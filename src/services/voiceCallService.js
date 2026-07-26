let startCallHandler = null;

export const registerVoiceCallStarter = (handler) => {
  startCallHandler = handler;
};

const startCall = (user, callType) => {
  if (!startCallHandler) return false;
  return startCallHandler(user, callType);
};

export const startVoiceCall = (user) => startCall(user, "voice");
export const startVideoCall = (user) => startCall(user, "video");
