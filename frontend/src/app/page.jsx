"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0D14] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white relative">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#111522]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between">
          
          {/* Brand Name */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              CM
            </div>
            <span className="font-semibold text-base text-white group-hover:text-slate-200 transition-colors">
              ClipMind AI
            </span>
          </Link>

          {/* Navigation & Auth Buttons */}
          <div className="flex items-center gap-8 text-xs font-medium">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="text-slate-400 hover:text-white transition-colors">Workflow</a>
            <a href="#roles" className="text-slate-400 hover:text-white transition-colors">Roles</a>

            <div className="flex items-center gap-3 border-l border-white/[0.08] pl-6">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-medium"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-primary px-4 py-2 rounded-lg text-xs font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative py-24 sm:py-28 px-6 text-center max-w-[1100px] mx-auto space-y-8">
        
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161B28] border border-white/[0.08] text-slate-300 text-xs font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          AI Video Intelligence & Summarization
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          Video Summarization & <br />
          <span className="text-cyan-400">
            Key Moments
          </span> Platform
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Transform video lectures, meetings, and tutorials into instant searchable transcripts, executive summaries, and interactive timestamped chapters with Whisper STT & Groq LLMs.
        </p>

        <div className="pt-2 flex flex-wrap justify-center gap-3.5">
          <Link
            href="/signup"
            className="btn-primary px-6 py-3 rounded-lg font-medium text-xs"
          >
            Start Free Processing
          </Link>
          <Link
            href="/login"
            className="btn-secondary px-6 py-3 rounded-lg font-medium text-xs text-slate-300 hover:text-white"
          >
            Access Studio
          </Link>
        </div>

        {/* Hero Preview Card */}
        <div className="pt-8 max-w-3xl mx-auto">
          <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">Ready to Process</span>
                <h4 className="text-sm font-semibold text-white">Full Video Timeline & AI Speech-to-Text Studio</h4>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="surface-badge px-2.5 py-1 text-[11px] font-mono text-slate-300">Whisper AI</span>
              <span className="surface-badge-emerald px-2.5 py-1 text-[11px] font-mono text-emerald-400">Groq Llama 3</span>
            </div>
          </div>
        </div>

      </section>

      {/* CORE FEATURES GRID */}
      <section id="features" className="py-20 px-6 max-w-[1400px] mx-auto space-y-12">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-semibold tracking-wider text-indigo-400 uppercase">Capabilities</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Engineered for Deep Content Insights</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Automated speech processing and intelligence designed for creators, learners, and educators.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="surface-card p-7 space-y-3.5 group">
            <span className="text-xs font-mono font-semibold text-indigo-400">01</span>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Speech-to-Text Transcription</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Converts video audio into accurate timestamped transcripts. Click any transcript line to jump playback directly to that exact video moment.
            </p>
          </div>

          <div className="surface-card p-7 space-y-3.5 group">
            <span className="text-xs font-mono font-semibold text-cyan-400">02</span>
            <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">Executive Summaries & Keywords</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates concise short summaries, detailed content breakdowns, and topic keyword tags for immediate scanning and quick absorption.
            </p>
          </div>

          <div className="surface-card p-7 space-y-3.5 group">
            <span className="text-xs font-mono font-semibold text-emerald-400">03</span>
            <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">Key Moments & Chapter Navigation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Identifies key topics across video timelines and generates timestamp markers so users can navigate hour-long recordings efficiently.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS WORKFLOW */}
      <section id="workflow" className="py-20 px-6 bg-[#0E111B] border-y border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto space-y-12">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold tracking-wider text-cyan-400 uppercase">Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Four Steps to Full Intelligence</h2>
            <p className="text-xs sm:text-sm text-slate-400">Streamlined processing pipeline from upload to instant export.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="surface-card p-5 space-y-2">
              <span className="text-[10px] font-mono font-semibold text-cyan-400">STEP 01</span>
              <h3 className="text-xs font-semibold text-white">Video Selection</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Upload MP4, MOV, AVI, WEBM, MKV files up to 500 MB or paste any online video link.</p>
            </div>

            <div className="surface-card p-5 space-y-2">
              <span className="text-[10px] font-mono font-semibold text-cyan-400">STEP 02</span>
              <h3 className="text-xs font-semibold text-white">Audio Extraction</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Audio track is extracted seamlessly and preprocessed for high-fidelity speech recognition.</p>
            </div>

            <div className="surface-card p-5 space-y-2">
              <span className="text-[10px] font-mono font-semibold text-cyan-400">STEP 03</span>
              <h3 className="text-xs font-semibold text-white">AI Analysis & STT</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Transcripts, executive summaries, keywords, and key moments are synthesized.</p>
            </div>

            <div className="surface-card p-5 space-y-2">
              <span className="text-[10px] font-mono font-semibold text-cyan-400">STEP 04</span>
              <h3 className="text-xs font-semibold text-white">Review & Export</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">Interactive timestamp seek, live transcript editor, and instant TXT / JSON export.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ROLE ACCESS OVERVIEW */}
      <section id="roles" className="py-20 px-6 max-w-[1400px] mx-auto space-y-12">
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-semibold tracking-wider text-indigo-400 uppercase">Access Matrix</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Role-Based Workspaces</h2>
          <p className="text-xs sm:text-sm text-slate-400">Tailored permissions and features for every member of your organization.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="surface-card p-6 space-y-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Content Creator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Upload media files, run AI processing pipelines, inspect insights, and manage video libraries.</p>
          </div>

          <div className="surface-card p-6 space-y-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Learner</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Search transcripts, jump to timestamps, read summaries, and bookmark key sections.</p>
          </div>

          <div className="surface-card p-6 space-y-2.5">
            <div className="w-2 h-2 rounded-full bg-indigo-300"></div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Educator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Upload lecture recordings, edit transcripts, and export structured summaries for students.</p>
          </div>

          <div className="surface-card p-6 space-y-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Administrator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Full platform access, system metrics monitoring, and multi-user management.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B0D14] text-white py-10 px-6 border-t border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">ClipMind AI</span>
            <span className="text-slate-500 font-mono text-[10px]">• Video Intelligence Platform</span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
