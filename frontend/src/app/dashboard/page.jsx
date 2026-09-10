"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import DashboardPage from "../../components/DashboardPage";

export default function Page() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center text-slate-300 relative overflow-hidden">
        <div className="absolute w-[400px] h-[400px] bg-indigo-600/20 blur-[130px] rounded-full pointer-events-none"></div>
        <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-3 font-mono text-xs shadow-2xl relative z-10 border border-white/10">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white font-bold">Loading ClipMind Studio...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <DashboardPage />;
}
