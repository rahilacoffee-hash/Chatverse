import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";

import { resetPassword } from "../../services/authService";
import { toast } from "react-toastify";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      return alert("Passwords do not match");
    }

    if (formData.newPassword.length < 6) {
      return alert("Password must be at least 6 characters");
    }

    try {
      setLoading(true);

      const response = await resetPassword({
        email,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });
      toast.success(response.data.message);

      navigate("/login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new password for your account"
    >
      <Link
        to="/verify-forgot-password-otp"
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="New Password"
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="••••••••"
        />

        <AuthInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
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
          {loading ? "Updating Password..." : "Reset Password"}
        </button>
      </form>

      <p className="text-center text-zinc-400 mt-6">
        Remember your password?{" "}
        <Link to="/login" className="text-violet-500 hover:text-violet-400">
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
