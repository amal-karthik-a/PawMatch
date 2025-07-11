import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, TextInput, Animated } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Bot from './../../assets/images/SettinngCover.png';
import { db } from './../../Config/FirebaseConfig';
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import CAlert from './../CustomAlert';

const HelpSupport = () => {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const auth = getAuth();

  const handleSendFeedback = async () => {
    if(!feedback){
      setalertMessage("No Feedback to Send!");
      setalertType("warning");
      setAlertVisible(true)
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user is signed in.");
        return;
      }
      
      await addDoc(collection(db, "Feedback"), {
        userId: user.email,
        feedback: feedback,
        timestamp: new Date().toISOString(),
      });
      
      setFeedback("");
      setalertMessage("Feedback Successfully Send!");
      setAlertVisible(true)
      setalertType("success");
      router.push('/SettingsCon/HelpandSupport');

    } catch (error) {
      console.error("Error storing feedback: ", error);
    }
  };

  const backFadeAnim = useRef(new Animated.Value(0)).current;
  const backSlideAnim = useRef(new Animated.Value(-50)).current;
  const robotSlideAnim = useRef(new Animated.Value(-200)).current;
  const textSlideAnim = useRef(new Animated.Value(200)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;
  const feedbackFadeAnim = useRef(new Animated.Value(0)).current;
  const feedbackLiftAnim = useRef(new Animated.Value(30)).current;
  const contactFadeAnim = useRef(new Animated.Value(0)).current;
  const contactZoomAnim = useRef(new Animated.Value(0.95)).current;
  const contactTextSlideAnim = useRef(new Animated.Value(50)).current;
  const imagePulseAnim = useRef(new Animated.Value(1)).current;
  const imageVibrateAnim = useRef(new Animated.Value(0)).current;
  const imageTiltAnim = useRef(new Animated.Value(0)).current;
  const [alertVisible,setAlertVisible] = useState(false);
  const [alertType,setalertType] = useState("");
  const [alertMessage,setalertMessage] = useState("");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(backSlideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(robotSlideAnim, {
        toValue: 0,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 0,
        duration: 700,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 500,
          delay: 500,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScaleAnim, {
          toValue: 1,
          tension: 70,
          friction: 8,
          delay: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulseAnim, {
            toValue: 1.03,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    Animated.parallel([
      Animated.timing(feedbackFadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(feedbackLiftAnim, {
        toValue: 0,
        tension: 70,
        friction: 8,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(contactFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contactZoomAnim, {
        toValue: 1,
        duration: 1000,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.spring(contactTextSlideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(imagePulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(imagePulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(imageVibrateAnim, {
              toValue: 8,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(imageTiltAnim, {
              toValue: -0.1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(imageVibrateAnim, {
              toValue: -3,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(imageTiltAnim, {
              toValue: 0.05,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(imageVibrateAnim, {
              toValue: 5,
              duration: 110,
              useNativeDriver: true,
            }),
            Animated.timing(imageTiltAnim, {
              toValue: -0.07,
              duration: 110,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(imageVibrateAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(imageTiltAnim, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(3670),
        ])
      ),
    ]).start();
  }, []);

  const handleBack = () => {
    Animated.parallel([
      Animated.timing(backFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(backSlideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(robotSlideAnim, {
        toValue: -200,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(textSlideAnim, {
        toValue: 200,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(buttonFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(buttonPulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackLiftAnim, {
        toValue: 50,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(contactFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contactZoomAnim, {
        toValue: 0.9,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(contactTextSlideAnim, {
        toValue: 100,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(imagePulseAnim, {
        toValue: 0.95,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(imageVibrateAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(imageTiltAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => router.back());
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 16, backgroundColor: "#fff", height: '70%' }}>
        <Animated.View
          style={{
            opacity: backFadeAnim,
            transform: [{ translateY: backSlideAnim }],
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
              backgroundColor: 'white',
              marginTop: 15,
              marginLeft: 2,
            }}
          >
            <Ionicons name="arrow-back" size={24} color="rgba(1, 1, 1, 0.6)" />
          </TouchableOpacity>
        </Animated.View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Animated.Image
            source={Bot}
            style={{
              width: 160,
              height: 160,
              marginRight: 10,
              transform: [{ translateX: robotSlideAnim }],
            }}
          />
          <Animated.View
            style={{
              flex: 1,
              transform: [{ translateX: textSlideAnim }],
            }}
          >
            <Text
              style={{
                fontSize: 26,
                fontWeight: "bold",
                flexWrap: 'wrap',
                flexShrink: 1,
                color: 'rgba(37, 161, 64, 0.55)',
                textAlign: 'justifyContent',
              }}
            >
              Saudha Knows the Way, Just Ask!
            </Text>
            <Animated.View
              style={{
                opacity: buttonFadeAnim,
                transform: [{ scale: buttonScaleAnim }, { scale: buttonPulseAnim }],
              }}
            >
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(37, 141, 145, 0.7)",
                  paddingVertical: 12,
                  marginVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 19,
                  overflow: "hidden",
                  width: 155,
                  boxShadow: '0px 0px 5px rgba(46, 44, 44, 0.34)',
                }}
                onPress={() => router.push('/SettingsCon/chatbot')}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "bold",
                    flex: 1,
                  }}
                >
                  Let's Start
                </Text>
                <Ionicons
                  name="chatbubbles-outline"
                  size={31.5}
                  color={'rgba(250, 246, 246, 0.53)'}
                />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View
          style={{
            opacity: feedbackFadeAnim,
            transform: [{ translateY: feedbackLiftAnim }],
            boxShadow: '0px 0px 7px rgba(56, 55, 55, 0.17)',
            padding: 15,
            borderRadius: 15,
            marginTop: 27,
            marginHorizontal: 16,
          }}
        >
          <Text
            style={{
              width: 126,
              paddingVertical: 8,
              boxShadow: '0px 0px 3px rgba(71, 70, 70, 0.27)',
              borderRadius: 50,
              paddingHorizontal: 15,
              color: 'rgb(77, 177, 143)',
              backgroundColor: 'rgba(77, 177, 143, 0.29)',
              fontSize: 22,
              fontWeight: "bold",
              marginBottom: 20,
            }}
          >
            Feedback
          </Text>
          <TextInput
            style={{
              height: 100,
              borderColor: "rgba(204, 198, 198, 0.25)",
              borderWidth: 1.5,
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
              fontSize: 17,
              color: 'rgba(54, 158, 199, 0.68)',
            }}
            multiline
            placeholder="Write your feedback here..."
            value={feedback}
            onChangeText={setFeedback}
            placeholderTextColor={'rgba(56, 115, 117, 0.53)'}
          />
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={handleSendFeedback}
              style={{
                backgroundColor: "rgba(37, 141, 145, 0.69)",
                padding: 12,
                borderRadius: 8,
                width: 165,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Text style={{ color: "white", fontSize: 16 }}>
                Send Feedback
              </Text>
              <Ionicons
                color={'rgba(250, 246, 246, 0.53)'}
                size={19}
                name="send"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        style={{
          opacity: contactFadeAnim,
          transform: [{ scale: contactZoomAnim }],
          padding: 0,
          width: '100%',
          height: '30%',
          backgroundColor: 'rgba(37, 141, 145, 0.15)',
          borderTopLeftRadius: 50,
          borderTopRightRadius: 50,
          boxShadow: '0px 0px 10px rgba(167, 162, 162, 0.51)',
          paddingHorizontal: 30,
          paddingVertical: 5,
          flexDirection: 'row',
        }}
      >
        <Animated.View
          style={{
            marginTop: 30,
            transform: [{ translateX: contactTextSlideAnim }],
          }}
        >
          <Text
            style={{
              fontSize: 21,
              fontWeight: "bold",
              marginBottom: 18,
              color: 'rgb(77, 177, 143)',
            }}
          >
            Contact Support
          </Text>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
          >
            <Ionicons size={23} name="mail" color="rgba(21, 126, 117, 0.53)" />
            <Text
              style={{
                fontSize: 15,
                color: 'rgba(55, 79, 99, 0.51)',
                marginLeft: 10,
              }}
            >
              amal.karthik2026@gmail.com
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
          >
            <Ionicons size={23} name="call" color="rgba(21, 126, 117, 0.53)" />
            <Text
              style={{
                fontSize: 15,
                color: 'rgba(55, 79, 99, 0.51)',
                marginLeft: 10,
              }}
            >
              +91 0495-112233
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
          >
            <Ionicons
              size={23}
              name="logo-twitter"
              color="rgba(21, 126, 117, 0.53)"
            />
            <Text
              style={{
                fontSize: 15,
                color: 'rgba(55, 79, 99, 0.51)',
                marginLeft: 10,
              }}
            >
              twitter@.com
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
          >
            <Ionicons
              size={23}
              name="logo-instagram"
              color="rgba(21, 126, 117, 0.53)"
            />
            <Text
              style={{
                fontSize: 15,
                color: 'rgba(55, 79, 99, 0.51)',
                marginLeft: 10,
              }}
            >
              insta.com
            </Text>
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
          >
            <Ionicons size={23} name="trophy" color="rgba(21, 126, 117, 0.53)" />
            <Text
              style={{
                fontSize: 15,
                color: 'rgba(55, 79, 99, 0.51)',
                marginLeft: 10,
              }}
            >
              App
            </Text>
          </View>
        </Animated.View>
        <View>
          <View
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Animated.Image
              source={require('./../../assets/images/contact.png')}
              style={{
                width: 130,
                height: 220,
                transform: [
                  { scale: imagePulseAnim },
                  { translateX: imageVibrateAnim },
                  {
                    rotate: imageTiltAnim.interpolate({
                      inputRange: [-0.1, 0.05],
                      outputRange: ['-5deg', '3deg'],
                    }),
                  },
                ],
              }}
            />
          </View>
        </View>
      </Animated.View>
      <CAlert
          visible={alertVisible}
          type={alertType}
          msg={alertMessage}
          btnCount={1}
          buttons={[{ label: "OK", onPress: () => setAlertVisible(false) }]}
          onClose={() => setAlertVisible(false)}
        />
    </View>
  );
};

export default HelpSupport;