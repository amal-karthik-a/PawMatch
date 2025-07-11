import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { auth } from "./../../Config/FirebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import LottieView from "lottie-react-native";

const Changepassword = () => {
  const [password, setPassword] = useState("");
  const [repassword, setRePasswd] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const animationRef = useRef(null);

  const { email } = useLocalSearchParams();

  useEffect(() => {
    // No user should be logged in for a forgot password flow
    if (auth.currentUser) {
      Alert.alert(
        "Warning",
        "A user is currently logged in. This page is intended for password reset without login."
      );
    }

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 20, // Move "Dables" down by 20 units
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Play Lottie animation
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, [fadeAnim, scaleAnim, translateYAnim, email]);

  const handleLogin = async () => {
    if (!password) {
      Alert.alert("Error", "Enter the new password!");
      return;
    } else if (password.length < 6) {
      Alert.alert("Error", "Password should have a minimum of 6 characters!");
      return;
    } else if (password !== repassword) {
      Alert.alert("Error", "Passwords don't match!");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://emailbackend-9rx1.onrender.com/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: repassword }),
      });

      // Check if response is OK
      if (!response.ok) {
        const errorText = await response.text(); // Get raw response for debugging
        console.log("Raw response:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      // Attempt to parse JSON
      const data = await response.json();
      if (data.success) {
        Alert.alert("Info", "Password Changed Successfully!");
        router.replace("/Authentication/LoginScreen");
      } else {
        Alert.alert("Error", data.message || "Failed to reset password.");
      }
    } catch (error) {
      console.error("Fetch error details:", error);
      Alert.alert("Error", `Connection Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Lottie Animation */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignSelf: "center", // Center the animation horizontally
        }}
      >
        <LottieView
          ref={animationRef}
          source={require("./../../assets/Animations/ForgotPassword.json")}
          style={styles.lottieAnimation}
          loop={true}
        />
      </Animated.View>
      <View style={styles.form}>
        {loading ? (
          <ActivityIndicator size="large" color="#50E3C2" />
        ) : (
          <>
            {/* Debug: Display email parameter */}
            <Text style={styles.debugText}>Email: {email || "No email provided"}</Text>

            {/* Meet & Breed Heading */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }}
            >
              <View style={styles.Meet_Breed}>
                <Text style={styles.title3}>Bree</Text>
                <Text style={styles.title4}>Dables</Text>
                <Animated.View
                  style={{
                    transform: [{ translateY: translateYAnim }],
                  }}
                ></Animated.View>
              </View>
            </Animated.View>

            {/* Enter new password text box */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                secureTextEntry
                value={password}
                onChangeText={(text) => setPassword(text)}
              />
            </Animated.View>

            {/* Re-Enter new password text box */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }}
            >
              <TextInput
                style={styles.input}
                placeholder="Re-Enter password"
                secureTextEntry
                value={repassword}
                onChangeText={(text) => setRePasswd(text)}
              />
            </Animated.View>

            {/* Continue Button with Animation */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }}
            >
              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
    justifyContent: "center",
  },
  form: {
    width: "100%",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  Meet_Breed: {
    flexDirection: "row",
    marginBottom: 15,
    marginTop: 10, // Spacing between animation and title
  },
  title3: {
    fontSize: 30,
    color: "#000000",
    fontWeight: "bold",
  },
  title4: {
    fontSize: 30,
    color: "#50E3C2",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#50E3C2",
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    fontSize: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  button: {
    width: "100%", // Match input width
    padding: 15,
    backgroundColor: "#50E3C2",
    borderRadius: 10,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  buttonText: {
    color: "black",
    fontWeight: "bold",
    fontSize: 16,
  },
  lottieAnimation: {
    width: 400,
    height: 400,
  },
  debugText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
});

export default Changepassword;