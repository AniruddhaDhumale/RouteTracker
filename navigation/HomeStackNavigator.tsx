import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "@/screens/HomeScreen";
import TripDetailsScreen from "@/screens/TripDetailsScreen";
import SiteVisitModal from "@/screens/SiteVisitModal";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";

export type HomeStackParamList = {
  Home: undefined;
  TripDetails: { tripId: string };
  SiteVisit: { mode: "arrival" | "departure"; visitId?: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="RouteTracker" />,
        }}
      />
      <Stack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{ headerTitle: "Trip Details" }}
      />
      <Stack.Screen
        name="SiteVisit"
        component={SiteVisitModal}
        options={{
          headerTitle: "Record Site Visit",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
