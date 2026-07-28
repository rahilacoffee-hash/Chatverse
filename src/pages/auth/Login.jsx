import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";
import { loginUser } from "../../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await loginUser(formData);

      localStorage.setItem("accessToken", response.data.data.accessToken);

      localStorage.setItem("refreshToken", response.data.data.refreshToken);

      localStorage.setItem("userId", response.data.data.user._id);

      localStorage.setItem("user", JSON.stringify(response.data.data.user));

      toast.success(response.data.message);

      navigate("/chats");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Login to continue to ChatVerse">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-4"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
        />

        <AuthInput
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-violet-500 hover:text-violet-400"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition disabled:opacity-50"
        >
          {loading ? "Signing In..." : "Login"}
        </button>
      </form>

      <p className="text-center text-zinc-400 mt-6">
        Don't have an account?{" "}
        <Link to="/register" className="text-violet-500 hover:text-violet-400">
          Create Account
        </Link>
      </p>
    </AuthLayout>
  );
}
