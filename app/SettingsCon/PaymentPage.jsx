import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Modal } from 'react-native';
import { WebView } from 'react-native-webview';

const BACKEND_URL = 'https://paymentbackend-q91e.onrender.com'; // Your backend URL

const PaymentPage = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const initiatePayment = async () => {
    console.log('Button pressed, amount:', amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      console.log('Fetching payment link from backend...');
      const response = await fetch(`${BACKEND_URL}/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (!data.success) {
        Alert.alert('Error', data.message);
        return;
      }

      console.log('Opening Razorpay WebView with URL:', data.payment_link);
      setPaymentUrl(data.payment_link);
      setModalVisible(true);
    } catch (error) {
      console.error('Payment Error:', error);
      Alert.alert('Error', `Payment failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Make a Payment</Text>
      <TextInput
        placeholder="Enter amount (e.g., 10.00)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={styles.input}
      />
      <TouchableOpacity onPress={initiatePayment} style={styles.button}>
        <Text style={styles.buttonText}>Pay with Razorpay</Text>
      </TouchableOpacity>

      {/* Razorpay WebView Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.webviewContainer}>
          {paymentUrl && (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={(navState) => {
                console.log('WebView Navigation:', navState.url);

                if (navState.url.includes('payment-success')) {
                  setModalVisible(false);
                  Alert.alert('Success', 'Payment completed!');
                  navigation.navigate('TransactionHistory');
                } else if (navState.url.includes('payment-failure')) {
                  setModalVisible(false);
                  Alert.alert('Error', 'Payment failed.');
                }
              }}
            />
          )}
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginVertical: 10, borderRadius: 5 },
  button: { backgroundColor: '#6a1b9a', padding: 10, marginVertical: 10, borderRadius: 5 },
  buttonText: { color: 'white', textAlign: 'center' },
  webviewContainer: { flex: 1, backgroundColor: 'white', marginTop: 50 },
  closeButton: { backgroundColor: 'red', padding: 10, margin: 20, borderRadius: 5 },
});

export default PaymentPage;
