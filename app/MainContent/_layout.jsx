import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function MainLayout() {

  return (   
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Events/_layout" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}