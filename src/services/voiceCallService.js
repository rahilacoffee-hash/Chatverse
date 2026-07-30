let startCallHandler = null;
let joinGroupCallHandler = null;

export const registerVoiceCallStarter = (handler) => {
  startCallHandler = handler;
};

export const registerGroupCallJoiner = (handler) => {
  joinGroupCallHandler = handler;
};

const startCall = (user, callType) => {
  if (!startCallHandler) return false;
  return startCallHandler(user, callType);
};

export const startVoiceCall = (user) => startCall(user, "voice");
export const startVideoCall = (user) => startCall(user, "video");
export const startGroupVoiceCall = (group) => startCall(group, "group-voice");
export const startGroupVideoCall = (group) => startCall(group, "group-video");
export const joinGroupCall = (call) => joinGroupCallHandler ? joinGroupCallHandler(call) : false;
