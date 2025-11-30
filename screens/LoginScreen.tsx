import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { AuthScrollView } from "@/components/AuthScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { AuthStackParamList } from "@/navigation/AuthStackNavigator";

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { theme } = useTheme();
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!employeeId.trim()) {
      Alert.alert("Error", "Please enter your Employee ID.");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await login(employeeId.trim(), password);

      if (!result.success) {
        Alert.alert("Login Failed", result.error || "Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h2" style={styles.title}>
            RouteTracker
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            GPS Route Tracking for Field Workers
          </ThemedText>
        </View>

        <View
          style={[
            styles.formContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.backgroundSecondary,
            },
          ]}
        >
          <ThemedText type="h4" style={styles.formTitle}>
            Login
          </ThemedText>

          <View style={styles.inputContainer}>
            <ThemedText type="caption" style={styles.inputLabel}>
              Employee ID
            </ThemedText>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.backgroundTertiary,
                },
              ]}
            >
              <Feather name="user" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={employeeId}
                onChangeText={setEmployeeId}
                placeholder="Enter your Employee ID"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="caption" style={styles.inputLabel}>
              Password
            </ThemedText>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.backgroundTertiary,
                },
              ]}
            >
              <Feather name="lock" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.loginButton,
              {
                backgroundColor: AppColors.primary,
                opacity: pressed || isLoading ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText
              type="body"
              style={[styles.loginButtonText, { color: "#FFFFFF" }]}
            >
              {isLoading ? "Logging in..." : "Login"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.registerContainer}>
          <ThemedText
            type="body"
            style={[styles.registerText, { color: theme.textSecondary }]}
          >
            Don't have an account?
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Register")}>
            <ThemedText
              type="body"
              style={[styles.registerLink, { color: AppColors.accent }]}
            >
              Register here
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </AuthScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  formContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  formTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    marginBottom: Spacing.xs,
    opacity: 0.7,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  loginButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  loginButtonText: {
    fontWeight: "600",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  registerText: {},
  registerLink: {
    fontWeight: "600",
  },
});
