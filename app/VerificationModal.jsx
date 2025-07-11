import React, { useState, useRef } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert 
} from "react-native";

const VerificationModal = ({ isVisible, email, generatedCode, onVerifySuccess, onFailure }) => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef([]);

  const handleChangeText = (text, index) => {
    if (text.length > 1) return;
    let newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    
    if (text && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleVerify = () => {
    const enteredCode = code.join("");
    if (enteredCode === generatedCode) {
      Alert.alert("Success", "Verification successful!");
      setAttempts(0);
      onVerifySuccess();
    } else {
      let newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        Alert.alert("Account Creation Failed", "Too many incorrect attempts.");
        onFailure();
      } else {
        Alert.alert("Error", `Incorrect code. ${5 - newAttempts} attempts left.`);
      }
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onFailure}>
            <Text style={styles.closeButtonText}>✖</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Verify Your Email</Text>
          <Text style={styles.infoText}>
            A verification code has been sent to {email || "your email"}
          </Text>

          <View style={styles.inputContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.input}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                autoFocus={index === 0}
              />
            ))}
          </View>

          <TouchableOpacity onPress={handleVerify} style={styles.button}>
            <Text style={styles.buttonText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { 
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" 
  },
  modalContent: { 
    width: 320, padding: 20, backgroundColor: "#fff", borderRadius: 12, alignItems: "center", 
    position: "relative"
  },
  closeButton: { 
    position: "absolute", top: 10, right: 10, padding: 5 
  },
  closeButtonText: { 
    fontSize: 20, fontWeight: "bold", color: "rgba(230, 13, 13, 0.7)" 
  },
  modalTitle: { 
    fontSize: 20, fontWeight: "bold", marginBottom: 10 
  },
  infoText: { 
    fontSize: 14, textAlign: "center", marginBottom: 10, color: "gray" 
  },
  inputContainer: { 
    flexDirection: "row", justifyContent: "center", marginBottom: 15 
  },
  input: {
    width: 40, height: 50, marginHorizontal: 5, borderWidth: 2, borderRadius: 8,
    textAlign: "center", fontSize: 18, fontWeight: "bold", borderColor: "#BF32C1",
  },
  button: { 
    padding: 15, backgroundColor: "rgba(16, 83, 72, 0.61)", borderRadius: 8, alignItems: "center", width: "80%" 
  },
  buttonText: { 
    color: "#fff", fontWeight: "bold", fontSize: 16 
  },
});

export default VerificationModal;