import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import {
  Trip,
  GPSPoint,
  SiteVisit,
  UserSettings,
  calculateTotalDistance,
  generateId,
} from "./storage";

const DATABASE_NAME = "routetracker.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  if (Platform.OS === "web") {
    throw new Error("SQLite is not supported on web platform");
  }
  
  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  return db;
}

export async function initializeDatabase(): Promise<void> {
  if (Platform.OS === "web") {
    console.log("SQLite not available on web, using fallback storage");
    return;
  }

  const database = await getDatabase();

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      startLatitude REAL NOT NULL,
      startLongitude REAL NOT NULL,
      endLatitude REAL,
      endLongitude REAL,
      totalDistance REAL NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gps_points (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      accuracy REAL,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_visits (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      siteName TEXT NOT NULL,
      notes TEXT,
      photoUri TEXT,
      arrivalTime INTEGER NOT NULL,
      arrivalLatitude REAL NOT NULL,
      arrivalLongitude REAL NOT NULL,
      departureTime INTEGER,
      departureLatitude REAL,
      departureLongitude REAL,
      schemeName TEXT,
      schemeNumber TEXT,
      esrDetails TEXT,
      village TEXT,
      issueReported TEXT,
      resolution TEXT,
      currentStatus TEXT,
      FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      workerName TEXT DEFAULT '',
      workerId TEXT DEFAULT '',
      useKilometers INTEGER DEFAULT 1,
      allowanceRate REAL DEFAULT 3.5,
      gpsUpdateFrequency TEXT DEFAULT 'medium',
      allowanceRatePerMile REAL DEFAULT 0.8,
      minDistanceForAllowance REAL DEFAULT 0,
      maxDailyAllowance REAL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_gps_points_tripId ON gps_points(tripId);
    CREATE INDEX IF NOT EXISTS idx_site_visits_tripId ON site_visits(tripId);
    CREATE INDEX IF NOT EXISTS idx_trips_startTime ON trips(startTime);
    CREATE INDEX IF NOT EXISTS idx_trips_isActive ON trips(isActive);
  `);

  const settingsResult = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM user_settings"
  );
  if (!settingsResult || settingsResult.count === 0) {
    await database.runAsync(
      "INSERT INTO user_settings (id) VALUES (1)"
    );
  }
}

export async function getTripsFromDB(): Promise<Trip[]> {
  const database = await getDatabase();
  const trips = await database.getAllAsync<{
    id: string;
    startTime: number;
    endTime: number | null;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number | null;
    endLongitude: number | null;
    totalDistance: number;
    isActive: number;
  }>("SELECT * FROM trips WHERE isActive = 0 ORDER BY startTime DESC");

  const result: Trip[] = [];
  for (const trip of trips) {
    const siteVisits = await database.getAllAsync<{ id: string }>(
      "SELECT id FROM site_visits WHERE tripId = ?",
      [trip.id]
    );
    result.push({
      id: trip.id,
      startTime: trip.startTime,
      endTime: trip.endTime || undefined,
      startLatitude: trip.startLatitude,
      startLongitude: trip.startLongitude,
      endLatitude: trip.endLatitude || undefined,
      endLongitude: trip.endLongitude || undefined,
      totalDistance: trip.totalDistance,
      siteVisits: siteVisits.map((v) => v.id),
      isActive: false,
    });
  }
  return result;
}

export async function saveTripToDB(trip: Trip): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO trips 
     (id, startTime, endTime, startLatitude, startLongitude, endLatitude, endLongitude, totalDistance, isActive) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      trip.id,
      trip.startTime,
      trip.endTime || null,
      trip.startLatitude,
      trip.startLongitude,
      trip.endLatitude || null,
      trip.endLongitude || null,
      trip.totalDistance,
      trip.isActive ? 1 : 0,
    ]
  );
}

export async function deleteTripFromDB(tripId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM trips WHERE id = ?", [tripId]);
}

export async function getActiveTripFromDB(): Promise<Trip | null> {
  const database = await getDatabase();
  const trip = await database.getFirstAsync<{
    id: string;
    startTime: number;
    endTime: number | null;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number | null;
    endLongitude: number | null;
    totalDistance: number;
    isActive: number;
  }>("SELECT * FROM trips WHERE isActive = 1 LIMIT 1");

  if (!trip) return null;

  const siteVisits = await database.getAllAsync<{ id: string }>(
    "SELECT id FROM site_visits WHERE tripId = ?",
    [trip.id]
  );

  return {
    id: trip.id,
    startTime: trip.startTime,
    endTime: trip.endTime || undefined,
    startLatitude: trip.startLatitude,
    startLongitude: trip.startLongitude,
    endLatitude: trip.endLatitude || undefined,
    endLongitude: trip.endLongitude || undefined,
    totalDistance: trip.totalDistance,
    siteVisits: siteVisits.map((v) => v.id),
    isActive: true,
  };
}

export async function getGPSPointsFromDB(tripId: string): Promise<GPSPoint[]> {
  const database = await getDatabase();
  const points = await database.getAllAsync<{
    id: string;
    tripId: string;
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy: number | null;
  }>(
    "SELECT * FROM gps_points WHERE tripId = ? ORDER BY timestamp ASC",
    [tripId]
  );

  return points.map((p) => ({
    id: p.id,
    tripId: p.tripId,
    latitude: p.latitude,
    longitude: p.longitude,
    timestamp: p.timestamp,
    accuracy: p.accuracy || undefined,
  }));
}

export async function saveGPSPointToDB(point: GPSPoint): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO gps_points 
     (id, tripId, latitude, longitude, timestamp, accuracy) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      point.id,
      point.tripId,
      point.latitude,
      point.longitude,
      point.timestamp,
      point.accuracy || null,
    ]
  );
}

export async function clearGPSPointsFromDB(tripId: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync("DELETE FROM gps_points WHERE tripId = ?", [tripId]);
}

export async function getSiteVisitsFromDB(tripId: string): Promise<SiteVisit[]> {
  const database = await getDatabase();
  const visits = await database.getAllAsync<{
    id: string;
    tripId: string;
    siteName: string;
    notes: string | null;
    photoUri: string | null;
    arrivalTime: number;
    arrivalLatitude: number;
    arrivalLongitude: number;
    departureTime: number | null;
    departureLatitude: number | null;
    departureLongitude: number | null;
    schemeName: string | null;
    schemeNumber: string | null;
    esrDetails: string | null;
    village: string | null;
    issueReported: string | null;
    resolution: string | null;
    currentStatus: string | null;
  }>(
    "SELECT * FROM site_visits WHERE tripId = ? ORDER BY arrivalTime ASC",
    [tripId]
  );

  return visits.map((v) => ({
    id: v.id,
    tripId: v.tripId,
    siteName: v.siteName,
    notes: v.notes || undefined,
    photoUri: v.photoUri || undefined,
    arrivalTime: v.arrivalTime,
    arrivalLatitude: v.arrivalLatitude,
    arrivalLongitude: v.arrivalLongitude,
    departureTime: v.departureTime || undefined,
    departureLatitude: v.departureLatitude || undefined,
    departureLongitude: v.departureLongitude || undefined,
    schemeName: v.schemeName || undefined,
    schemeNumber: v.schemeNumber || undefined,
    esrDetails: v.esrDetails || undefined,
    village: v.village || undefined,
    issueReported: v.issueReported || undefined,
    resolution: v.resolution || undefined,
    currentStatus: v.currentStatus || undefined,
  }));
}

export async function saveSiteVisitToDB(visit: SiteVisit & { photoUri?: string }): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO site_visits 
     (id, tripId, siteName, notes, photoUri, arrivalTime, arrivalLatitude, arrivalLongitude, departureTime, departureLatitude, departureLongitude, schemeName, schemeNumber, esrDetails, village, issueReported, resolution, currentStatus) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      visit.id,
      visit.tripId,
      visit.siteName,
      visit.notes || null,
      visit.photoUri || null,
      visit.arrivalTime,
      visit.arrivalLatitude,
      visit.arrivalLongitude,
      visit.departureTime || null,
      visit.departureLatitude || null,
      visit.departureLongitude || null,
      visit.schemeName || null,
      visit.schemeNumber || null,
      visit.esrDetails || null,
      visit.village || null,
      visit.issueReported || null,
      visit.resolution || null,
      visit.currentStatus || null,
    ]
  );
}

export async function getAllSiteVisitsFromDB(): Promise<SiteVisit[]> {
  const database = await getDatabase();
  const visits = await database.getAllAsync<{
    id: string;
    tripId: string;
    siteName: string;
    notes: string | null;
    photoUri: string | null;
    arrivalTime: number;
    arrivalLatitude: number;
    arrivalLongitude: number;
    departureTime: number | null;
    departureLatitude: number | null;
    departureLongitude: number | null;
    schemeName: string | null;
    schemeNumber: string | null;
    esrDetails: string | null;
    village: string | null;
    issueReported: string | null;
    resolution: string | null;
    currentStatus: string | null;
  }>("SELECT * FROM site_visits ORDER BY arrivalTime DESC");

  return visits.map((v) => ({
    id: v.id,
    tripId: v.tripId,
    siteName: v.siteName,
    notes: v.notes || undefined,
    photoUri: v.photoUri || undefined,
    arrivalTime: v.arrivalTime,
    arrivalLatitude: v.arrivalLatitude,
    arrivalLongitude: v.arrivalLongitude,
    departureTime: v.departureTime || undefined,
    departureLatitude: v.departureLatitude || undefined,
    departureLongitude: v.departureLongitude || undefined,
    schemeName: v.schemeName || undefined,
    schemeNumber: v.schemeNumber || undefined,
    esrDetails: v.esrDetails || undefined,
    village: v.village || undefined,
    issueReported: v.issueReported || undefined,
    resolution: v.resolution || undefined,
    currentStatus: v.currentStatus || undefined,
  }));
}

export interface ExtendedUserSettings extends UserSettings {
  allowanceRatePerMile?: number;
  minDistanceForAllowance?: number;
  maxDailyAllowance?: number;
}

export async function getUserSettingsFromDB(): Promise<ExtendedUserSettings> {
  const database = await getDatabase();
  const settings = await database.getFirstAsync<{
    workerName: string;
    workerId: string;
    useKilometers: number;
    allowanceRate: number;
    gpsUpdateFrequency: string;
    allowanceRatePerMile: number;
    minDistanceForAllowance: number;
    maxDailyAllowance: number;
  }>("SELECT * FROM user_settings WHERE id = 1");

  if (!settings) {
    return {
      workerName: "",
      workerId: "",
      useKilometers: true,
      allowanceRate: 3.5,
      gpsUpdateFrequency: "medium" as const,
      allowanceRatePerMile: 0.8,
      minDistanceForAllowance: 0,
      maxDailyAllowance: 0,
    };
  }

  return {
    workerName: settings.workerName || "",
    workerId: settings.workerId || "",
    useKilometers: settings.useKilometers === 1,
    allowanceRate: settings.allowanceRate,
    gpsUpdateFrequency: settings.gpsUpdateFrequency as "low" | "medium" | "high",
    allowanceRatePerMile: settings.allowanceRatePerMile,
    minDistanceForAllowance: settings.minDistanceForAllowance,
    maxDailyAllowance: settings.maxDailyAllowance,
  };
}

export async function saveUserSettingsToDB(settings: ExtendedUserSettings): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE user_settings SET 
     workerName = ?, 
     workerId = ?, 
     useKilometers = ?, 
     allowanceRate = ?, 
     gpsUpdateFrequency = ?,
     allowanceRatePerMile = ?,
     minDistanceForAllowance = ?,
     maxDailyAllowance = ?
     WHERE id = 1`,
    [
      settings.workerName,
      settings.workerId,
      settings.useKilometers ? 1 : 0,
      settings.allowanceRate,
      settings.gpsUpdateFrequency,
      settings.allowanceRatePerMile || 0.8,
      settings.minDistanceForAllowance || 0,
      settings.maxDailyAllowance || 0,
    ]
  );
}

export async function getTripsByDateRange(
  startDate: number,
  endDate: number
): Promise<Trip[]> {
  const database = await getDatabase();
  const trips = await database.getAllAsync<{
    id: string;
    startTime: number;
    endTime: number | null;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number | null;
    endLongitude: number | null;
    totalDistance: number;
    isActive: number;
  }>(
    "SELECT * FROM trips WHERE startTime >= ? AND startTime <= ? AND isActive = 0 ORDER BY startTime DESC",
    [startDate, endDate]
  );

  const result: Trip[] = [];
  for (const trip of trips) {
    const siteVisits = await database.getAllAsync<{ id: string }>(
      "SELECT id FROM site_visits WHERE tripId = ?",
      [trip.id]
    );
    result.push({
      id: trip.id,
      startTime: trip.startTime,
      endTime: trip.endTime || undefined,
      startLatitude: trip.startLatitude,
      startLongitude: trip.startLongitude,
      endLatitude: trip.endLatitude || undefined,
      endLongitude: trip.endLongitude || undefined,
      totalDistance: trip.totalDistance,
      siteVisits: siteVisits.map((v) => v.id),
      isActive: false,
    });
  }
  return result;
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
  const database = await getDatabase();
  
  const tripStats = await database.getFirstAsync<{
    count: number;
    totalDistance: number;
    totalDuration: number;
  }>(
    `SELECT 
       COUNT(*) as count, 
       COALESCE(SUM(totalDistance), 0) as totalDistance,
       COALESCE(SUM(CASE WHEN endTime IS NOT NULL THEN endTime - startTime ELSE 0 END), 0) as totalDuration
     FROM trips 
     WHERE startTime >= ? AND startTime <= ? AND isActive = 0`,
    [startDate, endDate]
  );

  const siteStats = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM site_visits sv
     INNER JOIN trips t ON sv.tripId = t.id
     WHERE t.startTime >= ? AND t.startTime <= ? AND t.isActive = 0`,
    [startDate, endDate]
  );

  return {
    totalTrips: tripStats?.count || 0,
    totalDistance: tripStats?.totalDistance || 0,
    totalDuration: tripStats?.totalDuration || 0,
    totalSiteVisits: siteStats?.count || 0,
  };
}

export async function exportTripsToCSV(
  startDate: number,
  endDate: number
): Promise<string> {
  const database = await getDatabase();
  
  const trips = await database.getAllAsync<{
    id: string;
    startTime: number;
    endTime: number | null;
    startLatitude: number;
    startLongitude: number;
    endLatitude: number | null;
    endLongitude: number | null;
    totalDistance: number;
  }>(
    "SELECT * FROM trips WHERE startTime >= ? AND startTime <= ? AND isActive = 0 ORDER BY startTime ASC",
    [startDate, endDate]
  );

  const settings = await getUserSettingsFromDB();
  
  let csv = "Trip ID,Date,Start Time,End Time,Duration (min),Distance (km),Distance (mi),Allowance ($),Start Lat,Start Lng,End Lat,End Lng,Site Visits\n";

  for (const trip of trips) {
    const startDate = new Date(trip.startTime);
    const endDate = trip.endTime ? new Date(trip.endTime) : null;
    const duration = trip.endTime
      ? Math.round((trip.endTime - trip.startTime) / 60000)
      : 0;
    const distanceKm = trip.totalDistance;
    const distanceMi = distanceKm * 0.621371;
    const rate = settings.useKilometers
      ? settings.allowanceRate
      : settings.allowanceRatePerMile || 0.8;
    const allowance = (settings.useKilometers ? distanceKm : distanceMi) * rate;

    const siteVisits = await database.getAllAsync<{ siteName: string }>(
      "SELECT siteName FROM site_visits WHERE tripId = ?",
      [trip.id]
    );
    const siteNames = siteVisits.map((v) => v.siteName).join("; ");

    csv += `${trip.id},`;
    csv += `${startDate.toLocaleDateString()},`;
    csv += `${startDate.toLocaleTimeString()},`;
    csv += `${endDate ? endDate.toLocaleTimeString() : ""},`;
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
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM gps_points WHERE tripId = ?",
    [tripId]
  );
  return result?.count || 0;
}
