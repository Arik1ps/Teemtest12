import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, addDoc, query, where, onSnapshot, getDocs, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentRoomId = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    findMatch(user);
});

async function findMatch(user) {
    const roomsRef = collection(db, "chatRooms");
    
    // 1. Look for an existing room waiting for a second player
    const q = query(roomsRef, where("status", "==", "waiting"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        // Join the first available room
        const room = snapshot.docs[0];
        currentRoomId = room.id;
        await updateDoc(doc(db, "chatRooms", currentRoomId), {
            player2: user.uid,
            status: "active"
        });
        goToChat(currentRoomId);
    } else {
        // 2. Create a new room and wait
        const newRoom = await addDoc(roomsRef, {
            player1: user.uid,
            player2: null,
            status: "waiting",
            createdAt: serverTimestamp()
        });
        currentRoomId = newRoom.id;
        
        // Listen for when player 2 joins
        onSnapshot(doc(db, "chatRooms", currentRoomId), (doc) => {
            if (doc.data()?.status === "active") {
                goToChat(currentRoomId);
            }
        });
    }
}

function goToChat(roomId) {
    sessionStorage.setItem("currentChatRoom", roomId);
    window.location.href = "chat.html";
}

window.cancelSearch = async () => {
    if (currentRoomId) {
        await deleteDoc(doc(db, "chatRooms", currentRoomId));
    }
    window.location.href = "index.html";
};
