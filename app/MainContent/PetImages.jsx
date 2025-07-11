import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";
import { Card } from "react-native-paper";
import { db } from "./../../Config/FirebaseConfig";
import { doc, updateDoc, deleteDoc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
import { s3, S3_BUCKET } from "./../../aws-config";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const PetImages = ({ navigation }) => {
  const [images, setImages] = useState([]);
  const [licenseDoc, setLicenseDoc] = useState(null);
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [animationY] = useState(new Animated.Value(0));
  const [bandAnimation] = useState(new Animated.Value(300));
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userId, setUserId] = useState("");

  const params = useLocalSearchParams();
  const { documentId, petId, propic, purpose, petName, petBreed } = params;

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.email);
        console.log("Current user email:", user.email);
      } else {
        console.log("No user is logged in.");
        setUserId("");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log("Received Document ID:", documentId);
    console.log("Received Pet ID:", petId);

    const fetchPetDetails = async () => {
      if (!documentId) {
        console.error("No document ID provided.");
        return;
      }

      try {
        const petDocRef = doc(db, "PetMatchingPair", documentId);
        const petDoc = await getDoc(petDocRef);
        if (petDoc.exists()) {
          const petData = petDoc.data();
        } else {
          console.error("Pet document does not exist.");
        }
      } catch (error) {
        console.error("Error fetching pet details:", error.message);
      }
    };

    fetchPetDetails();

    Animated.loop(
      Animated.sequence([
        Animated.timing(animationY, {
          toValue: -10,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animationY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [documentId]);

  useEffect(() => {
    Animated.timing(bandAnimation, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setMarker({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Storage permission is needed to upload images.");
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImages([...images, ...result.assets.map((asset) => asset.uri)]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const pickLicenseDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result && result.assets && result.assets.length > 0) {
        setLicenseDoc({
          uri: result.assets[0].uri,
          name: result.assets[0].name || result.assets[0].uri.split("/").pop(),
        });
      }
    } catch (error) {
      Alert.alert("Error", "Unable to pick license document.");
    }
  };

  const removeLicenseDoc = () => setLicenseDoc(null);

  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const handleImageUpload = async (uri) => {
    try {
      if (!uri) {
        Alert.alert("Upload Error", "No image selected.");
        throw new Error("No image selected.");
      }

      const fileName = `pet-image-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
      const fileType = "image/jpeg";
      const fileBlob = await uriToBlob(uri);

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
    } catch (error) {
      Alert.alert("Upload Error", error.message);
      throw error;
    }
  };

  const uploadImagesToS3 = async () => {
    const uploadedImageUrls = [];
    for (const imageUri of images) {
      if (imageUri.startsWith("file://")) {
        try {
          const url = await handleImageUpload(imageUri);
          uploadedImageUrls.push(url);
        } catch (error) {
          console.error("Image upload failed:", error);
        }
      } else {
        uploadedImageUrls.push(imageUri);
      }
    }
    return uploadedImageUrls;
  };

  const uploadDocumentToS3 = async (doc) => {
    if (!doc || !doc.uri.startsWith("file://")) return doc?.uri;

    try {
      const fileName = `pet-document-${Date.now()}-${doc.name || Math.random().toString(36).substring(2, 15)}.pdf`;
      const fileBlob = await uriToBlob(doc.uri);
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: fileBlob,
        ContentType: "application/pdf",
      };

      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) reject(err);
          else resolve(data.Location);
        });
      });
    } catch (error) {
      throw new Error(`Failed to upload document: ${error}`);
    }
  };

  const handleLocationSelect = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    console.log("Selected Latitude:", latitude, "Longitude:", longitude);

    setRegion((prevRegion) => ({ ...prevRegion, latitude, longitude }));
    setMarker({ latitude, longitude });

    try {
      let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addressResponse.length > 0) {
        const loc = addressResponse[0];
        setCity(loc.city || "");
        setState(loc.region || "");
        setCountry(loc.country || "");
        setAddress(loc.street || loc.name || "");
        setPincode(loc.postalCode || "");
        setSelectedAddress(`${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ""}, ${loc.country}`);
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      console.log("Current Latitude:", latitude, "Longitude:", longitude);

      let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addressResponse.length > 0) {
        const loc = addressResponse[0];
        setCity(loc.city || "");
        setState(loc.region || "");
        setCountry(loc.country || "");
        setAddress(loc.street || loc.name || "");
        setPincode(loc.postalCode || "");
        setSelectedAddress(`${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ""}, ${loc.country}`);
      }

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setMarker({ latitude, longitude });
    } catch (error) {
      Alert.alert("Error", "Failed to get current location.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    try {
      setLoading(true);
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setMarker({ latitude, longitude });

        const addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addressResponse.length > 0) {
          const loc = addressResponse[0];
          setCity(loc.city || "");
          setState(loc.region || "");
          setCountry(loc.country || "");
          setAddress(loc.street || loc.name || "");
          setPincode(loc.postalCode || "");
          setSelectedAddress(`${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ""}, ${loc.country}`);
        }
      } else {
        Alert.alert("Location Not Found", "No results found for the search query.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to search location.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = async () => {
    if (!documentId) {
      Alert.alert("Error", "No document ID provided.");
      router.back();
      return;
    }

    try {
      const petDocRef = doc(db, "PetMatchingPair", documentId);
      await deleteDoc(petDocRef);
      console.log(`Document with ID ${documentId} deleted from PetMatchingPair collection.`);
      Alert.alert("Success", "Pet profile deleted successfully.");
    } catch (error) {
      console.error("Error deleting document:", error);
      Alert.alert("Error", "Failed to delete pet profile.");
    } finally {
      router.back();
    }
  };

  const handleNextStep = async () => {
    if (!images.length || !marker) {
      Alert.alert("Error", "Images and location are mandatory!");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not logged in. Please log in to continue.");
      return;
    }

    setLoading(true);
    try {
      const imageUrls = await uploadImagesToS3();
      if (!imageUrls.length) {
        throw new Error("No images were uploaded successfully.");
      }

      const licenseUrl = licenseDoc ? await uploadDocumentToS3(licenseDoc) : null;

      const petDocRef = doc(db, "PetMatchingPair", documentId);
      await updateDoc(petDocRef, {
        PetImages: imageUrls,
        PetLicense: licenseUrl,
        location: {
          latitude: marker.latitude,
          longitude: marker.longitude,
          address: selectedAddress,
        },
      });

      const currentDate = new Date();
      const notificationData = {
        type: "PrivatePetCreation",
        dateofnotification: currentDate.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }),
        time: Timestamp.fromDate(currentDate),
        userid: userId,
        propic: propic,
        msg: `Pet profile for ${petName} (${petBreed}) has been successfully created.`,
        path: '/MainContent/Mypet',
        notName: `New Pet for (${purpose})`,
      };

      await addDoc(collection(db, "Notifications"), notificationData);

      Alert.alert("Success", "Pet profile created successfully!");
      router.replace('/MainContent/petBreadHome');
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to upload files or update Firestore.");
      console.error("Error in handleNextStep:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={false} />

      <Ionicons
        name="arrow-back-outline"
        color="black"
        size={23}
        onPress={handleBackPress}
        style={styles.closeIcon}
      />

      <View style={styles.headerContainer}>
        <Animated.View style={[styles.lottieContainer, { transform: [{ translateY: animationY }] }]}>
          <LottieView
            source={require("./../../assets/Animations/wag.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
        </Animated.View>
        <Animated.View style={[styles.bandContainer, { transform: [{ translateX: bandAnimation }] }]}>
          <Text style={styles.title}>Create Pet Profile</Text>
        </Animated.View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>Pet Images</Text>
            <Text style={styles.description}>Select images of your pet from your gallery.</Text>
            <View style={styles.imageContainer}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: img }} style={styles.image} />
                  <TouchableOpacity style={styles.deleteIcon} onPress={() => removeImage(index)}>
                    <Ionicons name="close-circle" size={24} color="gray" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addImage} onPress={pickImage}>
                <Ionicons name="add" size={30} color="#68afb3" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>License (PDF)</Text>
            <Text style={styles.description}>Upload your pet's license document.</Text>
            <TouchableOpacity style={styles.addImage} onPress={pickLicenseDoc}>
              <Ionicons name="document-text-outline" size={25} color="#68afb3" />
            </TouchableOpacity>
            {licenseDoc && (
              <View style={styles.documentWrapper}>
                <Text style={styles.documentText}>{licenseDoc.name}</Text>
                <TouchableOpacity onPress={removeLicenseDoc}>
                  <Ionicons name="close-circle" size={24} color="gray" />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Add Your Location</Text>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search location..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleLocationSearch}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleLocationSearch}
              >
                <Ionicons name="search" size={20} color="#68afb3" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#68afb3" style={styles.loader} />
            ) : (
              region && (
                <MapView
                  style={styles.map}
                  region={region}
                  onPress={handleLocationSelect}
                  showsUserLocation
                >
                  {marker && <Marker coordinate={marker} />}
                </MapView>
              )
            )}

            <View style={styles.locationContainer}>
              <TouchableOpacity style={styles.locationIcon} onPress={getCurrentLocation}>
                <Ionicons name="location-outline" size={24} color="#68afb3" />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Address"
                value={address}
                onChangeText={setAddress}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={styles.input}
                placeholder="Pincode"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
              />
              <View style={styles.stateCountryContainer}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Country"
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>

            {selectedAddress ? <Text style={styles.address}>{selectedAddress}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleNextStep}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Uploading..." : "Next Step"}
              </Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    width: "100%",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    justifyContent: "space-between",
  },
  lottieContainer: {
    width: "30%",
    height: 150,
    borderRadius: 75,
    overflow: "hidden",
    borderColor: "#fff",
    borderWidth: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  bandContainer: {
    backgroundColor: "#68afb3",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 20,
    alignSelf: "flex-start",
  },
  lottie: {
    width: 250,
    height: 250,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 1,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeIcon: {
    alignSelf: "flex-start",
  },
  card: {
    borderRadius: 15,
    elevation: 4,
    paddingVertical: 10,
    backgroundColor: "#e6e6e6",
    marginBottom: 20,
    width: "100%",
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  label: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: "gray",
    marginBottom: 15,
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  imageWrapper: {
    position: "relative",
    margin: 5,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    margin: 5,
  },
  deleteIcon: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "white",
    borderRadius: 12,
  },
  addImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#68afb3",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  documentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    backgroundColor: "rgba(61, 58, 58, 0.1)",
    padding: 10,
    borderRadius: 10,
  },
  documentText: {
    fontSize: 14,
    color: "black",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: "#68afb3",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  searchButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#68afb3",
  },
  map: {
    width: "100%",
    height: 250,
    marginBottom: 10,
    borderRadius: 10,
  },
  locationContainer: {
    marginTop: 15,
  },
  locationIcon: {
    alignSelf: "flex-end",
    marginBottom: 10,
    padding: 5,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#68afb3",
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  stateCountryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  address: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
    textAlign: "center",
  },
  loader: {
    marginVertical: 20,
    alignSelf: "center",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#68afb3",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: "#a1a1a1",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default PetImages;