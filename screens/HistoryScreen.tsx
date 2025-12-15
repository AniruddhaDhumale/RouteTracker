import React, { useCallback, useState, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenFlatList } from "@/components/ScreenFlatList";
import { TripCard } from "@/components/TripCard";
import { EmptyState } from "@/components/EmptyState";
import { useTripContext } from "@/context/TripContext";
import { Trip, getAllSiteVisits, SiteVisit } from "@/utils/storage";
import { Spacing } from "@/constants/theme";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";

type HistoryScreenProps = {
  navigation: NativeStackNavigationProp<HistoryStackParamList, "History">;
};

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { trips, settings, loadData, isLoading } = useTripContext();
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData()
        .then(() => {
          console.log("[HistoryScreen] Data loaded successfully");
          setError(null);
        })
        .catch((err) => {
          console.error("[HistoryScreen] Error loading data:", err);
          setError(err instanceof Error ? err.message : "Failed to load trip history");
        });
      loadSiteVisits();
    }, [loadData])
  );

  const loadSiteVisits = async () => {
    try {
      const visits = await getAllSiteVisits();
      setSiteVisits(visits);
      console.log("[HistoryScreen] Loaded", visits.length, "site visits");
    } catch (err) {
      console.error("[HistoryScreen] Error loading site visits:", err);
    }
  };

  const getSiteVisitCount = (tripId: string) => {
    return siteVisits.filter((v) => v.tripId === tripId).length;
  };

  const sortedTrips = [...trips].sort((a, b) => b.startTime - a.startTime);

  const renderItem = ({ item }: { item: Trip }) => (
    <TripCard
      trip={item}
      useKilometers={settings.useKilometers}
      siteVisitCount={getSiteVisitCount(item.id)}
      onPress={() => navigation.navigate("TripDetails", { tripId: item.id })}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {error ? (
        <EmptyState
          icon="alert-circle"
          title="Error Loading History"
          message={error}
        />
      ) : isLoading ? (
        <EmptyState
          icon="loader"
          title="Loading..."
          message="Please wait while we load your trips"
        />
      ) : (
        <EmptyState
          icon="clock"
          title="No Trip History"
          message="Your completed trips will appear here. Start a trip from the Home tab to get started."
        />
      )}
    </View>
  );

  return (
    <ScreenFlatList
      data={sortedTrips}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={renderEmpty}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    paddingTop: Spacing.xxl,
  },
});
