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
  Image, 
  Animated,
  Alert
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import { db } from "../../Config/FirebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; 
import Av1 from './../../assets/Animations/AV1.json';
import LottieView from 'lottie-react-native';
import { s3, S3_BUCKET } from "../../aws-config";
import { getAuth } from "firebase/auth";

const EditPetProfile = () => {
  const { documentId } = useLocalSearchParams(); // Get documentId from navigation params
  const [petName, setPetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [petWeight, setPetWeight] = useState("");
  const [petId, setPetId] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState("Male");
  const [petType, setPetType] = useState("");
  const [petSize, setPetSize] = useState("");
  const [petAge, setPetAge] = useState("");
  const [description, setDescription] = useState("");
  const [petPrice, setPetPrice] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [vaccinationStatus, setVaccinationStatus] = useState("");
  const [titles, setTitles] = useState([]);
  const [colors, setColors] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState("");
  const [email, setEmail] = useState(null);
  const [petImage, setPetImage] = useState(null);
  const [purpose, setPurpose] = useState("Breed");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const titleInputRef = useRef(null);
  const colorInputRef = useRef(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Fetch the existing pet profile data
  useEffect(() => {
    const fetchPetProfile = async () => {
      try {
        if (!documentId) {
          Alert.alert("Error", "No document ID provided.");
          router.back();
          return;
        }

        const petDocRef = doc(db, "PetMatchingPair", documentId);
        const petDoc = await getDoc(petDocRef);

        if (!petDoc.exists()) {
          Alert.alert("Error", "Pet profile not found.");
          router.back();
          return;
        }

        const petData = petDoc.data();
        // Populate the form fields with fetched data
        setPetName(petData.petName || "");
        setPetId(petData.petID || "");
        setPetBreed(petData.petBreed || "");
        setPetGender(petData.petGender || "Male");
        setPetType(petData.petType || "");
        setPetSize(petData.petSize || "");
        setPetAge(petData.petAge || "");
        setDescription(petData.description || "");
        setPetPrice(petData.petPrice || "");
        setHealthStatus(petData.healthStatus || "");
        setVaccinationStatus(petData.vaccinationDateLast || "");
        setTitles(petData.titles || []);
        setColors(petData.colors || []);
        setPurpose(petData.purpose || "Breed");
        setPetImage(petData.propicpet || null);
        setPetWeight(petData.petWeight || "");
        setCity(petData.location?.city || "");
        setPincode(petData.location?.pincode || "");

        // Fetch user email from AsyncStorage
        try {
          const storedUserData = await AsyncStorage.getItem('userData');
          if (storedUserData) {
            const parsedData = JSON.parse(storedUserData);
            setEmail(parsedData.username);
          }
        } catch (error) {
          console.error("Error reading login data:", error);
        }
      } catch (error) {
        console.error("Error fetching pet profile:", error);
        Alert.alert("Error", "Failed to load pet profile.");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    fetchPetProfile();

    // Animation setup
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [documentId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need media library permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setPetImage(result.assets[0].uri);
    }
  };

  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const handleImageUpload = async () => {
    try {
      if (!petImage) {
        Alert.alert("Upload Error", "No image selected.");
        throw new Error("No image selected.");
      }

      // Check if the petImage is a new local URI (not an S3 URL)
      if (petImage.startsWith('file://') || petImage.startsWith('content://')) {
        const fileName = `pet-profile-${Date.now()}.jpg`;
        const fileType = "image/jpeg";
        const fileBlob = await uriToBlob(petImage);

        const params = {
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: fileBlob,
          ContentType: fileType,
        };

        return new Promise((resolve, reject) => {
          s3.upload(params, (err, data) => {
            if (err) {
              Alert.alert("Upload Failed", err.message);
              reject(err.message);
            } else {
              resolve(data.Location);
            }
          });
        });
      }
      return petImage; // Return existing S3 URL if no new image is selected
    } catch (error) {
      Alert.alert("Upload Error", error.message);
      throw error;
    }
  };

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "Location permission is required to proceed.");
        return null;
      }

      if (city && pincode) {
        const address = `${city}, ${pincode}`;
        const results = await Location.geocodeAsync(address);
        if (results.length > 0) {
          const { latitude, longitude } = results[0];
          return { latitude, longitude };
        } else {
          Alert.alert("Location Error", "Could not find location for the provided city and pincode.");
          return null;
        }
      } else {
        let location = await Location.getCurrentPositionAsync({});
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Location Error", "Failed to retrieve location.");
      return null;
    }
  };

  const handleSavePetProfile = async () => {
    if (
      !petName ||
      !petWeight ||
      !petBreed ||
      !petGender ||
      !petType ||
      !petSize ||
      !petAge ||
      !description ||
      !petPrice ||
      !healthStatus ||
      !vaccinationStatus || 
      !petId ||
      !purpose
    ) {
      alert('Please fill in all the fields.');
      return;
    }

    const vaccinationDate = vaccinationStatus.trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(vaccinationDate)) {
      alert('Invalid date format. Please enter the date in yyyy-mm-dd format.');
      return;
    }

    const vacDate = new Date(vaccinationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (vacDate > today) {
      alert('Vaccination date cannot be in the future.');
      return;
    }

    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    if (vacDate < threeMonthsAgo) {
      alert('Vaccination should be taken every 6 months. Your pet cannot be registered.');
      return;
    }

    try {
      setLoading(true);

      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No user is currently logged in.");
      }

      const location = await getLocation();
      if (!location) {
        throw new Error("Failed to retrieve location.");
      }

      let profileImageUrl = petImage;
      // Upload new image if a new one is selected
      if (petImage && (petImage.startsWith('file://') || petImage.startsWith('content://'))) {
        profileImageUrl = await handleImageUpload();
      }

      const petDocRef = doc(db, 'PetMatchingPair', documentId);
      await updateDoc(petDocRef, {
        userId: user.email,
        petID: petId,
        petName: petName,
        petWeight: petWeight,
        petBreed: petBreed,
        petGender: petGender,
        petType: petType,
        petSize: petSize,
        petAge: petAge,
        description: description,
        petPrice: petPrice,
        healthStatus: healthStatus,
        vaccinationDateLast: vaccinationStatus,
        titles: titles,
        colors: colors,
        purpose: purpose,
        propicpet: profileImageUrl,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          city: city || "",
          pincode: pincode || "",
        },
      });

      alert('Pet profile updated successfully!');
      // Navigate to PetImages page with documentId
      router.push({
        pathname: '/MainContent/Edit_Pet_images',
        params: { documentId: documentId },
      });
    } catch (error) {
      console.error("Error updating pet profile: ", error);
      alert('Failed to update pet profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addTitle = () => {
    if (newTitle.trim()) {
      setTitles([...titles, newTitle.trim()]);
      setNewTitle("");
      titleInputRef.current?.focus();
    }
  };

  const addColor = () => {
    if (newColor.trim()) {
      setColors([...colors, newColor.trim()]);
      setNewColor("");
      colorInputRef.current?.focus();
    }
  };

  const removeTitle = (index) => {
    setTitles(titles.filter((_, i) => i !== index));
  };
  
  const removeColor = (index) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.scrollContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back-outline" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Pet Profile</Text>
          </View>
          
          <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              {petImage ? (
                <Image source={{ uri: petImage }} style={styles.petImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <LottieView
                    style={styles.lottieAnimation}
                    source={Av1}
                    autoPlay
                    loop
                    speed={0.7}
                    onAnimationFailure={(error) => console.log("Animation Error:", error)}
                  />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.label}>Pet Info</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter pet name"
              value={petName}
              onChangeText={setPetName}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Pet License ID"
              value={petId}
              onChangeText={setPetId}
              placeholderTextColor="#999"
              editable={false} // Prevent editing of petID
            />
            <View style={styles.genderContainer}>
              {["Male", "Female"].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderButton,
                    petGender === gender && styles.genderButtonSelected,
                  ]}
                  onPress={() => setPetGender(gender)}
                >
                  <Text style={[styles.genderText, petGender === gender && styles.genderTextSelected]}>
                    {gender}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Pet Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pet type"
                  value={petType}
                  onChangeText={setPetType}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pet breed"
                  value={petBreed}
                  onChangeText={setPetBreed}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pet size"
                  value={petSize}
                  onChangeText={setPetSize}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pet weight"
                  value={petWeight}
                  onChangeText={setPetWeight}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.inputWrapperSmall}>
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  value={petAge}
                  onChangeText={(text) => /^\d{0,2}$/.test(text) && setPetAge(text)}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputWrapperLarge}>
                <TextInput
                  style={styles.input}
                  placeholder="Breed Price"
                  value={petPrice}
                  onChangeText={(text) => {
                    const num = parseInt(text, 10);
                    if (!isNaN(num) && num <= 9000000) setPetPrice(text);
                    else if (text === "") setPetPrice("");
                  }}
                  keyboardType="numeric"
                  maxLength={7}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
            <Text style={styles.label}>Purpose</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={purpose}
                onValueChange={(itemValue) => setPurpose(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Breed" value="Breed" />
                <Picker.Item label="Sell" value="Sell" />
              </Picker>
            </View>
          </Animated.View>

          <Animated.View style={styles.card}>
            <Text style={styles.label}>Health Status</Text>
            <TextInput
              style={styles.input}
              placeholder="Pet health status"
              value={healthStatus}
              onChangeText={setHealthStatus}
              placeholderTextColor="#999"
            />
            <Text style={styles.label}>Last Vaccination</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={vaccinationStatus}
              onChangeText={setVaccinationStatus}
              placeholderTextColor="#999"
            />
          </Animated.View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter pet description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={6}
            placeholderTextColor="#999"
          />

          <Animated.View style={styles.card}>
            <Text style={styles.label}>Certified Titles</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                ref={titleInputRef}
                style={[styles.input, styles.tagInput]}
                placeholder="Mention Certified Titles"
                value={newTitle}
                onChangeText={setNewTitle}
                onSubmitEditing={addTitle}
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.addButton} onPress={addTitle}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagsWrapper}>
              {titles.map((item, index) => (
                <View key={index} style={styles.colorTag}>
                  <Text style={styles.tagText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeTitle(index)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>    

            <Text style={styles.label}>Pet Colors</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                ref={colorInputRef}
                style={[styles.input, styles.tagInput]}
                placeholder="Add color"
                value={newColor}
                onChangeText={setNewColor}
                onSubmitEditing={addColor}
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.addButton} onPress={addColor}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.tagsWrapper}>
              {colors.map((item, index) => (
                <View key={index} style={styles.colorTag}>
                  <Text style={styles.tagText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeColor(index)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={styles.card}>
            <Text style={styles.label}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city"
              value={city}
              onChangeText={setCity}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Enter pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </Animated.View>

          <TouchableOpacity style={styles.nextButton} onPress={handleSavePetProfile}>
            <Text style={styles.nextButtonText}>Save</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    backgroundColor: '#f8f9fa',
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#E74C3C",
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 14,
    color: "#333",
    marginRight: 5,
  },
  colorTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    marginTop: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  input: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e6ed',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e6ed',
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#fff',
    elevation: 2,
  },
  genderButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  genderText: {
    fontSize: 16,
    color: '#666',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  petImage: {
    width: 130,
    height: 130,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  imagePlaceholder: {
    borderRadius: 70,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e6ed',
    borderStyle: 'dashed',
    elevation: 2,
  },
  imageText: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  lottieAnimation: {
    width: 130,
    height: 130,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputWrapper: {
    width: '48%',
  },
  inputWrapperSmall: {
    width: '30%',
  },
  inputWrapperLarge: {
    width: '65%',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tagInput: {
    flex: 1,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e6ed',
    elevation: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
});

export default EditPetProfile;