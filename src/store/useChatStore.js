import { create } from "zustand";
import socket from "../lib/socket";
import {
  getConversations,
  getMessages,
} from "../services/chatService";

const selectedChatStoragePrefix = "chatverse:selectedChat";
const conversationCachePrefix = "chatverse:conversations";
const conversationRefreshInterval = 15 * 1000;
let conversationRequest = null;

const getConversationCacheKey = () => {
  const userId = localStorage.getItem("userId");
  return userId ? `${conversationCachePrefix}:${userId}` : null;
};

const getSelectedChatStorageKey = () => {
  const userId = localStorage.getItem("userId");
  return userId ? `${selectedChatStoragePrefix}:${userId}` : null;
};

const getCachedConversations = () => {
  try {
    const cacheKey = getConversationCacheKey();
    if (!cacheKey) return [];
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "[]");
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
};

const cacheConversations = (conversations) => {
  try {
    const cacheKey = getConversationCacheKey();
    if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(conversations));
  } catch {
    // The current session still works if browser storage is unavailable.
  }
};

const getSavedSelectedChat = () => {
  try {
    const storageKey = getSelectedChatStorageKey();
    return storageKey ? JSON.parse(localStorage.getItem(storageKey) || "null") : null;
  } catch {
    return null;
  }
};

const useChatStore = create((set, get) => ({
  conversations: getCachedConversations(),
  conversationsLoadedAt: 0,
  messages: [],
  messagesConversationId: null,
  selectedChat: getSavedSelectedChat(),

  onlineUsers: [],
  typingUsers: [],



  addReaction: (messageId, reaction, receiverId) => {
  socket.emit("addReaction", {
    messageId,
    reaction,
    receiverId,
  });
},


incomingCall: null,
activeCall: null,

setIncomingCall: (call) =>
  set({ incomingCall: call }),

setActiveCall: (call) =>
  set({ activeCall: call }),

endCall: () =>
  set({
    incomingCall: null,
    activeCall: null,
  }),

  // =========================
  // CONVERSATIONS
  // =========================

  fetchConversations: async () => {
    if (conversationRequest) return conversationRequest;
    if (Date.now() - get().conversationsLoadedAt < conversationRefreshInterval) {
      return true;
    }

    conversationRequest = (async () => {
      try {
        const data = await getConversations();

        const conversations = Array.isArray(data) ? data : [];
        const refreshedSelectedChat = conversations.find(
          (chat) => chat._id === get().selectedChat?._id
        );

        if (refreshedSelectedChat) {
          try {
            const storageKey = getSelectedChatStorageKey();
            if (storageKey) localStorage.setItem(storageKey, JSON.stringify(refreshedSelectedChat));
          } catch {
            // The in-memory chat will still update if storage is unavailable.
          }
        }

        set({
          conversations,
          selectedChat: refreshedSelectedChat || get().selectedChat,
          conversationsLoadedAt: Date.now(),
        });
        cacheConversations(conversations);
        return true;
      } catch (error) {
        console.log(error);
        return false;
      } finally {
        conversationRequest = null;
      }
    })();

    return conversationRequest;
  },

  selectChat: (chat) => {
    try {
      const storageKey = getSelectedChatStorageKey();
      if (storageKey && chat) localStorage.setItem(storageKey, JSON.stringify(chat));
      else if (storageKey) localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn("Could not save selected chat", error);
    }

    // A single message list is rendered by ChatScreen. Clear it immediately
    // when changing threads so the previous person's history never flashes
    // while the next history request is in flight.
    set((state) => ({
      selectedChat: chat,
      messages: String(state.selectedChat?._id) === String(chat?._id) ? state.messages : [],
      messagesConversationId:
        String(state.selectedChat?._id) === String(chat?._id) ? state.messagesConversationId : null,
    }));
  },

  // =========================
  // MESSAGES
  // =========================

  fetchMessages: async (
    conversationId
  ) => {
    try {
      const data =
        await getMessages(
          conversationId
        );

      const uniqueMessages = [
        ...new Map(
          data.map((msg) => [
            msg._id,
            msg,
          ])
        ).values(),
      ];

      // Requests can resolve out of order when someone opens chats quickly.
      // Do not let an older response replace the newly selected conversation.
      if (String(get().selectedChat?._id) !== String(conversationId)) return;

      set({
        messages: uniqueMessages,
        messagesConversationId: conversationId,
      });
    } catch (error) {
      console.log(error);
    }
  },

  // sendNewMessage now accepts mediaUrl as a 4th argument and derives
  // the message "type" automatically — "image" if a mediaUrl is given,
  // "text" otherwise. Previously mediaUrl was silently dropped here even
  // when the caller passed it in, since the socket payload always hardcoded
  // type: "text" and never included mediaUrl at all.
  sendNewMessage: (
    conversationId,
    receiverId,
    text,
    mediaUrl = "",
    type = mediaUrl ? "image" : "text",
    replyTo = null
  ) => {
    socket.emit(
      "sendMessage",
      {
        conversationId,
        receiverId,
        type,
        text,
        mediaUrl,
        replyTo,
      },
      (response) => {
        if (
          !response?.success
        )
          return;

        set((state) => {
          const exists =
            state.messages.some(
              (msg) =>
                msg._id ===
                response.message._id
            );

          if (exists)
            return state;

          return {
            messages: state.selectedChat?._id === conversationId
              ? [...state.messages, response.message]
              : state.messages,

            conversations:
              state.conversations.map(
                (chat) =>
                  chat._id ===
                  conversationId
                    ? {
                        ...chat,
                        lastMessage:
                          response.message,
                      }
                    : chat
              ),
          };
        });
      }
    );
  },

  addIncomingMessage: (
    message
  ) =>
    set((state) => {
      const exists =
        state.messages.some(
          (msg) =>
            msg._id ===
            message._id
        );

      if (exists)
        return state;

      return {
        // Keep realtime messages for other conversations out of the open
        // thread. The conversation list is still updated below.
        messages: String(state.selectedChat?._id) === String(message.conversationId)
          ? [...state.messages, message]
          : state.messages,

        conversations:
          state.conversations.map(
            (chat) =>
              chat._id ===
              message.conversationId
                ? {
                    ...chat,
                    lastMessage:
                      message,
                  }
                : chat
          ),
      };
    }),

  updateMessage: (message) =>
    set((state) => ({
      messages: state.messages.map((current) =>
        current._id === message._id ? message : current
      ),
      conversations: state.conversations.map((chat) =>
        chat.lastMessage?._id === message._id
          ? { ...chat, lastMessage: message }
          : chat
      ),
    })),

  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((message) => message._id !== messageId),
    })),

  // =========================
  // STATUS
  // =========================

  updateMessageStatus: (
    data
  ) =>
    set((state) => ({
      messages:
        state.messages.map(
          (msg) =>
            msg._id ===
            data.messageId
              ? {
                  ...msg,
                  deliveredAt:
                    data.deliveredAt ||
                    msg.deliveredAt,

                  readAt:
                    data.readAt ||
                    msg.readAt,
                }
              : msg
        ),
    })),

  // =========================
  // ONLINE USERS
  // =========================

  setOnlineUsers: (
    users
  ) =>
    set({
      onlineUsers:
        Array.isArray(users)
          ? users
          : [],
    }),

  setUserOnline: (
    userId
  ) =>
    set((state) => ({
      onlineUsers: [
        ...new Set([
          ...state.onlineUsers,
          userId,
        ]),
      ],
    })),

  setUserOffline: (
    userId
  ) =>
    set((state) => ({
      onlineUsers:
        state.onlineUsers.filter(
          (id) =>
            id !== userId
        ),
    })),

  // =========================
  // TYPING
  // =========================

  setTyping: (
    userId,
    typing
  ) =>
    set((state) => ({
      typingUsers: typing
        ? [
            ...new Set([
              ...state.typingUsers,
              userId,
            ]),
          ]
        : state.typingUsers.filter(
            (id) =>
              id !== userId
          ),
    })),
}));

export default useChatStore;
