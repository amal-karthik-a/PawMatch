// Petagram.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth, db } from './../../Config/FirebaseConfig';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { s3, S3_BUCKET } from './../../aws-config';
import { Video } from 'expo-av';

// Separate Modal Component
const ProfileModal = ({ visible, userData, editBio, setEditBio, onSave, onClose }) => {
  const formatDate = (dob) => {
    if (!dob) return 'Not set';
    if (dob instanceof Object && 'toDate' in dob) {
      return dob.toDate().toLocaleDateString();
    }
    if (dob.year && dob.month && dob.day) {
      return `${dob.day}/${dob.month}/${dob.year}`;
    }
    return dob;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalContainer} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Profile Details</Text>

          <View style={styles.modalBody}>
            <View style={styles.modalDetails}>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Name</Text>
                <Text style={styles.modalText}>{userData.username || 'Not set'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Date of Birth</Text>
                <Text style={styles.modalText}>{formatDate(userData.dob)}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Gender</Text>
                <Text style={styles.modalText}>{userData.gender || 'Not set'}</Text>
              </View>
            </View>
            <Image source={{ uri: userData.profilePic }} style={styles.modalProfilePic} />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Bio</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              value={editBio}
              onChangeText={setEditBio}
              placeholder={userData.bio ? "Edit your bio..." : "Add your bio..."}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Comment Modal Component
const CommentModal = ({ visible, postId, comments, onClose, onSend }) => {
  const [commentText, setCommentText] = useState('');

  const handleSend = () => {
    if (commentText.trim()) {
      onSend(commentText);
      setCommentText('');
    }
  };

  // Convert comments object to array of values
  const commentArray = comments ? Object.values(comments) : [];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.commentModalContent}>
          <Text style={styles.modalTitle}>Comments</Text>
          {commentArray.length > 0 ? (
            commentArray.map((comment, index) => (
              <View key={index} style={styles.commentItem}>
                <Text>{comment.text}</Text>
                <Text style={styles.commentTimestamp}>{comment.timestamp.toDate().toLocaleString()}</Text>
                <Text style={styles.commentUserId}>{comment.userId}</Text>
              </View>
            ))
          ) : (
            <Text>No comments yet</Text>
          )}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Enter your comment..."
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Video Modal Component
const VideoModal = ({ visible, onClose, videoUri, setVideoUri, uploading, uploadVideo, description, setDescription, tags, setTags }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pickVideo = async () => {
    setLoading(true);
    setError(null);
    console.log("(NOBRIDGE) LOG Starting video picker process");

    try {
      console.log("(NOBRIDGE) LOG Requesting media library permission");
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("(NOBRIDGE) LOG Permission status:", status);

      if (status !== "granted") {
        setLoading(false);
        setError("Permission to access media library was denied.");
        Alert.alert("Permission Denied", "This app needs access to your media library to pick videos.");
        console.log("(NOBRIDGE) LOG Permission denied");
        return;
      }

      console.log("(NOBRIDGE) LOG Launching video picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 1,
      });
      console.log("(NOBRIDGE) LOG Picker result:", result);

      if (result.canceled) {
        setError("Video selection was cancelled.");
        console.log("(NOBRIDGE) LOG User cancelled video picker");
      } else if (result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        console.log("(NOBRIDGE) LOG Selected video:", video);
        if (video.mimeType?.includes("video/mp4")) {
          setVideoUri(video.uri);
          console.log("(NOBRIDGE) LOG Video URI set:", video.uri);
        } else {
          setError("Please select an MP4 video file.");
          Alert.alert("Invalid Format", "Please select an MP4 video file.");
          console.log("(NOBRIDGE) LOG Invalid video format");
        }
      } else {
        setError("No video selected or invalid response.");
        console.log("(NOBRIDGE) LOG Invalid picker response");
      }
    } catch (err) {
      console.log("(NOBRIDGE) LOG Error in pickVideo:", err.message);
      setError("Failed to pick video: " + err.message);
      Alert.alert("Error", "Failed to pick video: " + err.message);
    } finally {
      setLoading(false);
      console.log("(NOBRIDGE) LOG Finished video picker process");
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.postModalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={uploading || loading}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.imagePickerContainer}>
            {videoUri ? (
              <Video
                source={{ uri: videoUri }}
                style={styles.selectedVideo}
                useNativeControls
                resizeMode="contain"
                onError={(e) => {
                  console.log("(NOBRIDGE) LOG Video playback error:", e);
                  setError("Failed to play video: " + e.error);
                  Alert.alert("Playback Error", "Failed to play the selected video.");
                }}
                onLoad={() => console.log("(NOBRIDGE) LOG Video loaded successfully")}
              />
            ) : (
              <TouchableOpacity style={styles.videoPickerButton} onPress={pickVideo} disabled={uploading || loading}>
                <Ionicons name="videocam-outline" size={50} color="#00A8B5" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.descriptionInput}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description..."
            editable={!uploading && !loading}
          />
          <TextInput
            style={styles.tagsInput}
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags (comma-separated)..."
            editable={!uploading && !loading}
          />
          <TouchableOpacity style={styles.postButton} onPress={uploadVideo} disabled={uploading || loading || !videoUri}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const Petagram = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [optionVisible, setOptionVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Fetch Current User and Data on Mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const fetchUserData = async () => {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.email));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData({
                username: `${data.fname || ''} ${data.lname || ''}`.trim(),
                profilePic: data.propic || 'https://via.placeholder.com/50',
                bio: data.bio || '',
                dob: data.dob || '',
                gender: data.gender || '',
              });
              setEditBio(data.bio || '');
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        };
        fetchUserData();
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save Bio from Modal
  const saveBio = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.email), { bio: editBio });
      setUserData({ ...userData, bio: editBio });
      setModalVisible(false);
      alert('Bio saved successfully!');
    } catch (error) {
      console.error('Error saving bio:', error);
    }
  };

  // Fetch Posts and User Data
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'posts'), async (snapshot) => {
      const postsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const postData = doc.data();
          const userDoc = await getDoc(doc(db, 'users', postData.userId));
          const userData = userDoc.exists() ? userDoc.data() : {};
          return {
            id: doc.id,
            ...postData,
            username: `${userData.fname || ''} ${userData.lname || ''}`.trim(),
            profilePic: userData.propic || 'https://via.placeholder.com/50',
          };
        })
      );
      setPosts(postsData.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate()));
    });
    return () => unsubscribe();
  }, [user]);

  // Delete Post
  const deletePost = async (postId) => {
    await deleteDoc(doc(db, 'posts', postId));
  };

  // Format Timestamp
  const formatTimestamp = (timestamp) => {
    return timestamp.toDate().toLocaleString();
  };

  // Pick Image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setPostModalVisible(true); // Open modal after selecting image
    }
  };

  // Upload Image to AWS and Save Post
  const uploadPost = async () => {
    if (!selectedImage || !description) return;

    setUploading(true);
    try {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const fileName = `${user.email}/${Date.now()}.jpg`;
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: blob,
        ContentType: 'image/jpeg',
      };

      const uploadResult = await s3.upload(params).promise();
      const mediaUrl = uploadResult.Location;

      const tagsArray = tags.split(',').map(tag => tag.trim());

      await addDoc(collection(db, 'posts'), {
        comments: null,
        description,
        likes: null,
        mediaType: 'image',
        mediaUrl,
        tags: tagsArray,
        timestamp: new Date(),
        userId: user.email,
      });

      setSelectedImage(null);
      setDescription('');
      setTags('');
      setPostModalVisible(false);
    } catch (error) {
      console.error('Error uploading post:', error);
    } finally {
      setUploading(false);
    }
  };

  // Upload Video to AWS and Save Post
  const uploadVideoPost = async () => {
    if (!selectedVideo || !description) return;

    setUploading(true);
    try {
      const response = await fetch(selectedVideo);
      const blob = await response.blob();
      const fileName = `${user.email}/${Date.now()}.mp4`;
      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: blob,
        ContentType: 'video/mp4',
      };

      const uploadResult = await s3.upload(params).promise();
      const mediaUrl = uploadResult.Location;

      const tagsArray = tags.split(',').map(tag => tag.trim());

      await addDoc(collection(db, 'posts'), {
        comments: null,
        description,
        likes: null,
        mediaType: 'video', // Set mediaType to "video" as requested
        mediaUrl,
        tags: tagsArray,
        timestamp: new Date(),
        userId: user.email,
      });

      setSelectedVideo(null);
      setDescription('');
      setTags('');
      setVideoModalVisible(false);
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setUploading(false);
    }
  };

  // Handle Like/Unlike
  const handleLike = async (postId) => {
    const postRef = doc(db, 'posts', postId);
    const postDoc = await getDoc(postRef);
    const likes = postDoc.data().likes || [];

    if (likes.includes(user.email)) {
      await updateDoc(postRef, { likes: arrayRemove(user.email) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user.email) });
    }
  };

  // Handle Comment
  const handleComment = (postId) => {
    setSelectedPostId(postId);
    setCommentModalVisible(true);
  };

  // Send Comment
  const sendComment = async (text) => {
    if (!text.trim()) return;

    const postRef = doc(db, 'posts', selectedPostId);
    await updateDoc(postRef, {
      comments: {
        [Date.now()]: {
          text,
          timestamp: new Date(),
          userId: user.email,
        },
      },
    }, { merge: true }); // Use merge to avoid overwriting existing comments
    setCommentModalVisible(false);
  };

  // Render Post Item
  const renderPost = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: item.profilePic }} style={styles.profilePic} />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username || item.userId}</Text>
          <Text style={styles.email}>{item.userId}</Text>
        </View>
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      {item.mediaUrl && (
        item.mediaType === 'image' ? (
          <Image source={{ uri: item.mediaUrl }} style={styles.postMedia} />
        ) : (
          <Video
            source={{ uri: item.mediaUrl }}
            style={styles.postMedia}
            useNativeControls
            resizeMode="contain"
          />
        )
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
          <Ionicons name="heart-outline" size={20} color="#00A8B5" />
          <Text>Like {item.likes ? item.likes.length : 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => {/* Add view functionality */}}>
          <Ionicons name="eye-outline" size={20} color="#00A8B5" />
          <Text>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => {/* Add share functionality */}}>
          <Ionicons name="share-social-outline" size={20} color="#00A8B5" />
          <Text>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(item.id)}>
          <Ionicons name="chatbubble-outline" size={20} color="#00A8B5" />
          <Text>Comment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Header Component
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Image source={{ uri: userData.profilePic }} style={styles.headerProfilePic} />
      </TouchableOpacity>
      <View style={styles.headerUserInfo}>
        <Text style={styles.headerUsername}>{userData.username || user?.email}</Text>
        <Text style={styles.headerEmail}>{user?.email}</Text>
      </View>
    </View>
  );

  // Bottom Card with Action Buttons
  const renderBottomCard = () => (
    <View style={styles.bottomCard}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setOptionVisible(true)}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#00A8B5" />
        ) : (
          <Ionicons name="add" size={30} color="#00A8B5" />
        )}
      </TouchableOpacity>
      {optionVisible && (
        <View style={styles.optionContainer}>
          <TouchableOpacity style={styles.optionButton} onPress={() => { setOptionVisible(false); setPostModalVisible(true); pickImage(); }} disabled={uploading}>
            <Ionicons name="image-outline" size={30} color="#00A8B5" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionButton} onPress={() => { setOptionVisible(false); setVideoModalVisible(true); pickVideo(); }} disabled={uploading}>
            <Ionicons name="videocam-outline" size={30} color="#00A8B5" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.bannerActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => {/* Add paw action */}} disabled={uploading}>
          <Ionicons name="paw" size={30} color="#00A8B5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => {/* Add chat action */}} disabled={uploading}>
          <Ionicons name="chatbubble" size={30} color="#00A8B5" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Post Modal
  const renderPostModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={postModalVisible}
      onRequestClose={() => setPostModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.postModalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setPostModalVisible(false)} disabled={uploading}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.imagePickerContainer}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            ) : (
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage} disabled={uploading}>
                <Ionicons name="image-outline" size={50} color="#00A8B5" />
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.descriptionInput}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description..."
            editable={!uploading}
          />
          <TextInput
            style={styles.tagsInput}
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags (comma-separated)..."
            editable={!uploading}
          />
          <TouchableOpacity style={styles.postButton} onPress={uploadPost} disabled={uploading || !selectedImage}>
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Expose pickVideo to the parent component
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedVideo(result.assets[0].uri);
      setVideoModalVisible(true); // Open modal after selecting video
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>No user authenticated</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <FlatList
        style={styles.container}
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderBottomCard}
      />
      <ProfileModal
        visible={modalVisible}
        userData={userData}
        editBio={editBio}
        setEditBio={setEditBio}
        onSave={saveBio}
        onClose={() => setModalVisible(false)}
      />
      <CommentModal
        visible={commentModalVisible}
        postId={selectedPostId}
        comments={posts.find(post => post.id === selectedPostId)?.comments || {}}
        onClose={() => setCommentModalVisible(false)}
        onSend={sendComment}
      />
      <VideoModal
        visible={videoModalVisible}
        onClose={() => {
          setVideoModalVisible(false);
          setDescription(''); // Reset description when closing
          setTags(''); // Reset tags when closing
        }}
        videoUri={selectedVideo}
        setVideoUri={setSelectedVideo}
        uploading={uploading}
        uploadVideo={uploadVideoPost}
        description={description}
        setDescription={setDescription}
        tags={tags}
        setTags={setTags}
      />
      {renderPostModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  headerProfilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  headerUserInfo: {
    flex: 1,
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerEmail: {
    fontSize: 14,
    color: '#666',
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  postMedia: {
    width: '100',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#00A8B5',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalBody: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  modalDetails: {
    flex: 1,
  },
  modalSection: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    minHeight: 60,
  },
  modalProfilePic: {
    width: 100,
    height: 120,
    borderRadius: 10,
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    alignItems: 'center',
    marginBottom: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionButton: {
    padding: 10,
    marginHorizontal: 10,
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  postModalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF0000',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imagePickerButton: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00A8B5',
  },
  videoPickerButton: {
    width: 200,
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00A8B5',
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00A8B5',
  },
  selectedVideo: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00A8B5',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    minHeight: 60,
  },
  tagsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  postButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentModalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
  },
  commentItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#888',
  },
  commentUserId: {
    fontSize: 12,
    color: '#666',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3333',
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default Petagram;