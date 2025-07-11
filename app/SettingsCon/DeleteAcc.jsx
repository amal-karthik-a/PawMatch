import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, SafeAreaView, Image, KeyboardAvoidingView, ScrollView, Platform
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth, deleteUser } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import LottieView from 'lottie-react-native';
import VerificationPopUp from './../VerificationModal';

const DeleteAccount = () => {
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [ReasonDel, setReasonDel] = useState("");

  const handleDeleteAccount = async () => {
    if (confirmationText !== "DELETE") {
      Alert.alert("Error", 'Please type "DELETE" to confirm.');
      return;
    }

    if (user) {
      try {
        await deleteUser(user);
        setIsDeleting(true);
        
        // After animation ends, navigate to login
        setTimeout(() => {
          setIsDeleting(false);
          router.replace("/login");
        }, 2500); 
      } catch (error) {
        Alert.alert("Error", error.message);
      }
    } else {
      setIsDeleting(true);
        
        // After animation ends, navigate to login
        setTimeout(() => {
          setIsDeleting(false);
          router.replace("/login");
        }, 2500); 
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
       
        {/* Lottie Animation and Warning on Same Line */}
        <View style={styles.headerRow}>
          <LottieView
            source={require('./../../assets/Animations/dac.json')}
            autoPlay
            loop={false}
            style={styles.lottie1}
          />
          <View style={styles.warningCard}>
            <Ionicons name="warning" size={30} color="#D32F2F" style={styles.warningIcon} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningText}>
                <Text style={styles.bold}>WARNING:</Text> This action is <Text style={styles.bold}>permanent</Text> and cannot be undone.
                All your data, including pet profiles, will be <Text style={styles.bold}>erased forever</Text>.
              </Text>
            </View>
          </View>
        </View>

        {/* Reason for Deletion */}
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonText}>
            A verification code will be sent to your registered email for confirmation.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for Account Deletion"
            value={ReasonDel}
            onChangeText={setReasonDel}
            placeholderTextColor="#666"
          />
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <Text style={styles.instructions}>
            To confirm deletion, type <Text style={styles.bold}>"DELETE"</Text> below:
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Type DELETE to confirm"
            value={confirmationText}
            onChangeText={setConfirmationText}
            autoCapitalize="characters"
            placeholderTextColor="#666"
          />

          {/* Delete Button */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash" size={23} color="#fff" />
            <Text style={styles.deleteButtonText}>Permanently Delete</Text>
          </TouchableOpacity>
        </View>

        <Modal transparent={true} visible={isDeleting} animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <LottieView
                source={require("./../../assets/Animations/da.json")} 
                autoPlay
                loop={false}
                style={styles.lottie}
              />
              <Text style={styles.modalText}>Account Deleted Successfully</Text>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff", width: "100%" },
  scrollView: { flexGrow: 1, paddingHorizontal: 20, alignItems: "center" },

  backArrow: { position: "absolute", top: 20, left: 20, zIndex: 10 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 50,
  },

  lottie1: { 
    width: 120, 
    height: 120,
  },

  /* Warning Box */
  warningCard: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(255, 50, 50, 0.12)",
    padding: 10,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#68AFB3",
    shadowColor: "#68AFB3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    marginLeft: 10,
  },
  warningIcon: {
    marginRight: 8,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningText: {
    fontSize: 14,
    color: "#B71C1C",
    lineHeight: 20,
  },
  bold: {
    fontWeight: "bold",
    color: "#D32F2F",
  },

  /* Modal */
  modalContainer: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "rgba(0, 0, 0, 0.5)"
  },
  modalContent: {
    backgroundColor: "white", 
    padding: 20, 
    borderRadius: 10, 
    alignItems: "center"
  },
  lottie: { 
    width: 150, 
    height: 150 
  },
  modalText: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginTop: 10 
  },

  /* Form */
  formContainer: {
    width: "100%",
    padding: 20,
    borderRadius: 15,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
    marginTop: 20,
  },

  instructions: { 
    fontSize: 16, 
    textAlign: "center", 
    marginVertical: 20, 
    color: "rgba(1, 1, 1, 0.7)"
  },

  input: { 
    width: "100%", 
    padding: 12, 
    borderWidth: 1.5, 
    borderColor: "#68AFB3", 
    borderRadius: 8, 
    backgroundColor: "#f9f9f9", 
    textAlign: "center", 
    color: "rgba(182, 41, 41, 0.9)", 
    fontWeight: "600",
    marginBottom: 15
  },

  deleteButton: { 
    marginTop: 10, 
    padding: 15, 
    backgroundColor: "#68AFB3", 
    borderRadius: 8, 
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10
  },
  deleteButtonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },

  /* Reason for Deletion */
  reasonContainer: {
    width: "100%",
    padding: 15,
    borderRadius: 15,
    backgroundColor: "rgba(255, 243, 243, 1)",
  },
  reasonText: { 
    fontSize: 14, 
    color: "rgba(235, 70, 70, 0.81)", 
    marginBottom: 10, 
    textAlign: "center" 
  },
});

export default DeleteAccount;