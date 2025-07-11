import React, { useEffect, useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, FlatList, StyleSheet, Animated, Image,KeyboardAvoidingView,Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import axios from 'axios';
import uuid from 'react-native-uuid';
import LottieView from 'lottie-react-native';
import chatbotLoading from '../../assets/Animations/LoadingIcon.json'; 
import botAnimation from './../../assets/Animations/Animation1';
import sendAnimation from '../../assets/Animations/sendIcon.json';
import mainBotAnimation from '../../assets/Animations/mainBot.json';
import micOnAnimation from '../../assets/Animations/mic.json';
import micOffIcon from './../../assets/images/img/micoffimg.jpg';

const Chatbot = () => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sendButtonRef = useRef(null);
  const flatListRef = useRef(null);


  useEffect(() => {
    const getSessionId = async () => {
      try {
        let storedSessionId = await AsyncStorage.getItem('SESSION_ID');
        if (!storedSessionId) {
          storedSessionId = uuid.v4();
          await AsyncStorage.setItem('SESSION_ID', storedSessionId);
        }
        setSessionId(storedSessionId);
      } catch (error) {
        console.error('Error retrieving session ID:', error);
      }
    };
    getSessionId();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [messages]);

  useEffect(() => {
    
    if (sendButtonRef.current) {
      sendButtonRef.current.play(45, 45); 
    }
  }, []);

  const getAccessToken = async () => {
    try {
      const response = await axios.get('https://dialogflow-backend-4voy.onrender.com/get-access-token');
      return response.data.access_token;
    } catch (error) {
      console.error('Error fetching access token:', error.message);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = { text: input, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    if (sendButtonRef.current) {
      sendButtonRef.current.reset(); 
      sendButtonRef.current.play(0, 240); 
    }

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        console.error('Failed to retrieve access token');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `https://dialogflow.googleapis.com/v2/projects/mychatbotapp-453706/agent/sessions/${sessionId}:detectIntent`,
        {
          queryInput: {
            text: {
              text: input,
              languageCode: 'en',
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const botReply = response.data.queryResult.fulfillmentText;

      setTimeout(() => {
        setLoading(false);
        if (botReply) {
          setMessages((prevMessages) => [...prevMessages, { text: botReply, sender: 'bot' }]);
          // Speak the bot's response
                    Speech.speak(botReply, {
                      language: 'en-US',
                      pitch: 1.0,
                      rate: 0.8,
                    });
        }
        // Scroll to the latest message after bot reply
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error.response ? error.response.data : error.message);
      setLoading(false);
    }
  };

  // Toggle the mic button
    const toggleMic = () => {
      setIsSpeakingEnabled(!isSpeakingEnabled);
      Speech.stop(); 
    };
  const renderMainBotAnimation = () => (
    <LottieView
      source={mainBotAnimation}
      autoPlay
      loop
      style={styles.mainBotAnimation}
    />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Adjust behavior for iOS and Android
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // Adjust offset for iOS (header height, etc.)
    >
      <FlatList
        ref={flatListRef}
        data={[...messages, ...(loading ? [{ sender: 'bot', loading: true }] : [])]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Animated.View
            style={[
              styles.messageContainer,
              { opacity: fadeAnim },
              item.sender === 'user' ? styles.userMessageContainer : styles.botMessageContainer,
            ]}
          >
            {item.loading ? (
              <View style={styles.botMessageRow}>
                <LottieView
                  source={botAnimation}
                  autoPlay
                  loop
                  style={styles.botIcon}
                />
                <LottieView
                  source={chatbotLoading}
                  autoPlay
                  loop
                  style={styles.loadingAnimation}
                />
              </View>
            ) : (
              <View style={item.sender === 'bot' ? styles.botMessageRow : null}>
                {item.sender === 'bot' && (
                  <LottieView
                    source={botAnimation}
                    autoPlay
                    loop
                    style={styles.botIcon}
                  />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    item.sender === 'user' ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.sender === 'user' ? styles.userMessageText : null,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderMainBotAnimation}
      />
  
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity onPress={toggleMic} style={styles.micButton}>
          {isSpeakingEnabled ? (
            <LottieView source={micOnAnimation} autoPlay loop={false} style={styles.micAnimation} />
          ) : (
            <Image source={micOffIcon} style={styles.micIcon} />
          )}
        </TouchableOpacity>
  
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <LottieView
            ref={sendButtonRef}
            source={sendAnimation}
            style={styles.sendAnimation}
            loop={false}
            autoPlay={false}
            onAnimationFinish={() => {
              if (sendButtonRef.current) {
                setTimeout(() => {
                  sendButtonRef.current.play(45, 45);
                }, 500);
              }
            }}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 16,
  },
  micAnimation: {
    width: 40,
    height: 40,
  },
  micIcon: {
    width: 30,
    height: 30,
  },
  micButton: {
    marginRight: 8,
  },
  mainBotAnimation: {
    width: 300,
    height: 300,
    alignSelf: 'center',
  },
  chatList: {
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '70%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
  },
  botMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', 
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '100%',
  },
  userMessage: {
    backgroundColor: '#50E3C2',
    borderTopRightRadius: 0,
  },
  botMessage: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 0,
    marginLeft: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'System',
    lineHeight: 22,
  },
  userMessageText: {
    color: 'black',
  },
  botIcon: {
    width: 50,
    height: 50,
  },
  loadingAnimation: {
    width: 60,
    height: 60,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderRadius: 20,
  },
  sendButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendAnimation: {
    width: 90,
    height: 55,
  },
});

export default Chatbot; 