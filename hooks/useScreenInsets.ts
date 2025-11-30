import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Spacing } from "@/constants/theme";

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  return {
    paddingTop: headerHeight + Spacing.xl,
    paddingBottom: tabBarHeight + Spacing.xxl,
    tabBarHeight,
    headerHeight,
    scrollInsetBottom: insets.bottom + 16,
    insets,
  };
}

export function useBasicInsets() {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: insets.top + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xxl,
    scrollInsetBottom: insets.bottom + 16,
    insets,
  };
}
