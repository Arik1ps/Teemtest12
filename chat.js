import { auth, db } from "./firebase.js";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const roomId = sessionStorage.getItem("currentChatRoom");
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-input-form");
let partnerId = "";

if (!roomId) {
    window.location.href = "index.html";
}

// 1. Listen for the Live Stream in this specific room
onSnapshot(doc(db, "chatRooms", roomId), (snapshot) => {
    if (!snapshot.exists()) {
        alert("Partner has left the chat.");
        window.location.href = "index.html";
        return;
    }

    const data = snapshot.data();
    
    // Determine who the partner is
    partnerId = data.player1 === auth.currentUser.uid ? data.player2 : data.player1;
    document.getElementById("partner-name").textContent = "Live Partner";

    // Only display if there is a new message and it's not the same as the last one displayed
    if (data.lastMsg && data.lastMsg.time !== window.lastMsgTime) {
        displayMessage(data.lastMsg.text, data.lastMsg.senderId);
        window.lastMsgTime = data.lastMsg.time;
    }
});

function displayMessage(text, senderId) {
    const isMe = senderId === auth.currentUser.uid;
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg-bubble ${isMe ? "me" : "them"}`;
    msgDiv.textContent = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 2. Send Message (Overwrites the lastMsg field)
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("user-msg");
    const text = input.value.trim();

    if (text) {
        await updateDoc(doc(db, "chatRooms", roomId), {
            lastMsg: {
                text: text,
                senderId: auth.currentUser.uid,
                time: Date.now()
            }
        });
        input.value = "";
    }
});

// 3. Reporting Logic
window.openReportModal = () => document.getElementById("report-modal").style.display = "flex";
window.closeReportModal = () => document.getElementById("report-modal").style.display = "none";

window.submitReport = async () => {
    const reason = document.getElementById("report-reason").value;
    
    await addDoc(collection(db, "reports"), {
        reporterId: auth.currentUser.uid,
        reportedUserId: partnerId,
        reason: reason,
        roomId: roomId,
        timestamp: serverTimestamp()
    });

    alert("User reported. Our moderators will review the session.");
    closeReportModal();
};

window.leaveChat = async () => {
    if (confirm("End this conversation? This will delete the room.")) {
        await deleteDoc(doc(db, "chatRooms", roomId));
        window.location.href = "index.html";
    }
};
