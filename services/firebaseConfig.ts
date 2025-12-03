
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: REEMPLAZA ESTOS VALORES CON LOS DE TU CONSOLA DE FIREBASE
// Ve a Project Settings -> General -> Your apps -> SDK setup and configuration -> Config
const firebaseConfig = {
  apiKey: "AIzaSyD_2OESJf1Tih8z0-w8L2rYci9rQp__DwU",
  authDomain: "coral-current-475711-j3.firebaseapp.com",
  projectId: "coral-current-475711-j3",
  storageBucket: "coral-current-475711-j3.firebasestorage.app",
  messagingSenderId: "982525999965",
  appId: "1:982525999965:web:89d80a5e4878ab961786b4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
