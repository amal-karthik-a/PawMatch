import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Image,
  TextInput,
  ActivityIndicator,
  Share,
  StatusBar,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import BottomNavigation from "./BottomNavigation";
import { router } from "expo-router";
import { db } from "./../../Config/FirebaseConfig";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PetSaleHomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortedPets, setSortedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const userLocation = { latitude: 10.2070900577326342, longitude: 76.417107013505745 };

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUserId = currentUser ? currentUser.email : null;

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        setLoading(true);
        setError(null);

        const petCollection = collection(db, "PetMatchingPair");
        const q = query(petCollection, where("purpose", "==", "Sell"), where("Active", "==", "Y"));

        const petSnapshot = await getDocs(q);

        const petList = petSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sorted = petList
          .map((pet) => {
            if (!pet.location || !pet.location.latitude || !pet.location.longitude) {
              console.warn(`Pet ${pet.id} has invalid location data:`, pet.location);
              return { ...pet, distance: Infinity };
            }
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              pet.location.latitude,
              pet.location.longitude
            );
            return { ...pet, distance };
          })
          .sort((a, b) => a.distance - b.distance);

        setSortedPets(sorted);
        
      } catch (err) {
        console.error("Error fetching pet data:", err);
        setError("Failed to load pet profiles. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, currentUserId]);

  const handleChat = async (pet) => {
    if (!pet || !auth.currentUser) {
      setError("Please log in to chat.");
      return;
    }

    try {
      // Step 1: Fetch the userId of the corresponding card (pet owner) and current user
      const petOwnerId = pet.userId;
      const currentUserId = auth.currentUser.email;

      console.log("Step 1: Pet owner userId fetched", petOwnerId);
      console.log("Step 1: Current userId fetched", currentUserId);

      // Step 2: Check if current user is the same as pet owner
      if (currentUserId === petOwnerId) {
        console.log("Step 2: Current user is pet owner");
        Alert.alert("Info", "User cannot chat with oneself");
        return;
      }

      // Step 3: Check ChatUsers collection for current user
      const currentUserDocRef = doc(db, "ChatUsers", currentUserId);
      console.log("Step 3: Current user ChatUsers doc reference", currentUserDocRef.path);

      const currentUserDoc = await getDoc(currentUserDocRef);
      console.log("Step 4: Current user ChatUsers doc fetched", currentUserDoc.exists() ? currentUserDoc.data() : "Not found");

      // Step 4: Handle ChatUsers collection (unchanged)
      if (!currentUserDoc.exists()) {
        console.log("Step 5: ChatUsers doc doesn't exist, creating new");
        await setDoc(currentUserDocRef, {
          otherAcc: [petOwnerId],
          createdAt: new Date().toISOString(),
        });
        console.log("Step 6: New ChatUsers doc created with otherAcc", [petOwnerId]);
      } else {
        const currentUserData = currentUserDoc.data();
        const otherAcc = currentUserData.otherAcc || [];
        console.log("Step 5: Current otherAcc array", otherAcc);

        if (!otherAcc.includes(petOwnerId)) {
          console.log("Step 6: petOwnerId not found in otherAcc, adding it");
          await updateDoc(currentUserDocRef, {
            otherAcc: arrayUnion(petOwnerId),
          });
          console.log("Step 7: petOwnerId added to otherAcc", petOwnerId);
        } else {
          console.log("Step 6: petOwnerId already exists in otherAcc, proceeding to navigation");
          router.push('/MainContent/AllChatListPage');
          return;
        }
      }

      // Step 5: Handle new Chats collection structure
      const sortedUserPair = [currentUserId, petOwnerId].sort().join('_');
      const chatDocRef = doc(db, "Chats", sortedUserPair);
      console.log("Step 8: Chat document reference", chatDocRef.path);

      const chatDoc = await getDoc(chatDocRef);
      console.log("Step 9: Chat doc fetched", chatDoc.exists() ? "Exists" : "Not found");

      if (!chatDoc.exists()) {
        console.log("Step 10: Chat doc doesn't exist, creating new structure");
        await setDoc(chatDocRef, {
          metadata: {
            participants: [currentUserId, petOwnerId],
            lastMessage: null, // Will be updated when a message is sent
            clearedBy: {
              [currentUserId]: false,
              [petOwnerId]: false,
            },
          },
        });
        console.log("Step 11: Created new chat document with metadata");
      }

      // Step 6: Navigate to AllChatListPage
      console.log("Step 12: Navigating to AllChatListPage");
      router.push('/MainContent/AllChatListPage');

    } catch (error) {
      console.error("Error in handleChat:", error);
      setError("Failed to initiate chat. Please try again.");
    }
  };

  const handleUserProfile = (userId) => {
    router.push(`/MainContent/Ownerpage?userId=${userId}`);
  };

  const handlePetPress = (pet) => {
    router.push({
      pathname: "/MainContent/PetProfileScreen",
      params: { pet: JSON.stringify(pet) },
    });
  };

  const handleShare = async (pet) => {
    try {
      await Share.share({
        message: `Check out this pet for sale! ${pet.address || "Location not specified"} - ${pet.propicpet || "No image available"}`,
        url: pet.propicpet || "",
        title: `Pet Profile - ${pet.petName || "Unnamed Pet"}`,
      });
    } catch (error) {
      console.error("Error sharing pet:", error);
    }
  };

  const filteredPets = sortedPets.filter((pet) =>
    pet.address ? pet.address.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#006400" barStyle="light-content" />
      <View style={styles.container}>
        
        <View style={styles.fixedHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Pet Marketplace</Text>
            <View style={styles.searchSection}>
              <View style={styles.searchWrapper}>
                <Icon name="search" size={22} color="#006400" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search pets or locations..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={() => router.push("/MainContent/Filter")} style={styles.filterBtn}>
                  <Icon name="tune" size={22} color="#006400" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#006400" />
              <Text style={styles.loadingText}>Loading pet profiles...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : filteredPets.length > 0 ? (
            filteredPets.map((pet) => (
              <Animated.View key={pet.id} style={[styles.petCard, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={() => handlePetPress(pet)} style={styles.imageContainer}>
                  {pet.propicpet ? (
                    <Image source={{ uri: pet.propicpet }} style={styles.petImage} />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Text style={styles.placeholderText}>No Image Available</Text>
                    </View>
                  )}
                  <View style={styles.overlayContent}>
                    <View style={styles.iconContainer}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleUserProfile(pet.userId)}
                      >
                        <Icon name="person" size={24} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleChat(pet)}
                      >
                        <Icon name="chat" size={24} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleShare(pet)}
                      >
                        <Icon name="share" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.petInfo}>
                      <Text style={styles.petName}>{pet.petName || "Unnamed Pet"}</Text>
                      <Text style={styles.petLocation}>{pet.address || "Location not specified"}</Text>
                      {pet.distance !== Infinity && (
                        <Text style={styles.petDistance}>{pet.distance.toFixed(2)} km away</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <Text style={styles.noResultsText}>No pets found matching your search.</Text>
          )}
        </Animated.ScrollView>

        <BottomNavigation initialActiveIcon="sell" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  fixedHeader: {
    paddingTop: StatusBar.currentHeight || 20,
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    backgroundColor: '#E8F5E9',
  },
  headerContent: { alignItems: "center" },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "rgba(57, 165, 106, 0.88)",
    marginBottom: 10,
    textShadowColor: '0px 0px 5px white',
    paddingHorizontal: 10,
  },
  searchSection: { width: "100%" },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    paddingHorizontal: 15,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, color: "#006400" },
  filterBtn: { padding: 10 },
  scrollContent: { paddingTop: 20, paddingBottom: 80, paddingHorizontal: 15 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { fontSize: 16, color: "#006400", marginTop: 10 },
  errorText: { fontSize: 16, color: "#FF6347", textAlign: "center", padding: 20 },
  petCard: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    backgroundColor: "#fff",
  },
  imageContainer: { position: "relative", width: "100%", height: 320 },
  petImage: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#d3d3d3",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "rgba(95, 179, 151, 0.84)", fontSize: 14, fontWeight: "bold" },
  overlayContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 15,
    justifyContent: "space-between",
  },
  iconContainer: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  iconButton: {
    backgroundColor: "rgba(0, 0, 0, 0.11)",
    padding: 8,
    borderRadius: 20,
    elevation: 2,
  },
  petInfo: { alignSelf: "flex-start" },
  petName: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 5 },
  petLocation: {
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.77)",
    marginBottom: 5,
    backgroundColor: 'rgba(2, 2, 2, 0.23)',
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  petDistance: { fontSize: 13, color: "#fff", fontWeight: 600, fontStyle: "italic" },
  noResultsText: { fontSize: 16, color: "#006400", textAlign: "center", padding: 20 },
});

export default PetSaleHomePage;