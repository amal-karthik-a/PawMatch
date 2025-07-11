import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { db } from "../../Config/FirebaseConfig";
import { collection, getDocs, query, orderBy, doc, getDoc, deleteDoc, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Card, Provider as PaperProvider } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";
import LottieView from 'lottie-react-native';
import EventAni from './../../assets/Animations/EventAni.json';
import Av1 from './../../assets/Animations/AV1.json';
import Dog1 from './../../assets/Animations/Dog1.json';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.email);
        console.log("Current user ID:", user.email);
      } else {
        console.log("No user is logged in.");
        setCurrentUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notificationsRef = collection(db, "Notifications");
        const q = query(notificationsRef, orderBy("time", "desc"));
        console.log("Fetching notifications from Firestore...");
        const querySnapshot = await getDocs(q);

        const fetchedNotifications = [];
        for (const docSnap of querySnapshot.docs) {
          const notificationData = { id: docSnap.id, ...docSnap.data() };
          console.log("Document data:", notificationData);

          if (notificationData.type !== "General" && 
              notificationData.type !== "GeneralMissing" && 
              notificationData.type !== "GeneralEvent" && 
              notificationData.userid !== currentUserId) {
            console.log(`Skipping notification ${notificationData.id} for user ${notificationData.userid}`);
            continue;
          }

          if (notificationData.type === "PrivatePetCreation" && notificationData.propic) {
            console.log(`Using propic for PrivatePetCreation notification ${notificationData.id}:`, notificationData.propic);
            notificationData.petProfilePic = notificationData.propic;
          }

          if (notificationData.type === "PrivatePetProfile" && notificationData.propic) {
            console.log(`Using propic for PrivatePetProfile notification ${notificationData.id}:`, notificationData.propic);
            notificationData.petProfilePic = notificationData.propic;
          }

          if (notificationData.type === "GeneralEvent" && notificationData.EventId) {
            console.log(`Fetching event details for EventID: ${notificationData.EventId}`);
            const eventDocRef = doc(db, "Events", notificationData.EventId);
            const eventDocSnap = await getDoc(eventDocRef);
            if (eventDocSnap.exists()) {
              const eventData = eventDocSnap.data();
              notificationData.eventDetails = {
                propic: eventData.PosterImg || "",
                eventName: eventData.Eventname || "Unknown Event",
                organizer: eventData.Company || "Unknown Organizer",
                regCloseDate: eventData.RegCloseDate || "N/A",
                cost: eventData.EntryFee || "Free",
              };
              console.log(`Event details for ${notificationData.EventId}:`, notificationData.eventDetails);

              const petsRef = collection(db, "Pets");
              const petQuery = query(petsRef, where("eventId", "==", notificationData.EventId));
              const petSnapshot = await getDocs(petQuery);
              if (!petSnapshot.empty) {
                const petData = petSnapshot.docs[0].data();
                notificationData.petProfilePic = petData.PetProfilePic || "";
                console.log(`Pet profile pic for EventID ${notificationData.EventId}:`, notificationData.petProfilePic);
              } else {
                console.log(`No pet found for EventID ${notificationData.EventId}`);
                notificationData.petProfilePic = "";
              }
            } else {
              console.log(`Event with ID ${notificationData.EventId} not found.`);
              notificationData.eventDetails = null;
              notificationData.petProfilePic = "";
            }
          }

          if (notificationData.type === "GeneralMissing" && notificationData.imageUrl) {
            console.log(`Using imageUrl for GeneralMissing notification ${notificationData.id}:`, notificationData.imageUrl);
            notificationData.petProfilePic = notificationData.imageUrl;
          }

          console.log(`Notification ${notificationData.id} dateofnotification:`, notificationData.dateofnotification);
          fetchedNotifications.push(notificationData);
        }

        console.log("Fetched notifications with event details and pet pics:", fetchedNotifications);
        setNotifications(fetchedNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error.message, error.code);
        Alert.alert("Error", `Failed to load notifications: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUserId]);

  const handleBackPress = () => {
    router.back();
  };

  const formatTime = (time) => {
    try {
      if (typeof time === "string" && time.match(/^\d{2}:\d{2}$/)) {
        return time;
      }
      let date;
      if (time && time.seconds !== undefined) {
        date = new Date(time.seconds * 1000);
      } else if (typeof time === "string") {
        date = new Date(time);
      } else {
        return "Invalid Time";
      }
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      console.error("Error formatting time:", error.message);
      return "Invalid Time";
    }
  };

  const formatDate = (date) => {
    try {
      if (!date) {
        console.warn("Date is null or undefined");
        return "Date Not Available";
      }

      if (date && typeof date === "object" && date.seconds !== undefined) {
        const dateObj = new Date(date.seconds * 1000);
        if (isNaN(dateObj.getTime())) {
          console.warn("Invalid Firestore Timestamp:", date);
          return "Invalid Date";
        }
        return dateObj.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
      }

      if (typeof date === "string") {
        const dateMatch = date.match(/^(\d{1,2})\s([A-Za-z]+)\s(\d{4})$/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
          if (monthIndex === -1) {
            console.warn("Invalid month name:", month);
            return "Invalid Date";
          }
          const parsedDate = new Date(year, monthIndex, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
          }
        }

        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
        }

        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split("-");
          const parsedDate = new Date(year, month - 1, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
          }
        }

        console.warn("Unrecognized date string format:", date);
        return "Invalid Date";
      }

      if (date instanceof Date) {
        if (!isNaN(date.getTime())) {
          return dateObj.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
        }
        console.warn("Invalid Date object:", date);
        return "Invalid Date";
      }

      console.warn("Unrecognized date format:", date);
      return "Invalid Date";
    } catch (error) {
      console.error("Error formatting date:", error.message);
      return "Invalid Date";
    }
  };

  const handleNotMe = (notificationId) => {
    Alert.alert("Not Me", `You clicked "Not Me" for notification ${notificationId}`);
  };

  const handleOk = (notificationId) => {
    Alert.alert("OK", `You clicked "OK" for notification ${notificationId}`);
  };

  const deleteNotification = async (notificationId) => {
    try {
      const notificationDocRef = doc(db, "Notifications", notificationId);
      await deleteDoc(notificationDocRef);
      console.log(`Notification ${notificationId} deleted successfully.`);
      setNotifications(notifications.filter(notification => notification.id !== notificationId));
      Alert.alert("Success", "Notification deleted successfully.");
    } catch (error) {
      console.error("Error deleting notification:", error.message);
      Alert.alert("Error", "Failed to delete notification.");
    }
  };

  const handleNotificationPress = (path) => {
    if (path) {
      console.log("Navigating to path:", path);
      router.push(path);
    } else {
      console.log("No path provided for navigation.");
      Alert.alert("Error", "No navigation path available for this notification.");
    }
  };

  const handleRegisterNow = (path) => {
    if (path) {
      console.log("Navigating to path:", path);
      router.push(path);
    } else {
      Alert.alert("Error", "No path available for registration.");
    }
  };

  const handleFoundPress = () => {
    router.push('/SettingsCon/AllmissingPAge');
  };

  const renderRightActions = (notification) => {
    if (notification.type !== "PrivateAuth" && notification.type !== "PrivatePetCreation" && notification.type !== "GeneralEvent" && notification.type !== "PrivatePetProfile") {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(notification.id)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back-outline" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications available.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollView}>
            {notifications.map((notification) => (
              <Swipeable
                key={notification.id}
                renderRightActions={() => renderRightActions(notification)}
              >
                <TouchableOpacity
                  onPress={() => (notification.type === "PrivatePetCreation" || notification.type === "GeneralEvent" || notification.type === "PrivatePetProfile") && handleNotificationPress(notification.path)}
                  disabled={notification.type !== "PrivatePetCreation" && notification.type !== "GeneralEvent" && notification.type !== "PrivatePetProfile"}
                >
                  <Card style={styles.card}>
                    <Card.Content style={styles.cardContent}>
                      {(notification.type === "PrivatePetCreation" || notification.type === "PrivatePetProfile") && (
                        <>
                          {notification.petProfilePic ? (
                            <Image
                              source={{ uri: notification.petProfilePic }}
                              style={styles.petProfilePic}
                              onError={(e) => console.log("Error loading petProfilePic:", e.nativeEvent.error)}
                            />
                          ) : (
                            <LottieView
                              style={styles.lottieAnimation}
                              source={Av1}
                              autoPlay
                              loop
                              speed={0.7}
                              onAnimationFailure={(error) => console.log("Animation Error:", error)}
                            />
                          )}
                        </>
                      )}
                      <View style={styles.textContainer}>
                        <View style={styles.notificationHeader}>
                          <View style={styles.headerWithIcon}>
                            <Text style={styles.type}>
                              {notification.type === "General"
                                ? "📢 General"
                                : notification.type === "PrivatePetCreation"
                                ? "🐾 New Pet"
                                : notification.type === "GeneralEvent"
                                ? "🎉 General Event"
                                : notification.type === "PrivateAuth"
                                ? "🔐 Account Security"
                                : notification.type === "PrivatePetProfile"
                                ? "🐕 Pet Profile"
                                : notification.type === "GeneralMissing"
                                ? "🚨 Missing Pet"
                                : "Unknown"}
                            </Text>
                          </View>
                          <Text style={styles.dateTime}>
                            {formatDate(notification.dateofnotification || notification.dateOfNotification)} at {formatTime(notification.time)}
                          </Text>
                        </View>
                        <View style={styles.contentRow}>
                          {notification.type !== "GeneralEvent" && notification.type !== "GeneralMissing" && (
                            <Text style={styles.message}>{notification.msg}</Text>
                          )}
                          {notification.type === "GeneralEvent" && (
                            <View style={styles.animationContainer}>
                              <LottieView
                                source={EventAni}
                                autoPlay
                                loop
                                style={styles.eventAnimation}
                              />
                            </View>
                          )}
                          {notification.type === "GeneralEvent" && notification.eventDetails && (
                            <View style={styles.eventPosterContainer}>
                              {notification.eventDetails.propic && (
                                <Image
                                  source={{ uri: notification.eventDetails.propic }}
                                  style={styles.eventPosterImage}
                                  onError={(e) => console.log("Error loading event poster image:", e.nativeEvent.error)}
                                />
                              )}
                              <View style={styles.eventDetailsText}>
                                <Text style={styles.eventDetailText}>
                                  {notification.eventDetails.eventName}
                                </Text>
                                <Text style={styles.eventSubDetailText}>
                                  {notification.eventDetails.organizer}
                                </Text>
                                <Text style={styles.eventSubDetailText}>
                                  Price: {notification.eventDetails.cost}
                                </Text>
                                <Text style={styles.eventSubDetailText}>
                                  Reg. Closes: {notification.eventDetails.regCloseDate}
                                </Text>
                                <TouchableOpacity
                                  style={styles.registerButton}
                                  onPress={() => handleRegisterNow(notification.path)}
                                >
                                  <Text style={styles.registerButtonText}>Register Now</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          {notification.type === "GeneralMissing" && (
                            <View style={styles.missingContainer}>
                              <View style={styles.missingPosterContainer}>
                                <View style={styles.missingHeader}>
                                  <LottieView
                                    source={Dog1}
                                    autoPlay
                                    loop
                                    style={styles.missingAnimation}
                                  />
                                  <Text style={styles.missingTitle}>
                                    {notification.name || "Unknown Pet"}
                                  </Text>
                                </View>
                                <View style={styles.missingDetails}>
                                  <Text style={styles.eventSubDetailText}>
                                    {notification.msg}
                                  </Text>
                                  <Text style={styles.eventSubDetailText}>
                                    Status: {notification.status || "Missing"}
                                  </Text>
                                  <Text style={styles.eventSubDetailText}>
                                    Date: {formatDate(notification.dateofnotification || notification.dateOfNotification)}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.missingRightContainer}>
                                {notification.imageUrl ? (
                                  <Image
                                    source={{ uri: notification.imageUrl }}
                                    style={styles.missingDogImage}
                                    resizeMode="cover"
                                    onError={(e) => console.log("Error loading missing dog image:", e.nativeEvent.error)}
                                  />
                                ) : (
                                  <Text style={styles.noImageText}>No Image Available</Text>
                                )}
                                <TouchableOpacity
                                  style={styles.foundButton}
                                  onPress={handleFoundPress}
                                >
                                  <Text style={styles.registerButtonText}>Found</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                        {notification.type === "PrivateAuth" && (
                          <View style={styles.buttonContainer}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.notMeButton]}
                              onPress={() => handleNotMe(notification.id)}
                            >
                              <Text style={styles.buttonText}>Not Me</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.okButton]}
                              onPress={() => handleOk(notification.id)}
                            >
                              <Text style={styles.buttonText}>OK</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              </Swipeable>
            ))}
          </ScrollView>
        )}
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e50",
    marginLeft: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  petProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  lottieAnimation: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  type: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  dateTime: {
    fontSize: 14,
    color: "#666",
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  message: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginBottom: 10,
    flex: 1,
  },
  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  eventAnimation: {
    width: 100,
    height: 100,
  },
  eventPosterContainer: {
    width: 200,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row", // Restored to "row" for GeneralEvent
    alignItems: "center",
  },
  eventPosterImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  eventDetailsText: {
    flex: 1,
  },
  eventDetailText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  eventSubDetailText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  registerButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginTop: 5,
    alignSelf: "flex-start",
  },
  foundButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 5,
    alignSelf: "flex-end",
  },
  registerButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 10,
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  notMeButton: {
    backgroundColor: "#FF6347",
  },
  okButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#FF6347",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 15,
    marginBottom: 15,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  missingContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  missingPosterContainer: {
    width: 200,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    padding: 10,
    flexDirection: "column", // Column layout for GeneralMissing
  },
  missingRightContainer: {
    flex: 0.4,
    alignItems: "flex-end",
    flexDirection: "column",
  },
  missingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  missingAnimation: {
    width: 50,
    height: 50,
  },
  missingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
  },
  missingDetails: {
    flex: 1,
  },
  missingDogImage: {
    width: 120,
    height: 150,
    borderRadius: 10,
    marginBottom: 5,
  },
  noImageText: {
    fontSize: 14,
    color: "#666",
  },
});

export default Notifications;