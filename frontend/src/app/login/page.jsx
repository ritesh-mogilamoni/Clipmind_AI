"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Invalid email or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-[#F8FAFC] selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* ANIMATED AMBIENT CAUSTIC GLOW ORBS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] bg-gradient-to-tr from-indigo-600/35 via-violet-600/30 to-cyan-400/25 rounded-full pointer-events-none -z-0 orb-float-1"></div>
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-fuchsia-600/25 rounded-full pointer-events-none -z-0 orb-float-2"></div>
      <div className="absolute top-10 right-10 w-[400px] h-[400px] bg-cyan-500/20 rounded-full pointer-events-none -z-0 orb-float-3"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 relative z-10">
        <Link href="/" className="inline-flex items-center gap-2.5 text-2xl font-black tracking-tight text-white group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_25px_rgba(99,102,241,0.6)]">
            <div className="w-full h-full bg-[#070B14] rounded-[11px] flex items-center justify-center">
              <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">CM</span>
            </div>
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
            ClipMind AI
          </span>
        </Link>
        <p className="text-xs text-slate-400 font-medium">Sign in to access your intelligence studio</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glass-card-crystal py-8 px-6 sm:px-10 rounded-2xl space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium backdrop-blur-md">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 glass-button-primary text-white font-bold text-xs rounded-xl uppercase tracking-wider disabled:opacity-40"
            >
              {submitting ? "Signing in..." : "Sign In to Studio"}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-4 border-t border-white/[0.08]">
            Don't have an account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold transition">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
