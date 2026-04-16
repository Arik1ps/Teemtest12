import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCAAJ3q9iL-S6WTLaXQGjNHowfaTwGL8Hg",
    authDomain: "teendesh.firebaseapp.com",
    projectId: "teendesh",
    storageBucket: "teendesh.firebasestorage.app",
    messagingSenderId: "867505847481",
    appId: "1:867505847481:web:2cbd91baede588256fef68"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);