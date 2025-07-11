import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';
import { db, auth } from './../../Config/FirebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import { s3, S3_BUCKET } from './../../aws-config';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function MissingPage() {
  const [dogImage, setDogImage] = useState(null);
  const [dogName, setDogName] = useState('');
  const [breed, setBreed] = useState('');
  const [missingDate, setMissingDate] = useState('');
  const [missingTime, setMissingTime] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [uploading, setUploading] = useState(false);

  // Location-related states
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial location setup
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setMarker({ latitude, longitude });

      try {
        let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addressResponse.length > 0) {
          const loc = addressResponse[0];
          setCity(loc.city || '');
          setState(loc.region || '');
          setCountry(loc.country || '');
          setAddress(loc.street || loc.name || '');
          setPincode(loc.postalCode || '');
          setSelectedAddress(
            `${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ''}, ${loc.country}`
          );
        }
      } catch (error) {
        console.error('Error reverse geocoding initial location:', error);
      }

      setLoading(false);
    })();
  }, []);

  // Convert URI to Blob for S3 upload
  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob;
  };

  // Upload image to S3
  const handleImageUpload = async () => {
    if (!dogImage) {
      Alert.alert('Upload Error', 'No image selected.');
      return null;
    }

    const fileName = `missing-dogs/dog-${Date.now()}.jpg`;
    const fileBlob = await uriToBlob(dogImage);

    const params = {
      Bucket: S3_BUCKET,
      Key: fileName,
      Body: fileBlob,
      ContentType: 'image/jpeg',
    };

    return new Promise((resolve, reject) => {
      s3.upload(params, (err, data) => {
        if (err) {
          Alert.alert('Upload Failed', 'An error occurred while uploading the image.');
          reject(err);
        } else {
          resolve(data.Location);
        }
      });
    });
  };

  // Pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1,1],
      quality: 1,
    });

    if (!result.canceled) {
      setDogImage(result.assets[0].uri);
    }
  };

  // Location handling functions
  const handleLocationSelect = async (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setRegion((prevRegion) => ({ ...prevRegion, latitude, longitude }));
    setMarker({ latitude, longitude });

    try {
      let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addressResponse.length > 0) {
        const loc = addressResponse[0];
        setCity(loc.city || '');
        setState(loc.region || '');
        setCountry(loc.country || '');
        setAddress(loc.street || loc.name || '');
        setPincode(loc.postalCode || '');
        setSelectedAddress(
          `${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ''}, ${loc.country}`
        );
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addressResponse.length > 0) {
        const loc = addressResponse[0];
        setCity(loc.city || '');
        setState(loc.region || '');
        setCountry(loc.country || '');
        setAddress(loc.street || loc.name || '');
        setPincode(loc.postalCode || '');
        setSelectedAddress(
          `${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ''}, ${loc.country}`
        );
      }

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setMarker({ latitude, longitude });
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a location to search.');
      return;
    }

    try {
      setLoading(true);
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setMarker({ latitude, longitude });

        const addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addressResponse.length > 0) {
          const loc = addressResponse[0];
          setCity(loc.city || '');
          setState(loc.region || '');
          setCountry(loc.country || '');
          setAddress(loc.street || loc.name || '');
          setPincode(loc.postalCode || '');
          setSelectedAddress(
            `${loc.street || loc.name}, ${loc.city}, ${loc.region}, ${loc.postalCode || ''}, ${loc.country}`
          );
        }
      } else {
        Alert.alert('Location Not Found', 'No results found for the search query.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search location.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Function to auto-fill current date and time
  const fillCurrentDateTime = () => {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
    setMissingDate(dateString);
    setMissingTime(timeString);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!auth.currentUser) {
      Alert.alert('Authentication Error', 'You need to be logged in to submit a report.');
      return;
    }

    if (!dogName || !breed || !missingDate || !missingTime || !dogImage || !gender || !marker || !age) {
      Alert.alert('Validation Error', 'Please fill all required fields, including age, select a gender, upload an image, and select a location!');
      return;
    }

    setUploading(true);

    try {
      const imageUrl = await handleImageUpload();
      if (!imageUrl) {
        throw new Error('Image upload failed.');
      }

      const userId = auth.currentUser.email;
      const currentDateTime = new Date();
      const dateOfNotification = currentDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = currentDateTime.toTimeString().split(' ')[0].slice(0, 5); // HH:MM

      const reportData = {
        dogName,
        breed,
        location: {
          latitude: marker.latitude,
          longitude: marker.longitude,
          address: selectedAddress,
          city: city || '',
          state: state || '',
          country: country || '',
          pincode: pincode || '',
        },
        latitude: marker.latitude,
        longitude: marker.longitude,
        missingDate,
        missingTime,
        description: description || '',
        reward: reward || '',
        gender,
        age,
        imageUrl,
        createdAt: currentDateTime.toISOString(),
        userId,
        Active: "Y",
      };

      // Add to Missing collection
      const missingDocRef = await addDoc(collection(db, 'Missing'), reportData);

      // Add to Notifications collection
      const notificationData = {
        msg: `${dogName} has been reported missing! Please help find ${gender === 'Male' ? 'him' : 'her'} last seen at ${selectedAddress}`,
        imageUrl: imageUrl,
        name: dogName,
        dateOfNotification: dateOfNotification,
        time: time,
        type: "GeneralMissing",
        relatedDocId: missingDocRef.id, // Optional: Link to the missing report
        createdAt: currentDateTime.toISOString(),
        userId: userId,
      };

      await addDoc(collection(db, 'Notifications'), notificationData);

      Alert.alert('Success', 'Report submitted successfully and notification created!');

      // Reset form fields
      setDogImage(null);
      setDogName('');
      setBreed('');
      setMissingDate('');
      setMissingTime('');
      setDescription('');
      setReward('');
      setGender('');
      setAge('');
      setRegion(null);
      setMarker(null);
      setSelectedAddress('');
      setCity('');
      setState('');
      setCountry('');
      setAddress('');
      setPincode('');
      setSearchQuery('');
    } catch (error) {
      console.error('Error submitting report or creating notification:', error);
      Alert.alert('Submission Failed', error.message || 'An unknown error occurred.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <Text style={styles.title}>Report a Missing Dog</Text>
      </Animatable.View>

      {/* Image Upload */}
      <Animatable.View animation="fadeInUp" delay={200} style={styles.card}>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text style={styles.imageButtonText}>Upload Dog's Photo</Text>
        </TouchableOpacity>
        {dogImage && (
          <Animatable.Image
            animation="zoomIn"
            source={{ uri: dogImage }}
            style={styles.imagePreview}
          />
        )}
      </Animatable.View>

      {/* Form Fields */}
      <Animatable.View animation="fadeInUp" delay={400} style={styles.card}>
        <Text style={styles.label}>Dog's Name</Text>
        <TextInput
          style={styles.input}
          value={dogName}
          onChangeText={setDogName}
          placeholder="Enter dog's name"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={600} style={styles.card}>
        <Text style={styles.label}>Breed Type</Text>
        <TextInput
          style={styles.input}
          value={breed}
          onChangeText={setBreed}
          placeholder="Enter dog's breed (e.g., Labrador)"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={800} style={styles.card}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderContainer}>
          {['Male', 'Female'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.genderButton,
                gender === option && styles.genderButtonSelected,
              ]}
              onPress={() => setGender(option)}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  gender === option && styles.genderButtonTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animatable.View>

      {/* Age Input Field */}
      <Animatable.View animation="fadeInUp" delay={900} style={styles.card}>
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="Enter dog's age (e.g., 2 years)"
          keyboardType="numeric"
        />
      </Animatable.View>

      {/* Location Section */}
      <Animatable.View animation="fadeInUp" delay={1000} style={styles.card}>
        <Text style={styles.label}>Add Missing Location</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleLocationSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleLocationSearch}>
            <Ionicons name="search" size={20} color="#68afb3" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#68afb3" style={styles.loader} />
        ) : (
          region && (
            <MapView
              style={styles.map}
              region={region}
              onPress={handleLocationSelect}
              showsUserLocation
            >
              {marker && <Marker coordinate={marker} />}
            </MapView>
          )
        )}

        <View style={styles.locationContainer}>
          <TouchableOpacity style={styles.locationIcon} onPress={getCurrentLocation}>
            <Ionicons name="location-outline" size={24} color="#68afb3" />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={styles.input}
            placeholder="Pincode"
            value={pincode}
            onChangeText={setPincode}
            keyboardType="numeric"
          />
          <View style={styles.stateCountryContainer}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="State"
              value={state}
              onChangeText={setState}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Country"
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>

        {selectedAddress ? <Text style={styles.address}>{selectedAddress}</Text> : null}
      </Animatable.View>

      {/* Date of Missing with Auto-Fill Icon */}
      <Animatable.View animation="fadeInUp" delay={1200} style={styles.card}>
        <Text style={styles.label}>Date of Missing</Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            style={[styles.input, styles.inputWithIconText]}
            value={missingDate}
            onChangeText={setMissingDate}
            placeholder="e.g., 2025-03-23"
          />
          <TouchableOpacity style={styles.iconButton} onPress={fillCurrentDateTime}>
            <Ionicons name="calendar-outline" size={24} color="#68afb3" />
          </TouchableOpacity>
        </View>
      </Animatable.View>

      {/* Time of Missing with Auto-Fill Icon */}
      <Animatable.View animation="fadeInUp" delay={1400} style={styles.card}>
        <Text style={styles.label}>Time of Missing</Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            style={[styles.input, styles.inputWithIconText]}
            value={missingTime}
            onChangeText={setMissingTime}
            placeholder="e.g., 14:30"
          />
          <TouchableOpacity style={styles.iconButton} onPress={fillCurrentDateTime}>
            <Ionicons name="time-outline" size={24} color="#68afb3" />
          </TouchableOpacity>
        </View>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={1600} style={styles.card}>
        <Text style={styles.label}>Reward (Optional)</Text>
        <TextInput
          style={styles.input}
          value={reward}
          onChangeText={setReward}
          placeholder="Enter reward amount (e.g., $100)"
          keyboardType="numeric"
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={1800} style={styles.card}>
        <Text style={styles.label}>Additional Details</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Unique marks, instructions"
          multiline
        />
      </Animatable.View>

      {/* Submit Button */}
      <Animatable.View animation="fadeInUp" delay={2000} style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          <Text style={styles.submitButtonText}>
            {uploading ? 'Submitting...' : 'Submit Report'}
          </Text>
        </TouchableOpacity>
      </Animatable.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f8',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#68afb3',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithIconText: {
    flex: 1,
    marginBottom: 0,
  },
  iconButton: {
    padding: 10,
    marginLeft: 10,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#fafafa',
  },
  genderButtonSelected: {
    backgroundColor: '#4a90e2',
    borderColor: '#4a90e2',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#444',
  },
  genderButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imageButton: {
    backgroundColor: '#ff6f61',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: 200,
    height: 150,
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 8,
  },
  buttonContainer: {
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#a0c4ff',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#68afb3',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  searchButton: {
    padding: 10,
    marginLeft: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#68afb3',
  },
  map: {
    width: '100%',
    height: 250,
    marginBottom: 10,
    borderRadius: 10,
  },
  locationContainer: {
    marginTop: 15,
  },
  locationIcon: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    padding: 5,
  },
  stateCountryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  address: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 20,
    alignSelf: 'center',
  },
});