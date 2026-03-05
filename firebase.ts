import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDILZfBb2ioBsGLLLEyyj164nPQTNrlKe0",
  authDomain: "tarjeta-joven-escuinapa.firebaseapp.com",
  projectId: "tarjeta-joven-escuinapa",
  storageBucket: "tarjeta-joven-escuinapa.firebasestorage.app",
  messagingSenderId: "215334618974",
  appId: "1:215334618974:web:e1111ce2a37585afb2f1cf"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);