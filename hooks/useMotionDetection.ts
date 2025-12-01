import { useState, useEffect, useRef, useCallback } from "react";
import { Accelerometer, AccelerometerMeasurement } from "expo-sensors";
import { Platform } from "react-native";

export type MotionState = "stationary" | "moving" | "unknown";

interface MotionDetectionState {
  isMoving: boolean;
  motionState: MotionState;
  accelerationMagnitude: number;
  motionConfidence: number;
}

const STILLNESS_THRESHOLD = 0.02;
const MOVEMENT_THRESHOLD = 0.05;
const WINDOW_SIZE = 20;

export function useMotionDetection() {
  const [state, setState] = useState<MotionDetectionState>({
    isMoving: true,
    motionState: "unknown",
    accelerationMagnitude: 0,
    motionConfidence: 0.5,
  });
  
  const magnitudeBuffer = useRef<number[]>([]);
  const subscription = useRef<{ remove: () => void } | null>(null);
  const isAvailable = useRef(false);
  const smoothedConfidence = useRef(0.5);

  const processAcceleration = useCallback((data: AccelerometerMeasurement) => {
    const magnitude = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
    const deviation = Math.abs(magnitude - 1.0);
    
    magnitudeBuffer.current.push(deviation);
    if (magnitudeBuffer.current.length > WINDOW_SIZE) {
      magnitudeBuffer.current.shift();
    }
    
    if (magnitudeBuffer.current.length < 5) {
      return;
    }
    
    const avgDeviation = magnitudeBuffer.current.reduce((a, b) => a + b, 0) / magnitudeBuffer.current.length;
    const variance = magnitudeBuffer.current.reduce((sum, val) => sum + Math.pow(val - avgDeviation, 2), 0) / magnitudeBuffer.current.length;
    const stdDev = Math.sqrt(variance);
    
    const activityLevel = avgDeviation + stdDev * 2;
    
    let rawConfidence: number;
    if (activityLevel < STILLNESS_THRESHOLD) {
      rawConfidence = 0.0;
    } else if (activityLevel > MOVEMENT_THRESHOLD) {
      rawConfidence = 1.0;
    } else {
      rawConfidence = (activityLevel - STILLNESS_THRESHOLD) / (MOVEMENT_THRESHOLD - STILLNESS_THRESHOLD);
    }
    
    smoothedConfidence.current = smoothedConfidence.current * 0.7 + rawConfidence * 0.3;
    
    setState({
      isMoving: smoothedConfidence.current > 0.3,
      motionState: smoothedConfidence.current < 0.2 ? "stationary" : 
                   smoothedConfidence.current > 0.5 ? "moving" : "unknown",
      accelerationMagnitude: avgDeviation,
      motionConfidence: smoothedConfidence.current,
    });
  }, []);

  const startMotionDetection = useCallback(async () => {
    if (Platform.OS === "web") {
      setState({ isMoving: true, motionState: "unknown", accelerationMagnitude: 0, motionConfidence: 0.5 });
      return;
    }
    
    try {
      const available = await Accelerometer.isAvailableAsync();
      isAvailable.current = available;
      
      if (!available) {
        setState({ isMoving: true, motionState: "unknown", accelerationMagnitude: 0, motionConfidence: 0.5 });
        return;
      }
      
      await Accelerometer.setUpdateInterval(100);
      
      subscription.current = Accelerometer.addListener(processAcceleration);
    } catch (error) {
      console.error("Error starting motion detection:", error);
      setState({ isMoving: true, motionState: "unknown", accelerationMagnitude: 0, motionConfidence: 0.5 });
    }
  }, [processAcceleration]);

  const stopMotionDetection = useCallback(() => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    magnitudeBuffer.current = [];
    smoothedConfidence.current = 0.5;
  }, []);

  useEffect(() => {
    return () => {
      stopMotionDetection();
    };
  }, [stopMotionDetection]);

  return {
    ...state,
    startMotionDetection,
    stopMotionDetection,
    isAccelerometerAvailable: isAvailable.current,
  };
}

let globalMotionState: MotionState = "unknown";
let globalIsMoving = true;
let globalMotionConfidence = 0.5;

export function setGlobalMotionState(state: MotionState, isMoving: boolean, confidence?: number) {
  globalMotionState = state;
  globalIsMoving = isMoving;
  if (confidence !== undefined) {
    globalMotionConfidence = confidence;
  }
}

export function getGlobalMotionState(): { state: MotionState; isMoving: boolean; confidence: number } {
  return { state: globalMotionState, isMoving: globalIsMoving, confidence: globalMotionConfidence };
}

interface GPSLocationForMotion {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
}

const gpsMotionBuffer: GPSLocationForMotion[] = [];
const GPS_BUFFER_SIZE = 10;
const MIN_SPEED_MPS = 0.5;
const NET_DISPLACEMENT_MIN_M = 15;
const MAX_STATIONARY_ACCURACY = 25;

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

let smoothedConfidence = 0.0;

export function analyzeGPSMotion(location: GPSLocationForMotion, accelerometerConfidence?: number): { isStationary: boolean; motionConfidence: number } {
  gpsMotionBuffer.push(location);
  if (gpsMotionBuffer.length > GPS_BUFFER_SIZE) {
    gpsMotionBuffer.shift();
  }
  
  if (gpsMotionBuffer.length < 3) {
    smoothedConfidence = 0.0;
    return { isStationary: true, motionConfidence: 0.0 };
  }
  
  const oldest = gpsMotionBuffer[0];
  const newest = gpsMotionBuffer[gpsMotionBuffer.length - 1];
  const netDisplacement = haversineDistance(oldest.latitude, oldest.longitude, newest.latitude, newest.longitude);
  const windowTimeSec = (newest.timestamp - oldest.timestamp) / 1000;
  
  let totalPathDistance = 0;
  for (let i = 1; i < gpsMotionBuffer.length; i++) {
    totalPathDistance += haversineDistance(
      gpsMotionBuffer[i-1].latitude, gpsMotionBuffer[i-1].longitude,
      gpsMotionBuffer[i].latitude, gpsMotionBuffer[i].longitude
    );
  }
  
  const avgAccuracy = gpsMotionBuffer.reduce((sum, p) => sum + (p.accuracy || 25), 0) / gpsMotionBuffer.length;
  
  const hasDeviceSpeed = location.speed !== undefined && location.speed !== null && location.speed >= 0;
  const deviceSpeed = hasDeviceSpeed ? location.speed : 0;
  const netSpeed = windowTimeSec > 0 ? netDisplacement / windowTimeSec : 0;
  
  const straightness = totalPathDistance > 0 ? netDisplacement / totalPathDistance : 0;
  
  let rawConfidence = 0.0;
  
  if (hasDeviceSpeed && deviceSpeed >= 0.5) {
    rawConfidence = Math.min(0.95, 0.5 + deviceSpeed * 0.3);
  } else if (netDisplacement > avgAccuracy * 1.5 && straightness >= 0.5 && netSpeed >= 0.3) {
    rawConfidence = Math.min(0.9, straightness * 0.6 + netSpeed * 0.2);
  } else if (netDisplacement > avgAccuracy && straightness >= 0.3 && netSpeed >= 0.2) {
    rawConfidence = Math.min(0.7, straightness * 0.5 + netSpeed * 0.3);
  } else if (netSpeed >= 0.3) {
    rawConfidence = Math.min(0.5, netSpeed * 0.4 + straightness * 0.3);
  } else {
    rawConfidence = 0.0;
  }
  
  const hasAccelerometer = accelerometerConfidence !== undefined && accelerometerConfidence > 0;
  if (hasAccelerometer) {
    rawConfidence = rawConfidence * 0.4 + accelerometerConfidence * 0.6;
  }
  
  smoothedConfidence = smoothedConfidence * 0.5 + rawConfidence * 0.5;
  
  return { 
    isStationary: smoothedConfidence < 0.25, 
    motionConfidence: smoothedConfidence 
  };
}

export function resetGPSMotionBuffer() {
  gpsMotionBuffer.length = 0;
  smoothedConfidence = 0.0;
}
