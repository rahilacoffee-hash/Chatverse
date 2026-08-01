import api from "../services/axios";

export const getConversations = async () => {
  const res = await api.get("/chat/conversations");
  return res.data.data;
};

export const getExploreData = async () => (await api.get("/chat/explore")).data.data;
export const askExploreAi = async (post, question) => (await api.post("/chat/ai/ask", { post, question })).data.data;
export const createExplorePost = async (payload) => (await api.post("/chat/explore/posts", payload)).data.data;
export const createPost = async (payload) => (await api.post("/posts", payload)).data.data;

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

export const updateGroup = async (conversationId, payload) => (await api.patch(`/chat/conversations/${conversationId}/group`, payload)).data.data;
export const removeGroupMember = async (conversationId, memberId) => (await api.delete(`/chat/conversations/${conversationId}/members/${memberId}`)).data.data;
export const promoteGroupAdmin = async (conversationId, memberId) => (await api.post(`/chat/conversations/${conversationId}/members/${memberId}/admin`)).data.data;

export const deleteChatForMe = async (conversationId) => {
  const res = await api.delete(`/chat/conversations/${conversationId}/messages`);
  return res.data;
};

export const deleteConversationForMe = async (conversationId) => {
  const res = await api.delete(`/chat/conversations/${conversationId}`);
  return res.data;
};
