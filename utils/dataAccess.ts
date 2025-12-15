import { Platform } from "react-native";
import {
  Trip,
  GPSPoint,
  SiteVisit,
  UserSettings,
  getTrips as getTripsAsync,
  saveTrips as saveTripsAsync,
  getActiveTrip as getActiveTripAsync,
  saveActiveTrip as saveActiveTripAsync,
  getGPSPoints as getGPSPointsAsync,
  saveGPSPoint as saveGPSPointAsync,
  clearGPSPointsForTrip as clearGPSPointsAsync,
  getSiteVisits as getSiteVisitsAsync,
  saveSiteVisit as saveSiteVisitAsync,
  getAllSiteVisits as getAllSiteVisitsAsync,
  getUserSettings as getUserSettingsAsync,
  saveUserSettings as saveUserSettingsAsync,
} from "./storage";
import {
  initializeDatabase,
  getTripsFromDB,
  saveTripToDB,
  deleteTripFromDB,
  getActiveTripFromDB,
  getGPSPointsFromDB,
  saveGPSPointToDB,
  clearGPSPointsFromDB,
  getSiteVisitsFromDB,
  saveSiteVisitToDB,
  getAllSiteVisitsFromDB,
  getUserSettingsFromDB,
  saveUserSettingsToDB,
  getTripsByDateRange as getTripsByDateRangeDB,
  getTripStats as getTripStatsDB,
  exportTripsToCSV as exportTripsToCSVDB,
  getGPSPointCountForTrip as getGPSPointCountDB,
  ExtendedUserSettings,
} from "./database";

const isNative = Platform.OS !== "web";
let isDBInitialized = false;
let initializationPromise: Promise<boolean> | null = null;

export async function initializeDataLayer(): Promise<boolean> {
  if (!isNative) return false;
  
  if (isDBInitialized) return true;
  
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        console.log("[dataAccess] Initializing database layer...");
        await initializeDatabase();
        console.log("[dataAccess] Database initialized successfully");
        isDBInitialized = true;
        return true;
      } catch (error) {
        console.error("[dataAccess] CRITICAL - Failed to initialize SQLite database:", error);
        console.error("[dataAccess] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : "no stack",
        });
        isDBInitialized = false;
        initializationPromise = null;
        return false;
      }
    })();
  }
  
  return await initializationPromise;
}

function resetDBState(): void {
  isDBInitialized = false;
  initializationPromise = null;
}

async function ensureDBInitialized(): Promise<boolean> {
  if (!isNative) return false;
  return await initializeDataLayer();
}

export async function getTrips(): Promise<Trip[]> {
  if (await ensureDBInitialized()) {
    try {
      const trips = await getTripsFromDB();
      console.log("[dataAccess] Loaded", trips.length, "trips from SQLite");
      return trips;
    } catch (error) {
      console.error("[dataAccess] SQLite getTrips failed, falling back to AsyncStorage:", error);
      resetDBState();
    }
  }
  console.log("[dataAccess] Using AsyncStorage fallback for getTrips");
  return getTripsAsync();
}

export async function saveTrip(trip: Trip): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      await saveTripToDB(trip);
      return;
    } catch (error) {
      console.error("SQLite saveTrip failed, falling back:", error);
      resetDBState();
    }
  }
  const trips = await getTripsAsync();
  const existingIndex = trips.findIndex((t) => t.id === trip.id);
  if (existingIndex >= 0) {
    trips[existingIndex] = trip;
  } else {
    trips.push(trip);
  }
  await saveTripsAsync(trips);
}

export async function saveTrips(trips: Trip[]): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      for (const trip of trips) {
        await saveTripToDB(trip);
      }
      return;
    } catch (error) {
      console.error("SQLite saveTrips failed, falling back:", error);
      resetDBState();
    }
  }
  await saveTripsAsync(trips);
}

export async function deleteTrip(tripId: string): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      await deleteTripFromDB(tripId);
      return;
    } catch (error) {
      console.error("SQLite deleteTrip failed, falling back:", error);
      resetDBState();
    }
  }
  const trips = await getTripsAsync();
  await saveTripsAsync(trips.filter((t) => t.id !== tripId));
}

export async function getActiveTrip(): Promise<Trip | null> {
  if (await ensureDBInitialized()) {
    try {
      return await getActiveTripFromDB();
    } catch (error) {
      console.error("SQLite getActiveTrip failed, falling back:", error);
      resetDBState();
    }
  }
  return getActiveTripAsync();
}

export async function saveActiveTrip(trip: Trip | null): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      if (trip) {
        await saveTripToDB(trip);
      }
      return;
    } catch (error) {
      console.error("SQLite saveActiveTrip failed, falling back:", error);
      resetDBState();
    }
  }
  await saveActiveTripAsync(trip);
}

export async function getGPSPoints(tripId: string): Promise<GPSPoint[]> {
  if (await ensureDBInitialized()) {
    try {
      return await getGPSPointsFromDB(tripId);
    } catch (error) {
      console.error("SQLite getGPSPoints failed, falling back:", error);
      resetDBState();
    }
  }
  return getGPSPointsAsync(tripId);
}

export async function saveGPSPoint(point: GPSPoint): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      await saveGPSPointToDB(point);
      return;
    } catch (error) {
      console.error("SQLite saveGPSPoint failed, falling back:", error);
      resetDBState();
    }
  }
  await saveGPSPointAsync(point);
}

export async function clearGPSPointsForTrip(tripId: string): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      await clearGPSPointsFromDB(tripId);
      return;
    } catch (error) {
      console.error("SQLite clearGPSPoints failed, falling back:", error);
      resetDBState();
    }
  }
  await clearGPSPointsAsync(tripId);
}

export async function getSiteVisits(tripId: string): Promise<SiteVisit[]> {
  if (await ensureDBInitialized()) {
    try {
      return await getSiteVisitsFromDB(tripId);
    } catch (error) {
      console.error("SQLite getSiteVisits failed, falling back:", error);
      resetDBState();
    }
  }
  return getSiteVisitsAsync(tripId);
}

export async function saveSiteVisit(visit: SiteVisit): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      await saveSiteVisitToDB(visit);
      return;
    } catch (error) {
      console.error("SQLite saveSiteVisit failed, falling back:", error);
      resetDBState();
    }
  }
  await saveSiteVisitAsync(visit);
}

export async function getAllSiteVisits(): Promise<SiteVisit[]> {
  if (await ensureDBInitialized()) {
    try {
      return await getAllSiteVisitsFromDB();
    } catch (error) {
      console.error("SQLite getAllSiteVisits failed, falling back:", error);
      resetDBState();
    }
  }
  return getAllSiteVisitsAsync();
}

export async function getUserSettings(): Promise<ExtendedUserSettings> {
  if (await ensureDBInitialized()) {
    try {
      return await getUserSettingsFromDB();
    } catch (error) {
      console.error("SQLite getUserSettings failed, falling back:", error);
      resetDBState();
    }
  }
  const settings = await getUserSettingsAsync();
  return {
    ...settings,
    allowanceRate: settings.allowanceRate || 3.5,
    allowanceRatePerMile: 0.8,
    minDistanceForAllowance: 0,
    maxDailyAllowance: 0,
  };
}

export async function saveUserSettings(settings: ExtendedUserSettings): Promise<void> {
  if (await ensureDBInitialized()) {
    try {
      await saveUserSettingsToDB(settings);
      return;
    } catch (error) {
      console.error("SQLite saveUserSettings failed, falling back:", error);
      resetDBState();
    }
  }
  await saveUserSettingsAsync(settings);
}

export async function getTripsByDateRange(
  startDate: number,
  endDate: number
): Promise<Trip[]> {
  if (await ensureDBInitialized()) {
    try {
      return await getTripsByDateRangeDB(startDate, endDate);
    } catch (error) {
      console.error("SQLite getTripsByDateRange failed, falling back:", error);
      resetDBState();
    }
  }
  const trips = await getTripsAsync();
  return trips.filter(
    (trip) => trip.startTime >= startDate && trip.startTime <= endDate
  );
}

export async function getTripStats(
  startDate: number,
  endDate: number
): Promise<{
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  totalSiteVisits: number;
}> {
  if (await ensureDBInitialized()) {
    try {
      return await getTripStatsDB(startDate, endDate);
    } catch (error) {
      console.error("SQLite getTripStats failed, falling back:", error);
      resetDBState();
    }
  }
  const trips = await getTripsAsync();
  const filteredTrips = trips.filter(
    (trip) => trip.startTime >= startDate && trip.startTime <= endDate && !trip.isActive
  );
  
  const allVisits = await getAllSiteVisitsAsync();
  const tripIds = new Set(filteredTrips.map((t) => t.id));
  const filteredVisits = allVisits.filter((v) => tripIds.has(v.tripId));

  return {
    totalTrips: filteredTrips.length,
    totalDistance: filteredTrips.reduce((sum, t) => sum + t.totalDistance, 0),
    totalDuration: filteredTrips.reduce((sum, t) => {
      if (!t.endTime) return sum;
      return sum + (t.endTime - t.startTime);
    }, 0),
    totalSiteVisits: filteredVisits.length,
  };
}

export async function exportTripsToCSV(
  startDate: number,
  endDate: number
): Promise<string> {
  if (await ensureDBInitialized()) {
    try {
      return await exportTripsToCSVDB(startDate, endDate);
    } catch (error) {
      console.error("SQLite exportTripsToCSV failed, falling back:", error);
      resetDBState();
    }
  }

  const trips = await getTripsAsync();
  const settings = await getUserSettingsAsync();
  const filteredTrips = trips.filter(
    (trip) =>
      trip.startTime >= startDate &&
      trip.startTime <= endDate &&
      !trip.isActive
  );

  let csv =
    "Trip ID,Date,Start Time,End Time,Duration (min),Distance (km),Distance (mi),Allowance ($),Start Lat,Start Lng,End Lat,End Lng,Site Visits\n";

  for (const trip of filteredTrips) {
    const startDateObj = new Date(trip.startTime);
    const endDateObj = trip.endTime ? new Date(trip.endTime) : null;
    const duration = trip.endTime
      ? Math.round((trip.endTime - trip.startTime) / 60000)
      : 0;
    const distanceKm = trip.totalDistance;
    const distanceMi = distanceKm * 0.621371;
    const allowance = (settings.useKilometers ? distanceKm : distanceMi) * settings.allowanceRate;

    const siteVisits = await getSiteVisitsAsync(trip.id);
    const siteNames = siteVisits.map((v) => v.siteName).join("; ");

    csv += `${trip.id},`;
    csv += `${startDateObj.toLocaleDateString()},`;
    csv += `${startDateObj.toLocaleTimeString()},`;
    csv += `${endDateObj ? endDateObj.toLocaleTimeString() : ""},`;
    csv += `${duration},`;
    csv += `${distanceKm.toFixed(2)},`;
    csv += `${distanceMi.toFixed(2)},`;
    csv += `${allowance.toFixed(2)},`;
    csv += `${trip.startLatitude},`;
    csv += `${trip.startLongitude},`;
    csv += `${trip.endLatitude || ""},`;
    csv += `${trip.endLongitude || ""},`;
    csv += `"${siteNames}"\n`;
  }

  return csv;
}

export async function getGPSPointCountForTrip(tripId: string): Promise<number> {
  if (await ensureDBInitialized()) {
    try {
      return await getGPSPointCountDB(tripId);
    } catch (error) {
      console.error("SQLite getGPSPointCount failed, falling back:", error);
      resetDBState();
    }
  }
  const points = await getGPSPointsAsync(tripId);
  return points.length;
}

export function calculateAllowance(
  distanceKm: number,
  settings: ExtendedUserSettings
): number {
  const distance = settings.useKilometers
    ? distanceKm
    : distanceKm * 0.621371;

  if (
    settings.minDistanceForAllowance &&
    distance < settings.minDistanceForAllowance
  ) {
    return 0;
  }

  const rate = settings.useKilometers
    ? settings.allowanceRate
    : settings.allowanceRatePerMile ?? 0.8;

  let allowance = distance * rate;

  if (settings.maxDailyAllowance && settings.maxDailyAllowance > 0) {
    allowance = Math.min(allowance, settings.maxDailyAllowance);
  }

  return allowance;
}

export function formatAllowanceAdvanced(
  distanceKm: number,
  settings: ExtendedUserSettings
): string {
  const amount = calculateAllowance(distanceKm, settings);
  return `Rs ${amount.toFixed(2)}`;
}

export { ExtendedUserSettings };
