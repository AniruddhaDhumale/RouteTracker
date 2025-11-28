import React, { useState, useCallback } from "react";
import { StyleSheet, View, Image, TextInput, Alert, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { SettingsItem } from "@/components/SettingsItem";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTripContext } from "@/context/TripContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { saveUserSettings, UserSettings } from "@/utils/storage";

const GPS_FREQUENCIES = [
  { value: "low", label: "Low (30s)", description: "Saves battery" },
  { value: "medium", label: "Medium (15s)", description: "Balanced" },
  { value: "high", label: "High (5s)", description: "Most accurate" },
];

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { settings, loadData } = useTripContext();
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLocalSettings(settings);
      setHasChanges(false);
    }, [settings])
  );

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveUserSettings(localSettings);
      await loadData();
      setHasChanges(false);
      Alert.alert("Success", "Settings saved successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to save settings.");
    }
  };

  const handleGPSFrequencyChange = () => {
    const options = GPS_FREQUENCIES.map((f) => ({
      text: `${f.label} - ${f.description}`,
      onPress: () => updateSetting("gpsUpdateFrequency", f.value as "low" | "medium" | "high"),
    }));
    options.push({ text: "Cancel", onPress: () => {} });

    Alert.alert(
      "GPS Update Frequency",
      "Choose how often GPS coordinates are recorded during trips.",
      options
    );
  };

  const getCurrentFrequencyLabel = () => {
    const freq = GPS_FREQUENCIES.find(
      (f) => f.value === localSettings.gpsUpdateFrequency
    );
    return freq?.label || "Medium";
  };

  return (
    <ScreenKeyboardAwareScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.avatarContainer}>
        <Image
          source={require("../assets/images/worker-avatar.png")}
          style={styles.avatar}
          resizeMode="cover"
        />
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText type="small" style={styles.sectionTitle}>
          Worker Information
        </ThemedText>

        <View style={styles.inputContainer}>
          <ThemedText type="caption" style={styles.inputLabel}>
            Name
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.backgroundTertiary,
              },
            ]}
            value={localSettings.workerName}
            onChangeText={(text) => updateSetting("workerName", text)}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputContainer}>
          <ThemedText type="caption" style={styles.inputLabel}>
            Worker ID (Optional)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.backgroundTertiary,
              },
            ]}
            value={localSettings.workerId}
            onChangeText={(text) => updateSetting("workerId", text)}
            placeholder="Enter worker ID"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </View>

      <View
        style={[
          styles.section,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.backgroundSecondary,
          },
        ]}
      >
        <ThemedText type="small" style={styles.sectionTitle}>
          Preferences
        </ThemedText>

        <SettingsItem
          icon="globe"
          title="Use Kilometers"
          subtitle={localSettings.useKilometers ? "Distance in km" : "Distance in miles"}
          switchValue={localSettings.useKilometers}
          onSwitchChange={(value) => updateSetting("useKilometers", value)}
        />

        <View style={styles.inputContainer}>
          <ThemedText type="caption" style={styles.inputLabel}>
            Allowance Rate ($ per {localSettings.useKilometers ? "km" : "mile"})
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.backgroundTertiary,
              },
            ]}
            value={localSettings.allowanceRate.toString()}
            onChangeText={(text) => {
              const num = parseFloat(text) || 0;
              updateSetting("allowanceRate", num);
            }}
            keyboardType="decimal-pad"
            placeholder="0.50"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <SettingsItem
          icon="radio"
          title="GPS Update Frequency"
          subtitle="How often location is recorded"
          value={getCurrentFrequencyLabel()}
          onPress={handleGPSFrequencyChange}
          showChevron
        />
      </View>

      {hasChanges ? (
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: AppColors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <ThemedText
            type="body"
            style={[styles.saveButtonText, { color: "#FFFFFF" }]}
          >
            Save Changes
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.footer}>
        <ThemedText
          type="caption"
          style={[styles.footerText, { color: theme.textSecondary }]}
        >
          RouteTracker v1.0.0
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.footerText, { color: theme.textSecondary }]}
        >
          GPS route tracking for workers
        </ThemedText>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.md,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    opacity: 0.7,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  saveButtonText: {
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  footerText: {
    marginBottom: Spacing.xs,
  },
});
