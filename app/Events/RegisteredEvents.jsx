import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
} from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "./../../Config/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { LinearGradient } from "expo-linear-gradient";

const RegisteredEvents = () => {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Animation refs for each card
  const fadeAnims = useRef(registeredEvents.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchRegisteredEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch the user's Event_Reg array
        const userDocRef = doc(db, "users", user.email);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          console.log("User document does not exist.");
          setRegisteredEvents([]);
          setLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        const eventIds = userData.Event_Reg || [];

        if (eventIds.length === 0) {
          console.log("No event IDs found in Event_Reg.");
          setRegisteredEvents([]);
          setLoading(false);
          return;
        }

        // Fetch each event individually using the document ID
        const fetchedEvents = [];
        for (const eventId of eventIds) {
          const eventDocRef = doc(db, "Events", eventId);
          const eventDocSnap = await getDoc(eventDocRef);
          if (eventDocSnap.exists()) {
            const eventData = eventDocSnap.data();
            fetchedEvents.push({
              id: eventDocSnap.id,
              name: eventData.Eventname,
              tagline: eventData.Tagline,
              organizer: eventData.Company,
              startDate: eventData.DateStart,
              endDate: eventData.DateEnd,
              timestart: eventData.TimeStart,
              timeend: eventData.TimeEnd,
              location: eventData.Location,
              prizeMoney: eventData.Pricepool,
              registrationFee: eventData.EntryFee,
              regCloseDate: eventData.RegCloseDate || "N/A",
            });
          } else {
            console.log(`Event with ID ${eventId} not found.`);
          }
        }

        setRegisteredEvents(fetchedEvents);

        // Initialize animations for each card
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
        console.error("Error fetching registered events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegisteredEvents();
  }, [user]);

  return (
    <LinearGradient colors={["#e8f4f0", "#f5f5f5"]} style={styles.container}>
      <StatusBar hidden={false} barStyle="dark-content" backgroundColor="#e8f4f0" />
      <Text style={styles.header}>Registered Events</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#255957" style={{ marginTop: 20 }} />
      ) : registeredEvents.length === 0 ? (
        <Text style={styles.noEventsText}>No registered events found.</Text>
      ) : (
        <FlatList
          data={registeredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
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
                <Text style={styles.eventName}>{item.name}</Text>
                {item.tagline && <Text style={styles.tagline}>{item.tagline}</Text>}
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
            </Animated.View>
          )}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#255957",
    marginBottom: 15,
    textAlign: "center",
  },
  flatListContent: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  eventName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#255957",
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#255957",
    marginBottom: 5,
  },
  organizer: {
    fontSize: 14,
    color: "#255957",
    marginBottom: 5,
  },
  dateTime: {
    fontSize: 14,
    color: "#255957",
    marginBottom: 3,
  },
  regClose: {
    fontSize: 14,
    color: "#E63946",
    fontWeight: "bold",
    marginBottom: 3,
  },
  location: {
    fontSize: 14,
    color: "#a8e6cf",
    fontWeight: "bold",
    marginTop: 3,
  },
  prize: {
    fontSize: 14,
    color: "#DAA520",
    fontWeight: "bold",
    marginTop: 5,
  },
  fee: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#E63946",
    marginTop: 5,
  },
  freeEntry: {
    color: "#a8e6cf",
  },
  noEventsText: {
    fontSize: 16,
    color: "#255957",
    textAlign: "center",
    marginTop: 20,
  },
});

export default RegisteredEvents;