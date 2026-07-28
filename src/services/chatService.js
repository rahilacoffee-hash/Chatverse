import api from "../services/axios";

export const getConversations = async () => {
  const res = await api.get("/chat/conversations");
  return res.data.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(
    `/chat/messages/${conversationId}`
  );

  return res.data.data;
};

export const sendMessage = async (payload) => {
  const res = await api.post(
    "/chat/messages",
    payload
  );

  return res.data.data;
};

export const createConversation = async (
  otherUserId
) => {
  const res = await api.post(
    "/chat/conversations",
    {
      otherUserId,
    }
  );

  return res.data.data;
};

export const createGroupConversation = async (name, participantIds) => {
  const res = await api.post("/chat/conversations/group", { name, participantIds });
  return res.data.data;
};

export const addGroupMembers = async (conversationId, participantIds) => {
  const res = await api.post(`/chat/conversations/${conversationId}/members`, { participantIds });
  return res.data.data;
};
