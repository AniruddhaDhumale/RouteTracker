import React, { useState, useCallback } from "react";
import { StyleSheet, View, Alert, Platform, Linking } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { StatCard } from "@/components/StatCard";
import { ActiveTripCard } from "@/components/ActiveTripCard";
import { TimelineEvent, EventType } from "@/components/TimelineEvent";
import { ActionButton } from "@/components/ActionButton";
import { FAB } from "@/components/FAB";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTripContext } from "@/context/TripContext";
import { Spacing, AppColors } from "@/constants/theme";
import { formatDistance, SiteVisit } from "@/utils/storage";
import { formatAllowanceAdvanced } from "@/utils/dataAccess";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";
import { useScreenInsets } from "@/hooks/useScreenInsets";

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, "Home">;
};

interface TimelineEventData {
  id: string;
  type: EventType;
  time: number;
  title: string;
  subtitle?: string;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { theme } = useTheme();
  const { tabBarHeight } = useScreenInsets();
  const {
    activeTrip,
    siteVisits,
    settings,
    isLoading,
    locationPermission,
    startTrip,
    endTrip,
    recordSiteDeparture,
    getTodaysDistance,
    getTodaysAllowance,
    requestLocationPermission,
    loadData,
  } = useTripContext();

  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleStartTrip = async () => {
    setIsStarting(true);
    try {
      if (!locationPermission) {
        const granted = await requestLocationPermission();
        if (!granted) {
          Alert.alert(
            "Location Permission Required",
            "RouteTracker needs access to your location to track your trips. Please enable location access.",
            Platform.OS !== "web"
              ? [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Open Settings",
                    onPress: async () => {
                      try {
                        await Linking.openSettings();
                      } catch {
                      }
                    },
                  },
                ]
              : [{ text: "OK" }]
          );
          return;
        }
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startTrip();
    } catch (error) {
      Alert.alert("Error", "Failed to start trip. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndTrip = async () => {
    Alert.alert("End Trip", "Are you sure you want to end this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Trip",
        style: "destructive",
        onPress: async () => {
          setIsEnding(true);
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const completedTrip = await endTrip();
            if (completedTrip) {
              Alert.alert(
                "Trip Completed",
                `You traveled ${formatDistance(completedTrip.totalDistance, settings.useKilometers)} and earned ${formatAllowanceAdvanced(completedTrip.totalDistance, settings)}.`
              );
            }
          } catch (error) {
            Alert.alert("Error", "Failed to end trip. Please try again.");
          } finally {
            setIsEnding(false);
          }
        },
      },
    ]);
  };

  const handleRecordArrival = () => {
    navigation.navigate("SiteVisit", { mode: "arrival" });
  };

  const handleRecordDeparture = (visit: SiteVisit) => {
    Alert.alert(
      "Record Departure",
      `Record departure from ${visit.siteName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await recordSiteDeparture(visit.id);
          },
        },
      ]
    );
  };

  const buildTimelineEvents = (): TimelineEventData[] => {
    const events: TimelineEventData[] = [];

    if (activeTrip) {
      events.push({
        id: "start",
        type: "start",
        time: activeTrip.startTime,
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

      events.sort((a, b) => a.time - b.time);

      events.push({
        id: "current",
        type: "current",
        time: Date.now(),
        title: "Current Location",
        subtitle: "Tracking in progress",
      });
    }

    return events;
  };

  const timelineEvents = buildTimelineEvents();
  const pendingDepartures = siteVisits.filter((v) => !v.departureTime);
  const todaysDistance = getTodaysDistance();
  const todaysAllowance = getTodaysAllowance();

  return (
    <>
      <ScreenScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsRow}>
          <StatCard
            title="Distance Today"
            value={formatDistance(todaysDistance, settings.useKilometers)}
            icon="navigation"
            iconColor={AppColors.primary}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Allowance"
            value={`$${todaysAllowance.toFixed(2)}`}
            icon="dollar-sign"
            iconColor={AppColors.accent}
          />
        </View>

        {activeTrip ? (
          <>
            <ActiveTripCard
              startTime={activeTrip.startTime}
              distance={activeTrip.totalDistance}
              useKilometers={settings.useKilometers}
            />

            <View style={styles.actionsContainer}>
              <ActionButton
                title="Record Site Arrival"
                icon="log-in"
                onPress={handleRecordArrival}
                variant="secondary"
                style={styles.actionButton}
              />
              {pendingDepartures.length > 0 ? (
                <ActionButton
                  title={`Depart ${pendingDepartures[pendingDepartures.length - 1].siteName}`}
                  icon="log-out"
                  onPress={() =>
                    handleRecordDeparture(
                      pendingDepartures[pendingDepartures.length - 1]
                    )
                  }
                  variant="outline"
                  style={styles.actionButton}
                />
              ) : null}
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
                  isLast={index === timelineEvents.length - 1}
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyState
            icon="navigation"
            title="No Active Trip"
            message="Tap the button below to start tracking your route and calculate your travel distance."
          />
        )}
      </ScreenScrollView>

      <FAB
        icon={activeTrip ? "square" : "play"}
        color={activeTrip ? AppColors.secondary : AppColors.primary}
        onPress={activeTrip ? handleEndTrip : handleStartTrip}
        disabled={isStarting || isEnding}
        style={[
          styles.fab,
          { bottom: tabBarHeight + Spacing.md },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: Spacing.xxl + Spacing.fabSize,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  statSpacer: {
    width: Spacing.md,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  timelineContainer: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  fab: {
    position: "absolute",
    right: Spacing.md,
  },
});
