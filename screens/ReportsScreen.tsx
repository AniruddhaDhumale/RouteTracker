import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { ScreenScrollView } from "@/components/ScreenScrollView";
import { StatCard } from "@/components/StatCard";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useTripContext } from "@/context/TripContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { formatDistance, formatAllowance, formatDuration } from "@/utils/storage";
import { exportTripsToCSV } from "@/utils/dataAccess";

type DateRange = "week" | "month" | "all";

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { trips, settings, loadData } = useTripContext();
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [isExporting, setIsExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getDateRangeBounds = useCallback(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    switch (dateRange) {
      case "week":
        return { start: now - 7 * oneDay, end: now };
      case "month":
        return { start: now - 30 * oneDay, end: now };
      case "all":
      default:
        return { start: 0, end: now };
    }
  }, [dateRange]);

  const filteredTrips = useMemo(() => {
    const { start, end } = getDateRangeBounds();
    return trips.filter((t) => t.startTime >= start && t.startTime <= end);
  }, [trips, getDateRangeBounds]);

  const stats = useMemo(() => {
    const totalDistance = filteredTrips.reduce(
      (sum, t) => sum + t.totalDistance,
      0
    );
    const totalTrips = filteredTrips.length;
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    const rate = settings.useKilometers
      ? settings.allowanceRate
      : settings.allowanceRatePerMile || 0.8;
    const totalAllowance = totalDistance * rate;

    const totalDuration = filteredTrips.reduce((sum, t) => {
      const end = t.endTime || Date.now();
      return sum + (end - t.startTime);
    }, 0);

    return { totalDistance, totalTrips, avgDistance, totalAllowance, totalDuration };
  }, [filteredTrips, settings]);

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

  const handleExportCSV = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Export Not Available",
        "CSV export is only available on mobile devices via Expo Go."
      );
      return;
    }

    setIsExporting(true);
    try {
      const { start, end } = getDateRangeBounds();
      const csvContent = await exportTripsToCSV(start, end);

      const dateStr = new Date().toISOString().split("T")[0];
      const rangeLabel = dateRange === "all" ? "all-time" : dateRange;
      const fileName = `trip-report-${rangeLabel}-${dateStr}.csv`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/csv",
          dialogTitle: "Export Trip Report",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert(
          "Export Complete",
          `Report saved to: ${fileName}`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Export Failed", "There was an error exporting your trip data.");
    } finally {
      setIsExporting(false);
    }
  }, [dateRange, getDateRangeBounds]);

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
              settings.useKilometers
                ? settings.allowanceRate
                : settings.allowanceRatePerMile || 0.8
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
        <View style={styles.statsRow}>
          <StatCard
            title="Total Time"
            value={formatDuration(0, stats.totalDuration)}
            icon="clock"
            iconColor={AppColors.info}
          />
          <View style={styles.statSpacer} />
          <StatCard
            title="Site Visits"
            value={filteredTrips.reduce((sum, t) => sum + t.siteVisits.length, 0).toString()}
            icon="map-pin"
            iconColor={AppColors.error}
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

      <Pressable
        onPress={handleExportCSV}
        disabled={isExporting || filteredTrips.length === 0}
        style={({ pressed }) => [
          styles.exportButton,
          {
            backgroundColor: isExporting
              ? theme.backgroundSecondary
              : AppColors.primary,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Feather
          name={isExporting ? "loader" : "download"}
          size={20}
          color="#FFFFFF"
        />
        <ThemedText style={styles.exportButtonText}>
          {isExporting ? "Exporting..." : "Export to CSV"}
        </ThemedText>
      </Pressable>

      {filteredTrips.length === 0 ? (
        <View
          style={[
            styles.noDataContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="info" size={20} color={theme.textSecondary} />
          <ThemedText
            type="small"
            style={[styles.noDataText, { color: theme.textSecondary }]}
          >
            No trips found in this date range.
          </ThemedText>
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
    marginBottom: Spacing.lg,
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
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  noDataContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  noDataText: {
    textAlign: "center",
  },
});
