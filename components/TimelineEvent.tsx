import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";
import { formatTime } from "@/utils/storage";

export type EventType =
  | "start"
  | "end"
  | "site_arrival"
  | "site_departure"
  | "current";

interface TimelineEventProps {
  type: EventType;
  time: number;
  title: string;
  subtitle?: string;
  isLast?: boolean;
}

const getEventConfig = (type: EventType) => {
  switch (type) {
    case "start":
      return {
        icon: "home" as const,
        color: AppColors.primary,
        label: "Left Home",
      };
    case "end":
      return {
        icon: "flag" as const,
        color: AppColors.secondary,
        label: "Returned Home",
      };
    case "site_arrival":
      return {
        icon: "log-in" as const,
        color: AppColors.accent,
        label: "Arrived",
      };
    case "site_departure":
      return {
        icon: "log-out" as const,
        color: AppColors.warning,
        label: "Departed",
      };
    case "current":
      return {
        icon: "navigation" as const,
        color: AppColors.accent,
        label: "Current",
      };
  }
};

export function TimelineEvent({
  type,
  time,
  title,
  subtitle,
  isLast = false,
}: TimelineEventProps) {
  const { theme } = useTheme();
  const config = getEventConfig(type);

  return (
    <View style={styles.container}>
      <View style={styles.indicator}>
        <View
          style={[
            styles.dot,
            { backgroundColor: config.color, borderColor: config.color },
          ]}
        >
          <Feather name={config.icon} size={12} color="#FFFFFF" />
        </View>
        {!isLast ? (
          <View
            style={[styles.line, { backgroundColor: theme.backgroundSecondary }]}
          />
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="body" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.time, { color: theme.textSecondary }]}
          >
            {formatTime(time)}
          </ThemedText>
        </View>
        {subtitle ? (
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: 60,
  },
  indicator: {
    width: 30,
    alignItems: "center",
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: "500",
  },
  time: {
    fontWeight: "500",
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
});
