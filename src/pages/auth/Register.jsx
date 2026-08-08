import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";

import { registerAdmin, registerUser } from "../../services/authService";
import { toast } from "react-toastify";

export default function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    secretCode: "",
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

      const response = await (adminMode ? registerAdmin(formData) : registerUser(formData));

      toast(response.data.message);

      navigate("/verify-email", {
        state: {
          email: formData.email,
        },
      });
    } catch (error) {
      toast(
        error?.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={adminMode ? "Create Admin Account" : "Create Account"}
      subtitle={adminMode ? "Use your administrator secret code" : "Join ChatVerse today"}
    >
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-zinc-800 p-1 text-sm font-medium">
        <button type="button" onClick={() => setAdminMode(false)} className={`rounded-lg py-2 transition ${!adminMode ? "bg-violet-600 text-white" : "text-zinc-400"}`}>User account</button>
        <button type="button" onClick={() => setAdminMode(true)} className={`rounded-lg py-2 transition ${adminMode ? "bg-fuchsia-600 text-white" : "text-zinc-400"}`}>Admin account</button>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <AuthInput
          label="Full Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
        />

        {adminMode && <AuthInput
          label="Admin Secret Code"
          type="password"
          name="secretCode"
          value={formData.secretCode}
          onChange={handleChange}
          placeholder="Enter the server-provided secret"
        />}

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
            ? "Creating Account..."
            : adminMode ? "Create Admin Account" : "Create Account"}
        </button>
      </form>

      <p className="text-center text-zinc-400 mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-violet-500"
        >
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}
