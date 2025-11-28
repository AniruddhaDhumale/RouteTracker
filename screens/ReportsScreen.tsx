import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { StatCard } from "@/components/StatCard";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useTripContext } from "@/context/TripContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { formatDistance, formatAllowance, Trip } from "@/utils/storage";

type DateRange = "week" | "month" | "all";

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { trips, settings, loadData } = useTripContext();
  const [dateRange, setDateRange] = useState<DateRange>("week");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredTrips = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    switch (dateRange) {
      case "week":
        return trips.filter((t) => now - t.startTime <= 7 * oneDay);
      case "month":
        return trips.filter((t) => now - t.startTime <= 30 * oneDay);
      case "all":
      default:
        return trips;
    }
  }, [trips, dateRange]);

  const stats = useMemo(() => {
    const totalDistance = filteredTrips.reduce(
      (sum, t) => sum + t.totalDistance,
      0
    );
    const totalTrips = filteredTrips.length;
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;
    const totalAllowance = totalDistance * settings.allowanceRate;

    return { totalDistance, totalTrips, avgDistance, totalAllowance };
  }, [filteredTrips, settings.allowanceRate]);

  const dailyStats = useMemo(() => {
    const days: { [key: string]: number } = {};

    filteredTrips.forEach((trip) => {
      const date = new Date(trip.startTime);
      const key = `${date.getMonth() + 1}/${date.getDate()}`;
      days[key] = (days[key] || 0) + trip.totalDistance;
    });

    const entries = Object.entries(days)
      .sort((a, b) => {
        const [am, ad] = a[0].split("/").map(Number);
        const [bm, bd] = b[0].split("/").map(Number);
        return am - bm || ad - bd;
      })
      .slice(-7);

    const maxDistance = Math.max(...entries.map(([_, d]) => d), 1);

    return { entries, maxDistance };
  }, [filteredTrips]);

  const DateRangeButton = ({
    value,
    label,
  }: {
    value: DateRange;
    label: string;
  }) => (
    <Pressable
      onPress={() => setDateRange(value)}
      style={[
        styles.rangeButton,
        {
          backgroundColor:
            dateRange === value
              ? AppColors.primary
              : theme.backgroundSecondary,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.rangeButtonText,
          { color: dateRange === value ? "#FFFFFF" : theme.text },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  if (trips.length === 0) {
    return (
      <ScreenScrollView>
        <EmptyState
          icon="bar-chart-2"
          title="No Reports Yet"
          message="Complete some trips to see your travel reports and statistics here."
        />
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.rangeContainer}>
        <DateRangeButton value="week" label="Week" />
        <DateRangeButton value="month" label="Month" />
        <DateRangeButton value="all" label="All Time" />
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Distance"
            value={formatDistance(stats.totalDistance, settings.useKilometers)}
            icon="navigation"
            iconColor={AppColors.primary}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Total Allowance"
            value={formatAllowance(
              stats.totalDistance,
              settings.allowanceRate
            )}
            icon="dollar-sign"
            iconColor={AppColors.accent}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Trips"
            value={stats.totalTrips.toString()}
            icon="map"
            iconColor={AppColors.warning}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Avg Distance"
            value={formatDistance(stats.avgDistance, settings.useKilometers)}
            icon="trending-up"
            iconColor={AppColors.secondary}
          />
        </View>
      </View>

      {dailyStats.entries.length > 0 ? (
        <View
          style={[
            styles.chartContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.backgroundSecondary,
            },
          ]}
        >
          <ThemedText type="h4" style={styles.chartTitle}>
            Daily Distance
          </ThemedText>
          <View style={styles.chart}>
            {dailyStats.entries.map(([day, distance]) => {
              const height =
                (distance / dailyStats.maxDistance) * 100;
              return (
                <View key={day} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(height, 5)}%`,
                          backgroundColor: AppColors.primary,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={[styles.barLabel, { color: theme.textSecondary }]}
                  >
                    {day}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  rangeContainer: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  rangeButtonText: {
    fontWeight: "600",
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
  chartContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  chartTitle: {
    marginBottom: Spacing.md,
  },
  chart: {
    flexDirection: "row",
    height: 150,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 2,
  },
  barWrapper: {
    flex: 1,
    width: "80%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: BorderRadius.xs,
    minHeight: 4,
  },
  barLabel: {
    marginTop: Spacing.xs,
    fontSize: 10,
  },
});
