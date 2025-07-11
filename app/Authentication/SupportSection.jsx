import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const Support = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSendEmail = () => {
    if (!name || !email || !message) {
      Alert.alert("Error", "Please fill all fields before sending.");
      return;
    }

    const subject = `encodeURIComponent("Support Request from " + name)`;
    const body = `encodeURIComponent(Name: ${name}\nEmail: ${email}\n\nMessage:\n${message})`;
    const ownerEmail = "amal.karthik2026@gmail.com";
    const mailtoUrl = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;

    Linking.openURL(mailtoUrl).catch((err) => Alert.alert("Error", "Could not open email app."));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        {/* Profile Picture */}
        <Image source={require('../../assets/images/a.gif')} style={styles.profilePic}/>
      </View>

      {/* Support Form */}
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Your Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Your Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={[styles.input, styles.messageBox]} placeholder="Your Message" multiline numberOfLines={4} value={message} onChangeText={setMessage} />

        {/* Send Button */}
        <TouchableOpacity style={styles.button} onPress={handleSendEmail}>
          <Text style={styles.buttonText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25, // Makes the image round
    marginRight: 10,
  },
  form: {
    flex: 1,
    justifyContent: "center",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#BF32C1",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  messageBox: {
    height: 100,
    textAlignVertical: "top",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#BF32C1",
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default Support;