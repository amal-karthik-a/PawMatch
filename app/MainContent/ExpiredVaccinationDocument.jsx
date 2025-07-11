import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { db } from './../../Config/FirebaseConfig'; // Adjust the path to your Firebase config
import { collection, getDocs } from 'firebase/firestore';

const VaccinationReminder = () => {
  const [usersToNotify, setUsersToNotify] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to calculate the difference in days between two dates
  const calculateDaysDifference = (dateString) => {
    try {
      // Parse the vaccination date (format: "YYYY-MM-DD")
      const [year, month, day] = dateString.split('-').map(Number);
      const vaccinationDate = new Date(year, month - 1, day); // month is 0-indexed in JavaScript

      // Current date (March 25, 2025, as per system date)
      const currentDate = new Date('2025-03-25');

      // Calculate the difference in milliseconds
      const diffTime = currentDate - vaccinationDate;
      // Convert to days
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (err) {
      console.error(`Error parsing date ${dateString}:`, err);
      return Infinity; // If date parsing fails, assume it's overdue
    }
  };

  // Fetch pets from PetMatchingPair and filter those not vaccinated for more than 6 months
  const fetchPetsForVaccinationReminder = async () => {
    try {
      setLoading(true);
      setError(null);

      const petMatchingPairCollection = collection(db, 'PetMatchingPair');
      const petSnapshot = await getDocs(petMatchingPairCollection);

      const usersMap = new Map(); // To store unique users

      petSnapshot.forEach(doc => {
        const petData = doc.data();

        // Check if vaccinationDateLast exists
        if (petData.vaccinationDateLast) {
          const daysSinceLastVaccination = calculateDaysDifference(petData.vaccinationDateLast);

          // If more than 6 months (183 days) have passed
          if (daysSinceLastVaccination > 183) {
            const userEmail = petData.userId;
            if (userEmail) {
              // Add the user to the map with their email as the key
              usersMap.set(userEmail, {
                email: userEmail,
                petName: petData.petName || 'Unknown Pet',
                vaccinationDateLast: petData.vaccinationDateLast,
                daysOverdue: daysSinceLastVaccination,
              });
            }
          }
        }
      });

      // Convert the map to an array of users
      const usersList = Array.from(usersMap.values());
      setUsersToNotify(usersList);

      // Log the users for now (you can replace this with a notification system)
      if (usersList.length > 0) {
        console.log('Users whose pets need vaccination reminders:');
        usersList.forEach(user => {
          console.log(
            `Email: ${user.email}, Pet: ${user.petName}, Last Vaccinated: ${user.vaccinationDateLast}, Days Overdue: ${user.daysOverdue}`
          );
        });
      } else {
        console.log('No users found whose pets need vaccination reminders.');
      }
    } catch (error) {
      setError('Failed to fetch vaccination data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPetsForVaccinationReminder();
  }, []);

  // Render each user item
  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <Text style={styles.userText}>User Email: {item.email}</Text>
      <Text style={styles.petText}>Pet Name: {item.petName}</Text>
      <Text style={styles.dateText}>Last Vaccinated: {item.vaccinationDateLast}</Text>
      <Text style={styles.overdueText}>Days Overdue: {item.daysOverdue}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading vaccination data...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Vaccination Reminders</Text>
      <FlatList
        data={usersToNotify}
        renderItem={renderUserItem}
        keyExtractor={item => item.email}
        ListEmptyComponent={<Text style={styles.emptyText}>No pets need vaccination reminders at this time.</Text>}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    padding: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    elevation: 5,
  },
  userText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  petText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 4,
  },
  dateText: {
    font:12,
    color: '#BBBBBB',
    marginTop: 4,
  },
  overdueText: {
    fontSize: 14,
    color: '#FF5555',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888888',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888888',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#FF5555',
  },
});

export default VaccinationReminder;