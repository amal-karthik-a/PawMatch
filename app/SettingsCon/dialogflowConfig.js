import { Dialogflow_V2 } from "react-native-dialogflow";
import key from "./service-account.json"; // Ensure correct path

export const dialogflowConfig = {
  type: key.type,
  project_id: key.project_id,
  private_key_id: key.private_key_id,
  private_key: key.private_key.replace(/\\n/g, "\n"), // Fix newline issue
  client_email: key.client_email,
  client_id: key.client_id,
  auth_uri: key.auth_uri,
  token_uri: key.token_uri,
  auth_provider_x509_cert_url: key.auth_provider_x509_cert_url,
  client_x509_cert_url: key.client_x509_cert_url,
};

export const initializeDialogflow = () => {
  console.log("Dialogflow Config:", dialogflowConfig); // Debugging line
  Dialogflow_V2.setConfiguration(
    dialogflowConfig.client_email,
    dialogflowConfig.private_key,
    Dialogflow_V2.LANG_ENGLISH,
    dialogflowConfig.project_id
  );
};

