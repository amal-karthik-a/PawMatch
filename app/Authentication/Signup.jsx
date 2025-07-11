import React, { useState, useEffect } from "react";
import {
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image,
  Alert, ActivityIndicator, Animated
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { db, auth } from './../../Config/FirebaseConfig';
import { s3, S3_BUCKET } from "../../aws-config";
import { setDoc, doc } from "firebase/firestore";
import { router } from "expo-router";
import VerificationModal from "./../VerificationModal";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import Av1 from './../../assets/Animations/AV2.json';
import LottieView from 'lottie-react-native';

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lname, setLname] = useState("");
  const [fname, setFname] = useState("");
  const [repassword, setRePasswd] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("+91");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [addresses, setAddress] = useState({ 
    country: "", 
    city: "", 
    pincode: "", 
    street: "", 
    postOffice: "", 
    state: "" 
  });
  const [profileImage, setProfileImage] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isVerificationVisible, setVerificationVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [borderAnim] = useState(new Animated.Value(0));
  const [imageAnim] = useState(new Animated.Value(-200));
  const [titleAnim] = useState(new Animated.Value(300));
  const [promptAnim] = useState(new Animated.Value(300));
  const BACKEND_URL = 'https://emailbackend-9rx1.onrender.com';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(imageAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(promptAnim, {
        toValue: 0,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [profileImage]);

  const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

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

  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    return await response.blob();
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required!");
      return false;
    }
    return true;
  };

  const handleImageUpload = async () => {
    try {
      if (!profileImage) {
        Alert.alert("Upload Error", "No image selected.");
        throw new Error("No image selected.");
      }
      const fileName = `image-${Date.now()}.jpg`;
      const fileBlob = await uriToBlob(profileImage);
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: fileBlob,
        ContentType: "image/jpeg",
      };
      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            Alert.alert("Upload failed", err.message);
            reject(err);
          } else {
            setUploadedUrl(data.Location);
            setDoc(doc(db, "users", email), { propic: data.Location }, { merge: true })
            setDoc(doc(db, "ChatUsers", email), { propic: data.Location }, { merge: true })
              .then(() => resolve(data.Location))
              .catch(reject);
          }
        });
      });
    } catch (error) {
      Alert.alert("Upload Error", error.message);
      throw error;
    }
  };

  const checkEmailExists = async (email) => {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const specificLocation = address.subregion || address.district || address.name || "";
        const postOffice = address.name || address.street || ""; // Current point address
        const city = address.city || "";
        const state = address.region || "";
        const country = address.country || "";
        const pincode = address.postalCode || "";
        
        setAddress({
          country: country,
          city: city,
          pincode: pincode,
          postOffice: postOffice,
          state: state,
          street: `${specificLocation}${specificLocation ? ", " : ""}${postOffice}${postOffice ? ", " : ""}${city}${city ? ", " : ""}${state}${state ? ", " : ""}${country} ${pincode}`.trim(),
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch location: " + error.message);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password || !fname || !lname || !repassword || !dob.day || !dob.month || !dob.year || !addresses.country || !addresses.city || !addresses.pincode || !addresses.street || !addresses.postOffice || !addresses.state || !gender || !phone || !profileImage) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (password !== repassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (phone.length !== 13) {
      Alert.alert("Error", "Invalid Phone Number.");
      return;
    }
    if (email.split('@gmail.com').length > 2) {
      Alert.alert("Error", "Invalid Email.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Short Password!");
      return;
    }
    if (email.split('@gmail.com').length === 1) setEmail(email + "@gmail.com");

    setLoading(true);
    try {
      const code = generateVerificationCode();
      setGeneratedCode(code);
      const emailSent = await sendVerificationEmail(code);
      if (!emailSent) throw new Error("Failed to send verification email.");
      setVerificationVisible(true);
    } catch (error) {
      Alert.alert("Error", error.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    setLoading(true);
    setVerificationVisible(false);
    try {
      if (await checkEmailExists(email)) {
        Alert.alert("Error", "This email is already registered.");
        return;
      }
      await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", email), {
        userid: email, passwd: password, fname, lname, gender, dob, phno: phone,
        address: addresses, propic: uploadedUrl, Event_Reg: [],Active:"Y",
      });

      await setDoc(doc(db, "Settings", email), { twoStep: "N", FilterSell: ["B", 2500, 0, 0],AnimalAbuse:"Y",App:"Y",Events:"Y",Missing:"Y",RegisteredPets:"Y",Security:"Y" });

      await setDoc(doc(db, "ChatUsers", email), {userid: email,fname, lname,phno: phone,propic: uploadedUrl});

      await handleImageUpload();
      router.back();
    } catch (error) {
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationFailure = () => {
    setVerificationVisible(false);
    router.back();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <StatusBar hidden={false} barStyle="dark-content" backgroundColor="#E8F5E9" />

          <Animated.View style={[styles.profileCard, { opacity: fadeAnim }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#388E3C" />
            </TouchableOpacity>
            <View style={styles.profileRow}>
              <Animated.View style={[styles.imagePicker, { transform: [{ translateY: imageAnim }] }]}>
                <TouchableOpacity onPress={pickImage}>
                  {profileImage ? (
                    <View style={styles.imageContainer}>
                      <Animated.View style={[styles.borderOverlay, { opacity: borderAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]} />
                      <Image source={{ uri: profileImage }} style={styles.profileImage} />
                    </View>
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <LottieView
                        style={styles.sendAnimation}
                        source={Av1}
                        loop={true}
                        autoPlay={true}
                        speed={0.7}
                        onAnimationFailure={(error) => console.log("Animation Error:", error)}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.profileTextContainer}>
                <Animated.Text style={[styles.uploadText, { transform: [{ translateX: titleAnim }] }]}>
                  Join Our Pet Family
                </Animated.Text>
                <Animated.Text style={[styles.profilePromptText, { transform: [{ translateX: promptAnim }] }]}>
                  Let others recognise you, add a profile pic
                </Animated.Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
            {loading ? (
              <ActivityIndicator size="large" color="#4CAF50" />
            ) : (
              <View style={styles.form}>
                {/* Personal Details Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  <View style={styles.inputRow}>
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="First Name" 
                      value={fname} 
                      onChangeText={setFname} 
                    />
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="Last Name" 
                      value={lname} 
                      onChangeText={setLname} 
                    />
                  </View>
                  <View style={styles.genderContainer}>
                    {["Male", "Female"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.radioItem, gender === option && styles.radioSelected]}
                        onPress={() => setGender(option)}
                      >
                        <Text style={styles.radioText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.dobContainer}>
                    <TextInput 
                      style={styles.dobInput} 
                      placeholder="DD" 
                      keyboardType="number-pad" 
                      maxLength={2} 
                      value={dob.day} 
                      onChangeText={(text) => setDob({ ...dob, day: text })} 
                    />
                    <Text style={styles.dash}>-</Text>
                    <TextInput 
                      style={styles.dobInput} 
                      placeholder="MM" 
                      keyboardType="number-pad" 
                      maxLength={2} 
                      value={dob.month} 
                      onChangeText={(text) => setDob({ ...dob, month: text })} 
                    />
                    <Text style={styles.dash}>-</Text>
                    <TextInput 
                      style={styles.dobInput} 
                      placeholder="YYYY" 
                      keyboardType="number-pad" 
                      maxLength={4} 
                      value={dob.year} 
                      onChangeText={(text) => setDob({ ...dob, year: text })} 
                    />
                  </View>
                </View>

                {/* Contact Details Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact Details</Text>
                  <View style={styles.inputRow}>
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="Phone (+91)" 
                      keyboardType="phone-pad" 
                      value={phone} 
                      onChangeText={setPhone} 
                      maxLength={13} 
                    />
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="Email" 
                      keyboardType="email-address" 
                      value={email} 
                      onChangeText={setEmail} 
                    />
                  </View>
                </View>

                {/* Location Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <TouchableOpacity onPress={getCurrentLocation}>
                      <Ionicons name="location-outline" size={20} color="#388E3C" style={styles.locationIcon} />
                    </TouchableOpacity>
                  </View>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Country" 
                    value={addresses.country} 
                    onChangeText={(text) => setAddress({ ...addresses, country: text })} 
                  />
                  <View style={styles.inputRow}>
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="City" 
                      value={addresses.city} 
                      onChangeText={(text) => setAddress({ ...addresses, city: text })} 
                    />
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="Pin Code" 
                      keyboardType="number-pad" 
                      maxLength={6} 
                      value={addresses.pincode} 
                      onChangeText={(text) => setAddress({ ...addresses, pincode: text })} 
                    />
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="Post Office" 
                      value={addresses.postOffice} 
                      onChangeText={(text) => setAddress({ ...addresses, postOffice: text })} 
                    />
                    <TextInput 
                      style={[styles.input, styles.inputHalf]} 
                      placeholder="State" 
                      value={addresses.state} 
                      onChangeText={(text) => setAddress({ ...addresses, state: text })} 
                    />
                  </View>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Street Address" 
                    value={addresses.street} 
                    onChangeText={(text) => setAddress({ ...addresses, street: text })} 
                  />
                </View>

                {/* Password Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Password</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Password" 
                    secureTextEntry 
                    value={password} 
                    onChangeText={setPassword} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Confirm Password" 
                    secureTextEntry 
                    value={repassword} 
                    onChangeText={setRePasswd} 
                  />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSignIn}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          <VerificationModal
            isVisible={isVerificationVisible}
            email={email}
            generatedCode={generatedCode}
            onVerifySuccess={handleVerificationSuccess}
            onFailure={handleVerificationFailure}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
  },
  backButton: {
    position: "absolute",
    top: 15,
    left: 20,
    padding: 10,
    zIndex: 1,
  },
  profileCard: {
    width: "100%",
    backgroundColor: "#E8F5E9",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imagePicker: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    maxWidth: 130,
  },
  imageContainer: {
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
  },
  borderOverlay: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderColor: "#4CAF50",
    borderRadius: 19,
    zIndex: -1,
  },
  profilePlaceholder: {
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  profileImage: {
    width: 120,
    height: 120,
  },
  sendAnimation: {
    width: 125,
    height: 125,
  },
  profileTextContainer: {
    flex: 2,
    marginLeft: 20,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  uploadText: {
    color: "#4CAF50",
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 32,
  },
  profilePromptText: {
    color: "rgba(39, 168, 136, 0.96)",
    fontSize: 14,
    marginTop: 5,
    lineHeight: 18,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignSelf: "center",
  },
  form: {
    width: "100%",
  },
  section: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#388E3C",
    fontSize: 16,
    fontWeight: "600",
  },
  locationIcon: {
    marginLeft: 10,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  inputHalf: {
    width: "48%",
    marginBottom: 0,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  radioItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioSelected: {
    backgroundColor: "#A5D6A7",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  radioText: {
    color: "#388E3C",
    fontSize: 16,
    fontWeight: "500",
  },
  dobContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  dobInput: {
    width: 80,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
  dash: {
    marginHorizontal: 8,
    fontSize: 18,
    color: "#388E3C",
  },
  button: {
    width: "100%",
    padding: 16,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
});

export default Signup;