import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { db } from '../../Config/FirebaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Swiper from 'react-native-swiper';
import { router } from 'expo-router';
import { s3, S3_BUCKET } from '../../aws-config';
import LottieView from 'lottie-react-native';
import DogWalkAnimation from './../../assets/Animations/DogWalk.json';

const MyPet = () => {
  const [pets, setPets] = useState([]);
  const [orderedPets, setOrderedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState(null);

  const cleanUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    let cleanedUrl = url;
    if (cleanedUrl.startsWith('"')) cleanedUrl = cleanedUrl.slice(1);
    if (cleanedUrl.endsWith('"')) cleanedUrl = cleanedUrl.slice(0, -1);
    cleanedUrl = cleanedUrl.replace(/\s*\(string\)$/, '').trim();
    return cleanedUrl || 'https://via.placeholder.com/150';
  };

  const getS3KeyFromUrl = (url) => {
    if (!url) return null;
    const urlParts = url.split('/');
    return urlParts.slice(3).join('/');
  };

  const deleteS3Objects = async (urls) => {
    const keys = urls
      .filter(url => url && url.startsWith(`https://${S3_BUCKET}.s3`))
      .map(getS3KeyFromUrl)
      .filter(key => key);

    if (keys.length === 0) return;

    const deletePromises = keys.map(key => {
      return new Promise((resolve, reject) => {
        const params = { Bucket: S3_BUCKET, Key: key };
        s3.deleteObject(params, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    });

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting some S3 objects:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          Alert.alert('Error', 'You must be logged in to view your pets.');
          return;
        }

        const userEmail = user.email;
        const petsRef = collection(db, 'PetMatchingPair');
        const q = query(petsRef, where('userId', '==', userEmail));
        const querySnapshot = await getDocs(q);

        const petList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            propicpet: cleanUrl(data.propicpet),
            PetImages: (data.PetImages || []).map(cleanUrl),
          };
        });

        const activePets = petList.filter(pet => pet.Active !== "N");
        const inactivePets = petList.filter(pet => pet.Active === "N");

        setPets(activePets);
        setOrderedPets(inactivePets);
      } catch (error) {
        console.error('Error fetching pets:', error);
        Alert.alert('Error', 'Failed to load your pets.');
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  const handleView = (pet) => {
    console.log('Selected pet images:', pet.PetImages);
    console.log('Profile pic:', pet.propicpet);
    setSelectedPet(pet);
  };

  const handleEdit = (pet) => {
    router.push({
      pathname: '/MainContent/Profile_Edit_Pet',
      params: { documentId: pet.id },
    });
  };

  const handleDelete = (pet) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${pet.petName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const urlsToDelete = [
                pet.propicpet,
                ...(pet.PetImages || []),
                pet.PetLicense,
                ...(pet.PetCertificates || []),
              ].filter(Boolean);
              await deleteS3Objects(urlsToDelete);
              await deleteDoc(doc(db, 'PetMatchingPair', pet.id));
              setPets(pets.filter(p => p.id !== pet.id));
              setOrderedPets(orderedPets.filter(p => p.id !== pet.id));
              Alert.alert('Success', `${pet.petName} deleted successfully.`);
            } catch (error) {
              console.error('Error deleting pet:', error);
              Alert.alert('Error', 'Failed to delete pet.');
            }
          },
        },
      ]
    );
  };

  const handleViewBuyerProfile = (buyerEmail) => {
    router.push({
      pathname: '/MainContent/Ownerpage',
      params: { userId: buyerEmail },
    });
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return 'Unknown';
    const parts = url.split('/');
    return parts[parts.length - 1] || 'Unknown';
  };

  const openDocumentLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error('Failed to open URL:', err);
        Alert.alert('Error', 'Unable to open document link.');
      });
    }
  };

  const renderPetCard = ({ item }) => (
    <View style={styles.card}>
      <Image 
        source={{ uri: item.propicpet }} 
        style={styles.image} 
        resizeMode="cover"
        onError={(e) => console.log(`Failed to load card image for ${item.petName}:`, e.nativeEvent.error)}
        defaultSource={{ uri: 'https://via.placeholder.com/150' }}
      />
      <View style={styles.overlay}>
        <Text style={styles.name}>{item.petName}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleView(item)}>
            <Ionicons name="eye" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleDelete(item)}>
            <Ionicons name="trash" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* My Pets Section */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerCard}>
          <Text style={styles.heading}>My Pets</Text>
        </View>
        <View style={styles.animationContainer}>
          <LottieView
            source={DogWalkAnimation}
            autoPlay
            loop
            style={styles.dogWalkAnimation}
            speed={0.7}
            onAnimationFailure={(error) => console.log("Animation Error:", error)}
          />
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : pets.length === 0 ? (
        <Text style={styles.noPetsText}>You have no pets added yet.</Text>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderPetCard}
        />
      )}

      {/* Ordered Pets Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.heading}>Ordered Pets</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : orderedPets.length === 0 ? (
          <Text style={styles.noPetsText}>You have no ordered pets.</Text>
        ) : (
          <FlatList
            data={orderedPets}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={renderPetCard}
          />
        )}
      </View>

      {/* Popup Modal for Pet Details */}
      {selectedPet && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={!!selectedPet}
          onRequestClose={() => setSelectedPet(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setSelectedPet(null)}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>

              <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.modalTitle}>{selectedPet.petName}</Text>
                
                <View style={styles.swiperContainer}>
                  <Swiper
                    style={styles.imageSwiper}
                    showsPagination={true}
                    dot={<View style={styles.dot} />}
                    activeDot={<View style={styles.activeDot} />}
                    loop={false}
                    autoplay={false}
                    key={selectedPet.id}
                  >
                    {(selectedPet.PetImages || [selectedPet.propicpet]).map((img, idx) => (
                      <View key={idx} style={styles.modalSlide}>
                        <Image
                          source={{ uri: cleanUrl(img) }}
                          style={styles.modalImage}
                          resizeMode="contain"
                          onError={(e) => console.log(`Failed to load image ${idx} with URL ${img}:`, e.nativeEvent.error)}
                          defaultSource={{ uri: 'https://petmatch-public.s3.ap-south-1.amazonaws.com/pet-profile-1743819012070.jpg' }}
                        />
                      </View>
                    ))}
                  </Swiper>
                </View>

                <Text style={styles.modalDetail}>Pet ID: {selectedPet.petID}</Text>
                <Text style={styles.modalDetail}>Breed: {selectedPet.petBreed}</Text>
                <Text style={styles.modalDetail}>Age: {selectedPet.petAge} years</Text>
                <Text style={styles.modalDetail}>Gender: {selectedPet.petGender}</Text>
                <Text style={styles.modalDetail}>Type: {selectedPet.petType}</Text>
                <Text style={styles.modalDetail}>Size: {selectedPet.petSize}</Text>
                <Text style={styles.modalDetail}>Weight: {selectedPet.petWeight}</Text>
                <Text style={styles.modalDetail}>Price: ₹{selectedPet.petPrice}</Text>
                <Text style={styles.modalDetail}>Health: {selectedPet.healthStatus}</Text>
                <Text style={styles.modalDetail}>Location: {selectedPet.location?.address || 'N/A'}</Text>
                <Text style={styles.modalDetail}>Description: {selectedPet.description}</Text>
                <Text style={styles.modalDetail}>Verified Documents:</Text>
                {(selectedPet.PetDocuments || []).length > 0 ? (
                  selectedPet.PetDocuments.map((doc, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => openDocumentLink(doc)}
                      style={styles.documentLink}
                    >
                      <Text style={styles.documentLinkText}>{getFileNameFromUrl(doc)}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.modalDetail}>  None</Text>
                )}
                <Text style={styles.modalDetail}>
                  Colors: {(selectedPet.colors || []).length > 0 ? selectedPet.colors.join(', ') : 'None'}
                </Text>
                <Text style={styles.modalDetail}>
                  Titles: {(selectedPet.titles || []).length > 0 ? selectedPet.titles.join(', ') : 'None'}
                </Text>

                {/* Buyer Section for Ordered Pets */}
                {selectedPet.Active === "N" && (
                  <View style={styles.buyerSection}>
                    <Text style={styles.sectionHeading}>Buyer Details</Text>
                    <Text style={styles.modalDetail}>
                      Buyer Email: {selectedPet.Buyer || 'N/A'}
                    </Text>
                    {selectedPet.Buyer && (
                      <TouchableOpacity
                        style={styles.viewBuyerButton}
                        onPress={() => handleViewBuyerProfile(selectedPet.Buyer)}
                      >
                        <Text style={styles.viewBuyerButtonText}>View Buyer Profile</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPet(null)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  bannerContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 16,
  },
  bannerCard: {
    width: '50%',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  animationContainer: {
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dogWalkAnimation: {
    width: 150,
    height: 150,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    height: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 8,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noPetsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  sectionContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    maxHeight: '80%',
    position: 'relative',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  swiperContainer: {
    height: 220,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  imageSwiper: {
    height: 200,
  },
  modalSlide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  dot: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
  activeDot: {
    backgroundColor: '#000',
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 3,
  },
  modalDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  documentLink: {
    marginLeft: 10,
    marginBottom: 5,
  },
  documentLinkText: {
    fontSize: 14,
    color: '#1e90ff',
    textDecorationLine: 'underline',
  },
  buyerSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  viewBuyerButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  viewBuyerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyPet;