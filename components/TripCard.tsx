import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { Trip, formatDate, formatDuration, formatDistance } from "@/utils/storage";

interface TripCardProps {
  trip: Trip;
  useKilometers: boolean;
  onPress: () => void;
  siteVisitCount?: number;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TripCard({
  trip,
  useKilometers,
  onPress,
  siteVisitCount = 0,
}: TripCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.backgroundSecondary,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="body" style={styles.date}>
          {formatDate(trip.startTime)}
        </ThemedText>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={styles.statIcon}>
            <Feather name="navigation" size={14} color={AppColors.primary} />
          </View>
          <View>
            <ThemedText type="caption" style={styles.statLabel}>
              Distance
            </ThemedText>
            <ThemedText type="small" style={styles.statValue}>
              {formatDistance(trip.totalDistance, useKilometers)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.stat}>
          <View style={styles.statIcon}>
            <Feather name="clock" size={14} color={AppColors.accent} />
          </View>
          <View>
            <ThemedText type="caption" style={styles.statLabel}>
              Duration
            </ThemedText>
            <ThemedText type="small" style={styles.statValue}>
              {formatDuration(trip.startTime, trip.endTime)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.stat}>
          <View style={styles.statIcon}>
            <Feather name="map-pin" size={14} color={AppColors.warning} />
          </View>
          <View>
            <ThemedText type="caption" style={styles.statLabel}>
              Sites
            </ThemedText>
            <ThemedText type="small" style={styles.statValue}>
              {siteVisitCount}
            </ThemedText>
          </View>
        </View>
      </View>
    </AnimatedPressable>
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
  date: {
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    opacity: 0.7,
  },
  statValue: {
    fontWeight: "500",
  },
});
