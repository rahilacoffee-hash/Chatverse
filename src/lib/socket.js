import { io } from "socket.io-client";
import useChatStore from "../store/useChatStore";

const socket = io(
import.meta.env.VITE_API_URL ||
"http://localhost:5001",
{
autoConnect: false,
transports: ["websocket"],
}
);

export const connectSocket = () => {
const token =
localStorage.getItem("accessToken");

if (!token) return;

if (socket.connected) return;

socket.auth = { token };

socket.connect();

socket.removeAllListeners();

// ==========================
// CONNECTION
// ==========================

socket.on("connect", () => {
console.log(
"🟢 Socket Connected:",
socket.id
);
});

socket.on("disconnect", () => {
console.log(
"🔴 Socket Disconnected"
);
});

socket.on(
"connect_error",
(err) => {
console.log(
"Socket Error:",
err.message
);
}
);

// ==========================
// ONLINE USERS
// ==========================

socket.on(
"onlineUsers",
(users) => {
useChatStore
.getState()
.setOnlineUsers(users);
}
);

socket.on(
"userOnline",
(userId) => {
useChatStore
.getState()
.setUserOnline(userId);
}
);

socket.on(
"userOffline",
({ userId, lastSeen }) => {
const store =
useChatStore.getState();


  store.setUserOffline(userId);

  if (
    store.updateUserLastSeen
  ) {
    store.updateUserLastSeen(
      userId,
      lastSeen
    );
  }
}


);

// ==========================
// NEW MESSAGE
// ==========================

socket.on(
"newMessage",
(message) => {
const store =
useChatStore.getState();


  store.addIncomingMessage(
    message
  );

  if (
    document.hidden &&
    Notification.permission ===
      "granted"
  ) {
    new Notification(
      message?.sender?.name ||
        "New Message",
      {
        body:
          message.text ||
          "Sent a message",
      }
    );
  }
}


);

// ==========================
// MESSAGE STATUS
// ==========================

socket.on(
"messageStatusUpdate",
(data) => {
useChatStore
.getState()
.updateMessageStatus(data);
}
);

socket.on("messageUpdated", (message) => {
useChatStore.getState().updateMessage(message);
});

socket.on("messageDeletedForMe", ({ messageId }) => {
useChatStore.getState().removeMessage(messageId);
});

// ==========================
// TYPING
// ==========================

socket.on(
"userTyping",
({ userId }) => {
useChatStore
.getState()
.setTyping(userId, true);
}
);

socket.on(
"userStoppedTyping",
({ userId }) => {
useChatStore
.getState()
.setTyping(userId, false);
}
);

// ==========================
// CONVERSATION REFRESH
// ==========================

socket.on(
"conversationUpdated",
async () => {
const store =
useChatStore.getState();


  if (
    store.fetchConversations
  ) {
    await store.fetchConversations();
  }
}


);

// ==========================
// CALL EVENTS
// ==========================

socket.on(
"incomingCall",
(data) => {
console.log(
"📞 Incoming Call",
data
);


  const store =
    useChatStore.getState();

  if (
    store.setIncomingCall
  ) {
    store.setIncomingCall(
      data
    );
  }
}


);

socket.on(
"callAnswered",
({ answer }) => {
console.log(
"✅ Call Answered"
);


  const store =
    useChatStore.getState();

  if (
    store.setRemoteAnswer
  ) {
    store.setRemoteAnswer(
      answer
    );
  }
}

);

socket.on(
"iceCandidate",
(candidate) => {
console.log(
"🧊 ICE Candidate"
);


  const store =
    useChatStore.getState();

  if (
    store.addIceCandidate
  ) {
    store.addIceCandidate(
      candidate
    );
  }
}


);

socket.on(
"callEnded",
() => {
console.log(
"❌ Call Ended"
);


  const store =
    useChatStore.getState();

  if (store.endCall) {
    store.endCall();
  }
}

);
};

// ==========================
// CALL FUNCTIONS
// ==========================

export const callUser = (
receiverId,
offer
) => {
socket.emit("callUser", {
receiverId,
offer,
});
};

export const answerCall = (
callerId,
answer
) => {
socket.emit("answerCall", {
callerId,
answer,
});
};

export const sendIceCandidate = (
targetUserId,
candidate
) => {
socket.emit("iceCandidate", {
targetUserId,
candidate,
});
};

export const endCall = (
targetUserId
) => {
socket.emit("endCall", {
targetUserId,
});
};

// ==========================
// DISCONNECT
// ==========================

export const disconnectSocket =
() => {
if (socket.connected) {
socket.removeAllListeners();
socket.disconnect();
}
};

// ==========================
// NOTIFICATIONS
// ==========================

export const requestNotificationPermission =
async () => {
if (
!(
"Notification" in
window
)
)
return;


if (
  Notification.permission ===
  "default"
) {
  await Notification.requestPermission();
}


};

export default socket;
