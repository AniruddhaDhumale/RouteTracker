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
  const { trips, settings, loadData } = useTripContext();
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSiteVisits();
    }, [loadData])
  );

  const loadSiteVisits = async () => {
    const visits = await getAllSiteVisits();
    setSiteVisits(visits);
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
      <EmptyState
        icon="clock"
        title="No Trip History"
        message="Your completed trips will appear here. Start a trip from the Home tab to get started."
      />
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
