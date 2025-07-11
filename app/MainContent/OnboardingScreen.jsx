import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated , StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OnboardingScreen = () => {

  const router = useRouter();
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

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
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View>
        
      </View>
      <StatusBar hidden={true} />
      <View style={styles.container}>
        <StatusBar hidden={true} />
          <Animated.Text style={[styles.logoText, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>PetDaddy</Animated.Text>
          <Animated.Image source={''} style={[styles.image, { opacity: fadeAnim }]} resizeMode="contain" />
          <Animated.Text style={[styles.title, { opacity: fadeAnim }]}>
            Explore the mate and breed
          </Animated.Text>
          <Animated.Text style={[styles.description, { opacity: fadeAnim }]}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi maecenas quis interdum enim enim molestie faucibus.
          </Animated.Text>
          <Animated.View style={{ opacity: fadeAnim }}>
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
    backgroundColor: '#FCE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
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
    backgroundColor: '#D81B60',
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;
