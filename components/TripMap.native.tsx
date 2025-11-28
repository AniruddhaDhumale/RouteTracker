import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { GPSPoint, SiteVisit, Trip } from "@/utils/storage";
import { getGPSPoints, getSiteVisits } from "@/utils/dataAccess";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

interface TripMapProps {
  trip: Trip;
  height?: number;
}

export function TripMap({ trip, height = 250 }: TripMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [gpsPoints, setGpsPoints] = useState<GPSPoint[]>([]);
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [trip.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [points, visits] = await Promise.all([
        getGPSPoints(trip.id),
        getSiteVisits(trip.id),
      ]);
      setGpsPoints(points);
      setSiteVisits(visits);
    } catch (error) {
      console.error("Error loading map data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { height, backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Feather name="loader" size={24} color={theme.textSecondary} />
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
          >
            Loading route...
          </ThemedText>
        </View>
      </View>
    );
  }

  if (gpsPoints.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { height, backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <View style={styles.fallback}>
          <Feather name="map-pin" size={48} color={theme.textSecondary} />
          <ThemedText
            type="small"
            style={[styles.fallbackText, { color: theme.textSecondary }]}
          >
            No GPS data recorded for this trip
          </ThemedText>
        </View>
      </View>
    );
  }

  const routeCoordinates = gpsPoints.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  const allLatitudes = [
    ...gpsPoints.map((p) => p.latitude),
    ...siteVisits.map((v) => v.arrivalLatitude),
  ];
  const allLongitudes = [
    ...gpsPoints.map((p) => p.longitude),
    ...siteVisits.map((v) => v.arrivalLongitude),
  ];

  const minLat = Math.min(...allLatitudes);
  const maxLat = Math.max(...allLatitudes);
  const minLng = Math.min(...allLongitudes);
  const maxLng = Math.max(...allLongitudes);

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 1.3, 0.01);
  const lngDelta = Math.max((maxLng - minLng) * 1.3, 0.01);

  const initialRegion = {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={AppColors.primary}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />

        <Marker
          coordinate={{
            latitude: trip.startLatitude,
            longitude: trip.startLongitude,
          }}
          title="Start"
          description="Trip started"
          pinColor={AppColors.primary}
        />

        {trip.endLatitude && trip.endLongitude ? (
          <Marker
            coordinate={{
              latitude: trip.endLatitude,
              longitude: trip.endLongitude,
            }}
            title="End"
            description="Trip ended"
            pinColor={AppColors.secondary}
          />
        ) : null}

        {siteVisits.map((visit) => (
          <Marker
            key={visit.id}
            coordinate={{
              latitude: visit.arrivalLatitude,
              longitude: visit.arrivalLongitude,
            }}
            title={visit.siteName}
            description={visit.notes || "Site visit"}
            pinColor={AppColors.accent}
          />
        ))}
      </MapView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: AppColors.primary }]}
          />
          <ThemedText type="caption" style={{ color: theme.text }}>
            Start
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: AppColors.secondary }]}
          />
          <ThemedText type="caption" style={{ color: theme.text }}>
            End
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: AppColors.accent }]}
          />
          <ThemedText type="caption" style={{ color: theme.text }}>
            Site Visit
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  fallbackText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    flexDirection: "row",
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
