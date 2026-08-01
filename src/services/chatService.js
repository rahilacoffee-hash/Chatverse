import api from "../services/axios";

export const getConversations = async () => {
  const res = await api.get("/chat/conversations");
  return res.data.data;
};

export const getExploreData = async (query = "") => (await api.get("/explore", { params: query ? { q: query } : {} })).data.data;
export const askExploreAi = async (post, question) => (await api.post("/chat/ai/ask", { post, question })).data.data;
export const createExplorePost = async (payload) => (await api.post("/chat/explore/posts", payload)).data.data;
export const createPost = async (payload) => (await api.post("/posts", payload)).data.data;
export const getMyPosts = async () => (await api.get("/posts/me")).data.data;
export const likePost = async (id) => (await api.post(`/posts/${id}/like`)).data.data;
export const unlikePost = async (id) => (await api.delete(`/posts/${id}/like`)).data.data;
export const addPostComment = async (id, text) => (await api.post(`/posts/${id}/comments`, { text })).data.data;
export const getPostComments = async (id) => (await api.get(`/posts/${id}/comments`)).data.data;
export const sharePost = async (id) => (await api.post(`/posts/${id}/share`)).data.data;

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
