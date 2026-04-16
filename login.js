import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const msg = document.getElementById('message-display');
let isSigningUp = false;

function generateUID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '#TD-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


onAuthStateChanged(auth, (user) => {
    if (user && !isSigningUp) {
        window.location.href = "index.html";
    }
});


window.switchTab = (type) => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const guestFields = document.getElementById('guest-fields');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    msg.textContent = "";

    if (type === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        guestFields.style.display = 'none';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        guestFields.style.display = 'none';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
    }
};


window.signup = async () => {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass = document.getElementById('signup-password').value;
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;

    if (!username || !email || !pass || !age || !gender) {
        msg.textContent = "Please fill all signup fields.";
        return;
    }
    if (parseInt(age) < 13) {
        msg.textContent = "You must be at least 13 years old.";
        return;
    }

    try {
        isSigningUp = true;
        msg.textContent = "Creating account...";

        const result = await createUserWithEmailAndPassword(auth, email, pass);

        // Generate unique shareable ID
        const uniqueId = generateUID();

        await setDoc(doc(db, "users", result.user.uid), {
            username: username,
            type: "member",
            age: parseInt(age),
            gender: gender,
            uniqueId: uniqueId,
            created: serverTimestamp()
        });

        window.location.href = "index.html";
    } catch (err) {
        isSigningUp = false;
        msg.textContent = err.message;
    }
};


window.login = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;

    if (!email || !pass) {
        msg.textContent = "Please enter your email and password.";
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        window.location.href = "index.html";
    } catch (err) {
        msg.textContent = "Invalid email or password.";
    }
};


window.guestLogin = () => {
    const age = document.getElementById('guest-age').value;
    const gender = document.getElementById('guest-gender').value;

    if (!age || !gender) {
        msg.textContent = "Please fill in age and gender.";
        return;
    }
    if (parseInt(age) < 13) {
        msg.textContent = "You must be at least 13 years old.";
        return;
    }

    sessionStorage.setItem('guest', JSON.stringify({ age: parseInt(age), gender }));
    window.location.href = "index.html";
};


window.showGuestFields = () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('guest-fields').style.display = 'block';
    msg.textContent = "";
};

window.hideGuestFields = () => switchTab('login');
