import { Platform, StyleSheet, ScrollView } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export function AuthScrollView({
  children,
  contentContainerStyle,
  style,
  keyboardShouldPersistTaps = "handled",
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = insets.top + Spacing.xl;
  const paddingBottom = insets.bottom + Spacing.xxl;
  const scrollInsetBottom = insets.bottom + 16;

  if (Platform.OS === "web") {
    return (
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot },
          style,
        ]}
        contentContainerStyle={[
          {
            paddingTop,
            paddingBottom,
          },
          styles.contentContainer,
          contentContainerStyle,
        ]}
        scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={[
        styles.container,
        { backgroundColor: theme.backgroundRoot },
        style,
      ]}
      contentContainerStyle={[
        {
          paddingTop,
          paddingBottom,
        },
        styles.contentContainer,
        contentContainerStyle,
      ]}
      scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...scrollViewProps}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
  },
});
