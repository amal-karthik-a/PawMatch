import { Stack } from "expo-router";
import { useFonts } from "expo-font";

export default function RootLayout() {
  useFonts({
    'outfit': require('./../assets/fonts/ConcertOne-Regular.ttf'),
    'outfit-medium': require('./../assets/fonts/MadimiOne-Regular.ttf')
  });

  return (
    <Stack screenOptions={{
      headerTitle: "",
      headerBackTitleVisible: false,
      headerTransparent: true,
      headerShadowVisible: false,
      headerShown: false,
    }}>
      <Stack.Screen name="OnboardingScreen" options={{ headerShown: false }} />
      <Stack.Screen name="Authentication/_layout" options={{ headerShown: false }} />
      <Stack.Screen name="MainContent/_layout"/>
    </Stack>
  );
}