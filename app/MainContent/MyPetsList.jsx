import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  Alert, 
  ActivityIndicator, 
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { db } from '../../Config/FirebaseConfig'; // Adjust path to your Firebase config
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Swiper from 'react-native-swiper'; // Import Swiper

const MyPets = () => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pets for the current user
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          Alert.alert('Error', 'You must be logged in to view your pets.');
          router.replace('/login');
          return;
        }

        const userId = user.uid;
        const petsRef = collection(db, 'PetMatchingPair');
        const q = query(petsRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        const petList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPets(petList);
      } catch (error) {
        console.error('Error fetching pets:', error);
        Alert.alert('Error', 'Failed to load your pets.');
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  // Handle Delete
  const handleDelete = async (petId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this pet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'PetMatchingPair', petId));
              setPets(pets.filter(pet => pet.id !== petId));
              Alert.alert('Success', 'Pet deleted successfully.');
            } catch (error) {
              console.error('Error deleting pet:', error);
              Alert.alert('Error', 'Failed to delete pet.');
            }
          },
        },
      ]
    );
  };

  // Handle Edit
  const handleEdit = (petId) => {
    router.push({
      pathname: './PetProfile',
      params: { petId, isEdit: true },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Pets</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {pets.length === 0 ? (
          <Text style={styles.noPetsText}>You have no pets added yet.</Text>
        ) : (
          pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              {/* Pet Images Slider */}
              {pet.PetImages && pet.PetImages.length > 0 ? (
                <View style={styles.bannerContainer}>
                  <Swiper
                    style={styles.swiper}
                    autoplay={true}
                    autoplayTimeout={4}
                    showsPagination={true}
                    paginationStyle={styles.pagination}
                    dot={<View style={styles.dot} />}
                    activeDot={<View style={styles.activeDot} />}
                  >
                    {pet.PetImages.map((image, index) => (
                      <View key={index} style={styles.slide}>
                        <Image source={{ uri: image }} style={styles.bannerImage} />
                      </View>
                    ))}
                  </Swiper>
                </View>
              ) : (
                <Ionicons name="paw-outline" size={50} color="#4CAF50" style={styles.placeholderIcon} />
              )}

              {/* Pet Details */}
              <View style={styles.detailsContainer}>
                <Text style={styles.petName}>{pet.petName}</Text>
                <Text style={styles.petDetail}>Breed: {pet.petBreed}</Text>
                <Text style={styles.petDetail}>Age: {pet.petAge} years</Text>
                <Text style={styles.petDetail}>Gender: {pet.petGender}</Text>
                <Text style={styles.petDetail}>Type: {pet.petType}</Text>
                <Text style={styles.petDetail}>Size: {pet.petSize}</Text>
                <Text style={styles.petDetail}>Weight: {pet.petWeight}</Text>
                <Text style={styles.petDetail}>Price: ₹{pet.petPrice}</Text>
                <Text style={styles.petDetail}>Health: {pet.healthStatus}</Text>
                <Text style={styles.petDetail}>Vaccination: {pet.vaccinationDateLast}</Text>
                <Text style={styles.petDetail}>Purpose: {pet.purpose}</Text>
                {pet.titles && pet.titles.length > 0 && (
                  <Text style={styles.petDetail}>Titles: {pet.titles.join(', ')}</Text>
                )}
                {pet.colors && pet.colors.length > 0 && (
                  <Text style={styles.petDetail}>Colors: {pet.colors.join(', ')}</Text>
                )}
                <Text style={styles.petDetail}>Description: {pet.description}</Text>
              </View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(pet.id)}>
                  <Ionicons name="pencil-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(pet.id)}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 15,
  },
  scrollContainer: {
    padding: 20,
  },
  petCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  bannerContainer: {
    height: 200, // Adjust height for the swiper
    marginBottom: 10,
  },
  swiper: {
    height: 200,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  pagination: {
    bottom: 10,
  },
  dot: {
    backgroundColor: 'rgba(0,0,0,.2)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#4CAF50',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  placeholderIcon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  detailsContainer: {
    marginBottom: 15,
  },
  petName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  petDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#E74C3C',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
  },
  buttonText: {
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
  noPetsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default MyPets;