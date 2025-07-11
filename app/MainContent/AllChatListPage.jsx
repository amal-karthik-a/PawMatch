import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './../../Config/FirebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { router } from 'expo-router';
import BottomNavigation from './BottomNavigation';

const AllChatListPage = () => {
  const [chatUsers, setChatUsers] = useState([]);
  const [filteredChatUsers, setFilteredChatUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMetadata, setChatMetadata] = useState({}); // Store metadata for each chat room

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log('No current user, setting loading to false');
      setLoading(false);
      return;
    }

    setUser(currentUser);
    console.log('Current user:', currentUser.email);

    const fetchChatUsers = async () => {
      try {
        const userDocRef = doc(db, 'ChatUsers', currentUser.email);
        const userDocSnapshot = await getDoc(userDocRef);
        console.log('Document exists:', userDocSnapshot.exists());

        if (!userDocSnapshot.exists()) {
          console.log('ChatUsers document does not exist for', currentUser.email);
          setChatUsers([]);
          setFilteredChatUsers([]);
          setError('No chat users found for this account.');
          setLoading(false);
          return;
        }

        const data = userDocSnapshot.data();
        console.log('Full document data:', JSON.stringify(data, null, 2));

        if (!data || !data.otherAcc || !Array.isArray(data.otherAcc)) {
          console.log('otherAcc field is missing or not an array');
          setChatUsers([]);
          setFilteredChatUsers([]);
          setError('No other accounts found in the document.');
          setLoading(false);
          return;
        }

        const otherAccounts = data.otherAcc;
        console.log('Other accounts:', otherAccounts);

        const userDetailsPromises = otherAccounts.map(async (email) => {
          const userDocRef = doc(db, 'ChatUsers', email);
          const userDocSnapshot = await getDoc(userDocRef);
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            return {
              email,
              propic: userData.propic || null,
              fname: userData.fname || 'Unknown',
              lname: userData.lname || '',
              unreadMessages: userData.unreadMessages || 0,
            };
          }
          return {
            email,
            propic: null,
            fname: 'Unknown',
            lname: '',
            unreadMessages: 0,
          };
        });

        const userDetails = await Promise.all(userDetailsPromises);
        console.log('User details:', userDetails);

        // Fetch metadata for each chat room
        const metadataPromises = userDetails.map(async (user) => {
          const chatRoomId = [currentUser.email, user.email].sort().join('_');
          const chatDocRef = doc(db, 'Chats', chatRoomId);
          const chatDocSnapshot = await getDoc(chatDocRef);
          if (chatDocSnapshot.exists()) {
            const metadata = chatDocSnapshot.data().metadata || {};
            return { email: user.email, metadata };
          }
          return { email: user.email, metadata: { lastMessage: '', lastMessageTimestamp: null } };
        });

        const metadataResults = await Promise.all(metadataPromises);
        const metadataMap = metadataResults.reduce((acc, { email, metadata }) => {
          acc[email] = metadata;
          return acc;
        }, {});

        setChatMetadata(metadataMap);
        setChatUsers(userDetails);
        setFilteredChatUsers(userDetails);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chat users:', error.message);
        setError(error.message);
        setChatUsers([]);
        setFilteredChatUsers([]);
        setLoading(false);
      }
    };

    fetchChatUsers();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredChatUsers(chatUsers);
    } else {
      const filtered = chatUsers.filter((user) => {
        const fullName = `${user.fname} ${user.lname}`.toLowerCase();
        return fullName.includes(query.toLowerCase()) || user.email.toLowerCase().includes(query.toLowerCase());
      });
      setFilteredChatUsers(filtered);
    }
  };

  const toggleSearchBar = () => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
      setFilteredChatUsers(chatUsers);
    }
  };

  const renderChatItem = ({ item }) => {
    const fullName = `${item.lname} ${item.fname}`.trim();
    const metadata = chatMetadata[item.email] || {};
    const lastMessage = metadata.lastMessage || 'No messages yet';
    const timestamp = metadata.lastMessageTimestamp
      ? new Date(metadata.lastMessageTimestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'N/A';

    const handlePress = () => {
      router.push({
        pathname: '/MainContent/ChatPage',
        params: {
          currentUserId: user.email,
          otherUserId: item.email,
        },
      });
    };

    return (
      <Pressable onPress={handlePress} style={styles.chatCard}>
        <View style={styles.profilePicContainer}>
          {item.propic ? (
            <Image source={{ uri: item.propic }} style={styles.profilePic} />
          ) : (
            <Ionicons name="person-circle-outline" size={40} color="#ccc" />
          )}
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.name}>{fullName || item.email}</Text>
          <Text style={styles.messagePreview}>{lastMessage}</Text>
        </View>
        <View style={styles.timeAndBadge}>
          <Text style={styles.timestamp}>{timestamp}</Text>
          {item.unreadMessages > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadMessages}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.errorText}>Please log in to view your chats</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.replace('/MainContent/petBreadHome')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#2c3e50" />
          </Pressable>
          <Text style={styles.title}>Chats</Text>
          <Pressable onPress={toggleSearchBar} style={styles.searchIcon}>
            <Ionicons name="search" size={24} color="#2c3e50" />
          </Pressable>
        </View>
        {searchVisible && (
          <TextInput
            style={styles.searchBar}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
        )}
        {filteredChatUsers.length === 0 ? (
          <View style={styles.noChatsContainer}>
            <Text style={styles.noChatsText}>No chats found</Text>
            {error && <Text style={styles.errorText}>Error: {error}</Text>}
          </View>
        ) : (
          <FlatList
            data={filteredChatUsers}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.email}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={<Text style={styles.noChatsText}>No chats available</Text>}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
      <BottomNavigation initialActiveIcon="chat" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(156, 235, 184, 0.22)',
  },
  scrollContainer: {
    padding: 10,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E74C3C',
    flex: 1,
    textAlign: 'center',
  },
  searchIcon: {
    padding: 5,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  backButton: {
    padding: 5,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profilePicContainer: {
    marginRight: 10,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  messagePreview: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  timeAndBadge: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  unreadBadge: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChatsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorText: {
    fontSize: 16,
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 20,
  },
  noChatsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
});

export default AllChatListPage;