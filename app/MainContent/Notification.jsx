import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Switch, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { db } from './../../Config/FirebaseConfig'; // Adjust the path to your Firebase config
import { doc, setDoc, getDoc } from 'firebase/firestore';

const NotificationPage = () => {
  const auth = getAuth();
  const [notifications, setNotifications] = useState({
    missingPets: false,
    appGeneral: true,
    security: true,
    events: false,
    animalAbuse: false,
    registeredPets: false,
  });

  // Toggle switch handler
  const toggleSwitch = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Set all notifications to ON
  const setAllOn = () => {
    setNotifications({
      missingPets: true,
      appGeneral: true,
      security: true,
      events: true,
      animalAbuse: true,
      registeredPets: true,
    });
  };

  // Set all notifications to OFF
  const setAllOff = () => {
    setNotifications({
      missingPets: false,
      appGeneral: false,
      security: false,
      events: false,
      animalAbuse: false,
      registeredPets: false,
    });
  };

  // Load preferences from Firestore on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'Settings', user.email);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setNotifications({
              missingPets: data.Missing === 'Y',
              appGeneral: data.App === 'Y',
              security: data.Security === 'Y',
              events: data.Events === 'Y',
              animalAbuse: data.AnimalAbuse === 'Y',
              registeredPets: data.RegisteredPets === 'Y',
            });
          }
        } catch (error) {
          console.error('Error loading preferences:', error);
        }
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to Firestore
  const savePreferences = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save preferences.');
      return;
    }

    // Define the new notification settings
    const newSettingsData = {
      Missing: notifications.missingPets ? 'Y' : 'N',
      App: notifications.appGeneral ? 'Y' : 'N',
      Security: notifications.security ? 'Y' : 'N',
      Events: notifications.events ? 'Y' : 'N',
      AnimalAbuse: notifications.animalAbuse ? 'Y' : 'N',
      RegisteredPets: notifications.registeredPets ? 'Y' : 'N',
    };

    try {
      const docRef = doc(db, 'Settings', user.email);
      const docSnap = await getDoc(docRef);

      let updatedData = { ...newSettingsData };

      if (docSnap.exists()) {
        // Get the existing document data
        const existingData = docSnap.data();
        // Merge the existing data with the new notification settings
        updatedData = {
          ...existingData, // Preserve all existing fields
          ...newSettingsData, // Add or update the notification settings
        };
      }

      // Save the merged data back to Firestore
      await setDoc(docRef, updatedData);
      Alert.alert('Success', 'Notification preferences saved!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9f9f9" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back-outline" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Notification Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage Notifications</Text>

          {/* Missing Pets */}
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Ionicons name="paw-outline" size={24} color="#68AFB3" style={styles.icon} />
              <Text style={styles.optionLabel}>Missing Pets</Text>
            </View>
            <Switch
              onValueChange={() => toggleSwitch('missingPets')}
              value={notifications.missingPets}
              trackColor={{ false: '#767577', true: '#68AFB3' }}
              thumbColor={notifications.missingPets ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* App General */}
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Ionicons name="notifications-outline" size={24} color="#68AFB3" style={styles.icon} />
              <Text style={styles.optionLabel}>App General</Text>
            </View>
            <Switch
              onValueChange={() => toggleSwitch('appGeneral')}
              value={notifications.appGeneral}
              trackColor={{ false: '#767577', true: '#68AFB3' }}
              thumbColor={notifications.appGeneral ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Security */}
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#68AFB3" style={styles.icon} />
              <Text style={styles.optionLabel}>Security</Text>
            </View>
            <Switch
              onValueChange={() => toggleSwitch('security')}
              value={notifications.security}
              trackColor={{ false: '#767577', true: '#68AFB3' }}
              thumbColor={notifications.security ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Events Notification */}
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Ionicons name="calendar-outline" size={24} color="#68AFB3" style={styles.icon} />
              <Text style={styles.optionLabel}>Events Notification</Text>
            </View>
            <Switch
              onValueChange={() => toggleSwitch('events')}
              value={notifications.events}
              trackColor={{ false: '#767577', true: '#68AFB3' }}
              thumbColor={notifications.events ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Animal Abuse */}
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Ionicons name="alert-circle-outline" size={24} color="#68AFB3" style={styles.icon} />
              <Text style={styles.optionLabel}>Animal Abuse</Text>
            </View>
            <Switch
              onValueChange={() => toggleSwitch('animalAbuse')}
              value={notifications.animalAbuse}
              trackColor={{ false: '#767577', true: '#68AFB3' }}
              thumbColor={notifications.animalAbuse ? '#fff' : '#f4f3f4'}
            />
          </View>

          {/* Notification On Registered Pets */}
          <View style={styles.option}>
            <View style={styles.optionText}>
              <Ionicons name="heart-outline" size={24} color="#68AFB3" style={styles.icon} />
              <Text style={styles.optionLabel}>Notification On Registered Pets</Text>
            </View>
            <Switch
              onValueChange={() => toggleSwitch('registeredPets')}
              value={notifications.registeredPets}
              trackColor={{ false: '#767577', true: '#68AFB3' }}
              thumbColor={notifications.registeredPets ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Toggle All Buttons */}
        <View style={styles.toggleButtonsContainer}>
          <TouchableOpacity style={styles.toggleButtonOn} onPress={setAllOn}>
            <Text style={styles.toggleButtonText}>Set All On</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toggleButtonOff} onPress={setAllOff}>
            <Text style={styles.toggleButtonText}>Set All Off</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={savePreferences}>
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9', // Match FavoritesPage background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff', // Match FavoritesPage header background
    borderBottomWidth: 1,
    borderBottomColor: '#eee', // Match FavoritesPage header border
  },
  headerTitle: {
    fontSize: 20, // Match FavoritesPage header title
    fontWeight: 'bold',
    color: '#333', // Match FavoritesPage text color
    marginLeft: 10,
  },
  scrollContainer: {
    padding: 15, // Match FavoritesPage padding
  },
  section: {
    backgroundColor: '#fff', // Match FavoritesPage card background
    borderRadius: 8, // Match FavoritesPage card border radius
    padding: 15, // Match FavoritesPage padding
    elevation: 2, // Match FavoritesPage card elevation
  },
  sectionTitle: {
    fontSize: 18, // Match FavoritesPage section title
    fontWeight: 'bold',
    color: '#333', // Match FavoritesPage section title color
    marginBottom: 10,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Adjusted for better spacing
    borderBottomWidth: 1,
    borderBottomColor: '#eee', // Match FavoritesPage border color
  },
  optionText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 16, // Match FavoritesPage text size
    color: '#333', // Match FavoritesPage text color
  },
  toggleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  toggleButtonOn: {
    backgroundColor: '#68AFB3', // Match FavoritesPage accent color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5, // Match FavoritesPage button border radius
    flex: 1,
    alignItems: 'center',
    marginRight: 10,
    elevation: 2, // Match FavoritesPage elevation
  },
  toggleButtonOff: {
    backgroundColor: '#ff4444', // Match FavoritesPage error/remove color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5, // Match FavoritesPage button border radius
    flex: 1,
    alignItems: 'center',
    elevation: 2, // Match FavoritesPage elevation
  },
  toggleButtonText: {
    color: '#fff', // Match FavoritesPage button text color
    fontSize: 16, // Match FavoritesPage text size
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#68AFB3', // Match FavoritesPage accent color
    paddingVertical: 15,
    borderRadius: 5, // Match FavoritesPage button border radius
    alignItems: 'center',
    marginTop: 20,
    elevation: 2, // Match FavoritesPage elevation
  },
  saveButtonText: {
    color: '#fff', // Match FavoritesPage button text color
    fontSize: 16, // Match FavoritesPage text size
    fontWeight: 'bold',
  },
});

export default NotificationPage;