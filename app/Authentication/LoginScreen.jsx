import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Vibration, Image, ScrollView, 
  KeyboardAvoidingView, Platform, Alert
} from "react-native";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../Config/FirebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import CAlert from "./../CustomAlert";
import VerificationModal from './../VerificationModal';
const BACKEND_URL = 'https://emailbackend-9rx1.onrender.com';

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("amal.karthik2026@gmail.com");
  const [password, setPassword] = useState("Amal@2003.");
  const router = useRouter();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState("info");
  const [alertMessage, setAlertMessage] = useState("");
  const [isVerificationVisible, setVerificationVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [user, setUser] = useState(null);

  const [loginCredentials, setLoginCredentials] = useState({ email: '', password: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleVerificationFailure = () => {
    setVerificationVisible(false);
    Alert.alert("Error", "Account Login Failed!");
  };

  const handleVerificationSuccess = async () => {
    setLoading(true);
    try {
      const { email: storedEmail, password: storedPassword } = loginCredentials;
      await signInWithEmailAndPassword(auth, storedEmail, storedPassword);
      showAlert("success", "Login Successful!");
      setVerificationVisible(false);
      
      setTimeout(() => {
        router.replace("../MainContent/petBreadHome");
      }, 100);
    } catch (error) {
      showAlert("error", "Login failed after verification: " + error.message);
    } finally {
      setLoading(false);
    }
  };  

  const sendVerificationEmail = async (code) => {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Message sent successfully.');
        return true;
      } else {
        Alert.alert('Error', data.message);
        return false;
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong.');
      return false;
    }
  };

  const showAlert = (type, message) => {
    setAlertType(type);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (trimmedEmail.split('@gmail.com').length > 2) {
      setEmail((trimmedEmail + "@gmail.com"));
      showAlert("Error", "Invalid Email.");
      return;
    }

    if (!trimmedEmail || !trimmedPassword) {
      showAlert("warning", "Invalid Username and Password not found!");
      Vibration.vibrate(200);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showAlert("error", "Invalid Username and Password format used!");
      Vibration.vibrate(200);
      return;
    }

    // Store credentials for later use in verification
    setLoginCredentials({ email: trimmedEmail, password: trimmedPassword });
    setLoading(true);

    try {
      const settingsDocRef = doc(db, "Settings", trimmedEmail);
      const settingsDoc = await getDoc(settingsDocRef);
      
      if (settingsDoc.exists() && settingsDoc.data().twoStep === 'Y') {
        const code = generateVerificationCode();
        setGeneratedCode(code);
        console.log(code);
        await sendVerificationEmail(code);
        setVerificationVisible(true);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const user = userCredential.user;

        showAlert("success", "Login Successful!");
        router.replace("../MainContent/petBreadHome");
      }
    } catch (error) {
      console.error("Login Error:", error.code, error.message);
      Vibration.vibrate([200, 100, 200]);

      let errorMessage = "Something went wrong. Please try again.";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No user found with this email. Please sign up.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email format. Please enter a valid email.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Try again later.";
          break;
        case "auth/network-request-failed":
          errorMessage = "Network error. Please check your internet connection.";
          break;
        case "auth/invalid-credential":
          errorMessage = "Invalid email or password. Please check and try again.";
          break;
        default:
          errorMessage = "Login failed. Please try again later.";
      }

      showAlert("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.header,{paddingHorizontal:45,paddingVertical:45}]}>
          <View style={{flexDirection:'row',borderRadius:13}}>
            <View style={{height:140,backgroundColor:'rgba(255, 255, 255, 0.62)',borderRadius:11,boxShadow:'0px 0px 5px rgba(1, 1, 1, 0.18)'}}>
              <Image resizeMode="contain" style={{}} source={require('./../../assets/images/newimg/d5.png')} />
            </View>
            <View style={{backgroundColor:'',width:'20%'}}>
            </View>
          </View>
        </View>
          
        <View style={styles.formContainer}>
          <View style={styles.logoContainer}>
            <Image style={styles.logo} source={require("./../../assets/images/loginlookup.webp")} />
            <TouchableOpacity style={{marginBottom: 12}}>
              <Text style={[styles.titleName, { fontFamily: "outfit-medium" }]}>Breedables</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={"rgba(37, 141, 145, 0.6)"}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={"rgba(37, 141, 145, 0.6)"}
          />

          {loading ? (
            <ActivityIndicator size="large" color="#BF32C1" />
          ) : (
            <>
              <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push("/Authentication/Forgetpassword")}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/Authentication/Signup")}>
                <Text style={styles.signupText}>
                  Don't have an account? <Text style={styles.signupLink}>Sign up</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <CAlert
          visible={alertVisible}
          type={alertType}
          msg={alertMessage}
          btnCount={1}
          buttons={[{ label: "OK", onPress: () => setAlertVisible(false) }]}
          onClose={() => setAlertVisible(false)}
        />
        <VerificationModal
          isVisible={isVerificationVisible}
          email={email}
          generatedCode={generatedCode}
          onVerifySuccess={handleVerificationSuccess}
          onFailure={handleVerificationFailure}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// **🔹 Styles**
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "rgba(56, 190, 150, 0.15)",
    height: "45%",
    borderBottomRightRadius: 50,
    borderBottomLeftRadius: 50,
    boxShadow: '0px 0px 8px rgba(33, 34, 34, 0.19)',
  },
  formContainer: {
    height: "55%",
    justifyContent: "flex-start",
    padding: 40,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: -25,
  },
  logo: {
    width: "35%",
    height: 140,
  },
  title: {
    fontSize: 28.5,
    fontWeight: "800",
    marginBottom: 24,
    color: "rgba(37, 141, 145,0.7)",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "rgba(37, 141, 145, 0.36)",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(37, 141, 145,0.7)",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "rgba(37, 141, 145, 0.69)",
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  forgotPassword: {
    width: 145,
    marginBottom: -8,
  },
  forgotPasswordText: {
    fontWeight: "600",
    fontSize: 15,
    color: "rgba(238, 56, 56, 0.65)",
  },
  signupText: {
    marginTop: 15,
    fontSize: 14,
    fontWeight: 500,
    color: "rgba(32, 146, 118, 0.43)",
    textAlign: "center",
  },
  signupLink: {
    fontWeight: "700",
    fontSize: 18,
    color: "rgba(37, 141, 145, 0.69)",
  },  
  titleName: {
    fontSize: 28.5,
    fontWeight: "800",
    marginBottom: 24,
    color: 'rgba(37, 141, 145,0.7)',
    backgroundColor:"rgba(156, 222, 224, 0.29)",
    paddingHorizontal: 14,
    paddingVertical: 1,
    borderRadius: 11,
    boxShadow: '0px 0px 5px rgba(37, 141, 145, 0.25)',
  }
});

export default LoginScreen;