import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  StatusBar,
  Alert,
  Animated,
} from "react-native";
import { getDocs, collection, where, query, updateDoc, arrayUnion, arrayRemove, doc, getDoc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import { db, auth } from "./../../Config/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { SafeAreaView } from "react-native-safe-area-context"; // Import SafeAreaView
import ParticipantsPopup from "./ParticipantsPopup";
import PaymentPage from "./PaymentPage";
import BottomNavigationBar from "./../MainContent/BottomNavigation";

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [paymentPopupVisible, setPaymentPopupVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fadeAnims = useRef(events.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log("User authenticated:", currentUser.email);
        try {
          const userDocRef = doc(db, "users", currentUser.email);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const eventReg = userData.Event_Reg || [];
            console.log("Registered events:", eventReg);
            setRegisteredEvents(eventReg);
          } else {
            console.log("No user document found for:", currentUser.email);
            setRegisteredEvents([]);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          Alert.alert("Error", "Failed to load user data");
          setRegisteredEvents([]);
        }
      } else {
        console.log("No user authenticated");
        setRegisteredEvents([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) {
        console.log("User not authenticated yet, skipping fetchEvents");
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, "Events"), where("Active", "==", "Y"));
        const querySnapshot = await getDocs(q);
        const fetchedEvents = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().Eventname,
          tagline: doc.data().Tagline,
          poster: doc.data().PosterImg,
          organizer: doc.data().Company,
          startDate: doc.data().DateStart,
          endDate: doc.data().DateEnd,
          timestart: doc.data().TimeStart,
          timeend: doc.data().TimeEnd,
          location: doc.data().Location,
          prizeMoney: doc.data().Pricepool,
          registrationFee: doc.data().EntryFee,
          description: doc.data().Description || "No description available.",
          regCloseDate: doc.data().RegCloseDate || "N/A",
          userEmail: user.email,
        }));

        console.log("Fetched events:", fetchedEvents.map(event => event.id));
        setEvents(fetchedEvents);

        fadeAnims.current = fetchedEvents.map(() => new Animated.Value(0));
        fetchedEvents.forEach((_, index) => {
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.parallel([
              Animated.timing(fadeAnims.current[index], {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.spring(fadeAnims.current[index], {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
              }),
            ]),
          ]).start();
        });
      } catch (error) {
        console.error("Error fetching events:", error);
        Alert.alert("Error", "Failed to load events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleRegisterEvent = async (eventId) => {
    if (!user) {
      Alert.alert("Error", "Please log in to register for events");
      console.log("No user logged in");
      return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) {
      console.log("Event not found:", eventId);
      return;
    }

    const isRegistered = registeredEvents.includes(eventId);

    if (!isRegistered && event.registrationFee !== "Free") {
      console.log("Opening payment popup for event:", eventId);
      setSelectedEvent(event);
      setPaymentPopupVisible(true);
      return;
    }

    await processRegistration(eventId);
  };

  const processRegistration = async (eventId, transactionDetails = null) => {
    try {
      const userDocRef = doc(db, "users", user.email);
      const userDocSnap = await getDoc(userDocRef);
      const event = events.find(e => e.id === eventId);

      if (!userDocSnap.exists()) {
        Alert.alert("Error", "User profile not found");
        console.log("User document not found");
        return;
      }

      const isRegistered = registeredEvents.includes(eventId);

      if (transactionDetails) {
        console.log("Saving transaction details:", transactionDetails);
        const transactionDocRef = doc(db, "Payment", transactionDetails.transactionId);
        await setDoc(transactionDocRef, {
          transactionId: transactionDetails.transactionId,
          eventId: transactionDetails.eventId,
          price: transactionDetails.price,
          status: transactionDetails.status,
          userEmail: user.email,
          dateOfPayment: transactionDetails.dateOfPayment,
          timeOfPayment: transactionDetails.timeOfPayment,
        });

        if (transactionDetails.status === "success") {
          await updateDoc(userDocRef, {
            Event_Reg: arrayUnion(eventId),
          });
          setRegisteredEvents([...registeredEvents, eventId]);
          Alert.alert("Success", "Registered successfully");
          console.log("Registered for event:", eventId);
        }
      } else if (isRegistered) {
        Alert.alert(
          "Unregister Event",
          "Are you sure you want to unregister from this event?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes",
              onPress: async () => {
                try {
                  if (event.registrationFee !== "Free") {
                    const refundTransactionId = `REFUND_${eventId}_${Date.now()}`;
                    await setDoc(doc(db, "Payment", refundTransactionId), {
                      transactionId: refundTransactionId,
                      eventId: eventId,
                      price: event.registrationFee,
                      status: "pending",
                      userEmail: user.email,
                      dateOfPayment: new Date().toISOString().split('T')[0],
                      timeOfPayment: new Date().toTimeString().split(' ')[0],
                      type: "refund"
                    });
                    console.log("New refund request created:", refundTransactionId);
                  }

                  await updateDoc(userDocRef, {
                    Event_Reg: arrayRemove(eventId),
                  });
                  setRegisteredEvents(registeredEvents.filter((id) => id !== eventId));
                  Alert.alert("Success", "Unregistered successfully" + 
                    (event.registrationFee !== "Free" ? " Refund request submitted" : ""));
                  console.log("Unregistered from event:", eventId);
                } catch (error) {
                  console.error("Unregister error:", error);
                  Alert.alert("Error", "Failed to unregister");
                }
              },
            },
          ]
        );
      } else {
        await updateDoc(userDocRef, {
          Event_Reg: arrayUnion(eventId),
        });
        setRegisteredEvents([...registeredEvents, eventId]);
        Alert.alert("Success", "Registered successfully");
        console.log("Registered for event:", eventId);
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", `Registration failed: ${error.message}`);
    }
  };

  const handlePaymentComplete = (success, transactionDetails) => {
    console.log("Payment complete callback - Success:", success, "Transaction Details:", transactionDetails);
    setPaymentPopupVisible(false);
    if (selectedEvent) {
      processRegistration(selectedEvent.id, transactionDetails);
    } else {
      console.log("No selected event, skipping registration");
    }
    setSelectedEvent(null);
  };

  const openParticipantsPopup = (event) => {
    setSelectedEvent(event);
    setPopupVisible(true);
  };

  const isRegistrationClosed = (regCloseDate, startDate) => {
    if (regCloseDate === "N/A") return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const closeDate = new Date(regCloseDate);
    closeDate.setHours(0, 0, 0, 0);

    const eventStartDate = new Date(startDate);
    eventStartDate.setHours(0, 0, 0, 0);

    const isClosed = today > closeDate || closeDate >= eventStartDate;
    console.log(`Event registration status - Closed: ${isClosed}, Today: ${today}, Close: ${closeDate}, Start: ${eventStartDate}`);
    return isClosed;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events</Text>
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
            <Text style={styles.menuText}>☰</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={menuVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setMenuVisible(false)}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Events/NewEvent')}>
              <Text style={styles.menuItemText}>+ Add New Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Events/MyEvents')}>
              <Text style={styles.menuItemText}>📅 My Events</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Events/RegisteredEvents')}>
              <Text style={styles.menuItemText}>📌 Registered Events</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <ParticipantsPopup
          visible={popupVisible}
          onClose={() => setPopupVisible(false)}
          event={selectedEvent}
        />

        <Modal visible={paymentPopupVisible} transparent animationType="slide">
          <PaymentPage 
            event={selectedEvent} 
            onClose={handlePaymentComplete}
          />
        </Modal>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search Events..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#68AFB3" style={{ marginTop: 20 }} />
        ) : filteredEvents.length === 0 ? (
          <Text style={styles.noEventsText}>No events found.</Text>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const isRegistered = registeredEvents.includes(item.id);
              const registrationClosed = isRegistrationClosed(item.regCloseDate, item.startDate);

              return (
                <Animated.View
                  style={{
                    opacity: fadeAnims.current[index],
                    transform: [
                      { scale: fadeAnims.current[index] },
                      { translateY: fadeAnims.current[index].interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                    ],
                  }}
                >
                  <View style={styles.eventCard}>
                    <Image
                      source={{ uri: item.poster || "https://via.placeholder.com/200" }}
                      style={styles.poster}
                    />
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventName}>{item.name}</Text>
                      {item.tagline && <Text style={styles.tagline}>{item.tagline}</Text>}
                      <Text style={styles.description}>{item.description}</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.organizer}>By: {item.organizer}</Text>
                        <Text style={styles.dateTime}>📅 {item.startDate} - {item.endDate}</Text>
                        <Text style={styles.dateTime}>🕒 {item.timestart} - {item.timeend}</Text>
                        <Text style={styles.regClose}>📅 Registration Closes: {item.regCloseDate}</Text>
                        <Text style={styles.location}>📍 {item.location}</Text>
                        {item.prizeMoney !== "N/A" && (
                          <Text style={styles.prize}>🏆 Prize: {item.prizeMoney}</Text>
                        )}
                        <Text style={[styles.fee, item.registrationFee === "Free" && styles.freeEntry]}>
                          💰 {item.registrationFee === "Free" ? "Free Entry" : `Fee: ${item.registrationFee}`}
                        </Text>
                      </View>
                      <View style={styles.buttonContainer}>
                        {registrationClosed ? (
                          <TouchableOpacity style={styles.registerButton} disabled={true}>
                            <View style={styles.registerButtonDisabled}>
                              <Text style={styles.registerButtonTextDisabled}>
                                Registration Closed
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : isRegistered ? (
                          <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => handleRegisterEvent(item.id)}
                          >
                            <View style={styles.unregisterButton}>
                              <Text style={styles.registerButtonText}>Unregister</Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => handleRegisterEvent(item.id)}
                          >
                            <View style={styles.registerButtonGradient}>
                              <Text style={styles.registerButtonText}>Register Now</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.viewParticipantsButton}
                          onPress={() => openParticipantsPopup(item)}
                        >
                          <View style={styles.viewParticipantsButtonGradient}>
                            <Text style={styles.viewParticipantsButtonText}>View Participants</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              );
            }}
            contentContainerStyle={styles.flatListContent}
          />
        )}
        <BottomNavigationBar name="event" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9', // Matches the container background
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  searchRow: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchBar: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#68AFB3',
  },
  menuButton: {
    padding: 10,
    backgroundColor: '#68AFB3',
    borderRadius: 5,
    marginLeft: 10,
  },
  menuText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuContainer: {
    position: 'absolute',
    right: 15,
    top: 60,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    elevation: 2,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#68AFB3',
  },
  flatListContent: {
    paddingHorizontal: 15,
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    overflow: 'hidden',
  },
  poster: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  eventDetails: {
    padding: 15,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  infoRow: {
    marginBottom: 10,
  },
  organizer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  regClose: {
    fontSize: 14,
    color: '#ff4444',
    fontWeight: 'bold',
    marginBottom: 3,
  },
  location: {
    fontSize: 14,
    color: '#68AFB3',
    fontWeight: 'bold',
    marginTop: 3,
  },
  prize: {
    fontSize: 14,
    color: '#DAA520',
    fontWeight: 'bold',
    marginTop: 5,
  },
  fee: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 5,
  },
  freeEntry: {
    color: '#68AFB3',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    alignItems: 'center',
  },
  registerButton: {
    width: '48%',
    marginRight: 5,
  },
  viewParticipantsButton: {
    width: '48%',
    marginLeft: 5,
  },
  registerButtonGradient: {
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#68AFB3',
  },
  unregisterButton: {
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#ff4444',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButtonDisabled: {
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#d3d3d3',
  },
  registerButtonTextDisabled: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewParticipantsButtonGradient: {
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#68AFB3',
  },
  viewParticipantsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noEventsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default EventList;