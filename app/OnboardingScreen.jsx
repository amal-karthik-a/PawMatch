import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
const OnboardingScreen = () => {
  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const animationRef = useRef(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    if (animationRef.current) {
      animationRef.current.play();
    }
  }, [fadeAnim, slideAnim, scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden={true} />
      <View style={styles.content}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Breed</Text>
            <Text style={styles.logoTextHighlight}>ables</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <LottieView
            ref={animationRef}
            source={require('./../assets/Animations/dogface.json')} // Adjust path as per your project structure
            style={styles.lottieAnimation}
            loop={false}
          />
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
          Explore the mate and breed
        </Animated.Text>

        <Animated.Text style={[styles.description, { opacity: fadeAnim }]}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi maecenas quis interdum enim enim molestie faucibus.
        </Animated.Text>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity style={styles.button} onPress={() => router.push("./Authentication/LoginScreen")}>
            <Text style={styles.buttonText}>Let's Start</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6FEF4', // Matching Changepassword background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000000', // Black for "Bree"
  },
  logoTextHighlight: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#50E3C2', // Matching prime color from Changepassword
  },
  lottieAnimation: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000000',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: 'gray',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#50E3C2', // Matching Changepassword button color
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 10,
    elevation: 8, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  buttonText: {
    color: 'black', // Matching Changepassword button text color
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;