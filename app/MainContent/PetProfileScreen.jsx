import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Dimensions, Modal, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { db, auth } from "./../../Config/FirebaseConfig";
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, updateDoc, Timestamp, arrayUnion } from "firebase/firestore";
import LottieView from 'lottie-react-native';
import LoadingAnimation from './../../assets/Animations/LoadingAcc.json';
import VerifiedAnimation from './../../assets/Animations/DocVeri.json';
import NotVerifiedAnimation from './../../assets/Animations/DocVeri.json';

const { width, height } = Dimensions.get("window");

const PetProfileScreen = () => {
  const { pet } = useLocalSearchParams();
  const [petProfile, setPetProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("images");
  const [liked, setLiked] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [headerImageLoading, setHeaderImageLoading] = useState(true);
  const [galleryImageLoading, setGalleryImageLoading] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [isUpiConfirmed, setIsUpiConfirmed] = useState(false);

  // Helper functions
  const generateTransactionId = () => {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    return `TXN_${timestamp}_${randomNum}`;
  };

  const getCurrentUserEmail = () => {
    return auth.currentUser?.email || "anonymous@example.com";
  };

  useEffect(() => {
    const fetchPetData = async () => {
      if (!pet) {
        setError("No pet data provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const parsedPet = JSON.parse(pet);
        console.log("Parsed Pet Profile:", parsedPet);

        const petId = parsedPet.id || parsedPet;
        if (!petId) {
          setError("Pet ID not found in provided data.");
          setImages(parsedPet.petImages || []);
          setLoading(false);
          return;
        }

        const userId = parsedPet.userId;
        if (!userId) {
          console.log("No userId found in parsed pet data:", parsedPet);
          setError("User ID not found in provided data.");
          setLoading(false);
          return;
        }

        const favoritesQuery = query(
          collection(db, "Favorites"),
          where("petId", "==", petId),
          where("userId", "==", getCurrentUserEmail()) // Changed to current user
        );
        const favoritesSnapshot = await getDocs(favoritesQuery);

        if (!favoritesSnapshot.empty) {
          setLiked(true);
        } else {
          setLiked(false);
        }

        console.log("Fetching document with petId:", petId);
        const petDocRef = doc(db, "PetMatchingPair", petId);
        const petDocSnap = await getDoc(petDocRef);

        if (petDocSnap.exists()) {
          const petData = petDocSnap.data();
          console.log("Fetched PetMatchingPair Data:", petData);

          const updatedPetProfile = { ...parsedPet, ...petData };
          setPetProfile(updatedPetProfile);

          if (petData.PetImages && Array.isArray(petData.PetImages)) {
            setImages(petData.PetImages);
            const initialLoadingState = {};
            petData.PetImages.forEach((_, index) => {
              initialLoadingState[index] = true;
            });
            setGalleryImageLoading(initialLoadingState);
          } else {
            setImages([]);
            setError("No images found in Firestore.");
          }
        } else {
          setPetProfile(parsedPet);
          setImages(parsedPet.petImages || []);
          setError("Pet not found in Firestore. Using local data if available.");
        }
      } catch (error) {
        setError("Failed to fetch pet data from Firestore.");
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPetData();
  }, [pet]);

  const handleLike = async () => {
    if (!petProfile) return;

    const petId = petProfile.id;
    const userId = getCurrentUserEmail();
    if (!userId) {
      console.log("No userId available to handle like action");
      setError("User ID not available.");
      return;
    }

    try {
      const favoriteDocId = `${userId}_${petId}`;
      const favoriteDocRef = doc(db, "Favorites", favoriteDocId);

      if (liked) {
        await deleteDoc(favoriteDocRef);
        setLiked(false);
      } else {
        await setDoc(favoriteDocRef, {
          userId: userId,
          petId: petId,
          timestamp: new Date().toISOString(),
        });
        setLiked(true);
      }
    } catch (err) {
      console.error("Error updating favorites:", err);
      setError("Failed to update favorites. Please try again.");
    }
  };

  const handleChat = async () => {
    if (!petProfile || !auth.currentUser) {
      setError("Please log in to chat.");
      return;
    }

    try {
      // Step 1: Fetch the userId of the corresponding card (pet owner) and current user
      const petOwnerId = petProfile.userId;
      const currentUserId = auth.currentUser.email;

      console.log("Step 1: Pet owner userId fetched", petOwnerId);
      console.log("Step 1: Current userId fetched", currentUserId);

      // Step 2: Check if current user is the same as pet owner
      if (currentUserId === petOwnerId) {
        console.log("Step 2: Current user is pet owner");
        Alert.alert("Info", "User cannot chat with oneself");
        return;
      }

      // Step 3: Check ChatUsers collection for current user
      const currentUserDocRef = doc(db, "ChatUsers", currentUserId);
      console.log("Step 3: Current user ChatUsers doc reference", currentUserDocRef.path);

      const currentUserDoc = await getDoc(currentUserDocRef);
      console.log("Step 4: Current user ChatUsers doc fetched", currentUserDoc.exists() ? currentUserDoc.data() : "Not found");

      // Step 4: Handle ChatUsers collection
      if (!currentUserDoc.exists()) {
        console.log("Step 5: ChatUsers doc doesn't exist, creating new");
        await setDoc(currentUserDocRef, {
          otherAcc: [petOwnerId],
          createdAt: new Date().toISOString(),
        });
        console.log("Step 6: New ChatUsers doc created with otherAcc", [petOwnerId]);
      } else {
        const currentUserData = currentUserDoc.data();
        const otherAcc = currentUserData.otherAcc || [];
        console.log("Step 5: Current otherAcc array", otherAcc);

        if (!otherAcc.includes(petOwnerId)) {
          console.log("Step 6: petOwnerId not found in otherAcc, adding it");
          await updateDoc(currentUserDocRef, {
            otherAcc: arrayUnion(petOwnerId),
          });
          console.log("Step 7: petOwnerId added to otherAcc", petOwnerId);
        } else {
          console.log("Step 6: petOwnerId already exists in otherAcc, proceeding to navigation");
          router.push('/MainContent/AllChatListPage');
          return;
        }
      }

      // Step 5: Handle new Chats collection structure
      const sortedUserPair = [currentUserId, petOwnerId].sort().join('_');
      const chatDocRef = doc(db, "Chats", sortedUserPair);
      console.log("Step 8: Chat document reference", chatDocRef.path);

      const chatDoc = await getDoc(chatDocRef);
      console.log("Step 9: Chat doc fetched", chatDoc.exists() ? "Exists" : "Not found");

      if (!chatDoc.exists()) {
        console.log("Step 10: Chat doc doesn't exist, creating new structure");
        await setDoc(chatDocRef, {
          metadata: {
            participants: [currentUserId, petOwnerId],
            lastMessage: null, // Will be updated when a message is sent
            clearedBy: {
              [currentUserId]: false,
              [petOwnerId]: false,
            },
          },
        });
        console.log("Step 11: Created new chat document with metadata");
      }

      // Step 6: Navigate to AllChatListPage
      console.log("Step 12: Navigating to AllChatListPage");
      router.push('/MainContent/AllChatListPage');

    } catch (error) {
      console.error("Error in handleChat:", error);
      setError("Failed to initiate chat. Please try again.");
    }
  };

  const handleUserProfile = () => {
    if (petProfile) {
      router.push(`/MainContent/Ownerpage?userId=${petProfile.userId}`);
    }
  };

  const handleImagePress = (imageUri) => {
    setZoomedImage(imageUri);
  };

  const closeZoomedImage = () => {
    setZoomedImage(null);
  };

  const handleDoneUpi = async () => {
    if (!upiId.trim()) {
      Alert.alert("Error", "Please enter a valid UPI ID.");
      return;
    }

    setIsUpiConfirmed(true);
    Alert.alert("Success", "UPI ID confirmed!");

    if (!petProfile || !petProfile.id) {
      Alert.alert("Error", "Pet profile not loaded.");
      return;
    }

    try {
      const transactionId = generateTransactionId();
      const currentUserEmail = getCurrentUserEmail();
      const dateOfPayment = Timestamp.fromDate(new Date());

      const paymentDocRef1 = doc(db, "Payment", `${transactionId}_1`);
      await setDoc(paymentDocRef1, {
        dateOfPayment: dateOfPayment,
        price: petProfile.petPrice || 0,
        status: "success",
        transactionId: transactionId,
        userEmail: currentUserEmail,
        petId: petProfile.id,
      });

      const paymentDocRef2 = doc(db, "Payment", `${transactionId}_2`);
      await setDoc(paymentDocRef2, {
        dateOfPayment: dateOfPayment,
        price: petProfile.petPrice || 0,
        status: "success",
        transactionId: transactionId,
        petId: petProfile.id,
        userEmail: currentUserEmail,
      });

    } catch (err) {
      console.error("Error adding payment data:", err);
      Alert.alert("Error", "Failed to record payment details.");
    }
  };

  const handleBuyNow = async () => {
    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method.");
      return;
    }

    if (paymentMethod === "UPI" && !isUpiConfirmed) {
      Alert.alert("Error", "Please confirm your UPI ID by pressing Done.");
      return;
    }

    if (!petProfile || !petProfile.id) {
      Alert.alert("Error", "Pet profile not loaded.");
      return;
    }

    try {
      const currentUserEmail = getCurrentUserEmail();
      const dateOfNotification = Timestamp.fromDate(new Date());
      const transactionId = generateTransactionId();

      const petDocRef = doc(db, "PetMatchingPair", petProfile.id);
      await updateDoc(petDocRef, {
        Active: "N",
        Buyer: currentUserEmail,
        Confirmation: false,
      });

      const notificationDocRef = doc(db, "Notifications", `${petProfile.id}_${Date.now()}`);
      await setDoc(notificationDocRef, {
        dateOfNotification: dateOfNotification,
        time: new Date().toISOString().split("T")[1].split(".")[0],
        msg: `The ${currentUserEmail} has ordered your pet`,
        userOrder: currentUserEmail,
        owner: petProfile.userId,
        type: "Private",
      });

      if (paymentMethod === "Cash") {
        const dateOfPayment = Timestamp.fromDate(new Date());

        const paymentDocRef1 = doc(db, "Payment", `${transactionId}_1`);
        await setDoc(paymentDocRef1, {
          dateOfPayment: dateOfPayment,
          price: petProfile.petPrice || 0,
          status: "success",
          transactionId: transactionId,
          userEmail: currentUserEmail,
          petId: petProfile.id,
        });

        const paymentDocRef2 = doc(db, "Payment", `${transactionId}_2`);
        await setDoc(paymentDocRef2, {
          dateOfPayment: dateOfPayment,
          price: petProfile.petPrice || 0,
          status: "success",
          transactionId: transactionId,
          petId: petProfile.id,
          userEmail: currentUserEmail,
        });

        const purchaseDocRef = doc(db, "Purchase", `${transactionId}`); // Fixed Purchase collection usage
        await setDoc(purchaseDocRef, {
          dateOfPayment: dateOfPayment,
          price: petProfile.petPrice || 0,
          transactionId: transactionId,
          petId: petProfile.id,
          userEmail: currentUserEmail,
          status: "N",
        });
      }

      Alert.alert("Success", "Purchase completed! The pet is no longer active.");
      router.back();
    } catch (err) {
      console.error("Error completing purchase:", err);
      Alert.alert("Error", "Failed to complete the purchase. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          style={styles.loadingAnimation}
          source={LoadingAnimation}
          autoPlay
          loop
          speed={0.7}
          onAnimationFailure={(error) => console.log("Animation Error:", error)}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!petProfile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load pet profile.</Text>
      </View>
    );
  }

  const formatFieldName = (key) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const renderContent = () => {
    if (activeTab === "images") {
      return images.length > 0 ? (
        <FlatList
          data={images}
          keyExtractor={(item, index) => `${item}-${index}`}
          numColumns={2}
          columnWrapperStyle={styles.imageRow}
          renderItem={({ item, index }) => (
            <TouchableOpacity onPress={() => handleImagePress(item)}>
              <View style={styles.galleryImageContainer}>
                {galleryImageLoading[index] && (
                  <LottieView
                    style={StyleSheet.absoluteFillObject}
                    source={LoadingAnimation}
                    autoPlay
                    loop
                    speed={0.7}
                  />
                )}
                <Image
                  source={{ uri: item }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                  onLoad={() => {
                    setGalleryImageLoading((prev) => ({
                      ...prev,
                      [index]: false,
                    }));
                  }}
                  onError={() => {
                    setGalleryImageLoading((prev) => ({
                      ...prev,
                      [index]: false,
                    }));
                  }}
                />
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.errorText}>No images available for this pet.</Text>
      );
    } else {
      return (
        <ScrollView style={styles.aboutScroll}>
          <View style={styles.aboutSection}>
            <View style={styles.section}>
              <Text style={styles.petName}>{petProfile.petName}</Text>
              {(petProfile.petTitles || petProfile.petColor) && (
                <View style={styles.tagsContainer}>
                  {petProfile.petTitles && (
                    <Text style={styles.titleTag}>{petProfile.petTitles}</Text>
                  )}
                  {petProfile.petColor && (
                    <Text style={styles.colorTag}>{petProfile.petColor}</Text>
                  )}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Verification Status</Text>
              <View style={styles.verifiedContainer}>
                <LottieView
                  style={styles.verifiedAnimation}
                  source={petProfile.verified ? VerifiedAnimation : NotVerifiedAnimation}
                  autoPlay
                  loop={false}
                  speed={0.7}
                />
                <Text style={styles.verifiedText}>
                  {petProfile.verified ? "Verified" : "Not Verified"}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailsGrid}>
                  {Object.entries(petProfile)
                    .filter(([key]) =>
                      ![
                        "id",
                        "userId",
                        "PetImages",
                        "propicpet",
                        "petName",
                        "petTitles",
                        "petColor",
                        "petLicense",
                        "petCertificate",
                        "verified",
                        "latitude",
                        "longitude",
                      ].includes(key)
                    )
                    .map(([key, value]) => {
                      if (value === null || value === undefined || value === "") return null;
                      let formattedValue = value;

                      if (key === "location" && typeof value === "object") {
                        const locationDetails = [];
                        Object.entries(value).forEach(([locKey, locValue]) => {
                          if (["latitude", "longitude"].includes(locKey)) return;
                          if (locValue) {
                            locationDetails.push(`${formatFieldName(locKey)}: ${locValue}`);
                          }
                        });
                        formattedValue = locationDetails.join(", ");
                        if (!formattedValue) return null;
                      }

                      if (key === "distance" && typeof value === "number") {
                        formattedValue = `${value.toFixed(2)} Miles Away`;
                      }
                      if (key === "petPrice" && typeof value === "number") {
                        formattedValue = `$${value}`;
                      }
                      if (key === "petAge" && typeof value === "number") {
                        formattedValue = `${value} Years`;
                      }

                      return (
                        <View key={key} style={styles.detailItem}>
                          <Text style={styles.detailLabel}>{formatFieldName(key)}</Text>
                          <Text style={styles.detailValue}>{formattedValue.toString()}</Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pet Certificates</Text>
              {petProfile.petCertificate && petProfile.petCertificate.length > 0 ? (
                <FlatList
                  horizontal
                  data={petProfile.petCertificate}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleImagePress(item)}>
                      <Image
                        source={{ uri: item }}
                        style={styles.certificateImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.certificateList}
                />
              ) : (
                <Text style={styles.noDataText}>No data</Text>
              )}
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => {
                    setPaymentMethod("UPI");
                    setIsUpiConfirmed(false);
                    setUpiId("");
                  }}
                >
                  <View style={styles.radioCircle}>
                    {paymentMethod === "UPI" && <View style={styles.selectedRadio} />}
                  </View>
                  <Text style={styles.radioText}>UPI Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => {
                    setPaymentMethod("Cash");
                    setIsUpiConfirmed(false);
                    setUpiId("");
                  }}
                >
                  <View style={styles.radioCircle}>
                    {paymentMethod === "Cash" && <View style={styles.selectedRadio} />}
                  </View>
                  <Text style={styles.radioText}>Cash Payment</Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === "UPI" && (
                <View style={styles.upiContainer}>
                  <TextInput
                    style={styles.upiInput}
                    placeholder="Enter UPI ID (e.g., name@bank)"
                    value={upiId}
                    onChangeText={setUpiId}
                    editable={!isUpiConfirmed}
                  />
                  {!isUpiConfirmed && (
                    <TouchableOpacity style={styles.doneButton} onPress={handleDoneUpi}>
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow}>
                <Text style={styles.buyNowButtonText}>Buy Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.headerImageContainer}>
          {headerImageLoading && (
            <LottieView
              style={StyleSheet.absoluteFillObject}
              source={LoadingAnimation}
              autoPlay
              loop
              speed={0.7}
            />
          )}
          <Image
            source={{ uri: petProfile?.propicpet }}
            style={styles.headerImage}
            resizeMode="cover"
            onLoad={() => setHeaderImageLoading(false)}
            onError={() => setHeaderImageLoading(false)}
          />
        </View>
        <View style={styles.iconRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.contentContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <FontAwesome name={liked ? "heart" : "heart-o"} size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButtonPerson} onPress={handleUserProfile}>
              <MaterialIcons name="person-outline" size={45} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
              <Ionicons name="chatbubble-outline" size={28} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab("images")}
              style={[styles.tab, activeTab === "images" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "images" && styles.activeTabText]}>IMAGES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("about")}
              style={[styles.tab, activeTab === "about" && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === "about" && styles.activeTabText]}>ABOUT</Text>
            </TouchableOpacity>
          </View>

          {renderContent()}
        </View>
      </View>

      {zoomedImage && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={!!zoomedImage}
          onRequestClose={closeZoomedImage}
        >
          <View style={styles.zoomedImageContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeZoomedImage}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Image
              source={{ uri: zoomedImage }}
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8F5E9",
  },
  topSection: {
    width: "100%",
  },
  headerImageContainer: {
    width: "100%",
    height: 420,
    justifyContent: "center",
    alignItems: "center",
  },
  headerImage: {
    width: "100%",
    height: 420,
  },
  iconButton: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 6,
    borderRadius: 50,
  },
  iconRow: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 50,
  },
  bottomCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    marginTop: -35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.47,
    shadowRadius: 9,
    elevation: 5,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 0,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    gap: 40,
    marginTop: -27,
  },
  actionButton: {
    backgroundColor: "rgba(75, 212, 159, 0.73)",
    padding: 12,
    borderRadius: 30,
    height: 51,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  actionButtonPerson: {
    backgroundColor: "rgba(75, 212, 159, 0.84)",
    padding: 14,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 4,
    borderColor: "white",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(75, 212, 159, 0.56)",
  },
  activeTab: {
    backgroundColor: "rgba(75, 212, 159, 0.75)",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "white",
    fontWeight: "bold",
  },
  imageRow: {
    justifyContent: "space-around",
    marginBottom: 10,
  },
  galleryImageContainer: {
    width: width / 2.5,
    height: 120,
    margin: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  aboutScroll: {
    flex: 1,
  },
  aboutSection: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 10,
  },
  petName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  titleTag: {
    backgroundColor: "#81C784",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginHorizontal: 5,
    marginBottom: 5,
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  colorTag: {
    backgroundColor: "#C8E6C9",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginHorizontal: 5,
    marginBottom: 5,
    color: "#2E7D32",
    fontWeight: "600",
    fontSize: 12,
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F8E9",
    borderRadius: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  verifiedAnimation: {
    width: 50,
    height: 50,
    marginRight: 10,
  },
  verifiedText: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: "#F1F8E9",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailItem: {
    width: "48%",
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4CAF50",
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "600",
  },
  certificateList: {
    paddingVertical: 5,
  },
  certificateImage: {
    width: 150,
    height: 100,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  paymentSection: {
    marginBottom: 20,
  },
  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  selectedRadio: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2E7D32",
  },
  radioText: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "500",
  },
  upiContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  upiInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
  },
  doneButton: {
    backgroundColor: "#2E7D32",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buyNowButton: {
    backgroundColor: "#81C784",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buyNowButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
  },
  loadingAnimation: {
    width: 150,
    height: 150,
  },
  zoomedImageContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomedImage: {
    width: width * 0.9,
    height: height * 0.7,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.14)",
    padding: 5,
    borderRadius: 20,
  },
});

export default PetProfileScreen;