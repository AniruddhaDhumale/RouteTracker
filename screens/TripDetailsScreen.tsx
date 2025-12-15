import React, { useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { StatCard } from "@/components/StatCard";
import { TimelineEvent, EventType } from "@/components/TimelineEvent";
import { ThemedText } from "@/components/ThemedText";
import { TripMap } from "@/components/TripMap.native";
import { useTheme } from "@/hooks/useTheme";
import { useTripContext } from "@/context/TripContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  Trip,
  SiteVisit,
  formatDate,
  formatTime,
  formatDuration,
  formatDistance,
} from "@/utils/storage";
import { getSiteVisits, formatAllowanceAdvanced } from "@/utils/dataAccess";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";

type TripDetailsScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "TripDetails"
>;

interface TimelineEventData {
  id: string;
  type: EventType;
  time: number;
  title: string;
  subtitle?: string;
  photoUri?: string;
}

export default function TripDetailsScreen({
  route,
}: TripDetailsScreenProps) {
  const { theme } = useTheme();
  const { trips, settings } = useTripContext();
  const { tripId } = route.params;

  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const trip = trips.find((t) => t.id === tripId);

  useEffect(() => {
    loadSiteVisits();
  }, [tripId]);

  const loadSiteVisits = async () => {
    const visits = await getSiteVisits(tripId);
    setSiteVisits(visits);
  };

  if (!trip) {
    return (
      <ScreenScrollView>
        <ThemedText type="body">Trip not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const buildTimelineEvents = (): TimelineEventData[] => {
    const events: TimelineEventData[] = [];

    events.push({
      id: "start",
      type: "start",
      time: trip.startTime,
      title: "Left Home",
      subtitle: "Trip started",
    });

    siteVisits.forEach((visit) => {
      events.push({
        id: `arrival-${visit.id}`,
        type: "site_arrival",
        time: visit.arrivalTime,
        title: `Arrived at ${visit.siteName}`,
        subtitle: visit.notes,
        photoUri: visit.photoUri,
      });

      if (visit.departureTime) {
        events.push({
          id: `departure-${visit.id}`,
          type: "site_departure",
          time: visit.departureTime,
          title: `Departed ${visit.siteName}`,
        });
      }
    });

    if (trip.endTime) {
      events.push({
        id: "end",
        type: "end",
        time: trip.endTime,
        title: "Returned Home",
        subtitle: "Trip completed",
      });
    }

    events.sort((a, b) => a.time - b.time);

    return events;
  };

  const timelineEvents = buildTimelineEvents();

  return (
    <ScreenScrollView showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText type="h3">{formatDate(trip.startTime)}</ThemedText>
        <ThemedText
          type="small"
          style={[styles.timeRange, { color: theme.textSecondary }]}
        >
          {formatTime(trip.startTime)}
          {trip.endTime ? ` - ${formatTime(trip.endTime)}` : " - In Progress"}
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Route Map
      </ThemedText>
      <TripMap trip={trip} height={220} />

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Distance"
            value={formatDistance(trip.totalDistance, settings.useKilometers)}
            icon="navigation"
            iconColor={AppColors.primary}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Travel Allowance"
            value={formatAllowanceAdvanced(trip.totalDistance, settings)}
            icon="dollar-sign"
            iconColor={AppColors.accent}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Duration"
            value={formatDuration(trip.startTime, trip.endTime)}
            icon="clock"
            iconColor={AppColors.warning}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Site Visits"
            value={siteVisits.length.toString()}
            icon="map-pin"
            iconColor={AppColors.secondary}
          />
        </View>
      </View>

      <View style={styles.timelineContainer}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Trip Timeline
        </ThemedText>
        {timelineEvents.map((event, index) => (
          <TimelineEvent
            key={event.id}
            type={event.type}
            time={event.time}
            title={event.title}
            subtitle={event.subtitle}
            photoUri={event.photoUri}
            isLast={index === timelineEvents.length - 1}
          />
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  timeRange: {
    marginTop: Spacing.xs,
  },
  statsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
  },
  statSpacer: {
    width: Spacing.md,
  },
  timelineContainer: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
});
