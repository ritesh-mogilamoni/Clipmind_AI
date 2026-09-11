"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("content_creator");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signup, isAuthenticated, loading } = useAuth();
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
      await signup({ name, email, password, role });
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Registration failed. Check details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D14] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
            CM
          </div>
          <span className="font-semibold text-lg text-white group-hover:text-slate-200 transition-colors">
            ClipMind AI
          </span>
        </Link>
        <p className="text-xs text-slate-400">Create a new intelligence workspace account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="surface-card py-8 px-6 sm:px-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ritesh Kumar"
                className="surface-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="surface-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="surface-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="surface-input w-full px-3.5 py-2.5 rounded-lg text-xs cursor-pointer font-medium bg-[#161B28]"
              >
                <option value="content_creator" className="bg-[#111522] text-white">Content Creator (Upload, Analyze & Manage)</option>
                <option value="educator" className="bg-[#111522] text-white">Educator (Lectures, Transcripts & Notes)</option>
                <option value="learner" className="bg-[#111522] text-white">Learner (Watch, Study & Bookmark)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 px-4 text-xs font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? "Creating account..." : "Register Studio Account"}
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-4 border-t border-white/[0.08]">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
