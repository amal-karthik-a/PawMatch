import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { RadioButton, Button, Divider, IconButton, Card } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { db } from './../../Config/FirebaseConfig';
import { serverTimestamp, collection, addDoc } from 'firebase/firestore';
import * as Location from 'expo-location';

const ReportPage = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [emergency, setEmergency] = useState('');
  const [idType, setIdType] = useState('Aadhar');
  const [document, setDocument] = useState(null);
  const [docName, setDocName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [images, setImages] = useState([]);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  const SERVER_URL = 'https://aadhaar-verifier-backend.onrender.com/verify-aadhaar';

  // Fetch current location on component mount
  useEffect(() => {
    console.log('Component Mounted - Initial State:', {
      name,
      email,
      phone,
      eventPlace,
      currentLocation, // Log new state
      emergency,
      idType,
      document,
      docName,
      aadhaarNumber,
      images,
      showVerification,
      verificationResult,
      extractedText,
      isVerifying,
      error,
    });

    // Function to get current location
    const getCurrentLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          Alert.alert('Permission Denied', 'Location permission is required to auto-fill the current location.');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // Reverse geocode to get readable address
        let address = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address.length > 0) {
          const { city, region, country } = address[0];
          const locationString = `${city || ''}, ${region || ''}, ${country || ''}`.trim();
          setCurrentLocation(locationString);
          console.log('Current Location Set:', locationString);
        } else {
          setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          console.log('Fallback to Coordinates:', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } catch (err) {
        console.error('Location Fetch Error:', err);
        setCurrentLocation('Unable to fetch location');
        Alert.alert('Error', 'Failed to fetch current location.');
      }
    };

    getCurrentLocation();
  }, []);

  const validateAadhaarNumber = (number) => {
    const isValid = /^\d{12}$/.test(number);
    console.log('Validating Aadhaar Number:', number, 'Is Valid:', isValid);
    return isValid;
  };

  const formatAadhaarNumber = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 12);
    console.log('Formatting Aadhaar Number - Input:', text, 'Output:', cleaned);
    setAadhaarNumber(cleaned);
  };

  const selectDocument = async () => {
    console.log('Selecting Document...');
    try {
      let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      console.log('Document Picker Result:', result);
      if (!result.canceled) {
        setDocument(result.assets[0].uri);
        setDocName(result.assets[0].name);
        setShowVerification(true);
        console.log('Document Selected - URI:', result.assets[0].uri, 'Name:', result.assets[0].name);
      } else {
        console.log('Document Selection Canceled');
      }
    } catch (err) {
      console.error('Document Picker Error:', err);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const verifyDocument = async () => {
    console.log('Verifying Document...');
    console.log('Current State Before Verification:', { aadhaarNumber, document, docName });
  
    if (!aadhaarNumber) {
      console.log('Verification Failed: Missing Aadhaar Number');
      Alert.alert('Missing Information', 'Please enter your Aadhaar number.');
      return;
    }
  
    if (!validateAadhaarNumber(aadhaarNumber)) {
      console.log('Verification Failed: Invalid Aadhaar Number');
      Alert.alert('Invalid Aadhaar Number', 'Aadhaar number must be exactly 12 digits.');
      return;
    }
  
    if (!document) {
      console.log('Verification Failed: No Document Uploaded');
      Alert.alert('Missing Document', 'Please upload an Aadhaar PDF.');
      return;
    }
  
    setIsVerifying(true);
    setError(null);
    console.log('Verification Started - isVerifying:', true);
  
    try {
      const formData = new FormData();
      const fileUri = Platform.OS === 'ios' ? document.replace('file://', '') : document; // Fixed line
      formData.append('file', {
        uri: fileUri,
        name: docName || `aadhaar-${Date.now()}.pdf`,
        type: 'application/pdf',
      });
      formData.append('aadhaarNumber', aadhaarNumber);
  
      console.log('FormData Prepared:', {
        fileUri,
        name: docName || `aadhaar-${Date.now()}.pdf`,
        aadhaarNumber,
      });
      console.log('Sending request to:', SERVER_URL);
  
      const response = await axios.post(SERVER_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
  
      console.log('Verification Response Received:', response.data);
      const { status, confidence, extractedText: rawText } = response.data;
      setVerificationResult({ status, confidence });
      setExtractedText(rawText || 'No text extracted');
      console.log('Verification Result Set:', { status, confidence, rawText });
    } catch (err) {
      console.error('Verification Error:', err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to verify document. Please check your connection and try again.';
      setError(errorMessage);
      console.log('Error Set:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsVerifying(false);
      console.log('Verification Complete - isVerifying:', false);
    }
  };
  const pickImages = async () => {
    console.log('Picking Images...');
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 1,
      });

      console.log('Image Picker Result:', result);
      if (!result.canceled) {
        const newImages = result.assets.map((img) => img.uri);
        setImages([...images, ...newImages]);
        console.log('Images Added:', newImages);
      } else {
        console.log('Image Selection Canceled');
      }
    } catch (err) {
      console.error('Image Picker Error:', err);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const removeImage = (index) => {
    console.log('Removing Image at Index:', index);
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    console.log('Updated Images:', newImages);
  };

  const fileReport = async () => {
    console.log('Filing Report...');
    console.log('Current State Before Filing:', {
      name,
      email,
      phone,
      eventPlace,
      currentLocation, // Include new field in log
      emergency,
      idType,
      document,
      docName,
      aadhaarNumber,
      images,
      verificationResult,
    });

    if (!name || !email || !phone || !eventPlace || !currentLocation || !idType || !document || !verificationResult) {
      console.log('Filing Failed: Missing Required Fields');
      Alert.alert('Error', 'Please complete all fields and verify the document before submitting.');
      return;
    }

    if (verificationResult?.status !== 'verified' && verificationResult?.status !== 'Valid Aadhaar') {
      console.log('Filing Failed: Verification Status Not Acceptable', verificationResult?.status);
      Alert.alert('Error', 'Document verification failed. Please check the details and try again.');
      return;
    }

    try {
      const reportData = {
        name,
        email,
        phone,
        eventPlace,
        currentLocation, // Add new field to report data
        emergency,
        idType,
        aadhaarNumber,
        documentUri: document,
        images,
        verificationResult,
        extractedText,
        createdAt: serverTimestamp(),
      };

      console.log('Attempting to save to Firebase with data:', reportData);
      const reportsCollection = collection(db, 'reports');
      const docRef = await addDoc(reportsCollection, reportData);
      console.log('Successfully saved to Firebase with Doc ID:', docRef.id);

      Alert.alert('Success', 'Report filed successfully and saved to Firebase!');

      // Reset form after successful submission
      setName('');
      setEmail('');
      setPhone('');
      setEventPlace('');
      setCurrentLocation(''); // Reset new field
      setEmergency('');
      setDocument(null);
      setDocName('');
      setAadhaarNumber('');
      setImages([]);
      setShowVerification(false);
      setVerificationResult(null);
      setExtractedText('');
      console.log('Form Reset After Successful Submission');
    } catch (error) {
      console.error('Firebase Save Error:', error);
      Alert.alert('Error', `Failed to save report to Firebase: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />

      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          This report is confidential and for internal use only. The reporter is responsible for the accuracy of the provided information. False reporting may lead to legal consequences.
        </Text>
      </Card>
      <Divider />

      {/* Input Fields */}
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Enter your name" />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Event</Text>
      <TextInput
        style={styles.input}
        value={eventPlace}
        onChangeText={setEventPlace}
        placeholder="Enter event"
      />

      {/* New Current Location Field */}
      <Text style={styles.label}>Current Location</Text>
      <TextInput
        style={styles.input}
        value={currentLocation}
        onChangeText={setCurrentLocation} // Allow manual edits if needed
        placeholder="Fetching current location..."
        editable={true} // User can edit if auto-fetch fails or they want to adjust
      />

      <Text style={styles.label}>Emergency Requirements</Text>
      <TextInput
        style={styles.textarea}
        value={emergency}
        onChangeText={setEmergency}
        placeholder="Specify any emergency needs"
        multiline
      />

      {/* Document Upload Section */}
      <View style={styles.radioUploadContainer}>
        <View style={styles.radioContainer}>
          <Text style={styles.label}>Reporter Authenticator</Text>
          <RadioButton.Group onValueChange={setIdType} value={idType}>
            <View style={styles.radioItem}>
              <RadioButton value="Aadhar" color="#68AFB3" />
              <Text>Aadhar</Text>
            </View>
          </RadioButton.Group>
        </View>

        <TouchableOpacity onPress={selectDocument} style={styles.uploadBox}>
          {document ? (
            <Text style={styles.uploadedFile}>{docName}</Text>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <MaterialIcons name="upload-file" size={40} color="#68afb3" />
              <Text style={styles.uploadText}>Upload Aadhaar PDF</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Verification Form */}
      {showVerification && idType === 'Aadhar' && (
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationTitle}>Verify Aadhaar Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Aadhaar Number (12 digits)"
            onChangeText={formatAadhaarNumber}
            value={aadhaarNumber}
            keyboardType="numeric"
            maxLength={12}
          />
          {isVerifying ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#68AFB3" />
              <Text style={styles.loadingText}>Verifying...</Text>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={verifyDocument}
              disabled={isVerifying}
              style={styles.verifyButton}
            >
              Verify Document
            </Button>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {verificationResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                Status:{' '}
                <Text style={verificationResult.status === 'verified' || verificationResult.status === 'Valid Aadhaar' ? styles.success : styles.failure}>
                  {verificationResult.status}
                </Text>
              </Text>
              <Text style={styles.resultText}>Confidence: {verificationResult.confidence?.toFixed(2)}%</Text>
              <ScrollView style={styles.textBox}>
                <Text selectable>{extractedText}</Text>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Image Upload Section */}
      <Text style={styles.label}>Upload Images</Text>
      <FlatList
        horizontal
        data={images}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item }} style={styles.image} />
            <TouchableOpacity style={styles.removeIcon} onPress={() => removeImage(index)}>
              <MaterialIcons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity onPress={pickImages} style={styles.iuploadBox}>
        <MaterialIcons name="cloud-upload" size={40} color="#68AFB3" />
        <Text style={styles.iuploadText}>Select Images To Upload</Text>
      </TouchableOpacity>

      <Button mode="contained" onPress={fileReport} style={styles.submitButton}>
        File Report
      </Button>
    </ScrollView>
  );
};

// Styles remain unchanged
const styles = {
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f9f9f9' },
  disclaimerCard: { backgroundColor: '#cce4e5', padding: 15, marginBottom: 20 },
  disclaimerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  disclaimerText: { fontSize: 14, color: 'gray' },
  label: { fontSize: 15, fontWeight: 'bold', marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#68AFB3', padding: 12, borderRadius: 8, backgroundColor: '#fff', marginTop: 5 },
  textarea: {
    borderWidth: 1,
    borderColor: '#68AFB3',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 5,
    height: 100,
    textAlignVertical: 'top',
  },
  iuploadBox: {
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#aaa',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginVertical: 10,
  },
  iuploadText: { color: 'gray', marginTop: 10 },
  submitButton: { marginTop: 20, backgroundColor: '#68AFB3', paddingVertical: 10, borderRadius: 8 },
  imageWrapper: { position: 'relative', marginRight: 10 },
  image: { width: 80, height: 80, borderRadius: 5 },
  removeIcon: { position: 'absolute', top: 1, right: 1, backgroundColor: 'gray', borderRadius: 20, padding: 3 },
  radioUploadContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  radioContainer: { flex: 1 },
  radioItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  uploadBox: {
    width: '50%',
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#aaa',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 50,
  },
  uploadText: { color: 'gray', marginTop: 10 },
  uploadedFile: { fontSize: 14, color: 'black', textAlign: 'center' },
  verificationContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#68AFB3',
  },
  verificationTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  verifyButton: { marginTop: 10, backgroundColor: '#68AFB3' },
  resultContainer: { marginTop: 10 },
  resultText: { fontSize: 14, marginBottom: 5 },
  textBox: { maxHeight: 150, borderWidth: 1, borderColor: '#eee', padding: 5, borderRadius: 4 },
  loadingContainer: { alignItems: 'center', marginVertical: 10 },
  loadingText: { marginTop: 5, color: '#666' },
  errorText: { color: '#d32f2f', marginVertical: 10, textAlign: 'center' },
  success: { color: '#2e7d32' },
  failure: { color: '#d32f2f' },
};

export default ReportPage;