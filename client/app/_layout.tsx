import React, { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import Toast from "react-native-toast-message";
import "react-native-reanimated";
import { AppProvider } from "../context/appContext";
import { useFonts } from "expo-font";
import { StripeProvider } from "@stripe/stripe-react-native";
import { STRIPE_PUBLISHABLE_KEY } from "@/services/config";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const RootLayout: React.FC = () => {
  const [loaded] = useFonts({
    PoppinsRegular: require("../assets/fonts/Poppins-Regular.ttf"),
    PoppinsSemiBold: require("../assets/fonts/Poppins-SemiBold.ttf"),
    PoppinsBold: require("../assets/fonts/Poppins-Bold.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        initialRouteName="index"
        screenOptions={({ route }) => ({
          headerShown: false,
          gestureEnabled: false,
          animation:
            route.name === "loadingScreen" ? "fade" : "slide_from_bottom",
        })}
      >
        <Stack.Screen name="chatScreen" />
      </Stack>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
