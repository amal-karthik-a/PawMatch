import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

const { width } = Dimensions.get('window'); // Get screen width

const TermsAndConditions = () => {
  const router = useRouter();
  const fadeInValue = useSharedValue(0);

  useEffect(() => {
    fadeInValue.value = withTiming(1, { duration: 800 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeInValue.value,
    transform: [{ translateY: (1 - fadeInValue.value) * 50 }],
  }));

  const terms = [
    {
      number: '1',
      title: 'Introduction',
      content:
        'Welcome to our Pet Selling & Breeding App. By accessing or using our app, you agree to comply with these terms. If you do not agree, please do not use our platform.',
    },
    {
      number: '2',
      title: 'User Responsibilities',
      content:
        '- You must be at least 18 years old to use this app.\n- You are responsible for providing accurate pet details.\n- Any fraudulent activity will result in account suspension.',
    },
    {
      number: '3',
      title: 'Pet Listings & Breeding Policy',
      content:
        '- All pets listed must be healthy and meet ethical breeding standards.\n- Users must comply with local laws regarding pet sales and breeding.\n- No illegal or endangered species should be sold through the platform.',
    },
    {
      number: '4',
      title: 'Payments & Transactions',
      content:
        '- We do not handle payments directly; transactions are between buyers and sellers.\n- Users should verify the authenticity of a seller before making payments.',
    },
    {
      number: '5',
      title: 'Liability Disclaimer',
      content:
        '- We are not responsible for disputes between buyers and sellers.\n- We do not guarantee the health or quality of pets listed on the platform.',
    },
    {
      number: '6',
      title: 'Account Termination',
      content:
        '- We reserve the right to suspend accounts that violate our policies.\n- Users can request account deletion at any time.',
    },
    {
      number: '7',
      title: 'Contact & Support',
      content: 'For any queries, contact us at support@petapp.com.',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.lcontainer}>
      <LottieView
        source={require('./../../assets/Animations/tc.json')} // Your Lottie JSON file
        autoPlay
        loop
        style={styles.lottie}
      />
    </View>
        
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.cardScroll} 
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Terms and Conditions</Text>

            {terms.map((item, index) => {
              const slideInValue = useSharedValue(50);
              
              useEffect(() => {
                slideInValue.value = withTiming(0, { duration: 500, delay: index * 100 });
              }, []);

              const itemStyle = useAnimatedStyle(() => ({
                transform: [{ translateY: slideInValue.value }],
              }));

              return (
                <Animated.View key={index} style={[styles.sectionContainer, itemStyle]}>
                  <View style={styles.numberCircle}>
                    <Text style={styles.numberText}>{item.number}</Text>
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    <Text style={styles.text}>{item.content}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  lcontainer: {
                   // Takes full screen
    justifyContent: 'center',  // Centers vertically
    alignItems: 'center',  // Centers horizontally
    backgroundColor: '#fff',
  },
  lottie: {
    width: 200,  // Adjust width
    height: 200, // Adjust height
  },
  image: {
    width: '100%',
    height: 410,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  cardContainer: {
    width: '100%',   // Responsive width
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    alignSelf: 'stretch',  // Allow expansion with content
  },
  cardScroll: {
    flexGrow: 1,  // Allow card to expand dynamically
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#0E172C',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    width: '100%',
  },
  termsContainer: {
    flex: 1,
    paddingLeft: 15,
  },
  sectionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  numberCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#68afb3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    zIndex: 1,
  },
  numberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  textContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E172C',
    marginBottom: 5,
  },
  text: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: '#68afb3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: 'white',
    justifyContent: 'center',
    margin: 20,
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsAndConditions;
