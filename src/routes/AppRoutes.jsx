import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import VerifyEmail from "../pages/auth/VerifyEmail";
import ForgotPassword from "../pages/auth/ForgotPassword";
import VerifyForgotPasswordOtp from "../pages/auth/VerifyForgotPasswordOtp";
import ResetPassword from "../pages/auth/ResetPassword";
import SplashScreen from "../components/SplashScreen";
import Chats from "../pages/chat/Chats";
import ChatScreen from "../pages/chat/ChatScreen";
import NewChat from "../pages/chat/NewChat";
import Profile from "../pages/chat/Profile";
import Status from "../pages/chat/Status";
import Settings from "../pages/chat/Settings";
import VoiceTest from "../pages/chat/startRecording";
import ContactProfile from "../pages/chat/ContactProfile";
import GroupProfile from "../pages/chat/GroupProfile";
import CallHistory from "../pages/chat/CallHistory";
import Explore from "../pages/chat/Explore";
import Notifications from "../pages/chat/Notifications";
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen  />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/verify-forgot-password-otp"
          element={<VerifyForgotPasswordOtp />}
        />
        <Route path="/reset-password" element={<ResetPassword />} />
     <Route path="/chats" element={<Chats />} />
<Route path="/chat" element={<ChatScreen />} />
<Route path="/new-chat" element={<NewChat />} />
<Route path="/profile" element={<Profile />} />
<Route path="/profile/:userId" element={<ContactProfile />} />
<Route path="/group/:groupId" element={<GroupProfile />} />
<Route path="/status" element={<Status />} />
<Route path="/settings" element={<Settings />} />
<Route path="/rec" element={<VoiceTest />} />
<Route path="/calls" element={<CallHistory />} />
<Route path="/explore" element={<Explore />} />
<Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
