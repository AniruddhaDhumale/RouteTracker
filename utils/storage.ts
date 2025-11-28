import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  TRIPS: "@routetracker_trips",
  ACTIVE_TRIP: "@routetracker_active_trip",
  GPS_POINTS: "@routetracker_gps_points",
  SITE_VISITS: "@routetracker_site_visits",
  USER_SETTINGS: "@routetracker_user_settings",
};

export interface GPSPoint {
  id: string;
  tripId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface SiteVisit {
  id: string;
  tripId: string;
  siteName: string;
  notes?: string;
  arrivalTime: number;
  arrivalLatitude: number;
  arrivalLongitude: number;
  departureTime?: number;
  departureLatitude?: number;
  departureLongitude?: number;
}

export interface Trip {
  id: string;
  startTime: number;
  endTime?: number;
  startLatitude: number;
  startLongitude: number;
  endLatitude?: number;
  endLongitude?: number;
  totalDistance: number;
  siteVisits: string[];
  isActive: boolean;
}

export interface UserSettings {
  workerName: string;
  workerId: string;
  useKilometers: boolean;
  allowanceRate: number;
  gpsUpdateFrequency: "low" | "medium" | "high";
}

const defaultSettings: UserSettings = {
  workerName: "",
  workerId: "",
  useKilometers: true,
  allowanceRate: 0.5,
  gpsUpdateFrequency: "medium",
};

export async function getTrips(): Promise<Trip[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TRIPS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading trips:", error);
    return [];
  }
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  } catch (error) {
    console.error("Error saving trips:", error);
  }
}

export async function getActiveTrip(): Promise<Trip | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TRIP);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading active trip:", error);
    return null;
  }
}

export async function saveActiveTrip(trip: Trip | null): Promise<void> {
  try {
    if (trip) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TRIP, JSON.stringify(trip));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TRIP);
    }
  } catch (error) {
    console.error("Error saving active trip:", error);
  }
}

export async function getGPSPoints(tripId: string): Promise<GPSPoint[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GPS_POINTS);
    const allPoints: GPSPoint[] = data ? JSON.parse(data) : [];
    return allPoints.filter((p) => p.tripId === tripId);
  } catch (error) {
    console.error("Error loading GPS points:", error);
    return [];
  }
}

export async function saveGPSPoint(point: GPSPoint): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GPS_POINTS);
    const allPoints: GPSPoint[] = data ? JSON.parse(data) : [];
    allPoints.push(point);
    await AsyncStorage.setItem(STORAGE_KEYS.GPS_POINTS, JSON.stringify(allPoints));
  } catch (error) {
    console.error("Error saving GPS point:", error);
  }
}

export async function clearGPSPointsForTrip(tripId: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GPS_POINTS);
    const allPoints: GPSPoint[] = data ? JSON.parse(data) : [];
    const filtered = allPoints.filter((p) => p.tripId !== tripId);
    await AsyncStorage.setItem(STORAGE_KEYS.GPS_POINTS, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error clearing GPS points:", error);
  }
}

export async function getSiteVisits(tripId: string): Promise<SiteVisit[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SITE_VISITS);
    const allVisits: SiteVisit[] = data ? JSON.parse(data) : [];
    return allVisits.filter((v) => v.tripId === tripId);
  } catch (error) {
    console.error("Error loading site visits:", error);
    return [];
  }
}

export async function saveSiteVisit(visit: SiteVisit): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SITE_VISITS);
    const allVisits: SiteVisit[] = data ? JSON.parse(data) : [];
    const existingIndex = allVisits.findIndex((v) => v.id === visit.id);
    if (existingIndex >= 0) {
      allVisits[existingIndex] = visit;
    } else {
      allVisits.push(visit);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.SITE_VISITS, JSON.stringify(allVisits));
  } catch (error) {
    console.error("Error saving site visit:", error);
  }
}

export async function getAllSiteVisits(): Promise<SiteVisit[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SITE_VISITS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading all site visits:", error);
    return [];
  }
}

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch (error) {
    console.error("Error loading user settings:", error);
    return defaultSettings;
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving user settings:", error);
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateTotalDistance(points: GPSPoint[]): number {
  if (points.length < 2) return 0;
  
  const sortedPoints = [...points].sort((a, b) => a.timestamp - b.timestamp);
  let totalDistance = 0;
  
  for (let i = 1; i < sortedPoints.length; i++) {
    const prev = sortedPoints[i - 1];
    const curr = sortedPoints[i];
    totalDistance += calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }
  
  return totalDistance;
}

export function formatDistance(km: number, useKilometers: boolean): string {
  if (useKilometers) {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(2)} km`;
  } else {
    const miles = km * 0.621371;
    return miles < 1
      ? `${Math.round(miles * 5280)} ft`
      : `${miles.toFixed(2)} mi`;
  }
}

export function formatAllowance(km: number, rate: number): string {
  const amount = km * rate;
  return `$${amount.toFixed(2)}`;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(startTime: number, endTime?: number): string {
  const end = endTime || Date.now();
  const diff = end - startTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
