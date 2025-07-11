import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  TextInput,
} from "react-native";
import Slider from "@react-native-community/slider";
import Icon from "react-native-vector-icons/MaterialIcons";
import LottieView from "lottie-react-native";
import filterAnimation from "./../../assets/Animations/AniSearch.json";
import debounce from "lodash/debounce";
import { db, auth } from "./../../Config/FirebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";

const FilterPage = () => {
  const [selectedSex, setSelectedSex] = useState("");
  const [price, setPrice] = useState(2500);
  const [tempPrice, setTempPrice] = useState(2500);
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideLeftAnim = useRef(new Animated.Value(-100)).current;
  const slideRightAnim = useRef(new Animated.Value(100)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchFilters = async () => {
      const userEmail = auth.currentUser?.email;
      if (userEmail) {
        const settingsRef = doc(db, "Settings", userEmail);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          const filterSell = docSnap.data().FilterSell || ["", 2500, 0, 0];
          setSelectedSex(filterSell[0] === "M" ? "Male" : filterSell[0] === "F" ? "Female" : filterSell[0] === "B" ? "Both" : "");
          setPrice(filterSell[1]);
          setTempPrice(filterSell[1]);
        }
      }
    };

    fetchFilters();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(slideLeftAnim, { toValue: 0, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.spring(slideRightAnim, { toValue: 0, friction: 5, tension: 50, useNativeDriver: true }),
      Animated.timing(parallaxAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideLeftAnim, slideRightAnim, parallaxAnim]);

  const handleApplyFilters = async () => {
    const userEmail = auth.currentUser?.email;
    if (!userEmail) return;

    const genderCode = selectedSex === "Male" ? "M" : selectedSex === "Female" ? "F" : selectedSex === "Both" ? "B" : "";
    const filterData = [genderCode, price, 12.9716, 77.5946];

    try {
      const settingsRef = doc(db, "Settings", userEmail);
      await setDoc(settingsRef, { FilterSell: filterData }, { merge: true });
    } catch (error) {
      console.error("Error saving filters:", error);
    }
  };

  const handleResetFilters = async () => {
    setSelectedSex("Both");
    setPrice(2500);
    setTempPrice(2500);
    setSelectedLocation(null);
    setCustomLocation("");

    const userEmail = auth.currentUser?.email;
    if (userEmail) {
      const filterData = ["B", 2500, 12.9716, 77.5946];
      try {
        const settingsRef = doc(db, "Settings", userEmail);
        await setDoc(settingsRef, { FilterSell: filterData }, { merge: true });
      } catch (error) {
        console.error("Error resetting filters:", error);
      }
    }
  };

  const debouncedSetTempPrice = useRef(debounce((value) => {
    const step = 100;
    const snappedValue = Math.round(value / step) * step;
    setTempPrice(snappedValue);
  }, 50)).current;

  const handlePriceChange = (value) => debouncedSetTempPrice(value);

  const handlePriceComplete = (value) => {
    const step = 100;
    const snappedValue = Math.round(value / step) * step;
    setPrice(snappedValue);
    setTempPrice(snappedValue);
  };

  const toggleDropdown = () => setDropdownVisible(!isDropdownVisible);

  const handleSelectCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };

      const apiKey = "YOUR_API_KEY";
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        const addressComponents = result.address_components;
        const currentPoint = addressComponents.find((comp) => comp.types.includes("sublocality"))?.long_name || "Current Point";
        const city = addressComponents.find((comp) => comp.types.includes("locality"))?.long_name || "";
        const state = addressComponents.find((comp) => comp.types.includes("administrative_area_level_1"))?.long_name || "";
        const country = addressComponents.find((comp) => comp.types.includes("country"))?.long_name || "";
        const formattedAddress = `${currentPoint}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}${country ? `, ${country}` : ""}`;
        
        setSelectedLocation(formattedAddress);
        setCustomLocation("");

        const userEmail = auth.currentUser?.email;
        if (userEmail) {
          const filterData = [
            selectedSex === "Male" ? "M" : selectedSex === "Female" ? "F" : selectedSex === "Both" ? "B" : "",
            price,
            coords.lat,
            coords.lng,
          ];
          const settingsRef = doc(db, "Settings", userEmail);
          await setDoc(settingsRef, { FilterSell: filterData }, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      setSelectedLocation("Error Fetching Location");
    }
    setDropdownVisible(false);
  };

  const handleEnterLocation = async () => {
    if (!customLocation.trim()) {
      alert("Please enter a valid location.");
      return;
    }

    try {
      const apiKey = "YOUR_API_KEY";
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(customLocation)}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        setSelectedLocation(customLocation);

        const userEmail = auth.currentUser?.email;
        if (userEmail) {
          const filterData = [
            selectedSex === "Male" ? "M" : selectedSex === "Female" ? "F" : selectedSex === "Both" ? "B" : "",
            price,
            lat,
            lng,
          ];
          const settingsRef = doc(db, "Settings", userEmail);
          await setDoc(settingsRef, { FilterSell: filterData }, { merge: true });
        }
      } else {
        alert("Could not find location. Please try again.");
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
      alert("Error converting location.");
    }
    setDropdownVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={["#e8f4f0", "#f5f5f5"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Animated.View style={{ transform: [{ translateX: slideLeftAnim }] }}>
            <LottieView source={filterAnimation} autoPlay loop style={styles.lottie} />
          </Animated.View>
          <Animated.View
            style={[
              styles.headerTitleContainer,
              { opacity: fadeAnim, transform: [{ translateX: slideRightAnim }] },
            ]}
          >
            <Text style={styles.headerTitle}>Filter</Text>
          </Animated.View>
        </View>

        {/* Location */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { rotateX: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: ["10deg", "0deg"] }) },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.locationContainer} onPress={toggleDropdown}>
            <Icon name="location-on" size={24} color="#255957" />
            <Text style={styles.locationText}>
              {selectedLocation || "Select Location"}
            </Text>
            <Icon name="arrow-drop-down" size={24} color="#255957" />
          </TouchableOpacity>
          {isDropdownVisible && (
            <View style={styles.dropdown}>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleSelectCurrentLocation}>
                <Icon name="my-location" size={20} color="#a8e6cf" />
                <Text style={styles.dropdownText}>Select Current Location</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.locationInput}
                placeholder="Enter your location"
                placeholderTextColor="#aaa"
                value={customLocation}
                onChangeText={setCustomLocation}
              />
              <TouchableOpacity style={styles.doneButton} onPress={handleEnterLocation}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Gender */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) },
                { rotateX: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: ["15deg", "0deg"] }) },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Gender</Text>
          <View style={styles.toggleWrapper}>
            {["Male", "Female", "Both"].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[styles.toggleBtn, selectedSex === gender && styles.toggleActive]}
                onPress={() => setSelectedSex(gender)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    selectedSex === gender && styles.toggleTextActive,
                  ]}
                >
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Price */}
        <Animated.View
          style={[
            styles.section,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: [150, 0] }) },
                { rotateX: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: ["20deg", "0deg"] }) },
              ],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Price</Text>
          <LinearGradient colors={["#e8f4f0", "#f5f5f5"]} style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={5000}
              value={tempPrice}
              onValueChange={handlePriceChange}
              onSlidingComplete={handlePriceComplete}
              step={100}
              minimumTrackTintColor="#255957"
              maximumTrackTintColor="rgba(37, 89, 87, 0.3)"
              thumbTintColor="#255957"
              thumbStyle={styles.thumb}
            />
            <View style={styles.priceLabels}>
              <Text style={styles.priceText}>$0</Text>
              <Text style={styles.priceText}>${Math.round(tempPrice)}</Text>
              <Text style={styles.priceText}>$5000</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Buttons */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] }) },
                { rotateX: parallaxAnim.interpolate({ inputRange: [0, 1], outputRange: ["25deg", "0deg"] }) },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
            <LinearGradient colors={["#a8e6cf", "#e8f4f0"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Filter</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetFilters}>
            <LinearGradient colors={["#255957", "#a8e6cf"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Reset</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  lottie: { width: 100, height: 100 },
  headerTitleContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Roboto", // Replace with your app's font if different
    color: "#255957",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  section: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#255957",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 230, 207, 0.3)",
    padding: 12,
    borderRadius: 20,
  },
  locationText: { fontSize: 16, color: "#255957", marginHorizontal: 10 },
  dropdown: {
    backgroundColor: "rgba(245, 245, 245, 0.9)",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  dropdownItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  dropdownText: { fontSize: 16, color: "#255957", marginLeft: 10 },
  locationInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#255957",
    marginVertical: 10,
  },
  doneButton: {
    backgroundColor: "#a8e6cf",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  doneButtonText: { color: "#255957", fontSize: 16, fontWeight: "bold" },
  toggleWrapper: {
    flexDirection: "row",
    backgroundColor: "rgba(168, 230, 207, 0.2)",
    borderRadius: 25,
    padding: 5,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 5,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  toggleActive: {
    backgroundColor: "#a8e6cf",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  toggleText: { fontSize: 16, color: "#255957", fontWeight: "600" },
  toggleTextActive: { color: "#255957", fontWeight: "bold" },
  sliderContainer: { padding: 15, borderRadius: 15 },
  slider: { width: "100%", height: 40 },
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#255957" },
  priceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  priceText: { fontSize: 14, color: "#255957", fontWeight: "600" },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  applyButton: { flex: 1, marginRight: 10 },
  resetButton: { flex: 1 },
  buttonGradient: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonText: { color: "#255957", fontSize: 18, fontWeight: "bold" },
});

export default FilterPage;