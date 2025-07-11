// ParticipantsPopup.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "./../../Config/FirebaseConfig";

const ParticipantsPopup = ({ visible, onClose, event }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!event?.id) return;

      try {
        // Fetch users who have this event in their Event_Reg array
        const usersQuery = query(
          collection(db, "users"),
          where("Event_Reg", "array-contains", event.id)
        );
        const querySnapshot = await getDocs(usersQuery);
        const participantsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().fname || "Unknown User", // Assuming 'fname' field for user's name
        }));

        setParticipants(participantsList);
      } catch (error) {
        console.error("Error fetching participants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [event]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.popupContainer}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Popup Content */}
          <View style={styles.popupContent}>
            {/* Left Side: Participants Info */}
            <View style={styles.leftSide}>
              <Text style={styles.totalParticipants}>
                Total Participants: {participants.length}
              </Text>
              <Text style={styles.sectionTitle}>Registered Members:</Text>
              {loading ? (
                <Text style={styles.loadingText}>Loading...</Text>
              ) : participants.length > 0 ? (
                <FlatList
                  data={participants}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Text style={styles.participantName}>{item.name}</Text>
                  )}
                />
              ) : (
                <Text style={styles.noParticipants}>No participants yet.</Text>
              )}
            </View>

            {/* Right Side: Event Poster and Details */}
            <View style={styles.rightSide}>
              <Image source={{ uri: event?.poster }} style={styles.poster} />
              <Text style={styles.eventName}>{event?.name}</Text>
              <Text style={styles.eventDate}>
                📅 {event?.startDate} - {event?.endDate}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    width: "90%",
    backgroundColor: "#f5f5f5",
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#255957",
    fontWeight: "bold",
  },
  popupContent: {
    flexDirection: "row",
    marginTop: 20,
  },
  leftSide: {
    flex: 1,
    paddingRight: 10,
  },
  rightSide: {
    flex: 1,
    alignItems: "center",
  },
  totalParticipants: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#255957",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#255957",
    marginBottom: 5,
  },
  participantName: {
    fontSize: 14,
    color: "#255957",
    marginBottom: 5,
  },
  noParticipants: {
    fontSize: 14,
    color: "#255957",
    fontStyle: "italic",
  },
  loadingText: {
    fontSize: 14,
    color: "#255957",
    fontStyle: "italic",
  },
  poster: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#255957",
    textAlign: "center",
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 14,
    color: "#255957",
    textAlign: "center",
  },
});

export default ParticipantsPopup;