import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { db, auth } from './../../Config/FirebaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import BottomNavigation from './BottomNavigation';

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
    flex: 1, // Allow each section to take equal space
    paddingHorizontal: 15,
    marginTop: 20,
    paddingBottom: 80, // Added padding to account for BottomNavigation height
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
    flexGrow: 1, // Ensure the FlatList grows within its container
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
  disabledCard: {
    opacity: 0.6,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 280, // Increased from 220 to 280
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
  removeButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    height: 45,
    width: 45,
  },
  viewButton: {
    padding: 6,
    backgroundColor: 'rgba(1, 1, 1, 0.31)',
    borderRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: 280, // Increased from 220 to 280
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

const FavoritesPage = ({ navigation }) => {
  const [breedFavorites, setBreedFavorites] = useState([]);
  const [sellFavorites, setSellFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const petCache = new Map();

  useEffect(() => {
    setCurrentUser("amal.karthik2026@gmail.com");
    fetchFavorites("amal.karthik2026@gmail.com");
  }, []);

  const fetchPetData = async (petId) => {
    if (petCache.has(petId)) return petCache.get(petId);
    try {
      const petDoc = await getDoc(doc(db, 'PetMatchingPair', petId));
      const data = petDoc.exists() ? { id: petDoc.id, ...petDoc.data() } : null;
      petCache.set(petId, data);
      return data;
    } catch (err) {
      console.error(`Error fetching pet data for petId ${petId}:`, err);
      return null;
    }
  };

  const fetchFavorites = async (userId) => {
    try {
      setLoading(true);
      const favoritesQuery = query(
        collection(db, 'Favorites'),
        where('userId', '==', userId)
      );

      const favoritesSnapshot = await getDocs(favoritesQuery);
      if (favoritesSnapshot.empty) {
        setBreedFavorites([]);
        setSellFavorites([]);
        setLoading(false);
        return;
      }

      const petPromises = favoritesSnapshot.docs
        .filter(doc => doc.data().petId)
        .map(async (doc) => {
          const petData = await fetchPetData(doc.data().petId);
          return { favorite: { id: doc.id, ...doc.data() }, petData };
        });

      const results = await Promise.all(petPromises);

      const favoritesData = results
        .filter(result => result.petData)
        .map(result => ({
          id: result.favorite.id,
          active: result.favorite.active || 'Y',
          petId: result.favorite.petId,
          imageUrl: result.petData.propicpet,
          title: result.petData.petName || 'Favorite Pet',
          purpose: result.petData.purpose || 'Sell',
          petData: result.petData,
        }));

      const breedData = favoritesData.filter(fav => fav.purpose === 'Breed');
      const sellData = favoritesData.filter(fav => fav.purpose === 'Sell');

      setBreedFavorites(breedData);
      setSellFavorites(sellData);
      setError(null);
    } catch (err) {
      console.error("Error fetching favorites:", err);
      setError('Failed to load favorites. Please try again.');
      Alert.alert("Error", "Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favoriteId, purpose) => {
    try {
      await deleteDoc(doc(db, 'Favorites', favoriteId));
      if (purpose === 'Breed') {
        setBreedFavorites(breedFavorites.filter(fav => fav.id !== favoriteId));
      } else {
        setSellFavorites(sellFavorites.filter(fav => fav.id !== favoriteId));
      }
      Alert.alert("Success", "Removed from favorites");
    } catch (err) {
      console.error("Error removing favorite:", err);
      Alert.alert("Error", "Failed to remove favorite");
    }
  };

  const navigateToPetPage = (petData) => {
    router.push({
      pathname: "/MainContent/PetProfileScreen",
      params: { pet: JSON.stringify(petData) },
    });
  };

  const renderFavoriteItem = ({ item }, purpose) => (
    <View style={styles.cardContainer}>
      <Card style={[styles.card, item.active === 'N' ? styles.disabledCard : null]} disabled={item.active === 'N'}>
        {item.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: item.imageUrl }}
              style={styles.image}
              onError={() => console.log('Image failed to load:', item.imageUrl)}
            />
            <View style={styles.titleContainer}>
              <Text style={styles.overlayTitle}>{item.title || 'Favorite Pet'}</Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeFavorite(item.id, purpose)}
              >
                <MaterialIcons name="favorite" size={35} color="#ff4444" />
              </TouchableOpacity>
              {item.active === 'Y' && (
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => navigateToPetPage(item.petData)}
                >
                  <MaterialIcons name="visibility" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
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
        <Text style={styles.loadingText}>Loading favorites...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="lock" size={60} color="#68AFB3" />
        <Text style={styles.emptyText}>Please Sign In</Text>
        <Text style={styles.emptySubText}>You need to be logged in to view your favorites.</Text>
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
        <Text style={styles.headerTitle}>My Favorites</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchFavorites(currentUser)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Breed Favorites</Text>
        {breedFavorites.length === 0 ? (
          <View style={styles.emptySection}>
            <MaterialIcons name="favorite-border" size={40} color="#68AFB3" />
            <Text style={styles.emptySectionText}>No breed favorites yet</Text>
          </View>
        ) : (
          <FlatList
            data={breedFavorites}
            renderItem={(props) => renderFavoriteItem(props, 'Breed')}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true} // Enable nested scrolling
          />
        )}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Sell Favorites</Text>
        {sellFavorites.length === 0 ? (
          <View style={styles.emptySection}>
            <MaterialIcons name="favorite-border" size={40} color="#68AFB3" />
            <Text style={styles.emptySectionText}>No sell favorites yet</Text>
          </View>
        ) : (
          <FlatList
            data={sellFavorites}
            renderItem={(props) => renderFavoriteItem(props, 'Sell')}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true} // Enable nested scrolling
          />
        )}
      </View>

      <BottomNavigation name="favorite" />
    </View>
  );
};

export default FavoritesPage;