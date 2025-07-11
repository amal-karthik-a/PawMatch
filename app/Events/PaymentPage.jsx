import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';

const PaymentPage = ({ event, onClose }) => {
  const [processing, setProcessing] = useState(false);
  const [upiId, setUpiId] = useState('');

  const generateTransactionId = () => {
    return `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  };

  const handlePayment = async () => {
    if (!upiId) {
      Alert.alert("Error", "Please enter your UPI ID");
      return;
    }

    setProcessing(true);

    try {
      // Mock UPI payment (for testing purposes only)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const transactionDetails = {
        transactionId: generateTransactionId(),
        eventId: event.id,
        price: event.registrationFee,
        status: 'success',
        userEmail: event.userEmail,
        dateOfPayment: new Date().toISOString().split('T')[0],
        timeOfPayment: new Date().toLocaleTimeString(),
      };
      Alert.alert("Success", "Payment processed successfully (mocked)!");
      onClose(true, transactionDetails);
    } catch (error) {
      console.error("Payment error:", error);
      const transactionDetails = {
        transactionId: generateTransactionId(),
        eventId: event.id,
        price: event.registrationFee,
        status: 'failed',
        userEmail: event.userEmail,
        dateOfPayment: new Date().toISOString().split('T')[0],
        timeOfPayment: new Date().toLocaleTimeString(),
      };
      Alert.alert("Error", "Payment processing failed: " + error.message);
      onClose(false, transactionDetails);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#e8f4f0", "#f5f5f5"]} style={styles.gradient}>
        <View style={styles.paymentCard}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => {
              const transactionDetails = {
                transactionId: generateTransactionId(),
                eventId: event.id,
                price: event.registrationFee,
                status: 'failed',
                userEmail: event.userEmail,
                dateOfPayment: new Date().toISOString().split('T')[0],
                timeOfPayment: new Date().toLocaleTimeString(),
              };
              onClose(false, transactionDetails);
            }}
            disabled={processing}
          >
            <Ionicons name="close" size={24} color="#255957" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Payment for {event.name}</Text>
          <Text style={styles.detail}>Organizer: {event.organizer}</Text>
          <Text style={styles.detail}>Amount: {event.registrationFee}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter UPI ID (e.g., user@bank)"
            placeholderTextColor="#255957"
            value={upiId}
            onChangeText={setUpiId}
          />
          
          <TouchableOpacity 
            style={[styles.payButton, processing && styles.disabledButton]} 
            onPress={handlePayment}
            disabled={processing}
          >
            <LinearGradient
              colors={["#a8e6cf", "#255957"]}
              style={styles.payButtonGradient}
            >
              <Text style={styles.payButtonText}>
                {processing ? "Processing..." : "Pay with UPI"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    width: "80%",
    elevation: 5,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#255957",
    marginBottom: 15,
    textAlign: "center",
  },
  detail: {
    fontSize: 16,
    color: "#255957",
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#255957',
    borderRadius: 5,
    marginBottom: 10,
    color: '#255957',
  },
  payButton: {
    marginTop: 20,
    borderRadius: 25,
  },
  payButtonGradient: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default PaymentPage;