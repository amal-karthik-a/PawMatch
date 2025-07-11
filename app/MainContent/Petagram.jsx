import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { auth, db } from '../../Config/FirebaseConfig';
import { collection, onSnapshot, doc, getDoc, addDoc, updateDoc, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { s3, S3_BUCKET } from '../../aws-config';

// Screen dimensions for full-height posts
const { height } = Dimensions.get('window');
const HEADER_HEIGHT = 80; // Main header height
const POST_USER_HEADER_HEIGHT = 60; // Height for per-post user header
const POST_TAGS_HEIGHT = 40; // Height for tags section
const BOTTOM_CARD_HEIGHT = 100; // Bottom card height
const POST_HEIGHT = height - HEADER_HEIGHT - BOTTOM_CARD_HEIGHT;
const POST_SPACING = 30; // Spacing between posts

// Profile Modal Component
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
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
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
      onSend(postId, commentText);
      setCommentText('');
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.commentModalContent}>
          <Text style={styles.modalTitle}>Comments</Text>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Text>{comment.text}</Text>
                <Text style={styles.commentTimestamp}>
                  {comment.timestamp?.toDate().toLocaleString() || 'Unknown time'}
                </Text>
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

const Petagram = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({});
  const [posts, setPosts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [isVideoPost, setIsVideoPost] = useState(false);
  const [optionVisible, setOptionVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visiblePostId, setVisiblePostId] = useState(null); // Track visible post
  const videoRefs = useRef({}); // Refs for video components

  // Fetch Current User and Data on Mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const fetchUserData = async () => {
          try {
            const userRef = doc(db, 'users', currentUser.email);
            const userDoc = await getDoc(userRef);
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
            } else {
              console.log('No user document found for:', currentUser.email);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setError('Failed to load user data.');
          }
        };
        fetchUserData();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Save Bio from Modal
  const saveBio = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.email);
      await updateDoc(userRef, { bio: editBio });
      setUserData({ ...userData, bio: editBio });
      setModalVisible(false);
      alert('Bio saved successfully!');
    } catch (error) {
      console.error('Error saving bio:', error);
    }
  };

  // Fetch Posts, Likes, and Comments
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'posts'), async (snapshot) => {
      try {
        console.log('Fetching posts, snapshot size:', snapshot.docs.length);
        const postsData = await Promise.all(
          snapshot.docs.map(async (postDoc) => {
            const postData = postDoc.data();
            console.log('Post data:', postData);
            let userData = {};
            try {
              const userRef = doc(db, 'users', postData.userId);
              const userDoc = await getDoc(userRef);
              userData = userDoc.exists() ? userDoc.data() : {};
            } catch (userError) {
              console.error('Error fetching user data for post:', postData.userId, userError);
            }

            const commentsRef = collection(db, 'posts', postDoc.id, 'comments');
            const commentsSnapshot = await getDocs(commentsRef);
            const comments = commentsSnapshot.docs.map(commentDoc => ({
              id: commentDoc.id,
              ...commentDoc.data(),
            }));

            return {
              id: postDoc.id,
              ...postData,
              username: `${userData.fname || ''} ${userData.lname || ''}`.trim() || postData.userId,
              profilePic: userData.propic || 'https://via.placeholder.com/50',
              mediaUrl: postData.mediaUrl || [],
              title: postData.description || 'No Description',
              likes: postData.likes || [],
              comments,
            };
          })
        );
        const sortedPosts = postsData.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate());
        console.log('Processed posts:', sortedPosts);
        setPosts(sortedPosts);
        setError(null);
      } catch (err) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts. Please try again.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Pick Media (No size limit)
  const pickMedia = async (isVideo) => {
    const mediaType = isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType,
      allowsMultipleSelection: !isVideo,
      selectionLimit: 6,
      allowsEditing: false,
      quality: 0.5,
    });

    if (!result.canceled) {
      const assets = result.assets; // Removed size filter
      if (isVideo) {
        setSelectedMedia([assets[0].uri]);
      } else {
        const newImages = assets.map(asset => asset.uri);
        setSelectedMedia(prev => [...prev, ...newImages].slice(0, 6));
      }
    }
  };

  // Remove Selected Image
  const removeImage = (uri) => {
    setSelectedMedia(prev => prev.filter(image => image !== uri));
  };

  // Upload Media to AWS and Save Post
  const uploadPost = async () => {
    if (selectedMedia.length === 0 || !description) return;

    setUploading(true);
    try {
      const mediaUrls = [];
      for (const mediaUri of selectedMedia) {
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        console.log('Uploading file size:', blob.size);
        const fileExtension = isVideoPost ? 'mp4' : 'jpg';
        const fileName = `${user.email}/${Date.now()}-${mediaUrls.length}.${fileExtension}`;
        const contentType = isVideoPost ? 'video/mp4' : 'image/jpeg';
        const params = {
          Bucket: S3_BUCKET,
          Key: fileName,
          Body: blob,
          ContentType: contentType,
        };

        const uploadResult = await s3.upload(params).promise();
        mediaUrls.push(uploadResult.Location);
      }

      const tagsArray = tags.split(',').map(tag => tag.trim());

      await addDoc(collection(db, 'posts'), {
        comments: [],
        description,
        likes: [],
        mediaType: isVideoPost ? 'video' : 'image',
        mediaUrl: mediaUrls,
        tags: tagsArray,
        timestamp: new Date(),
        userId: user.email,
      });

      setSelectedMedia([]);
      setDescription('');
      setTags('');
      setPostModalVisible(false);
      setIsVideoPost(false);
    } catch (error) {
      console.error('Error uploading post:', error);
      alert('Upload failed: ' + error.message);
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
  const sendComment = async (postId, text) => {
    if (!text.trim() || !postId || !user) return;

    try {
      const commentRef = collection(db, 'posts', postId, 'comments');
      await addDoc(commentRef, {
        userId: user.email,
        text,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment.');
    }
  };

  // Handle Viewable Items Changed for Video Autoplay
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0].item;
      setVisiblePostId(visibleItem.id);

      // Pause all videos
      Object.keys(videoRefs.current).forEach((postId) => {
        if (postId !== visibleItem.id && videoRefs.current[postId]) {
          videoRefs.current[postId].pauseAsync();
        }
      });

      // Play the visible video
      if (visibleItem.mediaType === 'video' && videoRefs.current[visibleItem.id]) {
        videoRefs.current[visibleItem.id].playAsync();
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80, // Play when 80% of the post is visible
  }).current;

  // Render Post Item
  const renderPost = ({ item }) => {
    console.log('Rendering post:', { id: item.id, mediaUrl: item.mediaUrl[0], title: item.title, mediaType: item.mediaType });
    const validMediaUrl =
      item.mediaUrl && Array.isArray(item.mediaUrl) && item.mediaUrl.length > 0 && typeof item.mediaUrl[0] === 'string'
        ? item.mediaUrl[0]
        : 'https://via.placeholder.com/280';
    const isLiked = item.likes.includes(user?.email);
    const isVisible = item.id === visiblePostId;

    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={styles.postUserHeader}>
            <Image source={{ uri: item.profilePic }} style={styles.postProfilePic} />
            <View style={styles.postUserInfo}>
              <Text style={styles.postUsername}>{item.username}</Text>
              <Text style={styles.postEmail}>{item.userId}</Text>
            </View>
          </View>
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsText}>
              {item.tags && item.tags.length > 0 ? item.tags.join(', ') : 'No tags'}
            </Text>
          </View>
          <View style={styles.imageContainer}>
            {item.mediaType === 'video' ? (
              <Video
                ref={(ref) => (videoRefs.current[item.id] = ref)}
                source={{ uri: validMediaUrl }}
                style={styles.image}
                useNativeControls
                resizeMode="cover"
                shouldPlay={isVisible} // Autoplay only when fully visible
                isLooping
                onError={(e) => {
                  console.log('Video load error for URL:', validMediaUrl, e);
                  setPosts(prevPosts =>
                    prevPosts.map(post =>
                      post.id === item.id ? { ...post, mediaUrl: ['https://via.placeholder.com/280'] } : post
                    )
                  );
                }}
              />
            ) : (
              <Image
                source={{ uri: validMediaUrl }}
                style={styles.image}
                onError={(e) => {
                  console.log('Image load error for URL:', validMediaUrl, e.nativeEvent.error);
                  setPosts(prevPosts =>
                    prevPosts.map(post =>
                      post.id === item.id ? { ...post, mediaUrl: ['https://via.placeholder.com/280'] } : post
                    )
                  );
                }}
              />
            )}
            <View style={styles.titleContainer}>
              <Text style={styles.overlayTitle}>{item.title}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.viewButton} onPress={() => handleComment(item.id)}>
                <MaterialIcons name="comment" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewButton} onPress={() => handleLike(item.id)}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={22}
                  color={isLiked ? "#FF0000" : "#FFFFFF"}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Header Component (Main App Header with + Icon)
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Image source={{ uri: userData.profilePic }} style={styles.headerProfilePic} />
      </TouchableOpacity>
      <View style={styles.headerUserInfo}>
        <Text style={styles.headerUsername}>{userData.username || user?.email}</Text>
        <Text style={styles.headerEmail}>{user?.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.headerAddButton}
        onPress={() => setOptionVisible(true)}
        disabled={uploading}
      >
        <Ionicons name="add" size={30} color="#00A8B5" />
      </TouchableOpacity>
    </View>
  );

  // Bottom Card with Only + Button
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
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              setOptionVisible(false);
              setIsVideoPost(false);
              setPostModalVisible(true);
            }}
            disabled={uploading}
          >
            <Ionicons name="image-outline" size={30} color="#00A8B5" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => {
              setOptionVisible(false);
              setIsVideoPost(true);
              setPostModalVisible(true);
            }}
            disabled={uploading}
          >
            <Ionicons name="videocam-outline" size={30} color="#00A8B5" />
          </TouchableOpacity>
        </View>
      )}
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
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPostModalVisible(false)}
            disabled={uploading}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={() => pickMedia(isVideoPost)}
              disabled={uploading || selectedMedia.length >= 6}
            >
              <Ionicons
                name={isVideoPost ? "videocam-outline" : "image-outline"}
                size={60} // Increased size
                color="#00A8B5"
              />
            </TouchableOpacity>
            {selectedMedia.length > 0 && (
              <FlatList
                horizontal
                data={selectedMedia}
                renderItem={({ item: uri }) => (
                  <View style={styles.selectedImageWrapper}>
                    <Image source={{ uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(uri)}
                      disabled={uploading}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(item) => item}
              />
            )}
          </View>
          <TextInput
            style={styles.descriptionInput}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description..."
            editable={!uploading}
            numberOfLines={10}
          />
          <TextInput
            style={styles.tagsInput}
            value={tags}
            onChangeText={setTags}
            placeholder="Enter tags (comma-separated)..."
            editable={!uploading}
          />
          <TouchableOpacity style={styles.postButton} onPress={uploadPost} disabled={uploading}>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#68AFB3" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="lock" size={60} color="#68AFB3" />
        <Text style={styles.emptyText}>Please Sign In</Text>
        <Text style={styles.emptySubText}>You need to be logged in to view posts.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderBottomCard}
        contentContainerStyle={styles.listContainer}
        snapToInterval={POST_HEIGHT + POST_SPACING}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.emptySection}>
            <MaterialIcons name="photo" size={40} color="#68AFB3" />
            <Text style={styles.emptySectionText}>No posts available</Text>
          </View>
        }
      />
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
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
        comments={posts.find(post => post.id === selectedPostId)?.comments || []}
        onClose={() => setCommentModalVisible(false)}
        onSend={sendComment}
      />
      {renderPostModal()}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
    height: HEADER_HEIGHT,
    marginBottom: 25, // Added margin-bottom
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
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerEmail: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  headerAddButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 247, 250, 0.9)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7F8C8D',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginHorizontal: 15,
    marginTop: 10,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#68AFB3',
    borderRadius: 8,
    elevation: 2,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    paddingTop: 0,
    paddingBottom: BOTTOM_CARD_HEIGHT,
  },
  cardContainer: {
    height: POST_HEIGHT,
    marginBottom: POST_SPACING,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  postUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
    height: POST_USER_HEADER_HEIGHT,
  },
  postProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postUserInfo: {
    flex: 1,
  },
  postUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  postEmail: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  tagsContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F5F7FA',
    height: POST_TAGS_HEIGHT,
    justifyContent: 'center',
  },
  tagsText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  imageContainer: {
    position: 'relative',
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    resizeMode: 'cover',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(1, 1, 1, 0.31)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  overlayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(1, 1, 1, 0.31)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  viewButton: {
    padding: 6,
    backgroundColor: 'rgba(1, 1, 1, 0.31)',
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 247, 250, 0.9)',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptySection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    marginTop: 10,
  },
  emptySectionText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 10,
    textAlign: 'center',
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
    height: BOTTOM_CARD_HEIGHT,
    alignItems: 'center',
  },
  addButton: {
    alignItems: 'center',
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
    height: 160,
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
    marginVertical: 20,
  },
  imagePickerButton: {
    width: '100%',
    height: 150, // Increased height
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00A8B5',
  },
  selectedImageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  selectedImage: {
    width: 120, // Increased width
    height: 120, // Increased height
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00A8B5',
  },
  removeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF0000',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default Petagram;