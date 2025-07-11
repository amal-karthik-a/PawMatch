import React, { useState } from "react";
import { View, Button, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { s3, S3_BUCKET } from "../../aws-config";

const ImageUploader = () => {
  const [imageUri, setImageUri] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState("");

  // Function to pick image from gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission Denied", "You need to allow access to your gallery.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };
// Function to convert Image URI to Blob
const uriToBlob = async (uri) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
};
  // Function to upload image to AWS S3
  const uploadImageToS3 = async () => {
    if (!imageUri) {
      Alert.alert("Please select an image first!");
      return;
    }

    try {
      const fileName = `image-${Date.now()}.jpg`;
      const fileType = "image/jpeg";
      const fileBlob = await uriToBlob(imageUri); // Convert URI to Blob

      const params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: fileBlob,
        ContentType: fileType,
      };

      s3.upload(params, (err, data) => {
        if (err) {
          console.error("Upload Error:", err);
          Alert.alert("Upload failed", err.message);
        } else {
          console.log("Uploaded Successfully:", data.Location);
          setUploadedUrl(data.Location);
          Alert.alert("Upload Successful!", `Image URL: ${data.Location}`);
        }
      });
    } catch (error) {
      console.error("Error in Upload Process:", error);
      Alert.alert("Upload Error", error.message);
    }
  };





























  return (
    <View>
      <Button title="Pick Image" onPress={pickImage} />
      {imageUri && (
        <Image source={{ uri: imageUri }} style={{ width: 100, height: 100, marginTop: 10 }} />
      )}
      <Button title="Upload to S3" onPress={uploadImageToS3} />
      {uploadedUrl ? 
      <Button title="View Image" onPress={() => Alert.alert(uploadedUrl)} /> : null}
    </View>
  );
};

export default ImageUploader;
