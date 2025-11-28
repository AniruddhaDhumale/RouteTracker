import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Alert,
  Pressable,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

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
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const handleTakePhoto = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not Available",
        "Camera is available on mobile devices via Expo Go."
      );
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      if (!permissionResult.canAskAgain) {
        Alert.alert(
          "Permission Required",
          "Camera access is required. Please enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: async () => {
                try {
                  const { Linking } = await import("expo-linking");
                  await Linking.openSettings();
                } catch {
                  Alert.alert("Error", "Unable to open Settings.");
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "Camera permission is required to take photos."
        );
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleChoosePhoto = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not Available",
        "Photo gallery is available on mobile devices via Expo Go."
      );
      return;
    }

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      if (!permissionResult.canAskAgain) {
        Alert.alert(
          "Permission Required",
          "Photo library access is required. Please enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: async () => {
                try {
                  const { Linking } = await import("expo-linking");
                  await Linking.openSettings();
                } catch {
                  Alert.alert("Error", "Unable to open Settings.");
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "Photo library permission is required to select photos."
        );
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(undefined);
  };

  const handleSave = async () => {
    if (!siteName.trim()) {
      Alert.alert("Error", "Please enter a site name.");
      return;
    }

    setIsSaving(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await recordSiteArrival(
        siteName.trim(),
        notes.trim() || undefined,
        photoUri
      );
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

      <View style={styles.inputContainer}>
        <ThemedText type="body" style={styles.inputLabel}>
          Photo (Optional)
        </ThemedText>
        {photoUri ? (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
              contentFit="cover"
            />
            <Pressable
              onPress={handleRemovePhoto}
              style={[
                styles.removePhotoButton,
                { backgroundColor: AppColors.error },
              ]}
            >
              <Feather name="x" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.photoButtonsContainer}>
            <Pressable
              onPress={handleTakePhoto}
              style={({ pressed }) => [
                styles.photoButton,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="camera" size={24} color={AppColors.primary} />
              <ThemedText
                type="small"
                style={[styles.photoButtonText, { color: theme.text }]}
              >
                Take Photo
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleChoosePhoto}
              style={({ pressed }) => [
                styles.photoButton,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="image" size={24} color={AppColors.primary} />
              <ThemedText
                type="small"
                style={[styles.photoButtonText, { color: theme.text }]}
              >
                Choose Photo
              </ThemedText>
            </Pressable>
          </View>
        )}
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
  photoButtonsContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  photoButton: {
    flex: 1,
    height: 80,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  photoButtonText: {
    fontWeight: "500",
  },
  photoPreviewContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  removePhotoButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
