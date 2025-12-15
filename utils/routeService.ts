import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBackendUrl = (): string => {
  const extraConfig = Constants.expoConfig?.extra;
  
  if (extraConfig?.backendUrl) {
    return extraConfig.backendUrl;
  }
  
  if (Platform.OS === 'web') {
    return '';
  }
  
  return 'http://localhost:3001';
};

interface RouteResponse {
  distance: number;
  duration: number;
  geometry: string | null;
}

interface MatrixResponse {
  distances: number[][];
  durations: number[][];
}

interface SnapResponse {
  locations: Array<{
    location: [number, number];
    snapped_distance: number;
  }>;
}

export async function getRouteDistance(
  coordinates: [number, number][],
  profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<RouteResponse | null> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/route/directions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates, profile }),
    });

    if (!response.ok) {
      console.error('Route API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get route distance:', error);
    return null;
  }
}

export async function getDistanceMatrix(
  locations: [number, number][],
  profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<MatrixResponse | null> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/route/matrix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locations, profile }),
    });

    if (!response.ok) {
      console.error('Matrix API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get distance matrix:', error);
    return null;
  }
}

export async function snapToRoads(
  coordinates: [number, number][],
  profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<SnapResponse | null> {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/route/snap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates, profile }),
    });

    if (!response.ok) {
      console.error('Snap API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to snap to roads:', error);
    return null;
  }
}

export async function calculateTripDistanceWithRouting(
  gpsPoints: Array<{ latitude: number; longitude: number }>
): Promise<{ distance: number; usedRouting: boolean }> {
  if (gpsPoints.length < 2) {
    return { distance: 0, usedRouting: false };
  }

  const maxPointsPerRequest = 50;
  
  const coordinates: [number, number][] = gpsPoints.map(p => [p.longitude, p.latitude]);
  
  let totalDistance = 0;
  let usedRouting = true;

  for (let i = 0; i < coordinates.length; i += maxPointsPerRequest - 1) {
    const chunk = coordinates.slice(i, i + maxPointsPerRequest);
    
    if (chunk.length < 2) break;

    const result = await getRouteDistance(chunk);
    
    if (result && result.distance > 0) {
      totalDistance += result.distance;
    } else {
      usedRouting = false;
      break;
    }
  }

  return { distance: totalDistance / 1000, usedRouting };
}
