import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet } from 'react-native';
import { router } from 'expo-router';

const AnimatedScreen = () => {
  // Animation value
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Start animation when component mounts
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  // Button handlers
  const handleButtonPress = (buttonNumber) => {
    console.log(`Button ${buttonNumber} pressed`);
    // Add your button logic here
  };

  return (
    <View style={styles.container}>
      {/* Top Button */}
      <TouchableOpacity
        style={[styles.button, styles.topButton]}
        onPress={() => router.push('/MainContent/GKchatbot')}
      >
        <Text style={styles.buttonText}>Know About Pets </Text>
      </TouchableOpacity>

      {/* Center Animation */}
      <Animated.View
        style={[
          styles.animatedCircle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />

      {/* Bottom Buttons Container */}
      <View style={styles.bottomButtons}>
        {/* Left Button */}
        <TouchableOpacity
          style={[styles.button, styles.sideButton]}
          onPress={() => router.push('/MainContent/PredictionScreen')}
        >
          <Text style={styles.buttonText}>Check Compactibility</Text>
        </TouchableOpacity>

        {/* Right Button */}
        <TouchableOpacity
          style={[styles.button, styles.sideButton]}
          onPress={() => router.push('/MainContent/CrossPetImageAI')}
        >
          <Text style={styles.buttonText}>Find Cross Bread</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  animatedCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    position: 'absolute',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topButton: {
    position: 'absolute',
    top: '25%',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    position: 'absolute',
    bottom: '25%',
  },
  sideButton: {
    flex: 1,
    marginHorizontal: 10,
  },
});

export default AnimatedScreen;