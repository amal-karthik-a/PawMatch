import AsyncStorage from '@react-native-async-storage/async-storage';

const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    console.log(`Data stored successfully for key: ${key}`);
  } catch (error) {
    console.error('Error storing data:', error);
  }
};

const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error retrieving data:', error);
    return null;
  }
};

const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Data removed for key: ${key}`);
  } catch (error) {
    console.error('Error removing data:', error);
  }
};

export { storeData, getData, removeData };
