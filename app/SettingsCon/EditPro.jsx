import React, { useState, useEffect } from "react";
import { 
  ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, 
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image, 
  Alert, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RadioButton } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { db, auth } from '../../Config/FirebaseConfig';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";
import VerificationModal from "../VerificationModal";
import { onAuthStateChanged } from "firebase/auth";
import { s3, S3_BUCKET } from "../../aws-config";
const BACKEND_URL = 'https://emailbackend-9rx1.onrender.com';

const EditProfile = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [lname, setLname] = useState("");
  const [fname, setFname] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("+91");
  const [dob, setDob] = useState({ day: "", month: "", year: "" });
  const [addresses, setAddress] = useState({ country: "", city: "", pincode: "", street: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [originalProfileImage, setOriginalProfileImage] = useState(null);
  const [user, setUser] = useState(null);
  const [isVerificationVisible, setVerificationVisible] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
        await fetchUserData(currentUser.email);
      }
    });
    return unsubscribe;
  }, []);

  const fetchUserData = async (userEmail) => {
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", userEmail);
      const userSnapshot = await getDoc(userDocRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        setFname(userData.fname || "");
        setLname(userData.lname || "");
        setGender(userData.gender || "Male");
        setPhone(userData.phno || "+91");
        setDob(userData.dob || { day: "", month: "", year: "" });
        setAddress(userData.address || { country: "", city: "", pincode: "", street: "" });
        setProfileImage(userData.propic || null);
        setOriginalProfileImage(userData.propic || null);
      } else {
        Alert.alert("Error", "No User!");
      }
    } catch (error) {
      Alert.alert("Error", "Error fetching user data!");
    }
    setLoading(false);
  };

  const deleteFileFromS3 = async (url) => {
    try {
      if (!url) {
        return;
      }

      const urlObj = new URL(url);
      const bucketName = urlObj.hostname.split('.')[0];
      const objectKey = decodeURIComponent(urlObj.pathname.substring(1));

      const params = {
        Bucket: bucketName,
        Key: objectKey,
      };

      return new Promise((resolve, reject) => {
        s3.deleteObject(params, (err, data) => {
          if (err) {
            Alert.alert("Delete Error", "Failed to delete old image from S3: " + err.message);
            reject(err);
          } else {
            resolve(data);
          }
        });
      });
    } catch (error) {
      Alert.alert("Delete Error", error.message);
      throw error;
    }
  };

  const handleImageUpload = async () => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!profileImage) {
          Alert.alert("Upload Error", "No image selected.");
          return reject("No image selected.");
        }
        
        const isLocalImage = profileImage.startsWith("file://");
        if (!isLocalImage) {
          resolve(profileImage);
          return;
        }

        const fileName = `image-${Date.now()}.jpg`;
        const fileType = "image/jpeg";
        const fileBlob = await uriToBlob(profileImage);

        const params = {
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: fileBlob,
          ContentType: fileType,
        };

        s3.upload(params, (err, data) => {
          if (err) {
            Alert.alert("Upload failed", err.message);
            reject(err.message);
          } else {
            resolve(data.Location);
          }
        });
      } catch (error) {
        Alert.alert("Upload Error", error.message);
        reject(error.message);
      }
    });
  };

  const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();
  
  const sendVerificationEmail = async (code) => {
    const message = `Your OTP: ${code}`;
    try {
      const success = await sendMessage(message);
      if (success) {
        console.log(`Verification code sent to ${email}: ${code}`);
        return true;
      } else {
        Alert.alert("Error", "Failed to send verification email");
        return false;
      }
    } catch (error) {
      console.error("Error in sendVerificationEmail:", error);
      Alert.alert("Error", "Network error while sending verification email");
      return false;
    }
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
        return true;
      } else {
        console.error('Send message failed:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Send message error:', error);
      return false;
    }
  };  
  
  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access gallery is required!");
      return false;
    }
    return true;
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

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSignIn = async () => {
    if (!fname || !lname || !dob.day || !dob.month || !dob.year || !addresses.country || !addresses.city || !addresses.pincode || !addresses.street || !gender || !phone || !profileImage) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (phone.length !== 13) {
      Alert.alert("Error", "Invalid Phone Number.");
      return;
    }

    if (!email.includes("@gmail.com")) {
      setEmail((prevEmail) => prevEmail + "@gmail.com");
    }
    
    setLoading(true);
    const code = generateVerificationCode();
    setGeneratedCode(code);
    
    // Wait for email to be sent successfully before proceeding
    const emailSent = await sendVerificationEmail(code);
    if (emailSent) {
      setVerificationVisible(true);
    } else {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    setLoading(true);
    try {
      const userDocRef = doc(db, "users", email);

      let profileImageUrl = profileImage;
      const isLocalImage = profileImage.startsWith("file://");

      if (isLocalImage) {
        if (originalProfileImage) {
          await deleteFileFromS3(originalProfileImage);
        }
        
        profileImageUrl = await handleImageUpload();
      }

      await updateDoc(userDocRef, {
        fname: fname,
        lname: lname,
        gender: gender,
        dob: dob,
        phno: phone,
        address: addresses,
        propic: profileImageUrl, 
      });

      setOriginalProfileImage(profileImageUrl);
    } catch (error) {
      Alert.alert("Error", "Network Error: " + error.message);
    } finally {
      setLoading(false);
      setVerificationVisible(false);
      router.back();
    }
  };

  const handleVerificationFailure = () => {
    setVerificationVisible(false);
    setLoading(false);
    router.back();
  };
  
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <StatusBar hidden={false} />

          {loading ? (
            <ActivityIndicator size="large" color="#BF32C1" />
          ) : (<>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={100} color="#BF32C1" />
              )}
            </TouchableOpacity>

            <View style={styles.form}>
              <Text style={styles.label}>Personal</Text>
              <View style={styles.nameInput}>
                <TextInput style={[styles.input, styles.namesfield]} placeholder="First Name" value={fname} onChangeText={setFname} />
                <TextInput style={[styles.input, styles.namesfield]} placeholder="Last Name" value={lname} onChangeText={setLname} />
              </View>

              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                {["Male", "Female"].map((option) => (
                  <View key={option} style={styles.radioItem}>
                    <RadioButton value={option} status={gender === option ? 'checked' : 'unchecked'} onPress={() => setGender(option)} />
                    <Text>{option}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.label}>Date of Birth</Text>
              <View style={styles.dobContainer}>
                <TextInput style={styles.dobInput} placeholder="DD" keyboardType="number-pad" maxLength={2} value={dob.day} onChangeText={(text) => setDob({ ...dob, day: text })} />
                <Text style={styles.dash}>-</Text>
                <TextInput style={styles.dobInput} placeholder="MM" keyboardType="number-pad" maxLength={2} value={dob.month} onChangeText={(text) => setDob({ ...dob, month: text })} />
                <Text style={styles.dash}>-</Text>
                <TextInput style={styles.dobInput} placeholder="YYYY" keyboardType="number-pad" maxLength={4} value={dob.year} onChangeText={(text) => setDob({ ...dob, year: text })} />
              </View>
              
              <Text style={styles.label}>Contact</Text>
              <TextInput style={styles.phoneInput} placeholder="Phone Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={13} />
              <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} editable={false} />

              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} placeholder="Country" value={addresses.country} onChangeText={(text) => setAddress({ ...addresses, country: text })} />
              <View style={styles.cityPincodeContainer}>
                <TextInput style={styles.cityInput} placeholder="City" value={addresses.city} onChangeText={(text) => setAddress({ ...addresses, city: text })} />
                <TextInput style={styles.pincodeInput} placeholder="Pin Code" keyboardType="number-pad" maxLength={6} value={addresses.pincode} onChangeText={(text) => setAddress({ ...addresses, pincode: text })} />
              </View>
              <TextInput style={[styles.input, styles.addressInput]} placeholder="Address" value={addresses.street} onChangeText={(text) => setAddress({ ...addresses, street: text })} />

              <TouchableOpacity style={styles.button} onPress={() => handleSignIn()}>
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </>)}
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
  container: { flexGrow: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", padding: 30 },
  form: { width: "100%", maxWidth: 400, padding: 5 },
  nameInput: { flexDirection: 'row', justifyContent: 'space-between' },
  input: { padding: 12, borderWidth: 1, borderColor: "#BF32C1", borderRadius: 8, backgroundColor: "#f9f9f9", marginBottom: 15 },
  genderContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  radioItem: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  phoneInput: { width: "100%", padding: 12, borderWidth: 1, borderColor: "#BF32C1", borderRadius: 8, backgroundColor: "#f9f9f9", marginBottom: 15 },
  dobContainer: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  dobInput: { width: 60, padding: 12, borderWidth: 1, borderColor: "#BF32C1", borderRadius: 8, backgroundColor: "#f9f9f9", textAlign: "center"},
  dash: { marginHorizontal: 5, fontSize: 16, fontWeight: "bold" },
  cityPincodeContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  cityInput: { width: "45%", padding: 12, borderWidth: 1, borderColor: "#BF32C1", borderRadius: 8, backgroundColor: "#f9f9f9" },
  pincodeInput: { width: "47%", padding: 12, borderWidth: 1, borderColor: "#BF32C1", borderRadius: 8, backgroundColor: "#f9f9f9" },
  button: { width: "100%", padding: 15, backgroundColor: "#BF32C1", borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  namesfield:{width:'47.5%'},label:{color: 'orange', fontSize: 17.5, marginBottom: 2},
  imagePicker: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

export default EditProfile;