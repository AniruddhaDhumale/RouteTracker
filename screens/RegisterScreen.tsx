import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
  Image,
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

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, "Register">;

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { theme } = useTheme();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email.");
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (!employeeId.trim()) {
      Alert.alert("Error", "Please enter your Employee ID.");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter a password.");
      return;
    }

    if (password.length < 4) {
      Alert.alert("Error", "Password must be at least 4 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        employeeId: employeeId.trim(),
        password,
      });

      if (!result.success) {
        Alert.alert("Registration Failed", result.error || "Please try again.");
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
            Create Account
          </ThemedText>
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Register to start tracking your routes
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
          <View style={styles.inputContainer}>
            <ThemedText type="caption" style={styles.inputLabel}>
              Full Name
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
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="caption" style={styles.inputLabel}>
              Email
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
              <Feather name="mail" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

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
              <Feather name="briefcase" size={20} color={theme.textSecondary} />
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
                placeholder="Create a password"
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

          <View style={styles.inputContainer}>
            <ThemedText type="caption" style={styles.inputLabel}>
              Confirm Password
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
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.registerButton,
              {
                backgroundColor: AppColors.primary,
                opacity: pressed || isLoading ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText
              type="body"
              style={[styles.registerButtonText, { color: "#FFFFFF" }]}
            >
              {isLoading ? "Registering..." : "Register"}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.loginContainer}>
          <ThemedText
            type="body"
            style={[styles.loginText, { color: theme.textSecondary }]}
          >
            Already have an account?
          </ThemedText>
          <Pressable onPress={() => navigation.goBack()}>
            <ThemedText
              type="body"
              style={[styles.loginLink, { color: AppColors.accent }]}
            >
              Login here
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: Spacing.sm,
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
  registerButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  registerButtonText: {
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  loginText: {},
  loginLink: {
    fontWeight: "600",
  },
});
