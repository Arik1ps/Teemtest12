import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    setDoc,
    deleteDoc,
    collection,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let heartbeatInterval = null;

// ===================== AUTH GUARD =====================
onAuthStateChanged(auth, async (user) => {
    const isGuest = sessionStorage.getItem('guest');

    if (!user && !isGuest) {
        window.location.href = "login.html";
        return;
    }

    if (user) {
        await setUserOnline(user.uid);
        startHeartbeat(user.uid);
    } else if (isGuest) {
        let guestId = sessionStorage.getItem('guestId');
        if (!guestId) {
            guestId = "guest_" + Math.random().toString(36).slice(2, 9);
            sessionStorage.setItem('guestId', guestId);
        }
        await setUserOnline(guestId);
        startHeartbeat(guestId);
    }

    trackOnlineUsers();
});

// ===================== SET ONLINE =====================
async function setUserOnline(uid) {
    await setDoc(doc(db, "onlineUsers", uid), {
        online: true,
        lastActive: serverTimestamp()
    });
}

// ===================== HEARTBEAT =====================
// Refreshes every 2 minutes — keeps expireAt pushed forward
// If user closes tab, expireAt passes and TTL deletes the record
function startHeartbeat(uid) {
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    heartbeatInterval = setInterval(async () => {
        try {
            await setUserOnline(uid); // refresh expireAt
        } catch (err) {
            console.warn("Heartbeat failed:", err);
        }
    }, 2 * 60 * 1000); // every 2 minutes
}

// ===================== CLEANUP ON TAB CLOSE =====================
// Best effort — works on desktop, unreliable on mobile
// TTL is the real safety net for mobile
window.addEventListener("beforeunload", async () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    const user = auth.currentUser;
    const guestId = sessionStorage.getItem('guestId');
    const uid = user?.uid || guestId;
    if (!uid) return;
    deleteDoc(doc(db, "onlineUsers", uid)).catch(() => {});
});

// Also clean up when tab becomes hidden (mobile support)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        const user = auth.currentUser;
        const guestId = sessionStorage.getItem('guestId');
        const uid = user?.uid || guestId;
        if (!uid) return;
        // Mark offline — lastActive won't update so count will drop them after 5 min
        setDoc(doc(db, "onlineUsers", uid), {
            online: false,
            lastActive: serverTimestamp()
        }).catch(() => {});
    } else if (document.visibilityState === "visible") {
        // Tab is back — refresh online status
        const user = auth.currentUser;
        const guestId = sessionStorage.getItem('guestId');
        const uid = user?.uid || guestId;
        if (uid) setUserOnline(uid).catch(() => {});
    }
});

// ===================== TRACK ONLINE COUNT =====================
// Count only users active in the last 5 minutes — no TTL needed
function trackOnlineUsers() {
    const onlineRef = collection(db, "onlineUsers");
    onSnapshot(onlineRef, (snapshot) => {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        let count = 0;
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.online !== true) return;
            // Check lastActive timestamp
            const lastActive = data.lastActive?.toMillis?.() || 0;
            if (lastActive > fiveMinutesAgo) count++;
        });
        document.getElementById("user-count").innerText = count + " Online";
    });
}

// ===================== SUMMON BUTTON =====================
document.getElementById("summon-btn").addEventListener("click", () => {
    window.location.href = "waiting.html";
});

// ===================== THEME TOGGLE =====================
const themeBtn = document.getElementById("theme-toggle");
themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("day-mode");
    themeBtn.innerText = document.body.classList.contains("day-mode") ? "☀️" : "🌙";
});
