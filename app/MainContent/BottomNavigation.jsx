import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { router } from "expo-router";

const BottomNavigation = ({ initialActiveIcon = "" }) => {
  const [activeIcon, setActiveIcon] = useState(initialActiveIcon);
  const bottomBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bottomBarAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [bottomBarAnim]);

  const handleIconPress = (iconName) => {
    setActiveIcon(iconName);
    switch (iconName) {
      case "home":
        router.replace("/MainContent/petBreadHome");
        break;
      case "chat":
        router.push("/MainContent/AllChatListPage");
        break;
      case "favorite":
        router.push("/MainContent/FavoratesPage");
        break;
      case "add":
        router.push("/MainContent/PetProfile");
        break;
      case "sell":
        router.push("/MainContent/sellPage");
        break;
      case "trophy":
        router.push("/Events/AllEvents");
        break;
      case "settings":
        router.push("/MainContent/SettingsPage");
        break;
      default:
        router.push("/MainContent/petBreadHome");
    }
  };

  const navItems = [
    { icon: "home", label: "Home" },
    { icon: "chat", label: "Chat" },
    { icon: "favorite", label: "Favorite" },
    { icon: "add", isPrimary: true },
    { icon: "sell", label: "Sell" },
    { icon: "trophy", label: "Events" },
    { icon: "settings", label: "Settings" },
  ];

  return (
    <Animated.View
      style={[
        styles.bottomNav,
        {
          transform: [
            {
              translateY: bottomBarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
        },
      ]}
    >
      {navItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.navItem,
            item.isPrimary && styles.navPrimary,
            activeIcon === item.icon && styles.navActive,
          ]}
          onPress={() => handleIconPress(item.icon)}
        >
          <Icon
            name={item.icon}
            size={item.isPrimary ? 28 : 24}
            color={item.isPrimary ? "#fff" : activeIcon === item.icon ? "#28a745" : "#666"}
          />
          {!item.isPrimary && (
            <Text
              style={[
                styles.navLabel,
                activeIcon === item.icon && styles.navLabelActive,
              ]}
            >
              {item.label}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginBottom: 15,
    paddingVertical: 12,
    borderRadius: 35,
    elevation: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 15,
  },
  navItem: {
    alignItems: "center",
    padding: 5,
    flex: 1,
  },
  navPrimary: {
    backgroundColor: "#28a745",
    width: 50,
    height: 50,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -32,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  navLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 1,
  },
  navLabelActive: {
    color: "#28a745",
    fontWeight: "600",
  },
  navActive: {
    transform: [{ scale: 1.1 }],
  },
});

export default BottomNavigation;