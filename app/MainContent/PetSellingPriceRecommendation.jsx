import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Animated,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { db } from "../../Config/FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { PET_DATASET } from "../../assets/DataSet/PetData";
import axios from "axios";
import { Picker } from "@react-native-picker/picker"; // Updated import

const PetProfile = () => {
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState("Male");
  const [petSize, setPetSize] = useState("");
  const [petAge, setPetAge] = useState("");
  const [isAgeInMonths, setIsAgeInMonths] = useState(false);
  const [petWeight, setPetWeight] = useState("");
  const [healthStatus, setHealthStatus] = useState("Normal");
  const [vaccinationStatus, setVaccinationStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendedPrice, setRecommendedPrice] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const getPetfinderToken = async () => {
    try {
      const response = await axios.post(
        "https://api.petfinder.com/v2/oauth2/token",
        {
          grant_type: "client_credentials",
          client_id: "n1dr47mQaMRIHFW89thpNObF0wOKW1WjcMgvIO9jkrEKBbxKO4",
          client_secret: "Yladbt0saYWwt85bGe3uKkdikIH7Prz5aj9o0rwe",
        },
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return response.data.access_token;
    } catch (error) {
      return null;
    }
  };

  const getMarketPrice = async () => {
    try {
      const fbQuery = query(collection(db, "PetMatchingPair"), where("petBreed", "==", petBreed));
      const fbSnapshot = await getDocs(fbQuery);
      const fbPrices = fbSnapshot.docs.map((doc) => parseInt(doc.data().petPrice) || 0);

      const token = await getPetfinderToken();
      if (!token) return fbPrices.length ? fbPrices.reduce((a, b) => a + b) / fbPrices.length : null;

      const response = await axios.get("https://api.petfinder.com/v2/animals", {
        headers: { Authorization: `Bearer ${token}` },
        params: { type: "dog", breed: petBreed.trim(), status: "adoptable", limit: 20, location: "90210" },
      });

      const petfinderPrices = response.data.animals
        .filter((animal) => animal.breeds.primary === petBreed.trim())
        .map((animal) => {
          const ageFactor = animal.age === "Baby" ? 1.5 : animal.age === "Adult" ? 1 : 0.8;
          const basePrice = PET_DATASET.find((p) => p.Breed === petBreed.trim())?.Price || 10000;
          return basePrice * ageFactor;
        });

      const allPrices = [...fbPrices, ...petfinderPrices];
      return allPrices.length ? allPrices.reduce((a, b) => a + b) / allPrices.length : null;
    } catch (error) {
      return null;
    }
  };

  const getRecommendedPrice = async () => {
    if (!petBreed || !petAge || !petGender || !petWeight || !petSize || !healthStatus || !vaccinationStatus) {
      alert("Please fill in all fields to get a recommended price.");
      return;
    }

    setLoading(true);

    try {
      let basePrice;
      let avgWeight = 20;
      let commonHealthProblems = "";

      const ageNum = parseFloat(petAge) || 0;
      const ageRange = isAgeInMonths
        ? ageNum <= 6 ? "0-6 months" : ageNum <= 12 ? "6 months to 1 year" : "1-6 years"
        : ageNum <= 0.5 ? "0-6 months" : ageNum <= 1 ? "6 months to 1 year" : "1-6 years";

      if (Array.isArray(PET_DATASET)) {
        const petType = PET_DATASET.find((p) => p.Breed === petBreed)?.Type || "Dog";
        const matchedPet = PET_DATASET.find((pet) => pet.Breed === petBreed && pet.Age === ageRange && pet.Type === petType);

        if (matchedPet) {
          basePrice = matchedPet.Price;
          avgWeight = matchedPet.AvgWeight || 20;
          commonHealthProblems = matchedPet.CommonHealthProblems || "";
        } else {
          const breedMatches = PET_DATASET.filter((pet) => pet.Breed === petBreed && pet.Type === petType);
          if (breedMatches.length) {
            basePrice = breedMatches.reduce((sum, pet) => sum + pet.Price, 0) / breedMatches.length;
            avgWeight = breedMatches.reduce((sum, pet) => sum + (pet.AvgWeight || 20), 0) / breedMatches.length;
            commonHealthProblems = breedMatches[0]?.CommonHealthProblems || "";
          } else {
            const typeMatches = PET_DATASET.filter((pet) => pet.Type === petType);
            if (typeMatches.length) {
              basePrice = typeMatches.reduce((sum, pet) => sum + pet.Price, 0) / typeMatches.length;
              avgWeight = typeMatches.reduce((sum, pet) => sum + (pet.AvgWeight || 20), 0) / typeMatches.length;
              commonHealthProblems = typeMatches[0]?.CommonHealthProblems || "";
              const weightNum = parseFloat(petWeight) || 0;
              if (weightNum > avgWeight * 1.2) basePrice *= 1.25;
              else if (weightNum < avgWeight * 0.7) basePrice *= 0.75;
            } else {
              basePrice = petType === "Dog" ? 10000 : 5000;
            }
          }
        }
      } else {
        basePrice = 10000;
      }

      const marketPrice = await getMarketPrice();
      if (marketPrice) basePrice = (basePrice + marketPrice) / 2;

      if (isAgeInMonths) {
        if (ageNum <= 6) basePrice *= 1.4;
        else if (ageNum <= 12) basePrice *= 1.2;
      } else {
        if (ageNum <= 1) basePrice *= 1.3;
        else if (ageNum > 5) basePrice *= 0.7;
      }

      if (petGender === "Female") basePrice *= 1.15;

      if (healthStatus.toLowerCase().includes("excellent") && vaccinationStatus) basePrice *= 1.2;
      else if (commonHealthProblems && healthStatus.toLowerCase().includes(commonHealthProblems.toLowerCase())) basePrice *= 0.85;

      const weightNum = parseFloat(petWeight) || 0;
      if (weightNum > avgWeight * 1.3) basePrice *= 1.15;
      else if (weightNum < avgWeight * 0.7) basePrice *= 0.9;

      const sizeNum = parseFloat(petSize) || 0;
      if (sizeNum > 30) basePrice *= 1.1;

      const finalPrice = Math.round(basePrice / 100) * 100;
      setRecommendedPrice(finalPrice);
    } catch (error) {
      alert("Failed to calculate recommended price. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back-outline" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <Animated.View style={styles.card}>
            <Text style={styles.title}>Pet Price Factors</Text>
            <Text style={styles.label}>Price Factors</Text>
            <TextInput style={styles.input} placeholder="Pet breed" value={petBreed} onChangeText={setPetBreed} />
            <View style={styles.genderRow}>
              {["Male", "Female"].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[styles.genderBtn, petGender === gender && styles.genderBtnSelected]}
                  onPress={() => setPetGender(gender)}
                >
                  <Text style={[styles.genderText, petGender === gender && styles.genderTextSelected]}>
                    {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <TextInput
                style={styles.inputHalf}
                placeholder={`Age (${isAgeInMonths ? "months" : "years"})`}
                value={petAge}
                onChangeText={(text) => /^\d{0,2}(\.\d{0,1})?$/.test(text) && setPetAge(text)}
                keyboardType="numeric"
                maxLength={isAgeInMonths ? 2 : 2}
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>{isAgeInMonths ? "Months" : "Years"}</Text>
                <Switch
                  onValueChange={(value) => {
                    setIsAgeInMonths(value);
                    setPetAge("");
                  }}
                  value={isAgeInMonths}
                  trackColor={{ false: "#767577", true: "#4CAF50" }}
                  thumbColor="#f4f3f4"
                />
              </View>
            </View>
            <View style={styles.row}>
              <TextInput
                style={styles.inputHalf}
                placeholder="Weight (kg)"
                value={petWeight}
                onChangeText={setPetWeight}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.inputHalf}
                placeholder="Size (cm)"
                value={petSize}
                onChangeText={setPetSize}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={healthStatus}
                onValueChange={(itemValue) => setHealthStatus(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Good" value="Good" />
                <Picker.Item label="Healthy" value="Healthy" />
                <Picker.Item label="Active" value="Active" />
                <Picker.Item label="Inactive" value="Inactive" />
                <Picker.Item label="Normal" value="Normal" />
              </Picker>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Last vaccination (YYYY-MM-DD)"
              value={vaccinationStatus}
              onChangeText={setVaccinationStatus}
            />
            <TouchableOpacity style={styles.button} onPress={getRecommendedPrice}>
              <Text style={styles.buttonText}>Get Recommended Price</Text>
            </TouchableOpacity>
            {recommendedPrice !== null && (
              <Text style={styles.priceText}>Recommended Price: ₹{recommendedPrice.toLocaleString()}</Text>
            )}
          </Animated.View>
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    backgroundColor: "#f8f9fa",
    flex: 1,
  },
  loading: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    height: "100%" 
  },
  content: { 
    flex: 1,
    alignItems: "center",
    padding: 20,
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    width: "100%",
    marginBottom: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "700", 
    color: "#2c3e50", 
    textAlign: "center",
    marginBottom: 20,
  },
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 15, 
    padding: 20, 
    elevation: 6, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 8,
    width: "100%",
    maxWidth: 400,
  },
  label: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#4CAF50", 
    marginBottom: 10,
    textAlign: "center" 
  },
  input: { 
    backgroundColor: "#fff", 
    borderRadius: 10, 
    padding: 14, 
    fontSize: 16, 
    color: "#333", 
    borderWidth: 1, 
    borderColor: "#e0e6ed", 
    marginBottom: 15, 
    elevation: 2 
  },
  genderRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 15 
  },
  genderBtn: { 
    flex: 1, 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#e0e6ed", 
    alignItems: "center", 
    marginHorizontal: 5, 
    backgroundColor: "#fff", 
    elevation: 2 
  },
  genderBtnSelected: { 
    backgroundColor: "#4CAF50", 
    borderColor: "#4CAF50" 
  },
  genderText: { 
    fontSize: 16, 
    color: "#666" 
  },
  genderTextSelected: { 
    color: "#fff", 
    fontWeight: "600" 
  },
  row: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 15 
  },
  inputHalf: { 
    width: "48%", 
    backgroundColor: "#fff", 
    borderRadius: 10, 
    padding: 14, 
    fontSize: 16, 
    color: "#333", 
    borderWidth: 1, 
    borderColor: "#e0e6ed", 
    elevation: 2 
  },
  switchRow: { 
    width: "48%", 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  switchText: { 
    fontSize: 14, 
    color: "#333", 
    marginRight: 10 
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e6ed",
    marginBottom: 15,
    elevation: 2,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  button: { 
    backgroundColor: "#2196F3", 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: "center", 
    elevation: 3 
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "600" 
  },
  priceText: { 
    fontSize: 16, 
    color: "#4CAF50", 
    marginTop: 10, 
    textAlign: "center" 
  },
});

export default PetProfile;