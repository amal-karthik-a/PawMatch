import React, { useState } from 'react';
import { View, Button, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

const App = () => {
  const [dogName, setDogName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [dob, setDob] = useState('');
  const [chipNumber, setChipNumber] = useState('');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [result, setResult] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const pickDocument = async () => {
    try {
      if (!dogName || !ownerName || !dob || !chipNumber || !certificateNumber) {
        Alert.alert("Missing Information", "Please fill in all fields before uploading the document.");
        return;
      }

      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });

      if (res.canceled) return;
      const file = res.assets[0];

      setIsUploading(true); // Start loading

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: 'application/pdf',
      });

      // Add user-entered details to the request
      formData.append('dogName', dogName);
      formData.append('ownerName', ownerName);
      formData.append('dob', dob);
      formData.append('chipNumber', chipNumber);
      formData.append('certificateNumber', certificateNumber);

      console.log("Uploading file:", file.name);
      console.log("User Input:", { dogName, ownerName, dob, chipNumber, certificateNumber });

      // ✅ Updated to use your local IPv4 address `10.0.0.182`
      const response = await axios.post('http://10.0.0.182:4000/verify-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("API Response:", response.data);

      setResult(response.data);
      setExtractedText(response.data.extractedText || 'No text extracted');
      
    } catch (err) {
      console.error("Upload Error:", err);
      Alert.alert("Error", "Failed to upload or verify the document.");
    } finally {
      setIsUploading(false); // Stop loading
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dog Certificate Verifier 🐶</Text>

      {/* Input Fields */}
      <TextInput style={styles.input} placeholder="Dog Name" onChangeText={setDogName} value={dogName} />
      <TextInput style={styles.input} placeholder="Owner Name" onChangeText={setOwnerName} value={ownerName} />
      <TextInput style={styles.input} placeholder="Date of Birth (YYYY-MM-DD)" onChangeText={setDob} value={dob} />
      <TextInput style={styles.input} placeholder="Microchip Number" onChangeText={setChipNumber} value={chipNumber} />
      <TextInput style={styles.input} placeholder="Certificate Number" onChangeText={setCertificateNumber} value={certificateNumber} />

      {isUploading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        <Button title="Upload Certificate PDF" onPress={pickDocument} />
      )}

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.statusText}>Status: {result.status}</Text>
          <Text style={styles.confidenceText}>Confidence: {result.confidence}%</Text>
          
          <Text style={styles.header}>Extracted Text:</Text>
          <ScrollView style={styles.textBox}>
            <Text>{extractedText}</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, padding: 8, marginVertical: 5, borderRadius: 5 },
  resultContainer: { marginTop: 20 },
  statusText: { fontSize: 16, fontWeight: 'bold' },
  confidenceText: { fontSize: 14, color: 'green' },
  header: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  textBox: { height: 200, backgroundColor: '#f5f5f5', padding: 10, marginTop: 5, borderRadius: 5 },
});

export default App;
