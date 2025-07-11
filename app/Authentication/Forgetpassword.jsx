import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import VerificationModal from "./../VerificationModal";

const BACKEND_URL = "https://emailbackend-9rx1.onrender.com";

const ForgetPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVerificationVisible, setVerificationVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const router = useRouter();

  const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const sendVerificationEmail = async (code) => {
    console.log(email);
    const message = `Your OTP: ${code}`;
    const success = await sendMessage(message);
    if (success) {
      console.log(`Verification code sent to ${email}: ${code}`);
      return true;
    }
    return false;
  };

  const sendMessage = async (message) => {
    try {
      const response = await fetch(`${BACKEND_URL}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "OTP sent successfully.");
        return true;
      } else {
        Alert.alert("Error", data.message);
        return false;
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong while sending the OTP.");
      return false;
    }
  };

  const Passwordverify = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter an email address!");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address!");
      return;
    }

    try {
      setLoading(true);

      // Generate and send verification code
      const code = generateVerificationCode();
      setGeneratedCode(code);
      const emailSent = await sendVerificationEmail(code);
      if (emailSent) {
        setVerificationVisible(true);
      } else {
        Alert.alert("Error", "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("OTP Sending Error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    setVerificationVisible(false);
    router.push({
      pathname: "/Authentication/Changepassword",
      params: { email: email },
    });  
  };

  const handleVerificationFailure = () => {
    setVerificationVisible(false);
    Alert.alert("Error", "Verification failed. Please try again.");
    router.back();
  };

  return (
    <View style={styles.container}>
      <Image style={styles.image} source={require("../../assets/images/forgot.gif")} />

      <View style={styles.form}>
        {loading ? (
          <ActivityIndicator size="large" color="#BF32C1" />
        ) : (
          <>
            {/* Meet & Breed heading */}
            <Text style={styles.title}>
              Send OTP to <Text style={styles.titleHighlight}>Email</Text>
            </Text>

            {/* Email Input Box */}
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {/* Continue button */}
            <TouchableOpacity style={styles.button} onPress={() => Passwordverify()}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>

            {/* Support text */}
            <Text style={styles.helpText} onPress={() => router.push("/Authentication/SupportSection")}>
              Need help? Click <Text style={styles.supportText}>Support</Text>
            </Text>

            {/* Back button */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Verification Modal */}
      {isVerificationVisible && (
        <VerificationModal
          isVisible={isVerificationVisible}
          email={email}
          generatedCode={generatedCode}
          onVerifySuccess={handleVerificationSuccess}
          onFailure={handleVerificationFailure}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "50%",
  },
  form: {
    flex: 1,
    paddingHorizontal: 30,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 30,
    marginTop: 20,
    color: "black",
  },
  titleHighlight: {
    color: "#BF32C1",
  },
  input: {
    width: "100%",
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#BF32C1",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#BF32C1",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  helpText: {
    fontSize: 14,
    color: "gray",
    marginTop: 15,
    textAlign: "center",
  },
  supportText: {
    color: "red",
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 20,
    alignItems: "flex-start",
  },
  backText: {
    backgroundColor: "rgba(187, 34, 34, 0.84)",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9,
    color: "white",
    fontWeight: "bold",
  },
});

export default ForgetPassword;