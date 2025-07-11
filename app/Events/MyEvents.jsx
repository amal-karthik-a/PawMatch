import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, FlatList, Image, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Modal, StatusBar
} from "react-native";
import { getDocs, collection, where, query } from "firebase/firestore";
import { router } from "expo-router";
import { db, auth } from "./../../Config/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return; // Ensure user is available before fetching data

    const fetchEvents = async () => {
      try {
        const q = query(
          collection(db, "Events"), 
          where("userid", "==", user.email) // Fetch only current user's events
        );
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
          active: doc.data().Active, // Get Active field
        }));
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [user]);

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar hidden={false} />
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search Events..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(true)}>
          <Text style={styles.menuText}>☰</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setMenuVisible(false)} />
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Events/NewEvent')}>
            <Text style={styles.menuItemText}>+ Add New Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.replace('/Events/MyEvents')}>
            <Text style={styles.menuItemText}>📅 My Events</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.replace('/Events/RegisteredEvents')}>
            <Text style={styles.menuItemText}>📌 Registered Events</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.eventCard, { backgroundColor: item.active === "Y" ? "#d4edda" : "#f8d7da" }]}>
              <Image source={{ uri: item.poster }} style={styles.poster} />
              <View style={styles.eventDetails}>
                <Text style={styles.eventName}>{item.name}</Text>
                {item.tagline && <Text style={styles.tagline}>{item.tagline}</Text>}
                <Text style={styles.organizer}>By: {item.organizer}</Text>
                <Text style={styles.dateTime}>📅 {item.startDate} - {item.endDate}</Text>
                <Text style={styles.dateTime}>🕒 {item.timestart} - {item.timeend}</Text>
                <Text style={styles.location}>📍 {item.location}</Text>
                {item.prizeMoney !== "N/A" && (
                  <Text style={styles.prize}>🏆 Prize: {item.prizeMoney}</Text>
                )}
                <Text style={[styles.fee, item.registrationFee === "Free" && styles.freeEntry]}>
                  💰 {item.registrationFee === "Free" ? "Free Entry" : `Fee: ${item.registrationFee}`}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f9f9f9" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  searchBar: { flex: 1, padding: 12, borderWidth: 1, borderRadius: 8, backgroundColor: "#fff", fontSize: 16 },
  menuButton: { padding: 10, marginLeft: 10, backgroundColor: "#007BFF", borderRadius: 5 },
  menuText: { color: "white", fontSize: 20, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  menuContainer: { position: "absolute", right: 15, top: 80, backgroundColor: "white", borderRadius: 8, paddingVertical: 10, elevation: 5 },
  menuItem: { paddingVertical: 10, paddingHorizontal: 20 },
  menuItemText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  flatListContent: { paddingBottom: 20 },
  eventCard: { flexDirection: "row", padding: 15, borderWidth: 1.5, borderRadius: 10, marginBottom: 10, backgroundColor: "#fff", shadowColor: "rgba(31, 29, 29, 0.54)", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 , borderColor: 'rgba(31, 26, 26, 0.06)'},
  poster: { width: 139, height: 100, borderRadius: 10, marginRight: 15 },
  eventDetails: { flex: 1 },
  eventName: { fontSize: 18, fontWeight: "bold", marginBottom: 2, color: "#333" },
  tagline: { fontSize: 14, fontStyle: "italic", color: "#555", marginBottom: 5 },
  organizer: { fontSize: 14, color: "#555", marginBottom: 5 },
  dateTime: { fontSize: 14, color: "#666" },
  location: { fontSize: 14, color: "#007BFF", fontWeight: "bold", marginTop: 3 },
  prize: { fontSize: 14, color: "#DAA520", fontWeight: "bold", marginTop: 5 },
  fee: { fontSize: 14, fontWeight: "bold", color: "#E63946", marginTop: 5 },
  freeEntry: { color: "#28A745" },
});

export default EventList;
