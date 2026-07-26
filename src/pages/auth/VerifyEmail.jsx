import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import AuthLayout from "../../components/auth/AuthLayout";
import { verifyEmail } from "../../services/authService";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await verifyEmail({
        email,
        otp,
      });

      toast(response.data.message);

      navigate("/login");
    } catch (error) {
      toast(error?.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify Email"
      subtitle={`Enter the OTP sent to ${email}`}
    >
      <Link
        to="/register"
        className="
    inline-flex
    items-center
    gap-2
    text-zinc-400
    hover:text-white
    transition
    mb-4
  "
      >
        <ArrowLeft size={18} />
        Back to Register
      </Link>
      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="block text-sm text-zinc-300 mb-2">OTP Code</label>

          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            className="
              w-full
              px-4
              py-3
              rounded-xl
              bg-zinc-800
              border
              border-zinc-700
              text-white
              text-center
              text-xl
              tracking-[0.5em]
              outline-none
              focus:border-violet-500
            "
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            py-3
            rounded-xl
            bg-violet-600
            hover:bg-violet-700
            text-white
            font-semibold
          "
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </form>
    </AuthLayout>
  );
}
