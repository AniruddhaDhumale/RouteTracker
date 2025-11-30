import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Pressable, Alert, Platform, TextInput, Modal } from "react-native";
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
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { formatDistance, formatDuration, SiteVisit, Trip } from "@/utils/storage";
import { getAllSiteVisits, getTrips } from "@/utils/dataAccess";

type ReportType = "current" | "dateRange";

function formatDateDDMMYYYY(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function parseDateDDMMYYYY(dateStr: string): number | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const date = new Date(year, month - 1, day);
  return date.getTime();
}

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { trips, settings, loadData } = useTripContext();
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("current");
  const [startDate, setStartDate] = useState(formatDateDDMMYYYY(Date.now()));
  const [endDate, setEndDate] = useState(formatDateDDMMYYYY(Date.now()));
  const [isExporting, setIsExporting] = useState(false);
  const [allSiteVisits, setAllSiteVisits] = useState<SiteVisit[]>([]);
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSiteVisits();
    }, [loadData])
  );

  const loadSiteVisits = async () => {
    const visits = await getAllSiteVisits();
    setAllSiteVisits(visits);
  };

  const getDateRangeBounds = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    if (reportType === "current") {
      return { start: todayStart, end: todayEnd };
    }

    const start = parseDateDDMMYYYY(startDate);
    const end = parseDateDDMMYYYY(endDate);
    
    if (start && end) {
      return { 
        start, 
        end: end + 24 * 60 * 60 * 1000 - 1 
      };
    }

    return { start: todayStart, end: todayEnd };
  }, [reportType, startDate, endDate]);

  const filteredTrips = useMemo(() => {
    const { start, end } = getDateRangeBounds();
    return trips.filter((t) => t.startTime >= start && t.startTime <= end);
  }, [trips, getDateRangeBounds]);

  const filteredSiteVisits = useMemo(() => {
    const { start, end } = getDateRangeBounds();
    return allSiteVisits.filter(
      (v) => v.arrivalTime >= start && v.arrivalTime <= end
    );
  }, [allSiteVisits, getDateRangeBounds]);

  const stats = useMemo(() => {
    const totalDistance = filteredTrips.reduce(
      (sum, t) => sum + t.totalDistance,
      0
    );
    const totalTrips = filteredTrips.length;
    const avgDistance = totalTrips > 0 ? totalDistance / totalTrips : 0;

    const rate = settings.allowanceRate || 3.5;
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

  const generateExcelContent = async (): Promise<string> => {
    const allTrips = await getTrips();
    const allVisits = await getAllSiteVisits();
    const { start, end } = getDateRangeBounds();

    const rangeTrips = allTrips.filter(
      (t) => t.startTime >= start && t.startTime <= end
    );

    const employeeName = user?.name || "Unknown";
    const employeeCode = user?.employeeId || "Unknown";
    const rate = settings.allowanceRate || 3.5;

    let csv = `Employee Name,${employeeName},Employee Code,${employeeCode}\n`;
    csv += `Sr.No,Date,Scheme Name,Scheme Number,ESR Details,Village,Issue Reported,Resolution,Current Status,LAT,LONG,Km,Rate\n`;

    let srNo = 1;
    
    for (const trip of rangeTrips) {
      const tripVisits = allVisits.filter((v) => v.tripId === trip.id);
      const tripDate = formatDateDDMMYYYY(trip.startTime);

      csv += `${srNo},${tripDate},Home,,,,,,,,${trip.startLatitude.toFixed(6)},${trip.startLongitude.toFixed(6)},0,\n`;
      srNo++;

      for (const visit of tripVisits) {
        const km = trip.totalDistance > 0 ? (trip.totalDistance / (tripVisits.length + 1)).toFixed(1) : "0";
        const allowance = (parseFloat(km) * rate).toFixed(1);

        csv += `${srNo},`;
        csv += `${formatDateDDMMYYYY(visit.arrivalTime)},`;
        csv += `"${visit.schemeName || visit.siteName}",`;
        csv += `${visit.schemeNumber || ""},`;
        csv += `"${visit.esrDetails || ""}",`;
        csv += `"${visit.village || ""}",`;
        csv += `"${visit.issueReported || ""}",`;
        csv += `"${visit.resolution || ""}",`;
        csv += `${visit.currentStatus || ""},`;
        csv += `${visit.arrivalLatitude.toFixed(6)},`;
        csv += `${visit.arrivalLongitude.toFixed(6)},`;
        csv += `${km},`;
        csv += `${allowance}\n`;
        srNo++;
      }

      if (trip.endTime) {
        const endKm = (trip.totalDistance / (tripVisits.length + 1)).toFixed(1);
        const endAllowance = (parseFloat(endKm) * rate).toFixed(1);
        csv += `${srNo},${tripDate},Home,,,,,,,,${trip.endLatitude?.toFixed(6) || ""},${trip.endLongitude?.toFixed(6) || ""},${endKm},${endAllowance}\n`;
        srNo++;
      }
    }

    return csv;
  };

  const handleExportCSV = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Export Not Available",
        "Excel export is only available on mobile devices via Expo Go."
      );
      return;
    }

    if (reportType === "dateRange") {
      const start = parseDateDDMMYYYY(startDate);
      const end = parseDateDDMMYYYY(endDate);
      
      if (!start || !end) {
        Alert.alert("Invalid Date", "Please enter valid dates in DD-MM-YYYY format.");
        return;
      }

      if (start > end) {
        Alert.alert("Invalid Date Range", "Start date must be before end date.");
        return;
      }
    }

    setIsExporting(true);
    try {
      const csvContent = await generateExcelContent();
      
      const dateStr = reportType === "current" 
        ? formatDateDDMMYYYY(Date.now()).replace(/-/g, "")
        : `${startDate.replace(/-/g, "")}_to_${endDate.replace(/-/g, "")}`;
      
      const fileName = `trip-report-${dateStr}.csv`;
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
  }, [reportType, startDate, endDate, settings, user]);

  const openDateModal = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowDateModal(true);
  };

  const applyDateRange = () => {
    const start = parseDateDDMMYYYY(tempStartDate);
    const end = parseDateDDMMYYYY(tempEndDate);
    
    if (!start || !end) {
      Alert.alert("Invalid Date", "Please enter valid dates in DD-MM-YYYY format.");
      return;
    }

    if (start > end) {
      Alert.alert("Invalid Date Range", "Start date must be before end date.");
      return;
    }

    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setShowDateModal(false);
  };

  const ReportTypeButton = ({
    value,
    label,
  }: {
    value: ReportType;
    label: string;
  }) => (
    <Pressable
      onPress={() => setReportType(value)}
      style={[
        styles.rangeButton,
        {
          backgroundColor:
            reportType === value
              ? AppColors.primary
              : theme.backgroundSecondary,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.rangeButtonText,
          { color: reportType === value ? "#FFFFFF" : theme.text },
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
        <ReportTypeButton value="current" label="Current Date" />
        <ReportTypeButton value="dateRange" label="Date Range" />
      </View>

      {reportType === "dateRange" ? (
        <Pressable
          onPress={openDateModal}
          style={[
            styles.dateRangeDisplay,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.backgroundSecondary,
            },
          ]}
        >
          <Feather name="calendar" size={20} color={theme.textSecondary} />
          <ThemedText type="body">
            {startDate} to {endDate}
          </ThemedText>
          <Feather name="edit-2" size={16} color={theme.textSecondary} />
        </Pressable>
      ) : (
        <View
          style={[
            styles.dateRangeDisplay,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.backgroundSecondary,
            },
          ]}
        >
          <Feather name="calendar" size={20} color={theme.textSecondary} />
          <ThemedText type="body">
            Today: {formatDateDDMMYYYY(Date.now())}
          </ThemedText>
        </View>
      )}

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
            value={`Rs ${stats.totalAllowance.toFixed(2)}`}
            icon="credit-card"
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
            title="Site Visits"
            value={filteredSiteVisits.length.toString()}
            icon="map-pin"
            iconColor={AppColors.error}
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
          {isExporting ? "Exporting..." : "Download Excel Report"}
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
            No trips found for the selected date range.
          </ThemedText>
        </View>
      ) : null}

      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDateModal(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <ThemedText type="h4" style={styles.modalTitle}>
              Select Date Range
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <ThemedText type="caption" style={styles.modalInputLabel}>
                Start Date (DD-MM-YYYY)
              </ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
                value={tempStartDate}
                onChangeText={setTempStartDate}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.modalInputContainer}>
              <ThemedText type="caption" style={styles.modalInputLabel}>
                End Date (DD-MM-YYYY)
              </ThemedText>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.backgroundTertiary,
                  },
                ]}
                value={tempEndDate}
                onChangeText={setTempEndDate}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowDateModal(false)}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText type="body">Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={applyDateRange}
                style={[
                  styles.modalButton,
                  { backgroundColor: AppColors.primary },
                ]}
              >
                <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                  Apply
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  rangeContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
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
  dateRangeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  modalInputContainer: {
    marginBottom: Spacing.md,
  },
  modalInputLabel: {
    marginBottom: Spacing.xs,
    opacity: 0.7,
  },
  modalInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
