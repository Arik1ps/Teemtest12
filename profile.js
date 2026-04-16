import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentUser = null;
let myUsername = '';

// ===================== AUTH STATE =====================
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;
    loadProfile(user.uid);
    loadFriends(user.uid);
    listenForRequests(user.uid);
    listenForChatRequests(user.uid);
});

// ===================== LOAD PROFILE =====================
async function loadProfile(uid) {
    try {
        const snapshot = await getDoc(doc(db, "users", uid));
        if (snapshot.exists()) {
            const data = snapshot.data();
            myUsername = data.username || '';
            document.getElementById('display-username').textContent = data.username || 'Unknown';
            document.getElementById('display-type').textContent = data.type || 'Member';
            document.getElementById('display-age').textContent = data.age || '--';
            document.getElementById('display-gender').textContent = data.gender || '--';
            document.getElementById('display-uid').textContent = data.uniqueId || 'N/A';
        }
    } catch (err) { console.error("Profile load error:", err); }
}

// ===================== COPY UID =====================
window.copyUID = () => {
    const uid = document.getElementById('display-uid').textContent;
    if (uid === '--' || uid === 'N/A') return;
    navigator.clipboard.writeText(uid).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✓'; btn.style.color = '#00ff00';
        setTimeout(() => { btn.textContent = '⎘'; btn.style.color = ''; }, 2000);
    });
};

// ===================== LOGOUT =====================
window.logout = async () => {
    try {
        await signOut(auth);
        sessionStorage.removeItem('guest');
        sessionStorage.removeItem('guestId');
        window.location.href = "login.html";
    } catch (err) { console.error("Logout error:", err); }
};

// ===================== SEARCH USER =====================
window.searchUser = async () => {
    const input = document.getElementById('search-username').value.trim();
    const resultsDiv = document.getElementById('search-results');
    if (!input) { resultsDiv.innerHTML = "Please enter a username or ID."; return; }
    resultsDiv.innerHTML = "Searching...";

    try {
        const isUidSearch = input.startsWith('#TD-');
        const q = isUidSearch
            ? query(collection(db, "users"), where("uniqueId", "==", input.toUpperCase()))
            : query(collection(db, "users"), where("username", "==", input));

        const snapshot = await getDocs(q);
        resultsDiv.innerHTML = "";
        if (snapshot.empty) { resultsDiv.innerHTML = "No user found."; return; }

        let found = false;
        snapshot.forEach((docSnap) => {
            const uid = docSnap.id;
            const data = docSnap.data();
            if (uid === currentUser.uid) return;
            found = true;
            resultsDiv.innerHTML += `
                <div class="user-result-item">
                    <div>
                        <div>${data.username}</div>
                        <div style="font-size:0.75rem;color:#888;">${data.uniqueId || ''}</div>
                    </div>
                    <button class="add-btn" id="add-btn-${uid}" onclick="sendRequest('${uid}', '${data.username}')">ADD</button>
                </div>`;
        });
        if (!found) resultsDiv.innerHTML = "No other users found.";
    } catch (err) { resultsDiv.innerHTML = "Error: " + err.message; }
};

// ===================== SEND FRIEND REQUEST =====================
window.sendRequest = async (targetUid, targetName) => {
    const myUid = currentUser.uid;
    const btn = document.getElementById(`add-btn-${targetUid}`);

    const alreadyFriend = await getDoc(doc(db, `friends/${myUid}/list`, targetUid));
    if (alreadyFriend.exists()) { if (btn) btn.textContent = "FRIENDS"; return; }

    const alreadySent = await getDoc(doc(db, `friendRequests/${targetUid}/incoming`, myUid));
    if (alreadySent.exists()) { if (btn) btn.textContent = "SENT"; return; }

    if (btn) { btn.disabled = true; btn.textContent = "SENDING..."; }

    try {
        const mySnap = await getDoc(doc(db, "users", myUid));
        const myData = mySnap.data();

        await setDoc(doc(db, `friendRequests/${targetUid}/incoming`, myUid), {
            senderName: myData.username,
            senderUniqueId: myData.uniqueId || '',
            status: "pending",
            sentAt: serverTimestamp()
        });

        if (btn) { btn.textContent = "SENT ✓"; btn.style.color = "#00ff00"; }
        document.getElementById('search-results').innerHTML = "";
        document.getElementById('search-username').value = "";
    } catch (err) {
        console.error("Request error:", err);
        if (btn) { btn.disabled = false; btn.textContent = "ADD"; }
    }
};

// ===================== LISTEN FOR FRIEND REQUESTS =====================
function listenForRequests(uid) {
    onSnapshot(collection(db, `friendRequests/${uid}/incoming`), (snapshot) => {
        const box = document.getElementById('requests-list');
        const badge = document.getElementById('requests-badge');
        box.innerHTML = "";
        const pending = [];
        snapshot.forEach((d) => {
            if (d.data().status === 'pending') pending.push({ uid: d.id, ...d.data() });
        });

        badge.textContent = pending.length;
        badge.style.display = pending.length > 0 ? 'inline-block' : 'none';

        if (pending.length === 0) {
            box.innerHTML = "<p class='empty-msg'>No pending requests.</p>";
            return;
        }

        pending.forEach((req) => {
            box.innerHTML += `
                <div class="request-item">
                    <div>
                        <div class="request-name">${req.senderName}</div>
                        <div class="request-id">${req.senderUniqueId}</div>
                    </div>
                    <div class="request-btns">
                        <button class="accept-btn" onclick="acceptRequest('${req.uid}', '${req.senderName}')">✓</button>
                        <button class="reject-btn" onclick="rejectRequest('${req.uid}')">✗</button>
                    </div>
                </div>`;
        });
    });
}

// ===================== ACCEPT FRIEND REQUEST =====================
window.acceptRequest = async (senderUid, senderName) => {
    const myUid = currentUser.uid;
    try {
        const mySnap = await getDoc(doc(db, "users", myUid));
        const myName = mySnap.data().username;

        // ✅ Add BOTH to each other's friends list
        await setDoc(doc(db, `friends/${myUid}/list`, senderUid), {
            username: senderName, addedAt: Date.now()
        });
        await setDoc(doc(db, `friends/${senderUid}/list`, myUid), {
            username: myName, addedAt: Date.now()
        });

        // Delete the request
        await deleteDoc(doc(db, `friendRequests/${myUid}/incoming`, senderUid));
    } catch (err) { console.error("Accept error:", err); }
};

// ===================== REJECT FRIEND REQUEST =====================
window.rejectRequest = async (senderUid) => {
    try {
        await deleteDoc(doc(db, `friendRequests/${currentUser.uid}/incoming`, senderUid));
    } catch (err) { console.error("Reject error:", err); }
};

// ===================== LOAD FRIENDS (with chat button) =====================
function loadFriends(uid) {
    onSnapshot(collection(db, `friends/${uid}/list`), (snapshot) => {
        const listDiv = document.getElementById('friends-list');
        listDiv.innerHTML = "";

        if (snapshot.empty) {
            listDiv.innerHTML = "<p class='empty-msg'>No friends yet.</p>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const friendUid = docSnap.id;
            const friend = docSnap.data();
            listDiv.innerHTML += `
                <div class="friend-item">
                    <div class="online-dot"></div>
                    <span class="friend-name">${friend.username}</span>
                    <button class="chat-btn" title="Send chat request" onclick="sendChatRequest('${friendUid}', '${friend.username}')">💬</button>
                </div>`;
        });
    });
}

// ===================== SEND CHAT REQUEST =====================
window.sendChatRequest = async (friendUid, friendName) => {
    const myUid = currentUser.uid;

    try {
        // Write a chat request to the friend's notifications
        await setDoc(doc(db, `chatRequests/${friendUid}/incoming`, myUid), {
            senderName: myUsername,
            senderUid: myUid,
            status: "pending",
            sentAt: serverTimestamp()
        });

        // Go to waiting room
        sessionStorage.setItem('chatWith', JSON.stringify({ uid: friendUid, name: friendName }));
        window.location.href = "waiting.html";

    } catch (err) { console.error("Chat request error:", err); }
};

// ===================== LISTEN FOR CHAT REQUESTS =====================
function listenForChatRequests(uid) {
    onSnapshot(collection(db, `chatRequests/${uid}/incoming`), (snapshot) => {
        const badge = document.getElementById('chat-requests-badge');
        const box = document.getElementById('chat-requests-list');
        box.innerHTML = "";
        const pending = [];

        snapshot.forEach((d) => {
            if (d.data().status === 'pending') pending.push({ uid: d.id, ...d.data() });
        });

        badge.textContent = pending.length;
        badge.style.display = pending.length > 0 ? 'inline-block' : 'none';

        if (pending.length === 0) {
            box.innerHTML = "<p class='empty-msg'>No chat requests.</p>";
            return;
        }

        pending.forEach((req) => {
            box.innerHTML += `
                <div class="request-item">
                    <div class="request-name">${req.senderName} wants to chat</div>
                    <div class="request-btns">
                        <button class="accept-btn" onclick="acceptChatRequest('${req.uid}', '${req.senderName}')">JOIN</button>
                        <button class="reject-btn" onclick="rejectChatRequest('${req.uid}')">✗</button>
                    </div>
                </div>`;
        });
    });
}

// ===================== ACCEPT CHAT REQUEST =====================
window.acceptChatRequest = async (senderUid, senderName) => {
    const myUid = currentUser.uid;
    try {
        await deleteDoc(doc(db, `chatRequests/${myUid}/incoming`, senderUid));
        sessionStorage.setItem('chatWith', JSON.stringify({ uid: senderUid, name: senderName }));
        window.location.href = "waiting.html";
    } catch (err) { console.error("Accept chat error:", err); }
};

// ===================== REJECT CHAT REQUEST =====================
window.rejectChatRequest = async (senderUid) => {
    try {
        await deleteDoc(doc(db, `chatRequests/${currentUser.uid}/incoming`, senderUid));
    } catch (err) { console.error("Reject chat error:", err); }
};
