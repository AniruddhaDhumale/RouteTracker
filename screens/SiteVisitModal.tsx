import React, { useState } from "react";
import { StyleSheet, View, TextInput, Alert, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useTripContext } from "@/context/TripContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { HomeStackParamList } from "@/navigation/HomeStackNavigator";

type SiteVisitModalProps = NativeStackScreenProps<
  HomeStackParamList,
  "SiteVisit"
>;

export default function SiteVisitModal({
  navigation,
  route,
}: SiteVisitModalProps) {
  const { theme } = useTheme();
  const { recordSiteArrival } = useTripContext();
  const { mode } = route.params;

  const [siteName, setSiteName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!siteName.trim()) {
      Alert.alert("Error", "Please enter a site name.");
      return;
    }

    setIsSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await recordSiteArrival(siteName.trim(), notes.trim() || undefined);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to record site visit. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenKeyboardAwareScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.infoContainer}>
        <ThemedText
          type="small"
          style={[styles.infoText, { color: theme.textSecondary }]}
        >
          Your current time and GPS location will be automatically recorded.
        </ThemedText>
      </View>

      <View style={styles.inputContainer}>
        <ThemedText type="body" style={styles.inputLabel}>
          Site Name
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.backgroundSecondary,
            },
          ]}
          value={siteName}
          onChangeText={setSiteName}
          placeholder="e.g., Office Building A"
          placeholderTextColor={theme.textSecondary}
          autoFocus
        />
      </View>

      <View style={styles.inputContainer}>
        <ThemedText type="body" style={styles.inputLabel}>
          Notes (Optional)
        </ThemedText>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: theme.backgroundSecondary,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this site visit..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        style={({ pressed }) => [
          styles.saveButton,
          {
            backgroundColor: AppColors.primary,
            opacity: pressed || isSaving ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={[styles.saveButtonText, { color: "#FFFFFF" }]}
        >
          {isSaving ? "Saving..." : "Save Site Visit"}
        </ThemedText>
      </Pressable>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  infoContainer: {
    marginBottom: Spacing.lg,
  },
  infoText: {
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  saveButtonText: {
    fontWeight: "600",
  },
});
