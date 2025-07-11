import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, RefreshControl, Image, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from './../../Config/FirebaseConfig';
import { collection, query, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc, where, Timestamp } from 'firebase/firestore';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AWS from 'aws-sdk';

// AWS S3 Configuration
const S3_BUCKET = "petmatch-public";
const REGION = "ap-south-1";

AWS.config.update({
  accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY_ID,
  region: REGION,
});

const s3 = new AWS.S3();

const CommunityPage = () => {
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser] = useState('amal.karthik2026@gmail.com');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showUsersOverlay, setShowUsersOverlay] = useState(false);
  const [showReportsOverlay, setShowReportsOverlay] = useState(false);

  // Fetch users from Firestore
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: `${data.fname || ''} ${data.lname || ''}`.trim() || doc.id,
          fname: data.fname || doc.id,
          propic: data.propic || null,
          email: data.email || doc.id,
        };
      });
      setUsers(usersList);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports from Firestore
  const fetchReports = async () => {
    try {
      const reportsQuery = query(collection(db, 'reports'));
      const reportsSnapshot = await getDocs(reportsQuery);
      const reportsList = reportsSnapshot.docs.map(doc => {
        const data = doc.data();
        const imageUrl = data.images && data.images.length > 0 ? data.images[0] : null;
        const user = users.find(u => u.email === data.email);
        return {
          id: doc.id,
          email: data.email || 'Unknown',
          timestamp: data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Just now',
          eventPlace: data.eventPlace || '',
          emergency: data.emergency || '',
          imageUrl: imageUrl,
          propic: user ? user.propic : null,
          locationDetails: data.eventPlace || 'No location details available',
        };
      });
      setReports(reportsList);
      console.log('Fetched reports:', reportsList);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Delete expired comments
  const deleteExpiredComments = useCallback(async () => {
    try {
      const now = Timestamp.now();
      const expiredQuery = query(
        collection(db, 'Communitypage'),
        where('expirationTimestamp', '<=', now)
      );
      const expiredSnapshot = await getDocs(expiredQuery);
      
      if (expiredSnapshot.empty) return;

      const deletePromises = expiredSnapshot.docs.map(async (expiredDoc) => {
        const data = expiredDoc.data();
        const imageUrls = data.imageUrls || [];
        for (const url of imageUrls) {
          const key = url.split('/').pop();
          await s3.deleteObject({ Bucket: S3_BUCKET, Key: key }).promise();
        }
        await deleteDoc(doc(db, 'Communitypage', expiredDoc.id));
      });
      await Promise.all(deletePromises);
    } catch (err) {
      console.error('Error deleting expired comments:', err);
    }
  }, []);

  // Real-time posts listener
  useEffect(() => {
    if (loading) return;

    const postsQuery = query(collection(db, 'Communitypage'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsList = snapshot.docs.map(doc => {
        const data = doc.data();
        const userData = users.find(u => u.id === data.userId) || { fname: data.userId || 'Unknown', propic: null };
        return {
          id: doc.id,
          user: data.userId || 'Unknown',
          userName: userData.fname,
          description: data.description || '',
          mediaType: data.mediaType || 'text',
          mediaUrls: data.mediaUrl || [],
          timestamp: data.timestamp,
          expirationTimestamp: data.expirationTimestamp,
          timestampDisplay: data.timestamp?.toDate().toLocaleTimeString() || 'Just now',
          propic: userData.propic,
        };
      });
      setComments(postsList);
      deleteExpiredComments();
      console.log('=== DEBUG: RAW POSTS IN IMAGE POSTS SECTION ===');
      console.log(postsList.filter(post => post.mediaType === 'image'));
      console.log('=== DEBUG: IMAGE POSTS SECTION ===');
      console.log('Filtered image posts:', postsList.filter(post => post.mediaType === 'image'));
    }, (err) => {
      setError('Failed to load posts');
      console.error('Error loading posts:', err);
    });

    const intervalId = setInterval(() => {
      deleteExpiredComments();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [users, deleteExpiredComments, loading]);

  // Handle text comment submission
  const handleSendComment = async () => {
    if (!newComment.trim() || newComment.length > 200) return;
    try {
      const expirationTimestamp = Timestamp.fromDate(new Date(Date.now() + 15000));
      await addDoc(collection(db, 'Communitypage'), {
        userId: currentUser.split('@')[0],
        description: newComment,
        mediaType: 'text',
        mediaUrl: [],
        timestamp: serverTimestamp(),
        expirationTimestamp: expirationTimestamp,
      });
      setNewComment('');
    } catch (err) {
      console.error('Error sending comment:', err);
      alert('Failed to send comment');
    }
  };

  // Handle image upload
  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Camera roll permissions required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        const mediaUrls = [];
        for (const asset of result.assets) {
          const arrayBuffer = await FileSystem.readAsArrayBufferAsync(asset.uri);
          const fileName = `${Date.now()}_${currentUser.split('@')[0]}.jpg`;
          const params = {
            Bucket: S3_BUCKET,
            Key: fileName,
            Body: new Uint8Array(arrayBuffer),
            ContentType: 'image/jpeg',
          };

          const { Location } = await s3.upload(params).promise();
          mediaUrls.push(Location);
        }

        const expirationTimestamp = Timestamp.fromDate(new Date(Date.now() + 15000));
        await addDoc(collection(db, 'Communitypage'), {
          userId: currentUser.split('@')[0],
          description: '',
          mediaType: 'image',
          mediaUrl: mediaUrls,
          timestamp: serverTimestamp(),
          expirationTimestamp: expirationTimestamp,
        });
      }
    } catch (err) {
      console.error('Error uploading images:', err);
      alert('Failed to upload images');
    }
  };

  // Handle report button
  const handleReport = () => {
    fetchReports();
    setShowReportsOverlay(true);
  };

  // Render functions
  const renderUserItem = useCallback(({ item }) => {
    const firstLetter = item.name.charAt(0) || 'U';
    const backgroundColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    return (
      <View style={styles.userItem}>
        <View style={[styles.userInitialCircle, { backgroundColor }]}>
          <Text style={styles.userInitial}>{firstLetter}</Text>
        </View>
        <Text style={styles.userName}>{item.name}</Text>
      </View>
    );
  }, []);

  const renderCommentItem = useCallback(({ item }) => (
    <View style={styles.commentItem}>
      {item.propic ? (
        <Image source={{ uri: item.propic }} style={styles.commentProfilePic} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderPic} />
      )}
      <View style={styles.commentContent}>
        <Text style={styles.commentUser}>{item.userName || 'Unknown'}</Text>
        {item.description ? <Text style={styles.commentText}>{item.description}</Text> : null}
        {item.mediaUrls && item.mediaUrls.length > 0 && item.mediaType === 'image' && item.mediaUrls.map((url, index) => (
          <Image key={index} source={{ uri: url }} style={styles.commentImage} resizeMode="contain" />
        ))}
        {item.mediaUrls && item.mediaUrls.length > 0 && item.mediaType === 'video' && item.mediaUrls.map((url, index) => (
          <Text key={index} style={styles.commentText}>Video: {url}</Text> // Placeholder for video; replace with Video component if needed
        ))}
        <Text style={styles.commentTime}>{item.timestampDisplay}</Text>
      </View>
    </View>
  ), []);

  const renderReportItem = useCallback(({ item }) => (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        {item.propic ? (
          <Image source={{ uri: item.propic }} style={styles.reportProfilePic} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderPic} />
        )}
        <Text style={styles.reportHeading}>{item.email}</Text>
      </View>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.reportImage} resizeMode="contain" />
      ) : null}
      <Text style={styles.reportHighlighted}>Location Details: <Text style={styles.boldText}>{item.locationDetails}</Text></Text>
      <Text style={styles.reportHighlighted}>Emergency: <Text style={styles.boldText}>{item.emergency}</Text></Text>
      <Text style={styles.reportTime}>Time: {item.timestamp}</Text>
    </View>
  ), []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers().then(() => setRefreshing(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} color="#2C3E50" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.content}>
        <View style={styles.commentSection}>
          <View style={styles.chatHeader}>
            <Text style={styles.sectionTitle}>Live Chat</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={handleImageUpload}>
                <MaterialIcons name="image" size={24} color="#2C3E50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowUsersOverlay(!showUsersOverlay)}
              >
                <MaterialIcons name="admin-panel-settings" size={24} color="#68AFB3" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleReport}>
                <MaterialIcons name="report" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={comments}
            renderItem={renderCommentItem}
            keyExtractor={item => item.id}
            style={styles.commentsList}
            inverted
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Type a comment... (max 200 chars)"
              placeholderTextColor="#7F8C8D"
              maxLength={200}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendComment}
              disabled={!newComment.trim()}
            >
              <MaterialIcons name="send" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Users Overlay */}
        <Modal transparent={true} visible={showUsersOverlay} onRequestClose={() => setShowUsersOverlay(false)}>
          <View style={styles.overlay}>
            <View style={styles.usersOverlayContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowUsersOverlay(false)}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                style={styles.usersList}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              />
            </View>
          </View>
        </Modal>

        {/* Reports Overlay */}
        <Modal transparent={true} visible={showReportsOverlay} onRequestClose={() => setShowReportsOverlay(false)}>
          <View style={styles.overlay}>
            <View style={styles.reportsOverlayContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowReportsOverlay(false)}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.reportsTitle}>Reports</Text>
              {reports.length > 0 ? (
                <FlatList
                  data={reports}
                  renderItem={renderReportItem}
                  keyExtractor={item => item.id}
                  style={styles.reportsList}
                />
              ) : (
                <Text style={styles.noReportsText}>No reports available</Text>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
  },
  commentSection: {
    flex: 1,
    padding: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 5,
    marginLeft: 10,
  },
  commentsList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    padding: 10,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
  },
  commentProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  placeholderPic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#7F8C8D',
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065FD4',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#111',
    marginBottom: 4,
  },
  commentImage: {
    width: 200,
    height: 150,
    borderRadius: 4,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#7F8C8D',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#2C3E50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#68AFB3',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersOverlayContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxHeight: '80%',
    elevation: 5,
  },
  reportsOverlayContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  usersList: {
    paddingVertical: 10,
  },
  reportsList: {
    paddingVertical: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  reportItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  reportProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  reportHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  reportImage: {
    width: 200,
    height: 150,
    borderRadius: 4,
    marginVertical: 8,
  },
  userInitialCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userInitial: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 16,
    color: '#2C3E50',
  },
  reportsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  reportHighlighted: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
  },
  boldText: {
    fontWeight: 'bold',
  },
  reportTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  noReportsText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default CommunityPage;