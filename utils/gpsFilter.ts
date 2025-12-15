import { GPSPoint } from "./storage";

interface FilteredPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  speed: number;
  isValidMovement: boolean;
  filteredDistance: number;
  // High-precision coordinate backup
  rawLatitude?: number;
  rawLongitude?: number;
}

interface KalmanState {
  lat: number;
  lon: number;
  latVariance: number;
  lonVariance: number;
  timestamp: number;
}

class GPSFilter {
  private kalmanState: KalmanState | null = null;
  private pointBuffer: FilteredPoint[] = [];
  private lastValidPoint: FilteredPoint | null = null;
  private isStationaryLocked = true;
  private lockReleaseTime = 0;
  private dwellCenter: { lat: number; lon: number } | null = null;
  private consecutiveStationaryCount = 0;
  private consecutiveMovingCount = 0;
  private recentPositions: { lat: number; lon: number; timestamp: number }[] = [];

  private readonly BUFFER_SIZE = 20;
  private readonly STATIONARY_LOCK_RELEASE_METERS = 15;
  private readonly STATIONARY_LOCK_RELEASE_SECONDS = 20;
  private readonly DWELL_RADIUS_METERS = 12;

  // 🔧 Loosened thresholds
  private readonly MIN_SPEED_MPS = 0.4;          // was 0.8
  private readonly MIN_ACCURACY_METERS = 50;     // was 35
  private readonly MIN_SEGMENT_METERS = 5;       // was 10
  private readonly CONSECUTIVE_MOVING_THRESHOLD = 2;   // was 3
  private readonly CONSECUTIVE_STATIONARY_THRESHOLD = 4;

  private readonly PROCESS_NOISE = 2;
  private readonly MEASUREMENT_NOISE_BASE = 12;
  private readonly VARIANCE_WINDOW_SIZE = 10;
  private readonly MAX_STATIONARY_VARIANCE = 8;

  reset(): void {
    this.kalmanState = null;
    this.pointBuffer = [];
    this.lastValidPoint = null;
    this.isStationaryLocked = true;
    this.lockReleaseTime = 0;
    this.dwellCenter = null;
    this.consecutiveStationaryCount = 0;
    this.consecutiveMovingCount = 0;
    this.recentPositions = [];
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;

    // Validate coordinates
    if (!this.isValidCoordinate(lat1, lon1) || !this.isValidCoordinate(lat2, lon2)) {
      return 0;
    }

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Validate that latitude and longitude are within valid ranges
  private isValidCoordinate(lat: number, lon: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180;
  }

  private applyKalmanFilter(
    lat: number,
    lon: number,
    accuracy: number,
    timestamp: number
  ): { lat: number; lon: number } {
    const measurementNoise = Math.max(this.MEASUREMENT_NOISE_BASE, accuracy);

    if (!this.kalmanState) {
      this.kalmanState = {
        lat,
        lon,
        latVariance: measurementNoise * measurementNoise,
        lonVariance: measurementNoise * measurementNoise,
        timestamp,
      };
      return { lat, lon };
    }

    const timeDelta = (timestamp - this.kalmanState.timestamp) / 1000;
    const processNoise = this.PROCESS_NOISE * timeDelta;

    const predictedLatVariance = this.kalmanState.latVariance + processNoise * processNoise;
    const predictedLonVariance = this.kalmanState.lonVariance + processNoise * processNoise;

    const latKalmanGain = predictedLatVariance / (predictedLatVariance + measurementNoise * measurementNoise);
    const lonKalmanGain = predictedLonVariance / (predictedLonVariance + measurementNoise * measurementNoise);

    const newLat = this.kalmanState.lat + latKalmanGain * (lat - this.kalmanState.lat);
    const newLon = this.kalmanState.lon + lonKalmanGain * (lon - this.kalmanState.lon);

    this.kalmanState = {
      lat: newLat,
      lon: newLon,
      latVariance: (1 - latKalmanGain) * predictedLatVariance,
      lonVariance: (1 - lonKalmanGain) * predictedLonVariance,
      timestamp,
    };

    return { lat: newLat, lon: newLon };
  }

  private calculatePositionVariance(): number {
    if (this.recentPositions.length < 3) return 0;

    const centroidLat = this.recentPositions.reduce((sum, p) => sum + p.lat, 0) / this.recentPositions.length;
    const centroidLon = this.recentPositions.reduce((sum, p) => sum + p.lon, 0) / this.recentPositions.length;

    let totalVariance = 0;
    for (const pos of this.recentPositions) {
      const dist = this.haversineDistance(centroidLat, centroidLon, pos.lat, pos.lon);
      totalVariance += dist * dist;
    }

    return Math.sqrt(totalVariance / this.recentPositions.length);
  }

  private checkStationaryLock(): void {
    if (this.pointBuffer.length < 4) return;

    const now = this.pointBuffer[this.pointBuffer.length - 1].timestamp;
    const windowStart = now - this.STATIONARY_LOCK_RELEASE_SECONDS * 1000;

    const recentPoints = this.pointBuffer.filter(p => p.timestamp >= windowStart);
    if (recentPoints.length < 3) return;

    const oldest = recentPoints[0];
    const newest = recentPoints[recentPoints.length - 1];
    const netDisplacement = this.haversineDistance(
      oldest.latitude, oldest.longitude,
      newest.latitude, newest.longitude
    );

    const avgSpeed = recentPoints.reduce((sum, p) => sum + p.speed, 0) / recentPoints.length;
    const avgAccuracy = recentPoints.reduce((sum, p) => sum + p.accuracy, 0) / recentPoints.length;
    const positionVariance = this.calculatePositionVariance();

    if (this.isStationaryLocked) {
      if (
        netDisplacement > this.STATIONARY_LOCK_RELEASE_METERS &&
        avgSpeed >= this.MIN_SPEED_MPS &&
        avgAccuracy <= this.MIN_ACCURACY_METERS &&
        this.consecutiveMovingCount >= this.CONSECUTIVE_MOVING_THRESHOLD &&
        positionVariance > this.MAX_STATIONARY_VARIANCE
      ) {
        this.isStationaryLocked = false;
        this.lockReleaseTime = now;
        this.dwellCenter = null;
        this.consecutiveStationaryCount = 0;
      }
    } else {
      if (
        (netDisplacement < 12 && avgSpeed < 0.5) ||
        (positionVariance < this.MAX_STATIONARY_VARIANCE &&
          this.consecutiveStationaryCount >= this.CONSECUTIVE_STATIONARY_THRESHOLD)
      ) {
        this.isStationaryLocked = true;
        this.dwellCenter = { lat: newest.latitude, lon: newest.longitude };
        this.consecutiveMovingCount = 0;
      }
    }
  }

  processPoint(
    latitude: number,
    longitude: number,
    timestamp: number,
    accuracy: number | undefined,
    speed: number | null | undefined,
    motionConfidence: number
  ): { distance: number; isMoving: boolean; filteredLat: number; filteredLon: number } {
    const rawLat = latitude;
    const rawLon = longitude;

    // Validate input coordinates
    if (!this.isValidCoordinate(rawLat, rawLon)) {
      return {
        distance: 0,
        isMoving: false,
        filteredLat: rawLat,
        filteredLon: rawLon,
      };
    }

    const acc = accuracy ?? 20;
    const spd = speed ?? 0;

    const filtered = this.applyKalmanFilter(rawLat, rawLon, acc, timestamp);

    this.recentPositions.push({ lat: filtered.lat, lon: filtered.lon, timestamp });
    if (this.recentPositions.length > this.VARIANCE_WINDOW_SIZE) {
      this.recentPositions.shift();
    }

    const adjustedConfidence = spd < 0.4 ? Math.min(motionConfidence, 0.3) : motionConfidence;
    const isMovingBySpeed = spd >= this.MIN_SPEED_MPS;
    const isMovingByConfidence = adjustedConfidence >= 0.6;

    if (isMovingBySpeed && isMovingByConfidence) {
      this.consecutiveMovingCount++;
      this.consecutiveStationaryCount = 0;
    } else if (!isMovingBySpeed && !isMovingByConfidence) {
      this.consecutiveStationaryCount++;
      this.consecutiveMovingCount = 0;
    } else {
      if (this.consecutiveMovingCount > 0) {
        this.consecutiveMovingCount = Math.max(0, this.consecutiveMovingCount - 1);
      }
    }

    const point: FilteredPoint = {
      latitude: filtered.lat,
      longitude: filtered.lon,
      timestamp,
      accuracy: acc,
      speed: spd,
      isValidMovement: false,
      filteredDistance: 0,
      rawLatitude: rawLat,
      rawLongitude: rawLon,
    };

    this.pointBuffer.push(point);
    if (this.pointBuffer.length > this.BUFFER_SIZE) {
      this.pointBuffer.shift();
    }

    this.checkStationaryLock();

    if (this.isStationaryLocked) {
      if (!this.dwellCenter) {
        this.dwellCenter = { lat: filtered.lat, lon: filtered.lon };
      }
      this.lastValidPoint = point;
      return {
        distance: 0,
        isMoving: false,
        filteredLat: filtered.lat,
        filteredLon: filtered.lon,
      };
    }

    if (this.dwellCenter) {
      const distFromDwell = this.haversineDistance(
        this.dwellCenter.lat, this.dwellCenter.lon,
        filtered.lat, filtered.lon
      );
      if (distFromDwell < this.DWELL_RADIUS_METERS) {
        return {
          distance: 0,
          isMoving: false,
          filteredLat: filtered.lat,
          filteredLon: filtered.lon,
        };
      } else {
        this.dwellCenter = null;
      }
    }

    const positionVariance = this.calculatePositionVariance();
    if (positionVariance < this.MAX_STATIONARY_VARIANCE && this.recentPositions.length >= 5) {
      return {
        distance: 0,
        isMoving: false,
        filteredLat: filtered.lat,
        filteredLon: filtered.lon,
      };
    }

    if (!this.lastValidPoint) {
      this.lastValidPoint = point;
      return {
        distance: 0,
        isMoving: true,
        filteredLat: filtered.lat,
        filteredLon: filtered.lon,
      };
    }

    const segmentDistance = this.haversineDistance(
      this.lastValidPoint.latitude, this.lastValidPoint.longitude,
      filtered.lat, filtered.lon
    );

    if (segmentDistance < this.MIN_SEGMENT_METERS) {
      return {
        distance: 0,
        isMoving: false,
        filteredLat: filtered.lat,
        filteredLon: filtered.lon,
      };
    }

    const timeDiff = (timestamp - this.lastValidPoint.timestamp) / 1000;
    if (timeDiff > 0) {
      const impliedSpeed = segmentDistance / timeDiff;
      if (impliedSpeed > 55 || impliedSpeed < 0.5) {
        return {
          distance: 0,
          isMoving: false,
          filteredLat: filtered.lat,
          filteredLon: filtered.lon,
        };
      }
    }

    if (acc > this.MIN_ACCURACY_METERS) {
      return {
        distance: 0,
        isMoving: false,
        filteredLat: filtered.lat,
        filteredLon: filtered.lon,
      };
    }

    if (this.consecutiveMovingCount < this.CONSECUTIVE_MOVING_THRESHOLD) {
      return {
        distance: 0,
        isMoving: false,
        filteredLat: filtered.lat,
        filteredLon: filtered.lon,
      };
    }

    point.isValidMovement = true;
    point.filteredDistance = segmentDistance;
    this.lastValidPoint = point;

    return {
      distance: segmentDistance / 1000,
      isMoving: true,
      filteredLat: filtered.lat,
      filteredLon: filtered.lon,
    };
  }

  getDistanceInKm(meters: number): number {
    return meters / 1000;
  }

  getState(): {
    isLocked: boolean;
    consecutiveMoving: number;
    consecutiveStationary: number;
    bufferSize: number;
  } {
    return {
      isLocked: this.isStationaryLocked,
      consecutiveMoving: this.consecutiveMovingCount,
      consecutiveStationary: this.consecutiveStationaryCount,
      bufferSize: this.pointBuffer.length,
    };
  }
}

let globalFilter: GPSFilter | null = null;

export function getGPSFilter(): GPSFilter {
  if (!globalFilter) {
    globalFilter = new GPSFilter();
  }
  return globalFilter;
}

export function resetGPSFilter(): void {
  if (globalFilter) {
    globalFilter.reset();
  }
  globalFilter = new GPSFilter();
}

// Batch distance calculator for finished trips
export function calculateFilteredDistance(points: GPSPoint[]): number {
  if (points.length < 2) return 0;

  const sortedPoints = [...points].sort((a, b) => a.timestamp - b.timestamp);

  let totalDistance = 0;
  const MIN_SEGMENT_METERS = 5;      // was 10
  const MAX_ACCURACY_METERS = 50;    // was 35
  const MIN_SPEED_KMH = 1.0;         // was 1.5
  const MAX_SPEED_KMH = 200;
  const VARIANCE_WINDOW = 8;
  const MAX_VARIANCE_METERS = 20;    // was 10

  let lastValidPoint: GPSPoint | null = null;
  let stationaryCount = 0;
  let movingCount = 0;
  const recentPoints: GPSPoint[] = [];

  const isValidCoordinate = (lat: number, lon: number): boolean => {
    return Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180;
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
      return 0;
    }

    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateVariance = (pts: GPSPoint[]): number => {
    if (pts.length < 3) return 0;
    const centroidLat = pts.reduce((sum, p) => sum + p.latitude, 0) / pts.length;
    const centroidLon = pts.reduce((sum, p) => sum + p.longitude, 0) / pts.length;
    let totalVar = 0;
    for (const p of pts) {
      const dist = haversine(centroidLat, centroidLon, p.latitude, p.longitude);
      totalVar += dist * dist;
    }
    return Math.sqrt(totalVar / pts.length);
  };

  for (const point of sortedPoints) {
    if (point.latitude === 0 && point.longitude === 0) continue;
    if (!isValidCoordinate(point.latitude, point.longitude)) continue;

    const accuracy = point.accuracy ?? 20;
    if (accuracy > MAX_ACCURACY_METERS) continue;

    recentPoints.push(point);
    if (recentPoints.length > VARIANCE_WINDOW) {
      recentPoints.shift();
    }

    const variance = calculateVariance(recentPoints);
    if (variance < MAX_VARIANCE_METERS && recentPoints.length >= 5) {
      stationaryCount++;
      movingCount = 0;
      continue;
    }

    if (point.isStationary === true) {
      stationaryCount++;
      movingCount = 0;
      continue;
    }

    movingCount++;
    stationaryCount = 0;

    if (movingCount < 3) {
      lastValidPoint = point;
      continue;
    }

    if (!lastValidPoint) {
      lastValidPoint = point;
      continue;
    }

    const segmentDistanceMeters = haversine(
      lastValidPoint.latitude, lastValidPoint.longitude,
      point.latitude, point.longitude
    );

    if (segmentDistanceMeters < MIN_SEGMENT_METERS) {
      continue;
    }

    const timeDiffMs = point.timestamp - lastValidPoint.timestamp;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    if (timeDiffHours > 0) {
      const speedKmh = (segmentDistanceMeters / 1000) / timeDiffHours;

      if (speedKmh < MIN_SPEED_KMH || speedKmh > MAX_SPEED_KMH) {
        continue;
      }
    }

    totalDistance += segmentDistanceMeters / 1000;
    lastValidPoint = point;
  }

  return totalDistance;
}
