import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";

import { forgotPassword } from "../../services/authService";
import { toast } from "react-toastify";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await forgotPassword({
        email,
      });

      toast.success(response.data.message);

      navigate("/verify-forgot-password-otp", {
        state: { email },
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a reset OTP"
    >
      <Link
        to="/login"
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
        Back to Login
      </Link>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <AuthInput
          label="Email Address"
          type="email"
          name="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="john@example.com"
        />

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
            transition
          "
        >
          {loading
            ? "Sending OTP..."
            : "Send Reset OTP"}
        </button>
      </form>

      <p className="text-center text-zinc-400 mt-6">
        Remember your password?{" "}
        <Link
          to="/login"
          className="text-violet-500 hover:text-violet-400"
        >
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}