import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db, auth } from './../../Config/FirebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { s3, S3_BUCKET } from './../../aws-config';
import LottieView from 'lottie-react-native';

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [lastVisible, setLastVisible] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSendingImages, setIsSendingImages] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [userProfilePics, setUserProfilePics] = useState({});
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentUser = auth.currentUser;

  const { currentUserId, otherUserId } = params;
  const chatRoomId = [currentUserId, otherUserId].sort().join('_');

  const flatListRef = useRef(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    console.log('ChatPage mounted with chatRoomId:', chatRoomId);

    if (currentUserId === otherUserId) {
      Alert.alert("Info", "User cannot chat with oneself.");
      router.back();
      return;
    }

    const fetchUserName = async () => {
      const userDocRef = doc(db, 'ChatUsers', otherUserId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const { fname, lname, propic } = userDoc.data();
        setOtherUserName(`${fname} ${lname}`);
        setUserProfilePics((prev) => ({ ...prev, [otherUserId]: propic || null }));
      } else {
        setOtherUserName(otherUserId);
      }

      const currentUserDocRef = doc(db, 'ChatUsers', currentUserId);
      const currentUserDoc = await getDoc(currentUserDocRef);
      if (currentUserDoc.exists()) {
        const { propic } = currentUserDoc.data();
        setUserProfilePics((prev) => ({ ...prev, [currentUserId]: propic || null }));
      }
    };
    fetchUserName();

    setMessages([]);
    setLastVisible(null);
    setLoading(true);

    if (!currentUserId || !otherUserId || !currentUser) {
      setError('Missing user IDs or not authenticated');
      setLoading(false);
      return;
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const messagesRef = collection(db, 'Chats', chatRoomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawMessageList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const uniqueMessageList = rawMessageList.filter(
        (item, index, self) => index === self.findIndex((t) => t.id === item.id)
      ).reverse();
      setMessages(uniqueMessageList);
      setLastVisible(snapshot.docs[0] || null);
      setLoading(false);

      if (uniqueMessageList.length > 0) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    }, (error) => {
      setError('Failed to load messages');
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentUserId, otherUserId, currentUser, chatRoomId]);

  const loadMoreMessages = async () => {
    if (!lastVisible || isLoadingMore) return;

    setIsLoadingMore(true);
    const messagesRef = collection(db, 'Chats', chatRoomId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(10));

    try {
      const snapshot = await getDocs(q);
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).reverse();
      setMessages((prev) => {
        const combined = [...prev, ...newMessages];
        const unique = combined.filter(
          (item, index, self) => index === self.findIndex((t) => t.id === item.id)
        );
        return unique;
      });
      setLastVisible(snapshot.docs[0] || lastVisible);
    } catch (error) {
      console.error('Error loading more messages:', error.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const sendMessage = async (text = messageText, locationData = null, textLinks = []) => {
    if ((!text.trim() && !locationData && textLinks.length === 0) || !currentUser) return;

    try {
      const messagesRef = collection(db, 'Chats', chatRoomId, 'messages');
      const newMessage = {
        text: text || '',
        location: locationData || null,
        textLink: textLinks.length > 0 ? textLinks : null,
        senderId: currentUserId,
        timestamp: serverTimestamp(),
      };
      await addDoc(messagesRef, newMessage);

      const metadataRef = doc(db, 'Chats', chatRoomId);
      await updateDoc(metadataRef, {
        'metadata.lastMessage': text || (locationData ? 'Shared location' : textLinks.length > 0 ? 'Shared images' : ''),
        'metadata.lastMessageTimestamp': serverTimestamp(),
      }, { merge: true });

      setMessageText('');
      setSelectedLocation(null);
      setSelectedImages([]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const sendTextOnly = async () => {
    if (!messageText.trim() || !currentUser) return;

    try {
      const messagesRef = collection(db, 'Chats', chatRoomId, 'messages');
      const newMessage = {
        text: messageText.trim(),
        senderId: currentUserId,
        timestamp: serverTimestamp(),
      };
      await addDoc(messagesRef, newMessage);

      const metadataRef = doc(db, 'Chats', chatRoomId);
      await updateDoc(metadataRef, {
        'metadata.lastMessage': messageText.trim(),
        'metadata.lastMessageTimestamp': serverTimestamp(),
      }, { merge: true });

      setMessageText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setError('Failed to send text-only message');
    }
  };

  const sendLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access location was denied');
      return;
    }

    Alert.alert(
      'Select Location',
      'Choose an option',
      [
        { text: 'Use Current Location', onPress: handleCurrentLocation },
        { text: 'Pick on Map', onPress: () => setSelectedLocation({ latitude: null, longitude: null }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCurrentLocation = async () => {
    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    processLocation({ latitude, longitude });
  };

  const processLocation = async (coords) => {
    const { latitude, longitude } = coords;
    let address = await Location.reverseGeocodeAsync({ latitude, longitude });
    const [addressObj] = address;
    const locationData = {
      city: addressObj?.city || 'Unknown',
      street: addressObj?.street || 'Unknown',
      pincode: addressObj?.postalCode || 'Unknown',
      state: addressObj?.region || 'Unknown',
      country: addressObj?.country || 'Unknown',
      combinedAddress: `${addressObj?.street || ''}, ${addressObj?.city || ''}, ${addressObj?.region || ''}, ${addressObj?.country || ''}, ${addressObj?.postalCode || ''}`.trim(),
      latitude,
      longitude,
    };
    sendMessage('Shared location', locationData);
  };

  const uriToBlob = async (uri) => {
    const response = await fetch(uri);
    return await response.blob();
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access gallery is required!');
      return false;
    }
    return true;
  };

  const handleImageUpload = async (uri) => {
    try {
      const fileName = `image-${Date.now()}.jpg`;
      const fileBlob = await uriToBlob(uri);
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: fileBlob,
        ContentType: 'image/jpeg',
      };
      return new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data.Location);
          }
        });
      });
    } catch (error) {
      return null;
    }
  };

  const pickImages = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImages(result.assets.map(asset => asset.uri));
    }
  };

  const removeImage = (uri) => {
    setSelectedImages(selectedImages.filter(img => img !== uri));
  };

  const sendSelectedImages = async () => {
    if (selectedImages.length === 0) return;

    setIsSendingImages(true);
    try {
      const uploadPromises = selectedImages.map(uri => handleImageUpload(uri));
      const textLinks = await Promise.all(uploadPromises);
      const validTextLinks = textLinks.filter(url => url !== null);
      if (validTextLinks.length > 0) {
        sendMessage(messageText, null, validTextLinks);
      }
    } catch (error) {
      setError('Failed to send images');
    } finally {
      setIsSendingImages(false);
      setSelectedImages([]);
    }
  };

  const renderMessage = ({ item }) => {
    const isSent = item.senderId === currentUserId;
    const profilePic = userProfilePics[item.senderId] || 'https://via.placeholder.com/40';

    return (
      <View
        style={[
          styles.messageRow,
          isSent ? styles.sentRow : styles.receivedRow,
        ]}
      >
        {!isSent && (
          <Image
            source={{ uri: profilePic }}
            style={styles.profilePic}
            onError={(e) => console.log('Profile pic load error:', e.nativeEvent.error)}
          />
        )}
        <View
          style={[
            styles.messageContainer,
            isSent ? styles.sentMessage : styles.receivedMessage,
            (!item.text || item.text === 'Shared location') && !item.location ? styles.noBackground : null,
          ]}
        >
          {item.textLink && Array.isArray(item.textLink) && item.textLink.length > 0 && (
            <View style={styles.imageContainer}>
              {item.textLink.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={styles.image}
                  onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                />
              ))}
            </View>
          )}
          {item.location && (
            <View style={styles.locationContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: item.location.latitude,
                  longitude: item.location.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: item.location.latitude,
                    longitude: item.location.longitude,
                  }}
                  title="Shared Location"
                />
              </MapView>
              <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
                Location: {item.location.combinedAddress}
              </Text>
              <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
                Lat: {item.location.latitude}, Lon: {item.location.longitude}
              </Text>
            </View>
          )}
          {item.text && (
            <Text style={[styles.messageText, isSent ? styles.sentText : styles.receivedText]}>
              {item.text}
            </Text>
          )}
          <Text style={[styles.timestamp, isSent ? styles.sentText : styles.receivedText]}>
            {item.timestamp?.toDate().toLocaleTimeString() || 'Unknown time'}
          </Text>
        </View>
        {isSent && (
          <Image
            source={{ uri: profilePic }}
            style={styles.profilePic}
            onError={(e) => console.log('Profile pic load error:', e.nativeEvent.error)}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('./../../assets/Animations/LoadingCha.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (selectedLocation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MapView
          style={styles.fullMap}
          onPress={(event) => {
            const { coordinate } = event.nativeEvent;
            setSelectedLocation(coordinate);
          }}
          initialRegion={{
            latitude: selectedLocation.latitude || 37.78825,
            longitude: selectedLocation.longitude || -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {selectedLocation.latitude && selectedLocation.longitude && (
            <Marker
              coordinate={selectedLocation}
              title="Selected Location"
            />
          )}
        </MapView>
        <View style={styles.mapButtonContainer}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => processLocation(selectedLocation)}
          >
            <Text style={styles.mapButtonText}>Send Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => setSelectedLocation(null)}
          >
            <Text style={styles.mapButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{otherUserName}</Text>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <Text style={styles.noMessagesText}>No messages yet!</Text>
        }
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          isLoadingMore ? (
            <LottieView
              source={require('./../../assets/Animations/LoadingCha.json')}
              autoPlay
              loop
              style={styles.lottieSmall}
            />
          ) : null
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.inputContainer}>
          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.previewImageWrapper}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => removeImage(uri)}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={sendLocation} style={styles.iconButton}>
              <Ionicons name="location" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImages} style={styles.iconButton}>
              <Ionicons name="image" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <TextInput
              style={styles.messageTextInput}
              placeholder="Type a message..."
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={() => selectedImages.length === 0 ? sendTextOnly() : sendSelectedImages()}
              returnKeyType="send"
            />
            <TouchableOpacity 
              onPress={() => selectedImages.length === 0 ? sendTextOnly() : sendSelectedImages()} 
              style={styles.sendButton} 
              disabled={isSendingImages}
            >
              <Ionicons name="send" size={24} color={isSendingImages ? '#ccc' : '#4CAF50'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f2f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lottie: { width: 150, height: 150 },
  lottieSmall: { width: 40, height: 40, alignSelf: 'center' },
  errorContainer: { padding: 10, alignItems: 'center' },
  errorText: { fontSize: 14, color: '#d32f2f' },
  messagesList: { padding: 15, flexGrow: 1 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  sentRow: { justifyContent: 'flex-end' },
  receivedRow: { justifyContent: 'flex-start' },
  messageContainer: {
    maxWidth: '75%',
    padding: 8,
    marginHorizontal: 5,
  },
  sentMessage: {
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 0,
  },
  receivedMessage: {
    backgroundColor: '#e0e0e0',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 15,
  },
  noBackground: {
    backgroundColor: 'transparent',
  },
  profilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  messageText: { fontSize: 14, lineHeight: 18 },
  sentText: { color: '#fff' },
  receivedText: { color: '#333' },
  timestamp: { fontSize: 10, marginTop: 4, opacity: 0.7 },
  inputContainer: {
    padding: 10,
    backgroundColor: '#f0f2f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  previewImageWrapper: {
    position: 'relative',
    marginRight: 5,
    marginBottom: 5,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
  closeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: { marginRight: 10 },
  messageTextInput: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: { justifyContent: 'center', alignItems: 'center' },
  noMessagesText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 20 },
  imageContainer: { marginBottom: 5 },
  image: { width: 190, height: 190, borderRadius: 8 }, // Updated to 190x190
  locationContainer: { marginBottom: 5 },
  map: { 
    minWidth: 250, 
    minHeight: 250, 
    width: '100%', // Takes full width of message container if larger than 250
    height: 250, 
    borderRadius: 8 
  },
  fullMap: { flex: 1 },
  mapButtonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    padding: 15, 
    backgroundColor: '#f0f2f5' 
  },
  mapButton: { 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    backgroundColor: '#4CAF50', 
    borderRadius: 20 
  },
  mapButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default ChatPage;