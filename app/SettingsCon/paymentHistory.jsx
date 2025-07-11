import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import { db, auth } from './../../Config/FirebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const PaymentHistory = () => {
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedMainTab, setSelectedMainTab] = useState('All');
  const [selectedRewardSubTab, setSelectedRewardSubTab] = useState(null);
  const [eventsMap, setEventsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Utility functions to convert Firestore Timestamps
  const formatTimestampToDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      return date.toLocaleDateString();
    }
    return timestamp; // Return as is if already a string
  };

  const formatTimestampToTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
      const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return timestamp; // Return as is if already a string
  };

  // Fetch transactions from Payment collection
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        throw new Error("User is not authenticated or email is missing. Please log in.");
      }

      const paymentCollection = collection(db, 'Payment');
      const q1 = query(paymentCollection, where('userEmail', '==', userEmail));
      const q2 = query(paymentCollection, where('To', '==', userEmail));
      const q3 = query(paymentCollection, where('from', '==', userEmail));

      const [snapshot1, snapshot2, snapshot3] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
        getDocs(q3)
      ]);

      const transactionMap = new Map();
      [snapshot1, snapshot2, snapshot3].forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          transactionMap.set(doc.id, { 
            id: doc.id, 
            ...data,
            dateOfPayment: formatTimestampToDate(data.dateOfPayment),
            timeOfPayment: formatTimestampToTime(data.timeOfPayment)
          });
        });
      });

      const transactionList = Array.from(transactionMap.values());
      setTransactions(transactionList);
      setFilteredTransactions(transactionList);
      return transactionList;
    } catch (error) {
      throw new Error("Failed to fetch transactions: " + error.message);
    }
  };

  const fetchEventNames = async (transactionList) => {
    try {
      const eventIds = [...new Set(transactionList
        .map(txn => txn.eventId || txn.MissingId)
        .filter(id => id))];

      if (eventIds.length === 0) {
        setEventsMap({});
        return {};
      }

      const eventsCollection = collection(db, 'Events');
      const missingCollection = collection(db, 'Missing');
      const eventsSnapshot = await getDocs(eventsCollection);
      const missingSnapshot = await getDocs(missingCollection);
      const eventsData = {};

      eventsSnapshot.forEach(doc => {
        const eventId = doc.id;
        if (eventIds.includes(eventId)) {
          eventsData[eventId] = doc.data().eventName || 'Unknown Event';
        }
      });

      missingSnapshot.forEach(doc => {
        const missingId = doc.id;
        if (eventIds.includes(missingId)) {
          eventsData[missingId] = doc.data().dogName || 'Unknown Missing Pet';
        }
      });

      setEventsMap(eventsData);
      return eventsData;
    } catch (error) {
      throw new Error("Failed to fetch event/missing names: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const transactionList = await fetchTransactions();
        await fetchEventNames(transactionList);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter transactions based on selected tab
  const filterTransactions = (mainTab, subTab = null) => {
    setSelectedMainTab(mainTab);
    setSelectedRewardSubTab(subTab);
    let filtered = [];
    const currentUserEmail = auth.currentUser?.email;

    if (mainTab === 'All') {
      filtered = transactions;
    } else if (mainTab === 'Failed') {
      filtered = transactions.filter(txn => 
        txn.status && 
        txn.status.toLowerCase().startsWith('f') && 
        txn.userEmail === currentUserEmail
      );
    } else if (mainTab === 'Pending') {
      filtered = transactions.filter(txn => 
        txn.status && 
        (txn.status.toLowerCase() === 'pending' || txn.status.toLowerCase().startsWith('p')) && 
        txn.userEmail === currentUserEmail
      );
    } else if (mainTab === 'Refunded') {
      filtered = transactions.filter(txn => 
        txn.status && 
        txn.status.toLowerCase().startsWith('cr') && 
        txn.userEmail === currentUserEmail
      );
    } else if (mainTab === 'Reward') {
      const effectiveSubTab = subTab || 'Received';
      setSelectedRewardSubTab(effectiveSubTab);

      if (effectiveSubTab === 'Received') {
        filtered = transactions.filter(txn => 
          txn.To === currentUserEmail
        );
      } else if (effectiveSubTab === 'Sent') {
        filtered = transactions.filter(txn => 
          txn.from === currentUserEmail
        );
      }
    }

    setFilteredTransactions(filtered);
  };

  // Map status to display text and color
  const getStatusDisplay = (status) => {
    if (!status) return { text: 'Unknown', color: '#000000' };
    const lowerStatus = status.toLowerCase();
    
    if (lowerStatus === 'pending' || lowerStatus.startsWith('p')) {
      return { text: 'Pending', color: '#FFA500' };
    } else if (lowerStatus === 'success' || lowerStatus.startsWith('s')) {
      return { text: 'Completed', color: '#008000' };
    } else if (lowerStatus.startsWith('f')) {
      return { text: 'Failed', color: '#FF0000' };
    } else if (lowerStatus.startsWith('cr')) {
      return { text: 'Refund Completed', color: '#006400' };
    } else if (lowerStatus === 'reward') {
      return { text: 'Reward', color: '#00CED1' };
    }
    return { text: status, color: '#000000' };
  };

  // Render each transaction item with animation
  const renderTransaction = ({ item }) => {
    const statusDisplay = getStatusDisplay(item.status);
    const eventId = item.eventId || item.MissingId;
    const eventName = eventId && eventsMap[eventId] ? eventsMap[eventId] : 'Unknown';
    const showToFrom = item.To || item.from;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.transactionItem}
          onPress={() => navigation.navigate('PaymentDetails', { transaction: item })}
          activeOpacity={0.8}
        >
          <View style={styles.transactionInfo}>
            <Text style={styles.dateText}>{item.dateOfPayment || 'N/A'}</Text>
            <Text style={styles.timeText}>{item.timeOfPayment || 'N/A'}</Text>
            <Text style={styles.eventText}>{eventName}</Text>
            {showToFrom && (
              <>
                <Text style={styles.detailText}>From: {item.from || 'N/A'}</Text>
                <Text style={styles.detailText}>To: {item.To || 'N/A'}</Text>
              </>
            )}
            <Text style={styles.transactionIdText}>ID: {item.transactionId || 'N/A'}</Text>
          </View>
          <View style={styles.rightSection}>
            <Text style={styles.amountText}>${item.price || '0'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color }]}>
              <Text style={styles.statusText}>{statusDisplay.text}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading transactions...</Text>
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
      <Text style={styles.header}>Payment History</Text>

      <View style={styles.filterContainer}>
        {['All', 'Failed', 'Pending', 'Refunded', 'Reward'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterButton,
              selectedMainTab === tab && styles.selectedFilter,
            ]}
            onPress={() => filterTransactions(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                selectedMainTab === tab && styles.selectedFilterText,
              ]}
            >
              {tab === 'All'
                ? 'All Transactions'
                : tab === 'Failed'
                ? 'Failed'
                : tab === 'Pending'
                ? 'Pending'
                : tab === 'Refunded'
                ? 'Refunded'
                : 'Reward'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedMainTab === 'Reward' && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity
            style={[
              styles.subTabButton,
              selectedRewardSubTab === 'Received' && styles.selectedSubTab,
            ]}
            onPress={() => filterTransactions('Reward', 'Received')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subTabText,
                selectedRewardSubTab === 'Received' && styles.selectedSubTabText,
              ]}
            >
              Received
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTabButton,
              selectedRewardSubTab === 'Sent' && styles.selectedSubTab,
            ]}
            onPress={() => filterTransactions('Reward', 'Sent')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subTabText,
                selectedRewardSubTab === 'Sent' && styles.selectedSubTabText,
              ]}
            >
              Sent
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found for this filter.</Text>}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

// PaymentDetails Component
const PaymentDetails = () => {
  const navigation = useNavigation();
  const { transaction } = navigation.getState().routes.find(route => route.name === 'PaymentDetails').params;

  const getStatusDisplay = (status) => {
    if (!status) return 'Unknown';
    const lowerStatus = status.toLowerCase();
    if (lowerStatus === 'pending' || lowerStatus.startsWith('p')) return 'Pending';
    if (lowerStatus === 'success' || lowerStatus.startsWith('s')) return 'Completed';
    if (lowerStatus.startsWith('f')) return 'Failed';
    if (lowerStatus.startsWith('cr')) return 'Refund Completed';
    if (lowerStatus === 'reward') return 'Reward';
    return status;
  };

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalHeader}>Transaction Details</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>{transaction.dateOfPayment || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{transaction.timeOfPayment || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Event/Missing ID:</Text>
          <Text style={styles.detailValue}>{transaction.eventId || transaction.MissingId || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>${transaction.price || '0'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={styles.detailValue}>{getStatusDisplay(transaction.status)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Transaction ID:</Text>
          <Text style={styles.detailValue}>{transaction.transactionId || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{transaction.type || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>User Email:</Text>
          <Text style={styles.detailValue}>{transaction.userEmail || transaction.To || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>From:</Text>
          <Text style={styles.detailValue}>{transaction.from || 'N/A'}</Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
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
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#333333',
    margin: 5,
    elevation: 3,
  },
  selectedFilter: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#BBBBBB',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedFilterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  subTabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  subTabButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#333333',
    marginHorizontal: 5,
  },
  selectedSubTab: {
    backgroundColor: '#00CED1',
  },
  subTabText: {
    color: '#BBBBBB',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedSubTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    elevation: 5,
  },
  transactionInfo: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 14,
    color: '#BBBBBB',
  },
  eventText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  detailText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginTop: 4,
  },
  transactionIdText: {
    fontSize: 12,
    color: '#888888',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statusBadge: {
    marginTop: 5,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#BBBBBB',
    width: 120,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentHistory;