import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { db, auth } from "./../../Config/FirebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const OwnerProfile = () => {
  const { userId } = useLocalSearchParams();
  const [userProfile, setUserProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching userId:", userId);

        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const userData = {
            userId: userId,
            fname: data.fname || "",
            lname: data.lname || "",
            gender: data.gender || "",
            phno: data.phno || "",
            propic: data.propic || "https://via.placeholder.com/150",
            address: data.address || { city: "Unknown", country: "Unknown" },
            dob: data.dob || { day: "N/A", month: "N/A", year: "N/A" },
            Event_Reg: data.Event_Reg || [],
            passwrd: data.passwrd || "N/A",
          };
          setUserProfile(userData);

          if (userData.Event_Reg.length > 0) {
            const eventsQuery = query(
              collection(db, "Events"),
              where("__name__", "in", userData.Event_Reg)
            );
            const eventsSnapshot = await getDocs(eventsQuery);
            const eventsData = eventsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setEvents(eventsData);
          }
        } else {
          setError("User not found.");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user profile. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const handleChat = async () => {
    if (!userProfile || !auth.currentUser) {
      setError("Please log in to chat.");
      return;
    }

    try {
      // Step 1: Fetch the userId of the profile owner and current user
      const ownerId = userProfile.userId;
      const currentUserId = auth.currentUser.email;

      console.log("Step 1: Profile owner userId fetched", ownerId);
      console.log("Step 1: Current userId fetched", currentUserId);

      // Step 2: Check if current user is the same as profile owner
      if (currentUserId === ownerId) {
        console.log("Step 2: Current user is profile owner");
        Alert.alert("Info", "User cannot chat with oneself");
        return;
      }

      // Step 3: Check ChatUsers collection for current user
      const currentUserDocRef = doc(db, "ChatUsers", currentUserId);
      console.log("Step 3: Current user ChatUsers doc reference", currentUserDocRef.path);

      const currentUserDoc = await getDoc(currentUserDocRef);
      console.log("Step 4: Current user ChatUsers doc fetched", currentUserDoc.exists() ? currentUserDoc.data() : "Not found");

      // Step 4: Handle ChatUsers collection
      if (!currentUserDoc.exists()) {
        console.log("Step 5: ChatUsers doc doesn't exist, creating new");
        await setDoc(currentUserDocRef, {
          otherAcc: [ownerId],
          createdAt: new Date().toISOString(),
        });
        console.log("Step 6: New ChatUsers doc created with otherAcc", [ownerId]);
      } else {
        const currentUserData = currentUserDoc.data();
        const otherAcc = currentUserData.otherAcc || [];
        console.log("Step 5: Current otherAcc array", otherAcc);

        if (!otherAcc.includes(ownerId)) {
          console.log("Step 6: ownerId not found in otherAcc, adding it");
          await updateDoc(currentUserDocRef, {
            otherAcc: arrayUnion(ownerId),
          });
          console.log("Step 7: ownerId added to otherAcc", ownerId);
        } else {
          console.log("Step 6: ownerId already exists in otherAcc, proceeding to navigation");
          router.push('/MainContent/AllChatListPage');
          return;
        }
      }

      // Step 5: Handle new Chats collection structure
      const sortedUserPair = [currentUserId, ownerId].sort().join('_');
      const chatDocRef = doc(db, "Chats", sortedUserPair);
      console.log("Step 8: Chat document reference", chatDocRef.path);

      const chatDoc = await getDoc(chatDocRef);
      console.log("Step 9: Chat doc fetched", chatDoc.exists() ? "Exists" : "Not found");

      if (!chatDoc.exists()) {
        console.log("Step 10: Chat doc doesn't exist, creating new structure");
        await setDoc(chatDocRef, {
          metadata: {
            participants: [currentUserId, ownerId],
            lastMessage: null, // Will be updated when a message is sent
            clearedBy: {
              [currentUserId]: false,
              [ownerId]: false,
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="rgba(127, 204, 153, 0.47)" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No profile data available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Image Section */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: userProfile.propic }} style={styles.headerImage} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom Card Section */}
      <View style={styles.bottomCard}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* User Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>User Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{`${userProfile.fname} ${userProfile.lname}`}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gender:</Text>
                <Text style={styles.infoValue}>{userProfile.gender}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth:</Text>
                <Text style={styles.infoValue}>{`${userProfile.dob.day}/${userProfile.dob.month}/${userProfile.dob.year}`}</Text>
              </View>
            </View>
          </View>

          {/* Contact Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Contact Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{userProfile.phno}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{`${userProfile.address.city}, ${userProfile.address.country}`}</Text>
              </View>
            </View>
          </View>

          {/* Events Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Registered Events</Text>
            {events.length > 0 ? (
              <View style={styles.eventContainer}>
                {events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <Image source={{ uri: event.PosterImg }} style={styles.eventPoster} />
                    <View style={styles.eventDetails}>
                      <View style={styles.eventRow}>
                        <Text style={styles.eventLabel}>Name:</Text>
                        <Text style={styles.eventInfo}>{event.Eventname}</Text>
                      </View>
                      <View style={styles.eventRow}>
                        <Text style={styles.eventLabel}>Organization:</Text>
                        <Text style={styles.eventInfo}>{event.Company}</Text>
                      </View>
                      <View style={styles.eventRow}>
                        <Text style={styles.eventLabel}>Date:</Text>
                        <Text style={styles.eventInfo}>{event.DateStart}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.infoCard}>
                <Text style={styles.infoValue}>No events registered.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F5",
  },
  imageContainer: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.45,
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.43)",
    padding: 12,
    borderRadius: 25,
  },
  chatButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.43)",
    padding: 12,
    borderRadius: 25,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    boxShadow: '0px 0px 9px rgba(1, 1, 1, 0.39)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: "rgba(61, 134, 94, 0.86)",
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    textAlign: "right",
  },
  eventContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  eventCard: {
    width: "48%",
    borderRadius: 15,
    marginBottom: 15,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  eventPoster: {
    width: "100%",
    height: 120,
  },
  eventDetails: {
    padding: 10,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  eventLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  eventInfo: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6F5",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(61, 134, 94, 0.86)",
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6F5",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6347",
  },
});

export default OwnerProfile;