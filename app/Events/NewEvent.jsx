import { collection, addDoc } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db } from "../../Config/FirebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { s3, S3_BUCKET } from "../../aws-config";

// Enhanced date validation
const isValidDate = (date) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;

  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(year, month - 1, day);
  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() + 1 === month &&
    parsedDate.getDate() === day &&
    !isNaN(parsedDate)
  );
};

// Time validation
const isValidTime = (time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);

// Compare times on the same day
const compareTimes = (startTime, endTime) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  if (startHour < endHour) return true;
  if (startHour === endHour) return startMinute < endMinute;
  return false;
};

const getCurrentDateTime = () => {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].slice(0, 5);
  return { date, time };
};

const AddEventScreen = () => {
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState("");
  const [eventData, setEventData] = useState({
    Eventname: "",
    Tagline: "",
    Company: "",
    DateStart: "",
    DateEnd: "",
    TimeStart: "",
    TimeEnd: "",
    Location: "",
    Pricepool: "",
    EntryFee: "",
    RegCloseDate: "",
    Active: "Y",
    userid: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setEventData((prevData) => ({ ...prevData, userid: user?.email || null }));
    });
    return unsubscribe;
  }, []);

  const handleInputChange = (key, value) => {
    setEventData((prevData) => ({ ...prevData, [key]: value }));
  };

  const fetchCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied.");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    let reverseGeocode = await Location.reverseGeocodeAsync(location.coords);

    if (reverseGeocode.length > 0) {
      let address = reverseGeocode[0];
      let formattedAddress = `${address.name ? address.name + ", " : ""}${
        address.district ? address.district + ", " : ""
      }${address.city}, ${address.region}, ${address.country}`;
      setEventData((prevData) => ({ ...prevData, Location: formattedAddress }));
    } else {
      alert("Unable to fetch location.");
    }
  };

  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const handleImageUpload = async () => {
    try {
      if (!profileImage) {
        Alert.alert("Upload Error", "No image selected.");
        throw new Error("No image selected.");
      }

      const fileName = `event-poster-${Date.now()}.jpg`;
      const fileType = "image/jpeg";
      const fileBlob = await uriToBlob(profileImage);

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access media library was denied.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const selectedUri = result.assets[0].uri;
      setProfileImage(selectedUri);
    }
  };

  const addEvent = async () => {
    const { Eventname, Company, DateStart, DateEnd, TimeStart, TimeEnd, Location, RegCloseDate, EntryFee } = eventData;

    // Required field validation
    if (!Eventname || !Company || !DateStart || !TimeStart || !Location || !RegCloseDate) {
      alert("Please fill all required fields.");
      return;
    }

    // Validate date formats
    if (!isValidDate(DateStart)) {
      alert("Invalid start date format. Use YYYY-MM-DD.");
      return;
    }
    if (DateEnd && !isValidDate(DateEnd)) {
      alert("Invalid end date format. Use YYYY-MM-DD.");
      return;
    }
    if (!isValidDate(RegCloseDate)) {
      alert("Invalid registration close date format. Use YYYY-MM-DD.");
      return;
    }

    // Validate time formats
    if (!isValidTime(TimeStart)) {
      alert("Invalid start time format. Use HH:MM (24-hour format).");
      return;
    }
    if (TimeEnd && !isValidTime(TimeEnd)) {
      alert("Invalid end time format. Use HH:MM (24-hour format).");
      return;
    }

    // Date validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(DateStart);
    const endDate = DateEnd ? new Date(DateEnd) : null;
    const regCloseDate = new Date(RegCloseDate);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (startDate < tomorrow) {
      alert("Start date must be tomorrow or later.");
      return;
    }

    if (endDate) {
      if (startDate > endDate) {
        alert("Start date must be before end date.");
        return;
      }

      const sixMonthsLater = new Date(startDate);
      sixMonthsLater.setMonth(startDate.getMonth() + 6);
      if (endDate > sixMonthsLater) {
        alert("End date cannot be more than 6 months after the start date.");
        return;
      }

      if (startDate.toDateString() === endDate.toDateString()) {
        if (!compareTimes(TimeStart, TimeEnd)) {
          alert("Start time must be before end time on the same day.");
          return;
        }
      }
    }

    if (regCloseDate < today) {
      alert("Registration close date cannot be before today.");
      return;
    }
    if (regCloseDate > startDate) {
      alert("Registration close date cannot be after the start date.");
      return;
    }
    
    let finalEntryFee = EntryFee;
    if (!EntryFee || parseFloat(EntryFee) === 0) {
      finalEntryFee = "Free";
    } else if (isNaN(parseFloat(EntryFee))) {
      alert("Registration fee must be a valid number or left empty for free entry.");
      return;
    }

    try {
      let posterUrl = "";
      if (profileImage) {
        posterUrl = await handleImageUpload();
      }

      const finalEventData = {
        ...eventData,
        EntryFee: finalEntryFee,
        PosterImg: posterUrl || "",
      };

      const eventDocRef = await addDoc(collection(db, "Events"), finalEventData);
      const eventId = eventDocRef.id;

      const { date, time } = getCurrentDateTime();

      const notificationData = {
        EventId: eventId,
        dateofnotification: date,
        time: time,
        msg: `New event "${Eventname}" created by ${Company}!`, 
        type: "GeneralEvent",
        userid: user?.email || "anonymous",
        path: "/Events/AllEvents",
      };
      
      await addDoc(collection(db, "Notifications"), notificationData);

      const Advertisement = {
       poster:posterUrl,
       EventId: eventId,
      };
      
      await addDoc(collection(db, "Advertisement"), Advertisement);

      alert("Event and notification added successfully!");
    
      setEventData({
        Eventname: "",
        Tagline: "",
        Company: "",
        DateStart: "",
        DateEnd: "",
        TimeStart: "",
        TimeEnd: "",
        Location: "",
        Pricepool: "",
        EntryFee: "",
        RegCloseDate: "",
        Active: "Y",
        userid: user?.email || null,
      });
      setProfileImage("");

      router.replace("./AllEvents");
    } catch (error) {
      console.error("Error adding event or notification:", error);
      alert("Failed to add event or notification. Please try again.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View>
            <TouchableOpacity onPress={() => router.replace("./AllEvents")}>
              <Ionicons name="arrow-back" size={22.5} color={"rgba(26, 25, 25, 0.68)"} />
            </TouchableOpacity>
            <Text style={styles.title}>Add New Event</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Event Name"
            value={eventData.Eventname}
            onChangeText={(text) => handleInputChange("Eventname", text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Tagline"
            value={eventData.Tagline}
            onChangeText={(text) => handleInputChange("Tagline", text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Company"
            value={eventData.Company}
            onChangeText={(text) => handleInputChange("Company", text)}
          />

          <View style={styles.rowContainer}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Price"
              value={eventData.Pricepool}
              onChangeText={(text) => handleInputChange("Pricepool", text)}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Registration Fee"
              value={eventData.EntryFee}
              onChangeText={(text) => handleInputChange("EntryFee", text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Start Date (YYYY-MM-DD)"
              value={eventData.DateStart}
              onChangeText={(text) => handleInputChange("DateStart", text)}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="End Date (YYYY-MM-DD)"
              value={eventData.DateEnd}
              onChangeText={(text) => handleInputChange("DateEnd", text)}
            />
          </View>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Start Time (HH:MM)"
              value={eventData.TimeStart}
              onChangeText={(text) => handleInputChange("TimeStart", text)}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="End Time (HH:MM)"
              value={eventData.TimeEnd}
              onChangeText={(text) => handleInputChange("TimeEnd", text)}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Registration Close Date (YYYY-MM-DD)"
            value={eventData.RegCloseDate}
            onChangeText={(text) => handleInputChange("RegCloseDate", text)}
          />

          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="Location"
              value={eventData.Location}
              onChangeText={(text) => handleInputChange("Location", text)}
            />
            <TouchableOpacity onPress={fetchCurrentLocation} style={styles.iconButton}>
              <FontAwesome name="map-marker" size={35} color="#007BFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.descriptionContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Enter event description..."
              multiline
              numberOfLines={4}
              value={eventData.Description}
              onChangeText={(text) => handleInputChange("Description", text)}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <TouchableOpacity onPress={pickImage} style={styles.posterPicker}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.posterImage} />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Ionicons name="images-outline" size={50} color="#6C63FF" />
                  <Text style={styles.posterText}>Upload Poster</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.addButton} onPress={addEvent}>
              <Text style={styles.addButtonText}>Create Event</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  scrollContainer: { padding: 28 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { padding: 12, borderWidth: 1, borderRadius: 8, backgroundColor: "#fff", fontSize: 16, marginBottom: 15 },
  halfInput: { width: "48%" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  locationRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flexInput: { width: "90%" },
  posterPicker: {
    width: 200,
    height: 250,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#6C63FF",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  posterImage: { width: "100%", height: "100%", borderRadius: 15, justifyContent: "center", alignItems: "center" },
  addButton: {
    backgroundColor: "#007BFF",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
    height: 50,
    marginTop: "25%",
    paddingHorizontal: 20,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", height: 45, textAlign: "center" },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  descriptionContainer: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
    fontSize: 16,
    padding: 10,
  },
  posterPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  posterText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6C63FF",
  },
});

export default AddEventScreen;