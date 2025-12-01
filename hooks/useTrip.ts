import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import {
  Trip,
  GPSPoint,
  SiteVisit,
  generateId,
} from "@/utils/storage";
import {
  initializeDataLayer,
  getTrips,
  saveTrip,
  saveTrips,
  getActiveTrip,
  saveActiveTrip,
  getGPSPoints,
  saveGPSPoint,
  getSiteVisits,
  saveSiteVisit,
  getUserSettings,
  saveUserSettings,
  ExtendedUserSettings,
} from "@/utils/dataAccess";
import { useMotionDetection, setGlobalMotionState, getGlobalMotionState, analyzeGPSMotion, resetGPSMotionBuffer } from "./useMotionDetection";
import { getGPSFilter, resetGPSFilter, calculateFilteredDistance } from "@/utils/gpsFilter";

export interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  gpsPoints: GPSPoint[];
  siteVisits: SiteVisit[];
  settings: ExtendedUserSettings;
  isLoading: boolean;
  locationPermission: boolean;
  currentLocation: Location.LocationObject | null;
}

export function useTrip() {
  const [state, setState] = useState<TripState>({
    trips: [],
    activeTrip: null,
    gpsPoints: [],
    siteVisits: [],
    settings: {
      workerName: "",
      workerId: "",
      useKilometers: true,
      allowanceRate: 3.5,
      gpsUpdateFrequency: "medium",
      allowanceRatePerMile: 0.8,
      minDistanceForAllowance: 0,
      maxDailyAllowance: 0,
    },
    isLoading: true,
    locationPermission: false,
    currentLocation: null,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const { isMoving, motionState, motionConfidence, startMotionDetection, stopMotionDetection } = useMotionDetection();

  useEffect(() => {
    setGlobalMotionState(motionState, isMoving, motionConfidence);
  }, [motionState, isMoving, motionConfidence]);

  const loadData = useCallback(async () => {
    try {
      await initializeDataLayer();

      const [trips, activeTrip, settings] = await Promise.all([
        getTrips(),
        getActiveTrip(),
        getUserSettings(),
      ]);

      let gpsPoints: GPSPoint[] = [];
      let siteVisits: SiteVisit[] = [];

      if (activeTrip) {
        [gpsPoints, siteVisits] = await Promise.all([
          getGPSPoints(activeTrip.id),
          getSiteVisits(activeTrip.id),
        ]);
      }

      setState((prev) => ({
        ...prev,
        trips,
        activeTrip,
        gpsPoints,
        siteVisits,
        settings,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading data:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      console.log("Location tracking not supported on web");
      return false;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setState((prev) => ({ ...prev, locationPermission: granted }));
      return granted;
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    if (Platform.OS === "web") {
      console.log("Location tracking not supported on web");
      return null;
    }
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setState((prev) => ({ ...prev, currentLocation: location }));
      return location;
    } catch (error) {
      console.error("Error getting current location:", error);
      return null;
    }
  }, []);

  const startLocationTracking = useCallback(
    async (tripId: string) => {
      if (Platform.OS === "web") {
        console.log("Location tracking not supported on web");
        return;
      }

      if (locationSubscription.current) {
        try {
          locationSubscription.current.remove();
        } catch (e) {
          console.log("Error removing subscription:", e);
        }
        locationSubscription.current = null;
      }

      const intervalMap = {
        low: 20000,     // 20 seconds - battery saver
        medium: 10000,  // 10 seconds - balanced
        high: 3000,     // 3 seconds - fitness app accuracy
      };

      const distanceMap = {
        low: 30,    // 30 meters
        medium: 10, // 10 meters
        high: 5,    // 5 meters - captures turns and curves accurately
      };

      const interval = intervalMap[state.settings.gpsUpdateFrequency];
      const distance = distanceMap[state.settings.gpsUpdateFrequency];

      resetGPSMotionBuffer();
      resetGPSFilter();
      
      try {
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: interval,
            distanceInterval: distance,
          },
          async (location) => {
            let motionInfo = getGlobalMotionState();
            
            const accelConfidence = motionInfo.state !== "unknown" ? motionInfo.confidence : undefined;
            
            const gpsMotion = analyzeGPSMotion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy || undefined,
              speed: location.coords.speed,
              heading: location.coords.heading,
            }, accelConfidence);
            
            if (motionInfo.state === "unknown" || Platform.OS === "web") {
              motionInfo = {
                state: gpsMotion.isStationary ? "stationary" : "moving",
                isMoving: !gpsMotion.isStationary,
                confidence: gpsMotion.motionConfidence,
              };
            } else {
              motionInfo = {
                ...motionInfo,
                confidence: Math.max(motionInfo.confidence, gpsMotion.motionConfidence),
              };
            }
            
            const gpsFilter = getGPSFilter();
            const filterResult = gpsFilter.processPoint(
              location.coords.latitude,
              location.coords.longitude,
              location.timestamp,
              location.coords.accuracy || undefined,
              location.coords.speed,
              motionInfo.confidence
            );
            
            const point: GPSPoint = {
              id: generateId(),
              tripId,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy || undefined,
              isStationary: !filterResult.isMoving,
              motionConfidence: motionInfo.confidence,
            };

            await saveGPSPoint(point);

            setState((prev) => {
              const newPoints = [...prev.gpsPoints, point];
              
              let totalDistance = prev.activeTrip?.totalDistance || 0;
              totalDistance += filterResult.distance;

              if (prev.activeTrip) {
                const updatedTrip = { ...prev.activeTrip, totalDistance };
                saveActiveTrip(updatedTrip);
                return {
                  ...prev,
                  gpsPoints: newPoints,
                  activeTrip: updatedTrip,
                  currentLocation: location,
                };
              }

              return { ...prev, gpsPoints: newPoints, currentLocation: location };
            });
          }
        );
      } catch (error) {
        console.error("Error starting location tracking:", error);
      }
    },
    [state.settings.gpsUpdateFrequency]
  );

  const stopLocationTracking = useCallback(() => {
    if (locationSubscription.current) {
      try {
        locationSubscription.current.remove();
      } catch (e) {
        console.log("Error removing location subscription:", e);
      }
      locationSubscription.current = null;
    }
  }, []);

  const startTrip = useCallback(async () => {
    if (Platform.OS === "web") {
      console.log("Trip tracking not supported on web");
      return null;
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await getCurrentLocation();
    if (!location) {
      return null;
    }

    const trip: Trip = {
      id: generateId(),
      startTime: Date.now(),
      startLatitude: location.coords.latitude,
      startLongitude: location.coords.longitude,
      totalDistance: 0,
      siteVisits: [],
      isActive: true,
    };

    await saveActiveTrip(trip);

    const initialPoint: GPSPoint = {
      id: generateId(),
      tripId: trip.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: Date.now(),
      accuracy: location.coords.accuracy || undefined,
    };

    await saveGPSPoint(initialPoint);

    setState((prev) => ({
      ...prev,
      activeTrip: trip,
      gpsPoints: [initialPoint],
      siteVisits: [],
    }));

    await startMotionDetection();
    await startLocationTracking(trip.id);

    return trip;
  }, [requestLocationPermission, getCurrentLocation, startLocationTracking, startMotionDetection]);

  const endTrip = useCallback(async () => {
    if (!state.activeTrip) return null;

    stopLocationTracking();
    stopMotionDetection();
    resetGPSFilter();

    const location = await getCurrentLocation();
    const finalPoints = await getGPSPoints(state.activeTrip.id);
    const totalDistance = calculateFilteredDistance(finalPoints);

    const completedTrip: Trip = {
      ...state.activeTrip,
      endTime: Date.now(),
      endLatitude: location?.coords.latitude,
      endLongitude: location?.coords.longitude,
      totalDistance,
      isActive: false,
    };

    await saveTrip(completedTrip);
    
    const updatedTrips = [...state.trips, completedTrip];

    setState((prev) => ({
      ...prev,
      trips: updatedTrips,
      activeTrip: null,
      gpsPoints: [],
      siteVisits: [],
    }));

    return completedTrip;
  }, [state.activeTrip, state.trips, stopLocationTracking, stopMotionDetection, getCurrentLocation]);

  const recordSiteArrival = useCallback(
    async (
      siteName: string,
      notes?: string,
      photoUri?: string,
      additionalFields?: {
        schemeName?: string;
        schemeNumber?: string;
        esrDetails?: string;
        village?: string;
        issueReported?: string;
        resolution?: string;
        currentStatus?: string;
      }
    ) => {
      if (!state.activeTrip) return null;

      const location = await getCurrentLocation();
      if (!location && Platform.OS !== "web") return null;

      const visit: SiteVisit = {
        id: generateId(),
        tripId: state.activeTrip.id,
        siteName,
        notes,
        photoUri,
        arrivalTime: Date.now(),
        arrivalLatitude: location?.coords.latitude || 0,
        arrivalLongitude: location?.coords.longitude || 0,
        schemeName: additionalFields?.schemeName,
        schemeNumber: additionalFields?.schemeNumber,
        esrDetails: additionalFields?.esrDetails,
        village: additionalFields?.village,
        issueReported: additionalFields?.issueReported,
        resolution: additionalFields?.resolution,
        currentStatus: additionalFields?.currentStatus,
      };

      await saveSiteVisit(visit);

      const updatedTrip = {
        ...state.activeTrip,
        siteVisits: [...state.activeTrip.siteVisits, visit.id],
      };
      await saveActiveTrip(updatedTrip);

      setState((prev) => ({
        ...prev,
        siteVisits: [...prev.siteVisits, visit],
        activeTrip: updatedTrip,
      }));

      return visit;
    },
    [state.activeTrip, getCurrentLocation]
  );

  const recordSiteDeparture = useCallback(
    async (visitId: string) => {
      if (!state.activeTrip) return null;

      const location = await getCurrentLocation();

      const visit = state.siteVisits.find((v) => v.id === visitId);
      if (!visit) return null;

      const updatedVisit: SiteVisit = {
        ...visit,
        departureTime: Date.now(),
        departureLatitude: location?.coords.latitude || visit.arrivalLatitude,
        departureLongitude: location?.coords.longitude || visit.arrivalLongitude,
      };

      await saveSiteVisit(updatedVisit);

      setState((prev) => ({
        ...prev,
        siteVisits: prev.siteVisits.map((v) =>
          v.id === visitId ? updatedVisit : v
        ),
      }));

      return updatedVisit;
    },
    [state.activeTrip, state.siteVisits, getCurrentLocation]
  );

  const updateSettings = useCallback(async (newSettings: Partial<ExtendedUserSettings>) => {
    const updatedSettings = { ...state.settings, ...newSettings };
    await saveUserSettings(updatedSettings);
    setState((prev) => ({
      ...prev,
      settings: updatedSettings,
    }));
  }, [state.settings]);

  const getTodaysTrips = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    return state.trips.filter((trip) => trip.startTime >= todayStart);
  }, [state.trips]);

  const getTodaysDistance = useCallback(() => {
    const todaysTrips = getTodaysTrips();
    const tripDistance = todaysTrips.reduce(
      (sum, trip) => sum + trip.totalDistance,
      0
    );
    const activeDistance = state.activeTrip?.totalDistance || 0;
    return tripDistance + activeDistance;
  }, [getTodaysTrips, state.activeTrip]);

  const getTodaysAllowance = useCallback(() => {
    const distance = getTodaysDistance();
    const rate = state.settings.useKilometers
      ? state.settings.allowanceRate
      : state.settings.allowanceRatePerMile || 0.8;
    
    let allowance = distance * rate;
    
    if (state.settings.minDistanceForAllowance && distance < state.settings.minDistanceForAllowance) {
      allowance = 0;
    }
    
    if (state.settings.maxDailyAllowance && state.settings.maxDailyAllowance > 0) {
      allowance = Math.min(allowance, state.settings.maxDailyAllowance);
    }
    
    return allowance;
  }, [getTodaysDistance, state.settings]);

  useEffect(() => {
    loadData();

    return () => {
      stopLocationTracking();
    };
  }, [loadData, stopLocationTracking]);

  useEffect(() => {
    if (state.activeTrip && state.locationPermission && Platform.OS !== "web") {
      startLocationTracking(state.activeTrip.id);
    }
  }, [state.activeTrip?.id, state.locationPermission, startLocationTracking]);

  return {
    ...state,
    startTrip,
    endTrip,
    recordSiteArrival,
    recordSiteDeparture,
    updateSettings,
    getTodaysTrips,
    getTodaysDistance,
    getTodaysAllowance,
    requestLocationPermission,
    getCurrentLocation,
    loadData,
  };
}
