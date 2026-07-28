import { io } from "socket.io-client";
import useChatStore from "../store/useChatStore";
import { API_ORIGIN } from "../config/api";
import axiosInstance from "../services/axiosInstance";

const socket = io(
API_ORIGIN,
{
autoConnect: false,
// Allow HTTP long-polling as a fallback. Some hosting proxies temporarily
// reject WebSocket upgrades; Socket.IO can then reconnect and keep actions
// such as edits and reactions realtime instead of silently disconnecting.
transports: ["websocket", "polling"],
reconnection: true,
reconnectionAttempts: Infinity,
reconnectionDelay: 1000,
}
);

let refreshPromise = null;

const refreshAccessToken = async () => {
if (!refreshPromise) {
  refreshPromise = axiosInstance
    .post("/user/refresh-token", undefined, {
      // The API also supports the httpOnly refresh-token cookie. This header
      // keeps refresh working when the app and API are on different origins.
      headers: localStorage.getItem("refreshToken")
        ? { Authorization: `Bearer ${localStorage.getItem("refreshToken")}` }
        : undefined,
    })
    .then(({ data }) => {
      const accessToken = data?.data?.accessToken;
      if (!accessToken) throw new Error("Refresh response did not include an access token");
      localStorage.setItem("accessToken", accessToken);
      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });
}

return refreshPromise;
};

export const connectSocket = () => {
const token =
localStorage.getItem("accessToken");

if (!token) return;

if (socket.connected) return;

// Socket.IO reads this callback for every reconnect, so a refreshed JWT is
// never replaced by the token that existed when this module first loaded.
socket.auth = (callback) => callback({ token: localStorage.getItem("accessToken") });

socket.connect();

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

if (!["Invalid or expired token", "No auth token provided"].includes(err.message)) return;

// An access token expiring is recoverable. Refresh once, then reconnect with
// the current token. A custom event tells the loader only when the session is
// genuinely no longer recoverable.
socket.authRefreshInProgress = true;
refreshAccessToken()
  .then(() => socket.connect())
  .catch(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("chatverse:auth-refresh-failed"));
  })
  .finally(() => {
    socket.authRefreshInProgress = false;
  });
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

socket.on("messageReactionUpdated", (message) => {
useChatStore.getState().updateMessage(message);
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
