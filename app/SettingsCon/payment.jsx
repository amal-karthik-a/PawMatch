import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Linking } from 'react-native';

const handlePayment = async () => {
  const upiId = "amal007vadakkedath@oksbi";
  const amount = "10.00"; 
  const name = "Amal Karthik"; // Receiver/Merchant Name
  
  const upiUrl = `upi://pay?pa=${upiId}&pn=${name}&mc=&tid=&tr=&tn=Payment&am=${amount}&cu=INR`;

  const supported = await Linking.canOpenURL(upiUrl);

  if (supported) {
    await Linking.openURL(upiUrl);
  } else {
    Alert.alert("Error", "No UPI app found. Please install Google Pay or another UPI app.");
  }
};

const PaymentPage = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make Payment</Text>
      <TouchableOpacity onPress={handlePayment} style={styles.payButton}>
        <Text style={styles.payText}>Proceed to Pay</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE4EC',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  payButton: {
    backgroundColor: '#25D366',
    padding: 15,
    borderRadius: 5,
  },
  payText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentPage;
