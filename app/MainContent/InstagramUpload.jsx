import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const InstagramPostPage = () => {
  const [instagramId, setInstagramId] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Replace with your actual Facebook App credentials
  const APP_ID = 'YOUR_APP_ID';
  const APP_SECRET = 'YOUR_APP_SECRET';
  const REDIRECT_URI = 'YOUR_REDIRECT_URI';

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadToInstagram = async () => {
    if (!instagramId || !selectedImage) {
      Alert.alert('Error', 'Please provide Instagram ID and select an image');
      return;
    }

    setLoading(true);

    try {
      // Get access token (in production, this should be stored securely and refreshed)
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Failed to get access token');

      // Convert image URI to Blob
      const response = await fetch(selectedImage);
      const blob = await response.blob();

      // Step 1: Create media container
      const containerResponse = await fetch(
        `https://graph.instagram.com/v20.0/${instagramId}/media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: selectedImage, // In reality, you'd need to upload to a public URL first
            caption: 'Posted via my app! #reactnative',
          }),
        }
      );

      const containerData = await containerResponse.json();
      if (!containerData.id) throw new Error('Failed to create media container');

      // Step 2: Publish the container
      const publishResponse = await fetch(
        `https://graph.instagram.com/v20.0/${instagramId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: containerData.id,
          }),
        }
      );

      const publishData = await publishResponse.json();
      if (publishData.id) {
        Alert.alert('Success', 'Image posted to Instagram successfully!');
        setInstagramId('');
        setSelectedImage(null);
      } else {
        throw new Error('Failed to publish post');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to upload to Instagram');
    } finally {
      setLoading(false);
    }
  };

  const getAccessToken = async () => {
    // In a real app, implement proper OAuth flow and token refresh
    // This is a simplified version - store and retrieve token securely
    try {
      const storedToken = await AsyncStorage.getItem('instagramAccessToken');
      if (storedToken) return storedToken;

      // This is a placeholder - implement actual OAuth flow
      const tokenResponse = await fetch(
        `https://api.instagram.com/oauth/access_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `client_id=${APP_ID}&client_secret=${APP_SECRET}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}&code=YOUR_AUTH_CODE`,
        }
      );
      
      const tokenData = await tokenResponse.json();
      if (tokenData.access_token) {
        await AsyncStorage.setItem('instagramAccessToken', tokenData.access_token);
        return tokenData.access_token;
      }
    } catch (error) {
      console.error('Token error:', error);
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('./../../assets/Animations/LoadingCha.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>
      ) : (
        <>
          <Text style={styles.title}>Post to Instagram</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter Instagram User ID"
            value={instagramId}
            onChangeText={setInstagramId}
            keyboardType="numeric"
          />

          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Text style={styles.imagePickerText}>
              {selectedImage ? 'Change Image' : 'Select Image'}
            </Text>
          </TouchableOpacity>

          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          )}

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={uploadToInstagram}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>Post to Instagram</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  imagePicker: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 200,
    height: 200,
  },
});

export default InstagramPostPage;