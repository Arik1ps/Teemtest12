import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";


// 🔥 YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyCAAJ3q9iL-S6WTLaXQGjNHowfaTwGL8Hg",
  authDomain: "teendesh.firebaseapp.com",
  projectId: "https://teendesh-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "teendesh.firebasestorage.app",
  messagingSenderId: "867505847481",
  appId: "1:867505847481:web:2cbd91baede588256fef68"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const errorBox = document.getElementById("auth-error");


// ================= LOGIN =================

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "main.html";
  } catch (error) {
    errorBox.innerText = error.message;
  }
};


// ================= SIGNUP =================

window.signup = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
      email: email,
      ageGroup: "unknown",
      createdAt: serverTimestamp()
    });

    window.location.href = "main.html";

  } catch (error) {
    errorBox.innerText = error.message;
  }
};


// ================= GUEST FLOW =================

window.showGuestFields = function () {
  document.getElementById("main-auth-fields").style.display = "none";
  document.getElementById("guest-info-fields").style.display = "block";
};

window.hideGuestFields = function () {
  document.getElementById("main-auth-fields").style.display = "block";
  document.getElementById("guest-info-fields").style.display = "none";
};


window.guestLogin = async function () {

  const age = parseInt(document.getElementById("guest-age").value);
  const gender = document.getElementById("guest-gender").value;

  if (!age || age < 13) {
    errorBox.innerText = "Minimum age is 13.";
    return;
  }

  if (!gender) {
    errorBox.innerText = "Please select gender.";
    return;
  }

  try {
    const userCred = await signInAnonymously(auth);

    const ageGroup = age < 18 ? "teen" : "adult";

    await setDoc(doc(db, "users", userCred.user.uid), {
      age: age,
      gender: gender,
      ageGroup: ageGroup,
      guest: true,
      createdAt: serverTimestamp()
    });

    window.location.href = "main.html";

  } catch (error) {
    errorBox.innerText = error.message;
  }
};
window.goToWaiting = function() {
  window.location.href = "waiting.html";
};