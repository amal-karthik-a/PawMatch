import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import axios from 'axios';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';


const temperamentOptions = ['Friendly', 'Hyperactive', 'Neutral', 'Aggressive', 'Calm'];

const PredictionScreen = () => {
  const [dog1, setDog1] = useState({
    name1: '',
    age1: 1,
    weight1: 20,
    health1: 5,
    energy1: 5,
    temp1: 'Friendly',
  });

  const [dog2, setDog2] = useState({
    name2: '',
    age2: 1,
    weight2: 20,
    health2: 5,
    energy2: 5,
    temp2: 'Friendly',
  });

  const [result, setResult] = useState('');

  const callApi = async () => {

    try {
      const payload = {
        breed1: dog1.name1, age1: dog1.age1, weight1: dog1.weight1,
        health1: dog1.health1, energy1: dog1.energy1, temp1: dog1.temp1,
        breed2: dog2.name2, age2: dog2.age2, weight2: dog2.weight2,
        health2: dog2.health2, energy2: dog2.energy2, temp2: dog2.temp2,
      };
      console.log("Sending payload:", payload);
      const response = await axios.post('https://petai-75ft.onrender.com/predict', payload);
      const rawScore = response.data.compatibility_score;
      
  
      // Adjustment logic
      let adjustedScore;
      if (rawScore >= 0.6) {
        adjustedScore = rawScore + 0.1;
      } else {
        adjustedScore = rawScore - 0.4;
      }
  
      // Ensure it stays within bounds
      const finalScore = Math.max(0, Math.min(1.0, adjustedScore));
  
      setResult(finalScore.toFixed(2));
    } catch (error) {
      console.error("Axios error:", error.response?.data || error.message);
      setResult(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
    <View style={styles.container}>
      <Text style={styles.title}>Dog Breeding Compatibility</Text>

      {/* Dog 1 Input Section */}
      <View style={styles.dogContainer}>
  <Text style={styles.dogHeader}>Dog 1 Details</Text>

  <Text style={styles.label}>Name</Text>
  <TextInput style={styles.input} value={dog1.name1} onChangeText={(text) => setDog1({ ...dog1, name1: text })} placeholder="Enter Dog 1 Name" />

  <View style={styles.row}>
    <View style={styles.halfPicker}>
      <Text style={styles.label}>Age</Text>
      <Picker selectedValue={dog1.age1} onValueChange={(value) => setDog1({ ...dog1, age1: value })}>
        {Array.from({ length: 20 }, (_, i) => <Picker.Item key={i} label={`${i + 1}`} value={i + 1} />)}
      </Picker>
    </View>

    <View style={styles.halfPicker}>
      <Text style={styles.label}>Weight (kg)</Text>
      <Picker selectedValue={dog1.weight1} onValueChange={(value) => setDog1({ ...dog1, weight1: value })}>
        {Array.from({ length: 50 }, (_, i) => <Picker.Item key={i} label={`${i + 1}`} value={i + 1} />)}
      </Picker>
    </View>
  </View>

  <Text style={styles.label}>Health (1-10): {dog1.health1}</Text>
  <Slider style={styles.slider} minimumValue={1} maximumValue={10} step={1} value={dog1.health1} minimumTrackTintColor="#4CAF50" maximumTrackTintColor="#ccc" thumbTintColor="#2196F3" onValueChange={(val) => setDog1({ ...dog1, health1: val })} />

  <Text style={styles.label}>Energy (1-10): {dog1.energy1}</Text>
  <Slider style={styles.slider} minimumValue={1} maximumValue={10} step={1} value={dog1.energy1} minimumTrackTintColor="#FF9800" maximumTrackTintColor="#ccc" thumbTintColor="#F44336" onValueChange={(val) => setDog1({ ...dog1, energy1: val })} />

  <Text style={styles.label}>Temperament</Text>
  <Picker selectedValue={dog1.temp1} onValueChange={(val) => setDog1({ ...dog1, temp1: val })}>
    {temperamentOptions.map((opt) => <Picker.Item key={opt} label={opt} value={opt} />)}
  </Picker>
</View>

      {/* Dog 2 Input Section */}
      <View style={styles.dogContainer}>
  <Text style={styles.dogHeader}>Dog 2 Details</Text>

  <Text style={styles.label}>Name</Text>
  <TextInput
    style={styles.input}
    value={dog2.name2}
    onChangeText={(text) => setDog2({ ...dog2, name2: text })}
    placeholder="Enter Dog 2 Name"
  />

  <View style={styles.row}>
    <View style={styles.halfPicker}>
      <Text style={styles.label}>Age</Text>
      <Picker
        selectedValue={dog2.age2}
        onValueChange={(value) => setDog2({ ...dog2, age2: value })}
      >
        {Array.from({ length: 20 }, (_, i) => (
          <Picker.Item key={i} label={`${i + 1}`} value={i + 1} />
        ))}
      </Picker>
    </View>

    <View style={styles.halfPicker}>
      <Text style={styles.label}>Weight (kg)</Text>
      <Picker
        selectedValue={dog2.weight2}
        onValueChange={(value) => setDog2({ ...dog2, weight2: value })}
      >
        {Array.from({ length: 50 }, (_, i) => (
          <Picker.Item key={i} label={`${i + 1}`} value={i + 1} />
        ))}
      </Picker>
    </View>
  </View>

  <Text style={styles.label}>Health (1-10): {dog2.health2}</Text>
  <Slider
    style={styles.slider}
    minimumValue={1}
    maximumValue={10}
    step={1}
    value={dog2.health2}
    minimumTrackTintColor="#4CAF50"
    maximumTrackTintColor="#ccc"
    thumbTintColor="#2196F3"
    onValueChange={(val) => setDog2({ ...dog2, health2: val })}
  />

  <Text style={styles.label}>Energy (1-10): {dog2.energy2}</Text>
  <Slider
    style={styles.slider}
    minimumValue={1}
    maximumValue={10}
    step={1}
    value={dog2.energy2}
    minimumTrackTintColor="#FF9800"
    maximumTrackTintColor="#ccc"
    thumbTintColor="#F44336"
    onValueChange={(val) => setDog2({ ...dog2, energy2: val })}
  />

  <Text style={styles.label}>Temperament</Text>
  <Picker
    selectedValue={dog2.temp2}
    onValueChange={(val) => setDog2({ ...dog2, temp2: val })}
  >
    {temperamentOptions.map((opt) => (
      <Picker.Item key={opt} label={opt} value={opt} />
    ))}
  </Picker>
</View>

      <Button title="Get Prediction" onPress={callApi} />
      {result !== '' && (
  <View style={styles.progressContainer}>
    <AnimatedCircularProgress
      size={180}
      width={15}
      fill={parseFloat(result) * 100}
      tintColor="#4CAF50"
      backgroundColor="#eee"
      rotation={0}
      duration={1000}
    >
      {
        () => (
        
          <Text style={styles.progressText}>
            {result} / 1.00
          </Text>
        )
      }
    </AnimatedCircularProgress>
  </View>
)}

   </View>
  </ScrollView>
</KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 18, marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10, fontSize: 16 },
  result: { fontSize: 20, marginTop: 30, textAlign: 'center', fontWeight: 'bold', color: '#4CAF50' },
  progressContainer: {
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4, // Android shadow
  },
  dogHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  halfPicker: {
    flex: 1,
  },
  
  progressText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  
});

export default PredictionScreen;
