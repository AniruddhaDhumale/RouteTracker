import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Trip } from "@/utils/storage";
import { Spacing, BorderRadius } from "@/constants/theme";

interface TripMapProps {
  trip: Trip;
  height?: number;
}

export function TripMap({ height = 250 }: TripMapProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: theme.backgroundSecondary },
      ]}
    >
      <View style={styles.fallback}>
        <Feather name="map" size={48} color={theme.textSecondary} />
        <ThemedText
          type="small"
          style={[styles.fallbackText, { color: theme.textSecondary }]}
        >
          Map view is available on mobile devices via Expo Go
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  fallbackText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
