import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { formatDuration, formatDistance } from "@/utils/storage";

interface ActiveTripCardProps {
  startTime: number;
  distance: number;
  useKilometers: boolean;
}

export function ActiveTripCard({
  startTime,
  distance,
  useKilometers,
}: ActiveTripCardProps) {
  const { theme, isDark } = useTheme();
  const pulseOpacity = useSharedValue(1);
  const [elapsedTime, setElapsedTime] = React.useState(
    formatDuration(startTime)
  );

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseOpacity]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(formatDuration(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? AppColors.accentLight + "20" : AppColors.accentLight,
          borderColor: AppColors.accent,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.pulseIndicator, pulseStyle]} />
          <ThemedText
            type="body"
            style={[styles.statusText, { color: AppColors.accent }]}
          >
            Trip in Progress
          </ThemedText>
        </View>
        <View style={styles.durationContainer}>
          <Feather name="clock" size={14} color={AppColors.accent} />
          <ThemedText
            type="small"
            style={[styles.durationText, { color: AppColors.accent }]}
          >
            {elapsedTime}
          </ThemedText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <ThemedText type="caption" style={styles.statLabel}>
            Distance
          </ThemedText>
          <ThemedText type="h4" style={styles.statValue}>
            {formatDistance(distance, useKilometers)}
          </ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText type="caption" style={styles.statLabel}>
            GPS Points
          </ThemedText>
          <View style={styles.gpsIndicator}>
            <Feather name="navigation" size={16} color={AppColors.primary} />
            <ThemedText type="small" style={styles.gpsText}>
              Tracking
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulseIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.accent,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontWeight: "600",
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  durationText: {
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontWeight: "600",
  },
  gpsIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  gpsText: {
    color: AppColors.primary,
    fontWeight: "500",
  },
});
