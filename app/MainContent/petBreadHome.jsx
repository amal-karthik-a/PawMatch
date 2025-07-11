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
  Share,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Swiper from "react-native-swiper";
import BottomNavigation from "./BottomNavigation";
import { router } from "expo-router";
import { db } from "./../../Config/FirebaseConfig";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PetPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortedPets, setSortedPets] = useState([]);
  const [adImages, setAdImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const userLocation = { latitude: 10.2070900577326342, longitude: 76.417107013505745 };

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const currentUserId = currentUser ? currentUser.email : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const adCollection = collection(db, "Advertisement");
        const adSnapshot = await getDocs(adCollection);
        const adUrls = adSnapshot.docs
          .map((doc) => doc.data().poster)
          .filter((url) => url);
        setAdImages(adUrls);

        const petCollection = collection(db, "PetMatchingPair");
        const q = query(petCollection, where("purpose", "==", "Breed"), where("Active", "==", "Y"));

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
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, currentUserId]);

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

  const handleChat = async (pet) => {
    if (!pet || !auth.currentUser) {
      setError("Please log in to chat.");
      return;
    }

    try {
      const petOwnerId = pet.userId;
      const currentUserId = auth.currentUser.email;

      console.log("Step 1: Pet owner userId fetched", petOwnerId);
      console.log("Step 1: Current userId fetched", currentUserId);

      if (currentUserId === petOwnerId) {
        console.log("Step 2: Current user is pet owner");
        Alert.alert("Info", "User cannot chat with oneself");
        return;
      }

      const currentUserDocRef = doc(db, "ChatUsers", currentUserId);
      console.log("Step 3: Current user ChatUsers doc reference", currentUserDocRef.path);

      const currentUserDoc = await getDoc(currentUserDocRef);
      console.log("Step 4: Current user ChatUsers doc fetched", currentUserDoc.exists() ? currentUserDoc.data() : "Not found");

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
        }
      }

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
            lastMessage: null,
            clearedBy: {
              [currentUserId]: false,
              [petOwnerId]: false,
            },
          },
        });
        console.log("Step 11: Created new chat document with metadata");
      }

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

  const handleAIIconPress = () => {
    router.push("/MainContent/ChooseAI");
  };

  const filteredPets = sortedPets.filter((pet) =>
    pet.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.fixedSection}>
          <View style={styles.fixedHeader}>
            <View style={styles.header}>
              <View style={styles.leftIcons}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => router.push('/MainContent/Mypet')}
                >
                  <Icon name="pets" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => router.push('/MainContent/Communitypage')}
                >
                  <Icon name="group" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.rightIcons}>
                {/* New Reels/Posts Icon */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => router.push('/MainContent/Petagram')}
                >
                  <Icon name="movie" size={24} color="#fff" />
                </TouchableOpacity>
                {/* Notification Icon */}
                <TouchableOpacity
                  style={styles.notificationBtn}
                  onPress={() => router.push('/MainContent/MainNotificationWindow')}
                >
                  <Icon name="notifications" size={24} color="#fff" />
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>2</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchSection}>
              <View style={styles.searchWrapper}>
                <Icon name="search" size={22} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search pets or locations..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.filterBtn} onPress={() => router.push("/MainContent/Filter")}>
                  <Icon name="tune" size={22} color="#28a745" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {adImages.length > 0 && (
            <View style={styles.bannerContainer}>
              <Swiper
                style={styles.swiper}
                autoplay={true}
                autoplayTimeout={4}
                showsPagination={true}
                paginationStyle={styles.pagination}
                dot={<View style={styles.dot} />}
                activeDot={<View style={styles.activeDot} />}
              >
                {adImages.map((image, index) => (
                  <View key={index} style={styles.slide}>
                    <Image source={{ uri: image }} style={styles.bannerImage} />
                  </View>
                ))}
              </Swiper>
            </View>
          )}
        </View>

        <View style={styles.scrollSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Looking for Matching Pair</Text>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#28a745" />
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
              <Text style={styles.noPetsText}>No pets found with purpose "Breed".</Text>
            )}
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={styles.floatingAIButton} 
          onPress={handleAIIconPress}
        >
          <Icon name="smart-toy" size={30} color="#fff" />
        </TouchableOpacity>

        <BottomNavigation initialActiveIcon="home" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { flex: 1 },
  fixedSection: {
    backgroundColor: "#f8f9fa",
  },
  fixedHeader: {
    backgroundColor: "rgba(127, 204, 153, 0.47)",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    zIndex: 100,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  leftIcons: {
    flexDirection: "row",
    gap: 15,
  },
  rightIcons: {
    flexDirection: "row",
    gap: 15,
  },
  iconBtn: {
    backgroundColor: "#28a745",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBtn: {
    backgroundColor: "#28a745",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#dc3545",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  searchSection: { paddingHorizontal: 20, paddingBottom: 15, paddingTop: 0 },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f3f5",
    borderRadius: 15,
    paddingHorizontal: 12,
    elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 16, color: "#333" },
  filterBtn: { padding: 12 },
  searchIcon: { marginLeft: 5 },
  bannerContainer: {
    marginHorizontal: 20,
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    marginBottom: 15,
    marginTop: 10,
  },
  swiper: { height: "100%" },
  slide: { flex: 1 },
  bannerImage: { width: "100%", height: "100%", borderRadius: 20 },
  dot: { backgroundColor: "rgba(255,255,255,0.3)", width: 8, height: 8, borderRadius: 4, margin: 4 },
  activeDot: { backgroundColor: "#fff", width: 12, height: 12, borderRadius: 6, margin: 4 },
  pagination: { bottom: 15 },
  scrollSection: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "rgba(109, 197, 156, 0.83)",
    textAlign: "left",
    marginLeft: 19,
  },
  petCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 3,
    position: "relative",
  },
  imageContainer: { position: "relative", width: "100%", height: 320 },
  petImage: { width: "100%", height: "100%", borderRadius: 20, resizeMode: "cover" },
  placeholderImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#666",
    fontSize: 16,
  },
  overlayContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 15,
    justifyContent: "space-between",
  },
  iconContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  iconButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    padding: 10,
  },
  petInfo: { alignSelf: "flex-start" },
  petName: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 5 },
  petLocation: {
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.84)",
    marginBottom: 5,
    backgroundColor: 'rgba(2, 2, 2, 0.23)',
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  petDistance: { fontSize: 13, color: "#fff", fontWeight: 600, fontStyle: "italic" },
  noPetsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
    color: "#dc3545",
    marginTop: 20,
  },
  floatingAIButton: {
    position: 'absolute',
    bottom: 105,
    right: 20,
    backgroundColor: '#28a745',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    zIndex: 1000,
  },
});

export default PetPage;