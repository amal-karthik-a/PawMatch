import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { db } from './../../Config/FirebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default function AllMissingCasesPage() {
  const [missingCases, setMissingCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMyMissing, setShowMyMissing] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [foundEmails, setFoundEmails] = useState({});
  const [showFoundOptions, setShowFoundOptions] = useState({});
  const [showFoundInput, setShowFoundInput] = useState({});
  const [userDetails, setUserDetails] = useState({});
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email);
      } else {
        setCurrentUserEmail(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'Missing'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const cases = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((caseItem) => caseItem.Active === 'Y');

      setMissingCases(cases);
      setFilteredCases(cases);

      const userDetailsTemp = {};
      await Promise.all(
        cases.map(async (caseItem) => {
          if (caseItem.userId) {
            const userDocRef = doc(db, 'users', caseItem.userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              userDetailsTemp[caseItem.userId] = {
                fname: data.fname || 'Unknown',
                lname: data.lname || '',
                phno: data.phno || 'N/A',
              };
            } else {
              userDetailsTemp[caseItem.userId] = {
                fname: 'Unknown',
                lname: '',
                phno: 'N/A',
              };
            }
          }
        })
      );

      setUserDetails(userDetailsTemp);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching missing cases:', error);
      alert('Failed to load missing cases: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserEmail]);

  useEffect(() => {
    if (showMyMissing && currentUserEmail) {
      const userCases = missingCases.filter((caseItem) => caseItem.userId === currentUserEmail);
      setFilteredCases(userCases);
    } else {
      setFilteredCases(missingCases);
    }
  }, [showMyMissing, missingCases, currentUserEmail]);

  const navigateToMissingPage = () => {
    router.push('/SettingsCon/MissingPage');
  };

  const toggleMyMissing = () => {
    if (!currentUserEmail) {
      alert('You need to be logged in to view your missing cases.');
      return;
    }
    setShowMyMissing(!showMyMissing);
  };

  const toggleDetails = (caseId) => {
    setShowDetails((prev) => ({
      ...prev,
      [caseId]: !prev[caseId],
    }));
  };

  const toggleFoundOptions = (caseId) => {
    const caseItem = missingCases.find((item) => item.id === caseId);
    if (!caseItem.reward || caseItem.reward === 'None') {
      handleFoundByMyself(caseId);
    } else {
      setShowFoundOptions((prev) => ({
        ...prev,
        [caseId]: true,
      }));
    }
  };

  const handleFoundByMyself = async (caseId) => {
    const caseRef = doc(db, 'Missing', caseId);
    try {
      await updateDoc(caseRef, { Active: 'N' });
      setFilteredCases((prev) => prev.filter((item) => item.id !== caseId));
    } catch (error) {
      console.error('Error updating Active status:', error);
      alert('Failed to mark as found: ' + error.message);
    }
  };

  const handleFoundByOther = (caseId) => {
    setShowFoundOptions((prev) => ({
      ...prev,
      [caseId]: false,
    }));
    setShowFoundInput((prev) => ({
      ...prev,
      [caseId]: true,
    }));
  };

  const handleFoundEmailChange = (caseId, email) => {
    setFoundEmails((prev) => ({
      ...prev,
      [caseId]: email,
    }));
  };

  const verifyEmailAndSubmit = async (caseId) => {
    const email = foundEmails[caseId];
    if (!email) {
      alert('Please enter the email of the user who found the dog.');
      return;
    }

    if (email === currentUserEmail) {
      Alert.alert('Invalid Entry', 'It’s not another user, it’s you!');
      return;
    }

    const userDocRef = doc(db, 'users', email);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      Alert.alert('Invalid Email', 'The entered email is not registered in the system.');
      return;
    }

    const caseItem = missingCases.find((item) => item.id === caseId);
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    const transactionIdBase = `Reward_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const paymentDataRecv = {
      dateOfPayment: currentDate,
      MissingId: caseId,
      price: caseItem.reward,
      status: 'reward',
      timeOfPayment: currentTime,
      transactionId: `${transactionIdBase}_recv`,
      type: 'recv',
      To: email,
      from: currentUserEmail,
    };

    const paymentDataSent = {
      dateOfPayment: currentDate,
      MissingId: caseId,
      price: caseItem.reward,
      status: 'reward',
      timeOfPayment: currentTime,
      transactionId: `${transactionIdBase}_sent`,
      type: 'sent',
      To: email,
      from: currentUserEmail,
    };

    try {
      await setDoc(doc(db, 'Payment', paymentDataRecv.transactionId), paymentDataRecv);
      await setDoc(doc(db, 'Payment', paymentDataSent.transactionId), paymentDataSent);

      const caseRef = doc(db, 'Missing', caseId);
      await updateDoc(caseRef, { Active: 'N' });

      alert(`Payment recorded for ${email} with reward ${caseItem.reward}`);
      setShowFoundInput((prev) => ({
        ...prev,
        [caseId]: false,
      }));
      setFoundEmails((prev) => ({
        ...prev,
        [caseId]: '',
      }));
      setFilteredCases((prev) => prev.filter((item) => item.id !== caseId));
    } catch (error) {
      console.error('Error recording payment or updating case:', error);
      alert('Failed to process: ' + error.message);
    }
  };

  const handleChat = async (ownerId) => {
    if (!currentUserEmail) {
      Alert.alert('Authentication Error', 'Please log in to chat.');
      return;
    }

    try {
      const currentUserId = currentUserEmail;

      if (currentUserId === ownerId) {
        Alert.alert("Info", "You cannot chat with yourself");
        return;
      }

      const currentUserDocRef = doc(db, "ChatUsers", currentUserId);
      const currentUserDoc = await getDoc(currentUserDocRef);

      if (!currentUserDoc.exists()) {
        await setDoc(currentUserDocRef, {
          otherAcc: [ownerId],
          createdAt: new Date().toISOString(),
        });
      } else {
        const currentUserData = currentUserDoc.data();
        const otherAcc = currentUserData.otherAcc || [];

        if (!otherAcc.includes(ownerId)) {
          await updateDoc(currentUserDocRef, {
            otherAcc: arrayUnion(ownerId),
          });
        } else {
          router.push('/MainContent/AllChatListPage');
          return;
        }
      }

      const sortedUserPair = [currentUserId, ownerId].sort().join('_');
      const chatDocRef = doc(db, "Chats", sortedUserPair);
      const chatDoc = await getDoc(chatDocRef);

      if (!chatDoc.exists()) {
        await setDoc(chatDocRef, {
          metadata: {
            participants: [currentUserId, ownerId],
            lastMessage: null,
            clearedBy: {
              [currentUserId]: false,
              [ownerId]: false,
            },
          },
        });
      }

      router.push('/MainContent/AllChatListPage');

    } catch (error) {
      console.error("Error in handleChat:", error);
      Alert.alert('Chat Error', 'Failed to initiate chat. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading missing cases...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Animatable.View animation="fadeInDown" style={styles.header}>
          <Text style={styles.title}>All Missing Dogs</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.viewMyMissingButton} onPress={toggleMyMissing}>
              <Ionicons name="person" size={20} color="#fff" />
              <Text style={styles.viewMyMissingButtonText}>
                {showMyMissing ? 'View All' : 'View My Missing'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newMissingButton} onPress={navigateToMissingPage}>
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.newMissingButtonText}>New Missing</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {filteredCases.length === 0 ? (
          <Text style={styles.noCasesText}>No active missing cases found.</Text>
        ) : (
          filteredCases.map((caseItem, index) => (
            <Animatable.View
              key={caseItem.id}
              animation="fadeInUp"
              delay={index * 200}
              style={styles.card}
            >
              <View style={styles.cardImageContainer}>
                {caseItem.imageUrl ? (
                  <Image
                    source={{ uri: caseItem.imageUrl }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageContainer}>
                    <Text style={styles.noImageText}>No Image</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => toggleDetails(caseItem.id)}
                >
                  <Ionicons name="eye" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {showDetails[caseItem.id] && (
                <View style={styles.detailsContainer}>
                  <View style={styles.imageSection}>
                    {caseItem.imageUrl ? (
                      <Image
                        source={{ uri: caseItem.imageUrl }}
                        style={styles.detailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.noDetailImage}>
                        <Text style={styles.noImageText}>No Image</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Owner Details</Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Name: </Text>
                      {userDetails[caseItem.userId]
                        ? `${userDetails[caseItem.userId].fname} ${userDetails[caseItem.userId].lname}`.trim()
                        : 'Unknown'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Email: </Text>
                      {caseItem.userId || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Phone: </Text>
                      {userDetails[caseItem.userId]?.phno || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Missing Pet Details</Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Name: </Text>
                      {caseItem.dogName || 'Unnamed Dog'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Breed: </Text>
                      {caseItem.breed || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Gender: </Text>
                      {caseItem.gender || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Location: </Text>
                      {caseItem.location?.address || 'Unknown location'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Latitude: </Text>
                      {caseItem.latitude || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Longitude: </Text>
                      {caseItem.longitude || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Date of Missing: </Text>
                      {caseItem.missingDate || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Time of Missing: </Text>
                      {caseItem.missingTime || 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Reward: </Text>
                      {caseItem.reward || 'None'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Description: </Text>
                      {caseItem.description || 'No additional details'}
                    </Text>
                    <Text style={styles.detailText}>
                      <Text style={styles.label}>Created At: </Text>
                      {caseItem.createdAt || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.buttonSection}>
                    {!showMyMissing && (
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleChat(caseItem.userId)}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                        <Text style={styles.chatButtonText}>Chat with Owner</Text>
                      </TouchableOpacity>
                    )}
                    {showMyMissing && (
                      <TouchableOpacity
                        style={styles.foundButton}
                        onPress={() => toggleFoundOptions(caseItem.id)}
                      >
                        <Text style={styles.foundButtonText}>Found</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {showMyMissing && showFoundOptions[caseItem.id] && (
                    <Animatable.View animation="fadeIn" style={styles.foundOptionsContainer}>
                      <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleFoundByMyself(caseItem.id)}
                      >
                        <Text style={styles.optionText}>Found by Myself</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleFoundByOther(caseItem.id)}
                      >
                        <Text style={styles.optionText}>By Other Member</Text>
                      </TouchableOpacity>
                    </Animatable.View>
                  )}

                  {showMyMissing && showFoundInput[caseItem.id] && (
                    <Animatable.View animation="fadeIn" style={styles.foundInputContainer}>
                      <TextInput
                        style={styles.foundInput}
                        placeholder="Enter registered email of finder"
                        value={foundEmails[caseItem.id] || ''}
                        onChangeText={(text) => handleFoundEmailChange(caseItem.id, text)}
                        keyboardType="email-address"
                      />
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={() => verifyEmailAndSubmit(caseItem.id)}
                      >
                        <Text style={styles.verifyButtonText}>Verify Email</Text>
                      </TouchableOpacity>
                    </Animatable.View>
                  )}
                </View>
              )}
            </Animatable.View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    marginBottom: 20,
    paddingTop: 20,
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  newMissingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 10,
  },
  newMissingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  viewMyMissingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6f61',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  viewMyMissingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  noCasesText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 40,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  cardImageContainer: {
    position: 'relative',
    height: 250,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666',
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  detailImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  noDetailImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 5,
  },
  label: {
    fontWeight: '600',
    color: '#666',
  },
  buttonSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  foundButton: {
    backgroundColor: '#ff6f61',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  foundButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  foundOptionsContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  optionButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  foundInputContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  foundInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  verifyButton: {
    backgroundColor: '#4a90e2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});