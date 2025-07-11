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
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [eventsMap, setEventsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Fetch events to map eventId to eventName
  const fetchEvents = async () => {
    try {
      const eventsCollection = collection(db, 'Events');
      const eventsSnapshot = await getDocs(eventsCollection);
      const eventsData = {};
      eventsSnapshot.forEach(doc => {
        const eventId = doc.id.toLowerCase();
        const eventName = doc.data().eventName || 'Unknown Event';
        eventsData[eventId] = eventName;
      });
      setEventsMap(eventsData);
      console.log('Events Mapping:', eventsData);
    } catch (error) {
      setError("Failed to fetch events: " + error.message);
    }
  };

  // Fetch transactions from Payment collection for the current user
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const userEmail = auth.currentUser?.email;
        if (!userEmail) {
          throw new Error("User is not authenticated or email is missing. Please log in.");
        }

        const paymentCollection = collection(db, 'Payment');
        const q = query(paymentCollection, where('userEmail', '==', userEmail));
        const paymentSnapshot = await getDocs(q);

        const transactionList = paymentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTransactions(transactionList);
        setFilteredTransactions(transactionList);

        transactionList.forEach(transaction => {
          const eventId = transaction.eventId?.toLowerCase();
          const eventName = eventId && eventsMap[eventId] ? eventsMap[eventId] : 'Unknown Event';
          console.log(`Transaction ID: ${transaction.id}, Event ID: ${eventId}, Event Name: ${eventName}`);
        });

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        setError("Failed to fetch transactions: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    const loadData = async () => {
      await fetchEvents();
      await fetchTransactions();
    };

    loadData();
  }, []);

  // Filter transactions based on selected option
  const filterTransactions = (filter) => {
    setSelectedFilter(filter);
    let filtered = [];
    if (filter === 'All') {
      filtered = transactions;
    } else if (filter === 'Failed') {
      filtered = transactions.filter(txn => txn.status && txn.status.startsWith('F'));
    } else if (filter === 'Pending') {
      filtered = transactions.filter(txn => txn.status && txn.status.startsWith('P'));
    } else if (filter === 'Refunded') {
      filtered = transactions.filter(txn => txn.status && txn.status.startsWith('CR'));
    }
    setFilteredTransactions(filtered);
  };

  // Map status to display text and color
  const getStatusDisplay = (status) => {
    if (!status) return { text: 'Unknown', color: '#000000' };
    if (status.startsWith('P')) {
      return { text: 'Pending', color: '#FFA500' };
    } else if (status.startsWith('S')) {
      return { text: 'Completed', color: '#008000' };
    } else if (status.startsWith('F')) {
      return { text: 'Failed', color: '#FF0000' };
    } else if (status.startsWith('CR')) {
      return { text: 'Refund Completed', color: '#006400' };
    }
    return { text: status, color: '#000000' };
  };

  // Render each transaction item
  const renderTransaction = ({ item }) => {
    const statusDisplay = getStatusDisplay(item.status);
    const eventId = item.eventId ? item.eventId.toLowerCase() : null;
    const eventName = eventId && eventsMap[eventId] ? eventsMap[eventId] : 'Unknown Event';

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
        {['All', 'Failed', 'Pending', 'Refunded'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.selectedFilter
            ]}
            onPress={() => filterTransactions(filter)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter && styles.selectedFilterText
            ]}>
              {filter === 'All' ? 'All Transactions' : 
               filter === 'Failed' ? 'Failed Transactions' : 
               filter === 'Pending' ? 'Pending Refund' : 'Refund Complete'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found.</Text>}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

// Styles
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
});

export default PaymentHistory;