import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Alert, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { auth, db } from './../../Config/FirebaseConfig';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import VerifingOtp from './../VerificationModal';
import { ActivityIndicator } from 'react-native-paper';

export default function PrivacySettings() {
    const router = useRouter();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureEntry, setSecureEntry] = useState(true);
    const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
    const [isTwoStepEnabled, setIsTwoStepEnabled] = useState(false);
    const [VerificationVisible, setVerificationVisible] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");
    const [user, setUser] = useState(null);

    const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

    const sendVerificationEmail = async (code) => {
        console.log(`Verification code sent to ${email}: ${code}`);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    setEmail(user.email);
                    const userDocRef = doc(db, "Settings", user.email);
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        setIsTwoStepEnabled(docSnap.data().twoStep === 'Y');
                    }
                } catch (error) {
                    console.error("Error fetching two-step setting:", error);
                }
            }
        });
        return unsubscribe;
    }, []);

    // Add notification to Firestore
    const addNotification = async (type, message, userId) => {
        try {
            const notificationRef = doc(db, "Notifications", `${userId}_${Date.now()}`);
            await setDoc(notificationRef, {
                type: type,
                msg: message,
                dateofnotification: serverTimestamp(),
                userid: userId,
                time: new Date().toISOString(),
            });
            console.log("Notification added successfully");
        } catch (error) {
            console.error("Error adding notification:", error);
        }
    };

    // Handle 2FA toggle switch with Firestore update and notification
    const toggleTwoStepVerification = async () => {
        const newValue = !isTwoStepEnabled;
        setIsTwoStepEnabled(newValue);
        
        if (user) {
            try {
                const userDocRef = doc(db, "Settings", user.email);
                await updateDoc(userDocRef, {
                    twoStep: newValue ? 'Y' : 'N'
                });
                
                // Add notification for two-step verification change
                const message = newValue
                    ? "Two-Step Verification has been enabled for your account."
                    : "Two-Step Verification has been disabled for your account.";
                await addNotification("PrivateAuth", message, user.email);

                Alert.alert(
                    "Two-Step Verification",
                    newValue
                        ? "Two-Step Verification has been enabled."
                        : "Two-Step Verification has been disabled."
                );
            } catch (error) {
                console.error("Error updating two-step verification:", error);
                Alert.alert("Error", "Failed to update two-step verification settings");
                setIsTwoStepEnabled(!newValue);
            }
        }
    };

    const verifyPassword = async (currentPassword) => {
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !confirmPassword || !newPassword) {
            Alert.alert("Error", "All fields are mandatory!");
            return;
        }
        else if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        else if (!(await verifyPassword(currentPassword))) {
            Alert.alert("Error", "Current Password is not Valid!");
            return;
        }

        const code = generateVerificationCode();
        setGeneratedCode(code);
        await sendVerificationEmail(code);
        setVerificationVisible(true);
    };

    const handleVerificationSuccess = async () => {
        setLoading(true);
        try {
            await updatePassword(user, confirmPassword);
            
            // Add notification for password change
            const message = "Your password has been successfully changed.";
            await addNotification("PrivateAuth", message, user.email);

            Alert.alert("Success", "Password Changed Successfully!");
        } catch (error) {
            console.error("Error updating password:", error);
            Alert.alert("Error", "Failed to change password: " + error.message);
            return;
        } finally {
            setLoading(false);
            setVerificationVisible(false);
            router.back();
        }
    };

    const handleVerificationFailure = async () => {
        // Add notification for failed OTP verification
        const message = "An attempt to change your password failed due to incorrect OTP verification.";
        await addNotification("PrivateAuth", message, user.email);

        setVerificationVisible(false);
        router.back();
    };

    return (
        <View style={styles.container}>
            {/* Back Button & Title */}
            <View style={{ padding: 20 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.replace('/MainContent/SettingsPage')}>
                        <Ionicons name="arrow-back" size={26} color="#68AFB3" />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Privacy Settings</Text>
                </View>
                <View style={styles.lcontainer}>
                    <LottieView
                        source={require('./../../assets/Animations/priv.json')}
                        autoPlay
                        loop
                        style={styles.lottie}
                    />
                </View>
            </View>

            <View style={{ padding: 20 }}>
                {loading ? (
                    <ActivityIndicator size="large" color="#BF32C1" />
                ) : (
                    <>
                        <View style={styles.card}>
                            <View style={styles.switchContainer}>
                                <Text style={styles.label}>Enable Two-Step Verification</Text>
                                <Switch
                                    value={isTwoStepEnabled}
                                    onValueChange={toggleTwoStepVerification}
                                    trackColor={{ false: "#ccc", true: "rgba(122, 199, 186, 0.41)" }}
                                    thumbColor={isTwoStepEnabled ? "#68AFB3" : "#f4f3f4"}
                                />
                            </View>
                        </View>
                        {/* Change Password Card */}
                        <View style={styles.card}>
                            <TouchableOpacity>
                                <Text style={styles.label}>Change Password</Text>
                            </TouchableOpacity>

                            <TextInput
                                placeholder="Current Password"
                                secureTextEntry
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                style={styles.input}
                            />

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="New Password"
                                    secureTextEntry={secureEntry}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    style={styles.inputFlex}
                                />
                                <TouchableOpacity onPress={() => setSecureEntry(!secureEntry)}>
                                    <Ionicons name={secureEntry ? "eye-off" : "eye"} size={22} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    placeholder="Confirm New Password"
                                    secureTextEntry={secureConfirmEntry}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    style={styles.inputFlex}
                                />
                                <TouchableOpacity onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}>
                                    <Ionicons name={secureConfirmEntry ? "eye-off" : "eye"} size={22} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
                                <Text style={styles.buttonText}>Change Password</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            <VerifingOtp
                isVisible={VerificationVisible}
                email={email}
                generatedCode={generatedCode}
                onVerifySuccess={handleVerificationSuccess}
                onFailure={handleVerificationFailure}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA", width: "100%" },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
    headerText: { 
        fontSize: 22, 
        fontWeight: "bold", 
        marginLeft: 20, 
        color: "#68AFB3", 
        backgroundColor: 'rgba(125, 228, 168, 0.23)', 
        paddingHorizontal: 14, 
        paddingVertical: 7, 
        borderRadius: 15,
        boxShadow: '0px 0px 5px rgba(1, 1, 1, 0.14)'
    },
    card: { 
        backgroundColor: "#fff", 
        padding: 20, 
        borderRadius: 15, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 4,
        marginBottom: 15,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    label: { 
        fontSize: 18, 
        fontWeight: "600", 
        color: "#68AFB3" 
    },
    lcontainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        height: 200,
    },
    lottie: {
        width: 200,
        height: 200,
    },
    input: { 
        borderWidth: 1.5, 
        padding: 12, 
        borderRadius: 8, 
        borderColor: "#68AFB3", 
        backgroundColor: "rgba(191, 230, 223, 0.14)", 
        marginBottom: 15 
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: "#68AFB3",
        backgroundColor: "rgba(191, 230, 223, 0.14)",
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    inputFlex: { flex: 1, paddingVertical: 12 },
    button: { 
        backgroundColor: "#68AFB3", 
        paddingVertical: 15, 
        borderRadius: 15, 
        alignItems: "center" 
    },
    buttonText: { 
        color: "white", 
        fontSize: 16, 
        fontWeight: "bold" 
    },
});