import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import AuthLayout from "../../components/auth/AuthLayout";
import { verifyForgotPasswordOtp } from "../../services/authService";
import { toast } from "react-toastify";

export default function VerifyForgotPasswordOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await verifyForgotPasswordOtp({
        email,
        otp,
      });

      toast.success(response.data.message);

      navigate("/reset-password", {
        state: {
          email,
          otp,
        },
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Invalid OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle={`Enter the OTP sent to ${email}`}
    >
      <Link
        to="/forgot-password"
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
        Back
      </Link>

      <form
        onSubmit={handleVerify}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm text-zinc-300 mb-2">
            OTP Code
          </label>

          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value)
            }
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
          {loading
            ? "Verifying..."
            : "Verify OTP"}
        </button>
      </form>

      <p className="text-center text-zinc-400 mt-6">
        Didn't receive the code?{" "}
        <Link
          to="/forgot-password"
          className="text-violet-500"
        >
          Resend OTP
        </Link>
      </p>
    </AuthLayout>
  );
}