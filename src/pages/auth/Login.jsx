import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import { FiChrome } from "react-icons/fi";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";
import { loginUser } from "../../services/authService";

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

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

      const isAdmin =
        response.data.data.user.role === "ADMIN" ||
        response.data.data.user.isAdmin === true;
      if (adminMode && !isAdmin) {
        toast.error("This account does not have admin access");
        return;
      }

      localStorage.setItem("accessToken", response.data.data.accessToken);
      localStorage.setItem("refreshToken", response.data.data.refreshToken);
      localStorage.setItem("userId", response.data.data.user._id);
      localStorage.setItem("user", JSON.stringify(response.data.data.user));

      toast.success(response.data.message);
      navigate(isAdmin && adminMode ? "/admin" : "/chats");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = Math.min(
    100,
    formData.password.length * 12 +
      (/[A-Z]/.test(formData.password) ? 20 : 0) +
      (/[0-9]/.test(formData.password) ? 20 : 0),
  );

  return (
    <AuthLayout
      title={adminMode ? "Admin Login" : "Welcome Back"}
      subtitle={
        adminMode
          ? "Sign in to the protected admin console"
          : "Login to continue to ChatVerse"
      }
    >
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-4"
      >
        <ArrowLeft size={18} />
        Back to Home
      </Link>

      <div className="mb-5 grid grid-cols-2 rounded-xl bg-zinc-800 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setAdminMode(false)}
          className={`rounded-lg py-2 transition ${!adminMode ? "bg-violet-600 text-white" : "text-zinc-400"}`}
        >
          User login
        </button>
        <button
          type="button"
          onClick={() => setAdminMode(true)}
          className={`rounded-lg py-2 transition ${adminMode ? "bg-fuchsia-600 text-white" : "text-zinc-400"}`}
        >
          Admin login
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!adminMode && (
          <>
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Google sign-in will be available once the provider is configured.",
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/[.04] py-3 text-sm font-semibold transition hover:bg-white/[.08]"
            >
              <FiChrome className="text-[#14F1D9]" /> Continue with Google
            </button>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[.18em] text-[var(--cv-muted)]">
              <span className="h-px flex-1 bg-white/10" />
              or continue with email
              <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}
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
        {formData.password && (
          <div className="-mt-2">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all ${passwordStrength > 70 ? "bg-[#22D3A6]" : passwordStrength > 40 ? "bg-[#F5A623]" : "bg-[#F5455C]"}`}
                style={{ width: `${passwordStrength}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--cv-muted)]">
              Password strength
            </p>
          </div>
        )}

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
          className="cv-gradient w-full rounded-[10px] py-3 text-white font-semibold transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Signing In..." : adminMode ? "Login as Admin" : "Login"}
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
