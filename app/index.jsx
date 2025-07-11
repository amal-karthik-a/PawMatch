import { View , StyleSheet , StatusBar } from "react-native";
import CoverPage from './OnboardingScreen'
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {


  
  return (
    <View style={Styles.containerPage}>
      <StatusBar backgroundColor={'rgba(1, 1, 1, 0.22)'} />
      <CoverPage />
    </View>
  );
}

const Styles = StyleSheet.create({
  containerPage:{
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  }
})