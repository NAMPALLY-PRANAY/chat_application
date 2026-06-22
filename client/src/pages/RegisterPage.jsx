import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", avatar: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(form.username, form.email, form.password, form.avatar);
      navigate("/a");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-slate-500 mt-1">Start chatting in realtime.</p>
        <div className="space-y-3 mt-5">
          <input placeholder="Username" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
          <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
          <input placeholder="Avatar URL (optional)" value={form.avatar} onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3 py-2" />
        </div>
        {error ? <p className="text-red-600 text-sm mt-3">{error}</p> : null}
        <button className="w-full mt-5 bg-accent text-white py-2 rounded-xl hover:bg-accentDark">Register</button>
        <p className="text-sm mt-4 text-slate-600">
          Already registered? <Link className="text-accent font-medium" to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
