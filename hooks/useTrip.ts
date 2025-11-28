import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import {
  Trip,
  GPSPoint,
  SiteVisit,
  UserSettings,
  getTrips,
  saveTrips,
  getActiveTrip,
  saveActiveTrip,
  getGPSPoints,
  saveGPSPoint,
  getSiteVisits,
  saveSiteVisit,
  getUserSettings,
  calculateTotalDistance,
  generateId,
} from "@/utils/storage";

export interface TripState {
  trips: Trip[];
  activeTrip: Trip | null;
  gpsPoints: GPSPoint[];
  siteVisits: SiteVisit[];
  settings: UserSettings;
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
      allowanceRate: 0.5,
      gpsUpdateFrequency: "medium",
    },
    isLoading: true,
    locationPermission: false,
    currentLocation: null,
  });

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const loadData = useCallback(async () => {
    try {
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
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }

      const intervalMap = {
        low: 30000,
        medium: 15000,
        high: 5000,
      };

      const distanceMap = {
        low: 50,
        medium: 20,
        high: 10,
      };

      const interval = intervalMap[state.settings.gpsUpdateFrequency];
      const distance = distanceMap[state.settings.gpsUpdateFrequency];

      try {
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: interval,
            distanceInterval: distance,
          },
          async (location) => {
            const point: GPSPoint = {
              id: generateId(),
              tripId,
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy || undefined,
            };

            await saveGPSPoint(point);

            setState((prev) => {
              const newPoints = [...prev.gpsPoints, point];
              const totalDistance = calculateTotalDistance(newPoints);

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
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  }, []);

  const startTrip = useCallback(async () => {
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

    await startLocationTracking(trip.id);

    return trip;
  }, [requestLocationPermission, getCurrentLocation, startLocationTracking]);

  const endTrip = useCallback(async () => {
    if (!state.activeTrip) return null;

    stopLocationTracking();

    const location = await getCurrentLocation();
    const finalPoints = await getGPSPoints(state.activeTrip.id);
    const totalDistance = calculateTotalDistance(finalPoints);

    const completedTrip: Trip = {
      ...state.activeTrip,
      endTime: Date.now(),
      endLatitude: location?.coords.latitude,
      endLongitude: location?.coords.longitude,
      totalDistance,
      isActive: false,
    };

    const updatedTrips = [...state.trips, completedTrip];
    await saveTrips(updatedTrips);
    await saveActiveTrip(null);

    setState((prev) => ({
      ...prev,
      trips: updatedTrips,
      activeTrip: null,
      gpsPoints: [],
      siteVisits: [],
    }));

    return completedTrip;
  }, [state.activeTrip, state.trips, stopLocationTracking, getCurrentLocation]);

  const recordSiteArrival = useCallback(
    async (siteName: string, notes?: string) => {
      if (!state.activeTrip) return null;

      const location = await getCurrentLocation();
      if (!location) return null;

      const visit: SiteVisit = {
        id: generateId(),
        tripId: state.activeTrip.id,
        siteName,
        notes,
        arrivalTime: Date.now(),
        arrivalLatitude: location.coords.latitude,
        arrivalLongitude: location.coords.longitude,
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
      if (!location) return null;

      const visit = state.siteVisits.find((v) => v.id === visitId);
      if (!visit) return null;

      const updatedVisit: SiteVisit = {
        ...visit,
        departureTime: Date.now(),
        departureLatitude: location.coords.latitude,
        departureLongitude: location.coords.longitude,
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
    return getTodaysDistance() * state.settings.allowanceRate;
  }, [getTodaysDistance, state.settings.allowanceRate]);

  useEffect(() => {
    loadData();

    return () => {
      stopLocationTracking();
    };
  }, [loadData, stopLocationTracking]);

  useEffect(() => {
    if (state.activeTrip && state.locationPermission) {
      startLocationTracking(state.activeTrip.id);
    }
  }, [state.activeTrip?.id, state.locationPermission, startLocationTracking]);

  return {
    ...state,
    startTrip,
    endTrip,
    recordSiteArrival,
    recordSiteDeparture,
    getTodaysTrips,
    getTodaysDistance,
    getTodaysAllowance,
    requestLocationPermission,
    getCurrentLocation,
    loadData,
  };
}
