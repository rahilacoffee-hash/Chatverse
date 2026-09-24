import { FiChrome } from "react-icons/fi";
import { GoogleLogin } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleAuthButton({ onSuccess, onError, disabled }) {
  if (!clientId) return null;

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""}>
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        useOneTap={false}
        theme="filled_black"
        size="large"
        width="400"
        text="continue_with"
        shape="pill"
      />
    </div>
  );
}

export function GoogleAuthFallback() {
  if (clientId) return null;
  return (
    <div className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-white/10 px-3 py-3 text-center text-xs text-[var(--cv-muted)]">
      <FiChrome /> Google sign-in needs to be configured
    </div>
  );
}