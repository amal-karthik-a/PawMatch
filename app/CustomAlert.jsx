import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CustomAlert = ({ visible, type, msg, onClose }) => {
  // 🔹 Define Colors & Icon Sizes Based on Type
  const typeStyles = {
    info: { icon: "information-circle", color: "rgba(82, 196, 216, 0.75)", size: 50 },
    warning: { icon: "warning", color: "rgba(243, 167, 69, 0.87)", size: 45 }, // Smaller Warning Icon
    error: { icon: "close-circle", color: "rgba(240, 66, 66, 0.81)", size: 50 },
    success: { icon: "checkmark-circle", color: "rgba(59, 223, 133, 0.75)", size: 50 },
  };

  const { icon, color, size } = typeStyles[type] || typeStyles.info;

  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>

          {/* Icon & Message */}
          <View style={styles.content}>
            <Ionicons name={icon} size={size} color={color} style={styles.icon} />
            <Text style={[styles.message, { color: color }]}>{msg}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 🔹 Styles
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.69)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: "85%",
    paddingVertical: 25, // Increased Vertical Padding
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(240, 66, 66, 0.81)", // Red Background
    width: 30,
    height: 30,
    borderRadius: 15, // Fully Rounded
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexWrap: "wrap",
  },
  icon: {
    marginRight: 15,
  },
  message: {
    flex: 1,
    fontSize: 16, // Lowered Font Size
    fontWeight: "500",
    textAlign: "left",
  },
});

export default CustomAlert;
