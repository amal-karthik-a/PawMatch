import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./../../Config/FirebaseConfig";
import { getDocs, collection, where, query } from "firebase/firestore";
import BottomNavigation from "../MainContent/BottomNavigation"; 
import LottieView from 'lottie-react-native';
import S1 from './../../assets/Animations/S2.json';
import S2 from './../../assets/Animations/S3.json';
import S4 from './../../assets/Animations/S3.json';
import S5 from './../../assets/Animations/S1.json';
import S6 from './../../assets/Animations/S2.json';
import S7 from './../../assets/Animations/S3.json';
import S8 from './../../assets/Animations/S1.json';
import S9 from './../../assets/Animations/S2.json';

const Settings = () => {
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [user, setUser] = useState(null);
  const [profileUrl, setProfileUrl] = useState("");

  // Animation Refs
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-50)).current;
  const sectionAnims = useRef([...Array(4)].map(() => ({
    fade: new Animated.Value(0),
    slide: new Animated.Value(50),
  }))).current;
  const logoutScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const email = currentUser.email;
        setUser(email);
        const result = await ProfilepicTake(email);
        setProfileUrl(result[0]?.profileUrl || "https://via.placeholder.com/150");
      } else {
        setUser(null);
        setProfileUrl("");
      }
    });

    // Header Animation
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Section Animations with stagger
    sectionAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.parallel([
          Animated.timing(anim.fade, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(anim.slide, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Logout Animation (pulse effect)
    Animated.loop(
      Animated.sequence([
        Animated.spring(logoutScaleAnim, {
          toValue: 1.1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.spring(logoutScaleAnim, {
          toValue: 0.9,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    ).start();

    return () => unsubscribe();
  }, []);

  const ProfilepicTake = async (userEmail) => {
    try {
      const usersCollection = collection(db, "users");
      const q = query(usersCollection, where("userid", "==", userEmail));
      const usersSnapshot = await getDocs(q);
      return usersSnapshot.docs.map(doc => ({
        profileUrl: doc.data().propic || "https://via.placeholder.com/150",
      }));
    } catch (error) {
      console.error('Profile pic fetch error:', error);
      return [];
    }
  };

  const navigateToEditProfile = () => router.push("/SettingsCon/EditPro");
  const navigateToSecurity = () => router.push('/SettingsCon/Security');
  const navigateToNotifications = () => router.push('/MainContent/Notification');
  const navigateToPrivacy = () => setPrivacyExpanded(!privacyExpanded);
  const navigateToSupport = () => router.push('/SettingsCon/HelpandSupport');
  const navigateToTermsAndPolicies = () => router.push('/SettingsCon/TandC');
  const navigateToReportProblem = () => router.push('/MainContent/ReportFun');
  const addAccount = () => router.push('/SettingsCon/DeleteAcc');
  const logout = () => router.replace('./../OnboardingScreen');
  const navigateToBilling = () => router.push('/SettingsCon/paymentHistory');
  const navigateToRegisterPetMissing = () => router.push('/SettingsCon/AllmissingPAge');
  const navigateToPurchasedPets = () => router.push('/SettingsCon/purchase'); // New navigation function

  const accountItems = [
    { text: "Edit Profile", action: navigateToEditProfile, hasProfileImage: true, animation: S1 },
    { text: "Privacy", action: navigateToPrivacy, hasDropdown: true, animation: S2,
      subItems: [
        { icon: "security", text: "Security", action: navigateToSecurity },
        { icon: "notifications-none", text: "Notifications", action: navigateToNotifications },
      ],
    },
  ];

  const paymentDetails = [
    { text: "Billing History", action: navigateToBilling, animation: S4 },
    { text: "Purchased Pets and Breeds", action: navigateToPurchasedPets, animation: S4 }, // New option
  ];

  const supportItems = [
    { text: "Help & Support", action: navigateToSupport, animation: S5 },
    { text: "Terms and Policies", action: navigateToTermsAndPolicies, animation: S6 },
  ];

  const actionsItems = [
    { text: "Permanently Delete Account", action: addAccount, animation: S7 },
    { text: "Report Animal Abuse", action: navigateToReportProblem, animation: S8 },
    { text: "Register Pet Missing", action: navigateToRegisterPetMissing, animation: S9 },
    { text: "Log out", action: logout, isLogout: true },
  ];

  const renderSettingsItem = ({ text, action, hasDropdown, subItems, hasProfileImage, animation, isLogout }) => (
    <>
      <TouchableOpacity onPress={action} style={styles.itemContainer}>
        {hasProfileImage ? (
          <Image 
            source={{ uri: profileUrl || "https://via.placeholder.com/150" }} 
            style={styles.profileImage}
          />
        ) : (
          <Animated.View 
            style={[
              styles.iconContainer,
              isLogout && { transform: [{ scale: logoutScaleAnim }] }
            ]}
          >
            {isLogout ? (
              <Ionicons name="logout" size={28} color="rgba(77, 177, 143, 0.9)" />
            ) : (
              <LottieView 
                source={animation || S1}
                autoPlay
                loop
                style={styles.lottieIcon}
              />
            )}
          </Animated.View>
        )}
        <Text style={styles.itemText}>{text}</Text>
        {hasDropdown && (
          <Ionicons 
            name={privacyExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="rgba(77, 177, 143, 0.9)" 
            style={styles.dropdownIcon} 
          />
        )}
      </TouchableOpacity>
      {hasDropdown && privacyExpanded && subItems.map((subItem, idx) => (
        <TouchableOpacity key={idx} onPress={subItem.action} style={styles.subItemContainer}>
          <Ionicons name={subItem.icon} size={24} color="rgba(77, 177, 143, 0.9)" />
          <Text style={styles.subItemText}>{subItem.text}</Text>
        </TouchableOpacity>
      ))}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: headerFadeAnim,
            transform: [{ translateY: headerSlideAnim }],
            ...styles.headerContainer,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={25} color="rgb(63, 148, 112)" />
          </TouchableOpacity>
          <Text style={styles.topHeaderText}>Settings</Text>
          <LottieView 
            source={S1}
            autoPlay
            loop
            style={styles.lottieHeader}
          />
        </Animated.View>

        <View style={styles.contentContainer}>
          {[
            { title: "Account", items: accountItems },
            { title: "Payment Details", items: paymentDetails },
            { title: "Support & About", items: supportItems },
            { title: "Actions", items: actionsItems },
          ].map((section, index) => (
            <Animated.View
              key={index}
              style={{
                opacity: sectionAnims[index].fade,
                transform: [{ translateX: sectionAnims[index].slide }],
                ...styles.sectionContainer,
              }}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionItemsContainer}>
                {section.items.map((item, idx) => (
                  <React.Fragment key={idx}>{renderSettingsItem(item)}</React.Fragment>
                ))}
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <BottomNavigation initialActiveIcon="settings" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  headerContainer: {
    backgroundColor: "rgba(129, 231, 180, 0.64)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
    backgroundColor: 'rgba(29, 28, 28, 0.1)',
    borderRadius:20,
    padding:6,
  },
  topHeaderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#rgb(63, 148, 112)",
    flex: 1,
    textAlign: "center",
  },
  lottieHeader: {
    width: 80,
    height: 80,
  },
  contentContainer: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 15,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(77, 177, 143, 0.9)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(77, 177, 143, 0.1)",
  },
  sectionItemsContainer: {
    padding: 10,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: "rgba(245, 245, 245, 0.9)",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieIcon: {
    width: 40,
    height: 40,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(77, 177, 143, 0.7)",
  },
  itemText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  subItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(77, 177, 143, 0.05)",
    borderRadius: 10,
    marginVertical: 2,
    marginLeft: 20,
  },
  subItemText: {
    marginLeft: 15,
    fontSize: 15,
    color: "#333",
  },
});

export default Settings;