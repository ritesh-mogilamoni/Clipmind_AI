"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#050811] text-[#F8FAFC] font-sans antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      
      {/* ANIMATED AMBIENT CAUSTIC GLOW ORBS */}
      <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-tr from-indigo-600/30 via-violet-600/25 to-cyan-400/25 rounded-full pointer-events-none -z-0 orb-float-1"></div>
      <div className="absolute top-[30%] -left-[200px] w-[650px] h-[650px] bg-fuchsia-600/20 rounded-full pointer-events-none -z-0 orb-float-2"></div>
      <div className="absolute top-[60%] -right-[200px] w-[700px] h-[700px] bg-cyan-500/20 rounded-full pointer-events-none -z-0 orb-float-3"></div>
      <div className="absolute bottom-[-10%] left-1/3 w-[800px] h-[600px] bg-indigo-600/20 rounded-full pointer-events-none -z-0 orb-float-1"></div>

      {/* FROSTED CRYSTAL GLASS HEADER */}
      <header className="sticky top-0 z-50 bg-[#080D1A]/70 backdrop-blur-2xl border-b border-white/[0.12] shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* Brand Name */}
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black tracking-tight text-white group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.6)]">
              <div className="w-full h-full bg-[#070B14] rounded-[11px] flex items-center justify-center">
                <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">CM</span>
              </div>
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 group-hover:to-indigo-300 transition">
              ClipMind AI
            </span>
          </Link>

          {/* Navigation & Auth Buttons */}
          <div className="flex items-center gap-8 text-xs font-semibold">
            <a href="#features" className="text-slate-300 hover:text-white transition duration-200">Features</a>
            <a href="#workflow" className="text-slate-300 hover:text-white transition duration-200">Workflow</a>
            <a href="#roles" className="text-slate-300 hover:text-white transition duration-200">Roles</a>

            <div className="flex items-center gap-4 border-l border-white/15 pl-6">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="glass-button-primary px-5 py-2.5 rounded-xl font-bold text-white tracking-wide"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="glass-button-secondary px-4 py-2.5 rounded-xl font-semibold tracking-wide"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="glass-button-primary px-5 py-2.5 rounded-xl font-bold text-white tracking-wide"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* HERO SECTION WITH LUMINOUS GRADIENT DEPTH */}
      <section className="relative py-28 px-6 text-center max-w-[1100px] mx-auto space-y-8 z-10">
        
        {/* Floating Crystal Glass Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-indigo-400/40 text-indigo-200 text-xs font-mono font-medium shadow-[0_0_25px_rgba(99,102,241,0.35)] animate-pulse">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></span>
          Next-Gen AI Video Intelligence & Summarization
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
          Video Summarization & <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-300 to-cyan-300">
            Key Moments
          </span> Platform
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Transform video lectures, meetings, and tutorials into instant searchable transcripts, executive summaries, and interactive timestamped chapters with Whisper STT & Groq LLMs.
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="glass-button-primary px-8 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-[0_0_35px_rgba(99,102,241,0.6)] transform hover:-translate-y-0.5 transition"
          >
            Start Free Processing
          </Link>
          <Link
            href="/login"
            className="glass-button-secondary px-8 py-3.5 rounded-xl font-semibold text-xs uppercase tracking-wider text-slate-200 hover:text-white transform hover:-translate-y-0.5 transition"
          >
            Access Studio
          </Link>
        </div>

        {/* Hero Interactive Crystal Glass Preview Teaser */}
        <div className="pt-10 max-w-4xl mx-auto">
          <div className="glass-card-crystal p-3 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-white/20">
            <div className="bg-[#070B14]/85 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">READY TO PROCESS</span>
                  <h4 className="text-sm font-bold text-white">Full Video Timeline & AI Speech-to-Text Studio</h4>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="glass-badge px-3 py-1 text-[11px] font-mono rounded-lg">Whisper AI</span>
                <span className="glass-badge-emerald px-3 py-1 text-[11px] font-mono rounded-lg">Groq Llama 3</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* CORE FEATURES GRID WITH CRYSTAL FROSTED GLASS CARDS */}
      <section id="features" className="py-24 px-6 max-w-[1400px] mx-auto space-y-14 relative z-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Engineered for Deep Content Insights</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Automated speech processing and intelligence designed for creators, learners, and educators.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card glass-card-hover p-8 rounded-2xl space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-bold font-mono text-sm group-hover:scale-110 group-hover:bg-indigo-500/30 transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.35)]">
              01
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">Speech-to-Text Transcription</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Converts video audio into accurate timestamped transcripts. Click any transcript line to jump playback directly to that exact video moment.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-8 rounded-2xl space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-300 flex items-center justify-center font-bold font-mono text-sm group-hover:scale-110 group-hover:bg-purple-500/30 transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
              02
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">Executive Summaries & Keywords</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generates concise short summaries, detailed content breakdowns, and topic keyword tags for immediate scanning and quick absorption.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-8 rounded-2xl space-y-4 group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold font-mono text-sm group-hover:scale-110 group-hover:bg-cyan-500/30 transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.35)]">
              03
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">Key Moments & Chapter Navigation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Identifies key topics across video timelines and generates timestamp markers so users can navigate hour-long recordings efficiently.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS WORKFLOW */}
      <section id="workflow" className="py-24 px-6 relative z-10 bg-[#080D1A]/50 border-y border-white/[0.08] backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto space-y-14">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Four Steps to Full Intelligence</h2>
            <p className="text-xs sm:text-sm text-slate-400">Streamlined processing pipeline from upload to instant export.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono font-bold text-indigo-400">STEP 01</span>
              <h3 className="text-xs font-bold text-white">Video Selection</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">Upload MP4, MOV, AVI, WEBM, MKV files up to 500 MB or paste any online video link.</p>
            </div>

            <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono font-bold text-purple-400">STEP 02</span>
              <h3 className="text-xs font-bold text-white">Audio Extraction</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">Audio track is extracted seamlessly and preprocessed for high-fidelity speech recognition.</p>
            </div>

            <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono font-bold text-cyan-400">STEP 03</span>
              <h3 className="text-xs font-bold text-white">AI Analysis & STT</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">Transcripts, executive summaries, keywords, and key moments are synthesized.</p>
            </div>

            <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
              <span className="text-xs font-mono font-bold text-emerald-400">STEP 04</span>
              <h3 className="text-xs font-bold text-white">Review & Export</h3>
              <p className="text-[11px] text-slate-300 leading-relaxed">Interactive timestamp seek, live transcript editor, and instant TXT / JSON export.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROLE ACCESS OVERVIEW */}
      <section id="roles" className="py-24 px-6 max-w-[1400px] mx-auto space-y-14 relative z-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-bold tracking-widest text-purple-400 uppercase">Access Matrix</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Role-Based Workspaces</h2>
          <p className="text-xs sm:text-sm text-slate-400">Tailored permissions and features for every member of your organization.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
            <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]"></div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Content Creator</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">Upload media files, run AI processing pipelines, inspect insights, and manage video libraries.</p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Learner</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">Search transcripts, jump to timestamps, read summaries, and bookmark key sections.</p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
            <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc]"></div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Educator</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">Upload lecture recordings, edit transcripts, and export structured summaries for students.</p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-2xl space-y-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"></div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Administrator</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">Full platform access, system metrics monitoring, and multi-user management.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#070B14]/85 text-white py-12 px-6 border-t border-white/[0.1] backdrop-blur-2xl relative z-10">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">ClipMind AI</span>
            <span className="text-slate-500 font-mono text-[10px]">• Crystal Glass Edition</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
