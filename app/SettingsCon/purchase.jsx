import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from '../../Config/FirebaseConfig';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';

// Restoring your original styles
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginLeft: 10,
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
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
    paddingLeft: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#68AFB3',
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
  listContainer: {
    flexGrow: 1,
  },
  cardContainer: {
    marginBottom: 15,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 280, // Restored original height
    borderRadius: 12,
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
  placeholderImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#ECF0F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 10,
    color: '#7F8C8D',
    fontSize: 14,
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
});

const PurchasedPetsPage = () => {
  const [purchasedPets, setPurchasedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const petCache = new Map();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = user.email;
        console.log('Current user email:', userEmail);
        setCurrentUser(userEmail);
        fetchPurchasedPets(userEmail);
      } else {
        console.log('No user is logged in');
        setCurrentUser(null);
        setPurchasedPets([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchPetData = async (petId) => {
    if (petCache.has(petId)) return petCache.get(petId);
    try {
      const petDoc = await getDoc(doc(db, 'PetMatchingPair', petId));
      if (!petDoc.exists()) {
        console.log(`No pet found in PetMatchingPair for petId: ${petId}`);
        return null;
      }
      const data = { id: petDoc.id, ...petDoc.data() };
      petCache.set(petId, data);
      console.log(`Fetched pet data for ${petId}:`, data);
      return data;
    } catch (err) {
      console.error(`Error fetching pet data for petId ${petId}:`, err);
      return null;
    }
  };

  const fetchPurchasedPets = async (userEmail) => {
    if (!userEmail) {
      console.log('No user email provided, skipping fetch');
      setError('Please log in to view your purchased pets.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching purchased pets for:', userEmail);
      const purchaseQuery = query(
        collection(db, 'Purchase'),
        where('userEmail', '==', userEmail)
      );

      const purchaseSnapshot = await getDocs(purchaseQuery);
      console.log('Purchase snapshot size:', purchaseSnapshot.size);
      console.log('Purchase docs:', purchaseSnapshot.docs.map(doc => doc.data()));

      if (purchaseSnapshot.empty) {
        console.log('No purchases found for user:', userEmail);
        setPurchasedPets([]);
        setLoading(false);
        return;
      }

      const petPromises = purchaseSnapshot.docs.map(async (doc) => {
        const petId = doc.data().petId;
        const petData = await fetchPetData(petId);
        return { purchase: { id: doc.id, ...doc.data() }, petData };
      });

      const results = await Promise.all(petPromises);

      const purchasedData = results.map(result => ({
        id: result.purchase.id,
        petId: result.purchase.petId,
        imageUrl: result.petData?.propicpet || null,
        title: result.petData?.petName || 'Unknown Pet',
        petData: result.petData || {},
      }));

      console.log('Filtered purchased pets data:', purchasedData);
      setPurchasedPets(purchasedData);
      setError(null);
    } catch (err) {
      console.error("Error fetching purchased pets:", err);
      setError('Failed to load purchased pets. Please try again.');
      Alert.alert("Error", "Failed to load purchased pets");
    } finally {
      setLoading(false);
    }
  };

  const navigateToPetPage = (petData) => {
    router.push({
      pathname: "/MainContent/PetProfileScreen",
      params: { pet: JSON.stringify(petData) },
    });
  };

  const renderPurchasedItem = ({ item }) => (
    <View style={styles.cardContainer}>
      <Card style={styles.card}>
        {item.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.imageUrl }}
              style={styles.image}
              onError={(e) => {
                console.log('Image load error for URL:', item.imageUrl, e.nativeEvent.error);
                setPurchasedPets(prevPets => 
                  prevPets.map(pet => 
                    pet.id === item.id ? { ...pet, imageUrl: null } : pet
                  )
                );
              }}
            />
            <View style={styles.titleContainer}>
              <Text style={styles.overlayTitle}>{item.title}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => navigateToPetPage(item.petData)}
              >
                <MaterialIcons name="visibility" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialIcons name="image" size={50} color="#BDC3C7" />
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </Card>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#68AFB3" />
        <Text style={styles.loadingText}>Loading purchased pets...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="lock" size={60} color="#68AFB3" />
        <Text style={styles.emptyText}>Please Sign In</Text>
        <Text style={styles.emptySubText}>You need to be logged in to view your purchased pets.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          color="#2C3E50"
          onPress={() => router.replace('/MainContent/petBreadHome')} 
        />
        <Text style={styles.headerTitle}>My Purchased Pets</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchPurchasedPets(currentUser)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Purchased Pets</Text>
        {purchasedPets.length === 0 ? (
          <View style={styles.emptySection}>
            <MaterialIcons name="pets" size={40} color="#68AFB3" />
            <Text style={styles.emptySectionText}>No purchased pets yet</Text>
          </View>
        ) : (
          <FlatList
            data={purchasedPets}
            renderItem={renderPurchasedItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          />
        )}
      </View>
    </View>
  );
};

export default PurchasedPetsPage;