"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { videosApi, analyticsApi } from "../api/client";

const renderFormattedDetailedSummary = (text) => {
  if (!text || !text.trim()) {
    return <p className="text-xs text-slate-400 italic">No detailed summary available.</p>;
  }

  // Split content by paragraphs or section breaks
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());

  return (
    <div className="space-y-3.5">
      {blocks.map((block, bIdx) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;

        const firstLine = lines[0];
        // Check if first line is a heading: **Header**: or ### Header or Header: or **Header**
        const isHeader =
          /^(\*\*|###|\#\#)(.+?)(\*\*|:)?$/.test(firstLine) ||
          (firstLine.endsWith(":") && lines.length > 1 && firstLine.length < 75) ||
          (/^([A-Z0-9\s,&/–-]+):$/.test(firstLine) && firstLine.length < 75);

        if (isHeader) {
          const cleanHeading = firstLine
            .replace(/^(\*\*|###|\#\#)\s*/, "")
            .replace(/\s*(\*\*|:)$/, "")
            .replace(/:$/, "")
            .trim();
          const contentLines = lines.slice(1);

          return (
            <div key={bIdx} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)] shrink-0"></span>
                <h5 className="text-xs font-bold text-purple-200 tracking-wide">{cleanHeading}</h5>
              </div>
              {contentLines.length > 0 && (
                <div className="pl-3 space-y-1 border-l border-purple-500/25 ml-0.5">
                  {contentLines.map((line, lIdx) => {
                    const isBullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ");
                    if (isBullet) {
                      const bulletContent = line.replace(/^[-*•]\s*/, "").trim();
                      return (
                        <div key={lIdx} className="text-xs text-slate-200 leading-relaxed flex items-start gap-1.5">
                          <span className="text-purple-400 font-bold text-xs mt-0.5">•</span>
                          <span>{bulletContent}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={lIdx} className="text-xs text-slate-200 leading-relaxed">
                        {line}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Regular paragraph or bullet list without separate header
        return (
          <div key={bIdx} className="space-y-1">
            {lines.map((line, lIdx) => {
              const isBullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ");
              if (isBullet) {
                const bulletContent = line.replace(/^[-*•]\s*/, "").trim();
                return (
                  <div key={lIdx} className="text-xs text-slate-200 leading-relaxed flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold text-xs mt-0.5">•</span>
                    <span>{bulletContent}</span>
                  </div>
                );
              }
              return (
                <p key={lIdx} className="text-xs text-slate-200 leading-relaxed">
                  {line}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("library"); // 'library', 'details', 'analytics'
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Upload Form State
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMode, setUploadMode] = useState("file"); // "file" or "url"
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Processing State
  const [processingId, setProcessingId] = useState(null);
  const [processMsg, setProcessMsg] = useState("");

  // Video Collection Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");

  // Transcript Editing & Search
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscriptText, setEditedTranscriptText] = useState("");
  const [transcriptSearch, setTranscriptSearch] = useState("");

  // Bookmarking
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Analytics Dashboard Interactive State
  const [analyticsReportSearch, setAnalyticsReportSearch] = useState("");
  const [selectedTimelineVideoId, setSelectedTimelineVideoId] = useState(null);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState(null);

  // Resizable Workstation Columns State (Default: Left 25%, Center 50% [wider video playback], Right 25%)
  const [colWidths, setColWidths] = useState({ left: 25, center: 50, right: 25 });
  const [videoError, setVideoError] = useState(false);
  const isDraggingRef = useRef(null);
  const startXRef = useRef(0);
  const startWidthsRef = useRef(colWidths);

  const handleMouseDownDivider = (divider, e) => {
    e.preventDefault();
    isDraggingRef.current = divider;
    startXRef.current = e.clientX;
    startWidthsRef.current = { ...colWidths };

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvent.clientX - startXRef.current;
      const rowContainer = document.getElementById("workstation-row-1");
      const containerWidth = rowContainer ? rowContainer.offsetWidth : 1200;
      const deltaPct = (deltaX / containerWidth) * 100;

      if (isDraggingRef.current === "left") {
        const newLeft = Math.min(Math.max(15, startWidthsRef.current.left + deltaPct), 45);
        const newCenter = Math.min(Math.max(25, startWidthsRef.current.center - deltaPct), 65);
        setColWidths({
          left: newLeft,
          center: newCenter,
          right: 100 - newLeft - newCenter,
        });
      } else if (isDraggingRef.current === "right") {
        const newCenter = Math.min(Math.max(25, startWidthsRef.current.center + deltaPct), 65);
        const newRight = Math.min(Math.max(15, startWidthsRef.current.right - deltaPct), 45);
        setColWidths({
          left: 100 - newCenter - newRight,
          center: newCenter,
          right: newRight,
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Video Player & References
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedVideoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Keep selectedVideoRef synchronized with selectedVideo state
  useEffect(() => {
    selectedVideoRef.current = selectedVideo;
  }, [selectedVideo]);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [adminUserStats, setAdminUserStats] = useState([]);

  const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm", ".mkv"];

  const fetchVideos = async (targetVideoId = null) => {
    setLoadingVideos(true);
    try {
      const data = await videosApi.listVideos();
      setVideos(data);
      const currentTargetId = targetVideoId !== undefined && targetVideoId !== null
        ? targetVideoId
        : selectedVideoRef.current?.id;
      if (currentTargetId) {
        const updated = data.find((v) => v.id === currentTargetId);
        if (updated) {
          setSelectedVideo(updated);
          selectedVideoRef.current = updated;
          setEditedTranscriptText(updated.transcript_text || "");
        }
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const stats = await analyticsApi.getDashboardStats();
      setAnalytics(stats);
      if (user?.role === "administrator") {
        const users = await analyticsApi.getAdminUserStats();
        setAdminUserStats(users);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  // Bookmarks & RBAC State
  const [bookmarks, setBookmarks] = useState([]);
  const [adminJobs, setAdminJobs] = useState([]);
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState(null);
  const [learnerViewMode, setLearnerViewMode] = useState("library"); // "library" or "bookmarks"

  const fetchBookmarks = async () => {
    try {
      const data = await videosApi.getMyBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    }
  };

  const fetchAdminJobs = async () => {
    if (user?.role === "administrator") {
      try {
        const jobs = await analyticsApi.getAdminJobs();
        setAdminJobs(jobs);
      } catch (err) {
        console.error("Failed to fetch admin jobs:", err);
      }
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserRoleId(userId);
    try {
      await analyticsApi.updateUserRole(userId, newRole);
      await fetchAnalytics();
      alert("User role updated successfully!");
    } catch (err) {
      alert("Failed to update user role: " + (err.response?.data?.detail || err.message));
    } finally {
      setUpdatingUserRoleId(null);
    }
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    try {
      await videosApi.deleteBookmark(bookmarkId);
      await fetchBookmarks();
    } catch (err) {
      alert("Failed to remove bookmark: " + err.message);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchAnalytics();
    fetchBookmarks();
    fetchAdminJobs();
  }, [user]);

  useEffect(() => {
    setVideoError(false);
    setCurrentTime(0);
    const vid = videoRef.current;
    if (!vid) return;

    const handleTimeUpdate = () => {
      setCurrentTime(vid.currentTime);
    };

    vid.addEventListener("timeupdate", handleTimeUpdate);
    return () => vid.removeEventListener("timeupdate", handleTimeUpdate);
  }, [selectedVideo]);

  const handleFileSelect = (file) => {
    setUploadError("");
    setUploadSuccess(false);
    if (!file) return;

    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Unsupported format '${ext}'. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !title) {
      setUploadError("Please enter a title and select a video file.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const createdVideo = await videosApi.uploadVideo(title, selectedFile, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      setUploadSuccess(true);
      setTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchVideos(createdVideo?.id);
      fetchAnalytics();

      if (createdVideo && createdVideo.id) {
        handleProcessVideo(createdVideo.id);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlImportSubmit = async (e) => {
    e.preventDefault();
    if (!videoUrl) {
      setUploadError("Please enter a valid video URL link.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess(false);

    try {
      const createdVideo = await videosApi.importVideoUrl(videoUrl, title);
      setUploadSuccess(true);
      setVideoUrl("");
      setTitle("");
      await fetchVideos(createdVideo?.id);
      fetchAnalytics();

      if (createdVideo && createdVideo.id) {
        handleProcessVideo(createdVideo.id);
      }
    } catch (err) {
      console.error("URL import failed:", err);
      setUploadError(err.response?.data?.detail || "Failed to import video from URL.");
    } finally {
      setUploading(false);
    }
  };

  const handleProcessVideo = async (videoId) => {
    setProcessingId(videoId);
    setProcessMsg("Processing video with Whisper STT & Groq LLM...");
    try {
      const result = await videosApi.processVideo(videoId);
      selectedVideoRef.current = result;
      setSelectedVideo(result);
      setEditedTranscriptText(result.transcript_text || "");
      setActiveTab("details");
      setProcessMsg("Processing completed successfully.");
      await fetchVideos(result.id);
      fetchAnalytics();
    } catch (err) {
      console.error("Processing failed:", err);
      alert("AI Processing failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setProcessingId(null);
      setProcessMsg("");
    }
  };

  const handleSelectVideo = (video) => {
    selectedVideoRef.current = video;
    setSelectedVideo(video);
    setEditedTranscriptText(video.transcript_text || "");
    setActiveTab("details");
    setIsBookmarked(false);
  };

  const handleSaveTranscript = async () => {
    if (!selectedVideo) return;
    try {
      const updated = await videosApi.updateTranscript(selectedVideo.id, editedTranscriptText, selectedVideo.transcript_segments);
      selectedVideoRef.current = updated;
      setSelectedVideo(updated);
      setIsEditingTranscript(false);
    } catch (err) {
      alert("Failed to update transcript: " + err.message);
    }
  };

  const handleSeekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const handleExport = async (format) => {
    if (!selectedVideo) return;
    try {
      if (format === "json") {
        const data = await videosApi.exportVideo(selectedVideo.id, "json");
        const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonStr);
        downloadAnchor.setAttribute("download", `${selectedVideo.title}_analysis.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        const blob = await videosApi.exportVideo(selectedVideo.id, "txt");
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${selectedVideo.title}_summary.txt`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  const handleBookmark = async () => {
    if (!selectedVideo) return;
    try {
      await videosApi.bookmarkVideo(selectedVideo.id, "Saved to bookmarks");
      setIsBookmarked(true);
      fetchBookmarks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await videosApi.deleteVideo(videoId);
      if (selectedVideo?.id === videoId || selectedVideoRef.current?.id === videoId) {
        setSelectedVideo(null);
        selectedVideoRef.current = null;
      }
      await fetchVideos();
      fetchAnalytics();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "N/A";
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0m 0s";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const handleOpenVideoFromAnalytics = (videoId) => {
    const found = videos.find((v) => v.id === videoId);
    if (found) {
      handleSelectVideo(found);
    } else {
      videosApi.getVideo(videoId).then((v) => {
        handleSelectVideo(v);
      }).catch((err) => console.error("Failed to load video from analytics:", err));
    }
  };

  const filteredVideos = videos.filter((vid) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = vid.title?.toLowerCase().includes(q);
    const kwMatch = vid.keywords && vid.keywords.some((kw) => kw.toLowerCase().includes(q));
    const formatMatch = vid.format && vid.format.toLowerCase().includes(q);
    return titleMatch || kwMatch || formatMatch;
  });

  return (
    <div className="min-h-screen bg-[#050811] text-[#F8FAFC] font-sans antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Animated Caustic Ambient Glow Spheres */}
      <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-tr from-indigo-600/30 via-violet-600/25 to-cyan-500/25 rounded-full pointer-events-none -z-0 orb-float-1"></div>
      <div className="absolute top-[35%] -right-20 w-[650px] h-[650px] bg-fuchsia-600/20 rounded-full pointer-events-none -z-0 orb-float-2"></div>
      <div className="absolute bottom-10 -left-20 w-[600px] h-[600px] bg-cyan-500/20 rounded-full pointer-events-none -z-0 orb-float-3"></div>
      <div className="absolute bottom-[-10%] right-1/3 w-[700px] h-[500px] bg-purple-600/15 rounded-full pointer-events-none -z-0 orb-float-1"></div>
      
      {/* FROSTED CRYSTAL GLASS HEADER */}
      <header className="bg-[#080D1A]/70 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/[0.12] shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="w-full px-5 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-[0_0_20px_rgba(99,102,241,0.6)]">
              <div className="w-full h-full bg-[#070B14] rounded-[11px] flex items-center justify-center">
                <span className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">CM</span>
              </div>
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white block">ClipMind AI</span>
              <p className="text-[10px] text-cyan-400 font-mono font-semibold">
                {user?.role === "learner"
                  ? "Learner Portal"
                  : user?.role === "educator"
                  ? "Educator Studio"
                  : user?.role === "administrator"
                  ? "Admin Intelligence Hub"
                  : "Creator Studio"}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4 shrink-0">
            <nav className="flex items-center gap-1.5 glass-panel p-1 rounded-xl">
              <button
                onClick={() => {
                  setActiveTab("library");
                  setLearnerViewMode("library");
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === "library" && learnerViewMode === "library"
                    ? "glass-button-primary text-white shadow-sm font-bold"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {user?.role === "learner" ? `Lectures (${videos.length})` : `Videos (${videos.length})`}
              </button>

              {user?.role === "learner" && (
                <button
                  onClick={() => {
                    setActiveTab("library");
                    setLearnerViewMode("bookmarks");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab === "library" && learnerViewMode === "bookmarks"
                      ? "glass-button-primary text-white shadow-sm font-bold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  Bookmarks ({bookmarks.length})
                </button>
              )}

              {user?.role !== "learner" && (
                <button
                  onClick={() => {
                    fetchAnalytics();
                    fetchAdminJobs();
                    setActiveTab("analytics");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab === "analytics"
                      ? "glass-button-primary text-white shadow-sm font-bold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {user?.role === "administrator" ? "Analytics & Admin" : "Analytics"}
                </button>
              )}

              {user?.role === "administrator" && (
                <button
                  onClick={() => {
                    fetchAnalytics();
                    fetchAdminJobs();
                    setActiveTab("analytics");
                    setTimeout(() => {
                      document.getElementById("admin-management")?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-200"
                >
                  Admin & Roles ⚡
                </button>
              )}
            </nav>

            <div className="flex items-center gap-3 border-l border-white/15 pl-4 text-xs">
              <div className="text-right hidden sm:block">
                <span className="block font-semibold text-white text-xs">{user?.name}</span>
                <span className="inline-block px-2 py-0.5 text-[9px] font-mono font-bold text-indigo-300 glass-badge rounded uppercase">
                  {user?.role?.replace("_", " ")}
                </span>
              </div>

              <button
                onClick={logout}
                className="glass-button-secondary px-3 py-1.5 rounded-lg text-xs font-semibold"
              >
                Logout
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* PROCESSING NOTIFICATION BAR */}
      {processMsg && (
        <div className="bg-indigo-600/85 backdrop-blur-md text-white px-4 py-2 text-center text-xs font-mono font-semibold shadow-[0_0_25px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 border-b border-indigo-400/40 relative z-40">
          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping"></span>
          {processMsg}
        </div>
      )}

      {/* MAIN STUDIO CONTAINER */}
      <main className="w-full px-3 sm:px-5 py-4 space-y-5 relative z-10">

        {/* TAB 1: COLLECTION & UPLOAD */}
        {activeTab === "library" && (
          <div className="space-y-8">

            {/* Upload Area */}
            {user?.role !== "learner" ? (
              <div className="glass-card p-7 rounded-2xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">Upload & Process Media</h2>
                    <p className="text-xs text-slate-400 mt-1">Upload a local video file or import directly from an online video link.</p>
                  </div>

                  <div className="flex items-center gap-1 glass-panel p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setUploadMode("file")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        uploadMode === "file" ? "glass-button-primary text-white" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("url")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        uploadMode === "url" ? "glass-button-primary text-white" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      Import Video URL
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium backdrop-blur-md">
                    {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium backdrop-blur-md">
                    Video imported successfully! Click "Run AI Processing" on the video card below if not processing automatically.
                  </div>
                )}

                {uploadMode === "url" ? (
                  <form onSubmit={handleUrlImportSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Online Video URL Link</label>
                      <input
                        type="url"
                        required
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Paste online video URL (e.g. YouTube, Vimeo, or direct .mp4 link)..."
                        className="w-full px-4 py-3 glass-input rounded-xl text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Video Title (Optional)</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Custom video title (leave empty to auto-extract from video link)"
                        className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || !videoUrl}
                      className="w-full py-3 glass-button-primary text-white font-bold text-xs rounded-xl uppercase tracking-wider disabled:opacity-40"
                    >
                      {uploading ? "Downloading & Processing Online Video..." : "Import & Process Video Link"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleUploadSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Video Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter video title"
                        className="w-full px-4 py-2.5 glass-input rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Media File</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".mp4,.mov,.avi,.webm,.mkv"
                        onChange={handleFileChange}
                        className="w-full text-xs text-slate-300 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-lg file:border file:border-indigo-400/30 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-200 hover:file:bg-indigo-500/40 cursor-pointer glass-input rounded-xl p-1"
                      />
                    </div>
                  </div>

                  {/* Glass Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                      isDragOver ? "border-indigo-400 bg-indigo-500/20 scale-[0.99] shadow-[0_0_25px_rgba(99,102,241,0.3)]" : "border-white/15 bg-white/[0.02] hover:border-indigo-400/60 hover:bg-white/[0.04]"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {selectedFile ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-indigo-300 block">{selectedFile.name}</span>
                        <span className="text-[11px] text-cyan-400 font-mono block">{formatBytes(selectedFile.size)}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white block">Drag and drop video file here, or click to browse</span>
                        <span className="text-[11px] text-slate-400 block">MP4, MOV, AVI, WEBM, MKV (Maximum size: 500 MB)</span>
                      </div>
                    )}
                  </div>

                  {uploading && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-300 font-mono">
                        <span>Uploading File...</span>
                        <span className="text-cyan-400 font-bold">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-white/10">
                        <div
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 h-2 rounded-full transition-all duration-200 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploading || !selectedFile || !title}
                    className="w-full py-3 glass-button-primary text-white font-bold text-xs rounded-xl uppercase tracking-wider disabled:opacity-40"
                  >
                    {uploading ? `Uploading (${uploadProgress}%)...` : "Upload Media File"}
                  </button>
                </form>
                )}
              </div>
            ) : (
              <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Learner Study Portal</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Browse educational lectures, search transcripts, and study AI-extracted summaries & chapters.</p>
                </div>

                <div className="flex items-center gap-2 glass-panel p-1 rounded-xl">
                  <button
                    onClick={() => setLearnerViewMode("library")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      learnerViewMode === "library" ? "glass-button-primary text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All Lectures ({videos.length})
                  </button>
                  <button
                    onClick={() => setLearnerViewMode("bookmarks")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      learnerViewMode === "bookmarks" ? "glass-button-primary text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    My Bookmarks ({bookmarks.length})
                  </button>
                </div>
              </div>
            )}

            {/* Learner Bookmarks View */}
            {user?.role === "learner" && learnerViewMode === "bookmarks" ? (
              <div className="glass-card p-6 sm:p-7 rounded-2xl space-y-6">
                <div className="border-b border-white/[0.08] pb-4">
                  <h2 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                    My Bookmarked Lectures & Highlights ({bookmarks.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Your saved study materials. Click "Study in Workstation" to jump directly into playback, notes, and key moments.
                  </p>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-white/10 rounded-2xl space-y-2">
                    <p className="font-bold text-white">No bookmarked lectures yet.</p>
                    <p className="text-slate-400 text-xs">Click "Bookmark" while studying any video in the workstation to save it here!</p>
                    <button
                      onClick={() => setLearnerViewMode("library")}
                      className="text-xs font-bold text-indigo-400 hover:underline pt-2 inline-block"
                    >
                      Browse All Lectures →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.bookmark_id}
                        className="glass-card glass-card-hover p-5 rounded-xl flex flex-col justify-between space-y-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 glass-badge-emerald text-[10px] font-mono font-bold rounded">
                              SAVED
                            </span>
                            <button
                              onClick={() => handleRemoveBookmark(bm.bookmark_id)}
                              className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                              title="Remove bookmark"
                            >
                              ✕
                            </button>
                          </div>
                          <h3 className="font-bold text-sm text-white mt-2 group-hover:text-indigo-300 transition line-clamp-1">
                            {bm.video?.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {bm.video?.short_summary || "No summary available."}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                          <span className="font-mono text-[10px] text-cyan-300">
                            {formatDuration(bm.video?.duration_seconds)}
                          </span>
                          <button
                            onClick={() => handleOpenVideoFromAnalytics(bm.video?.id)}
                            className="px-3 py-1.5 glass-button-primary text-white text-xs font-bold rounded-lg uppercase tracking-wider"
                          >
                            Study Now ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-6 sm:p-7 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 relative z-10">
                <div>
                  <h2 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                    Processed Video Repository ({filteredVideos.length}{searchQuery && ` of ${videos.length}`})
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Select a video item to access transcript, summaries, and key moments.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Field */}
                  <div className="relative flex-1 sm:w-72">
                    <input
                      type="text"
                      placeholder="Search videos by title or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 glass-input rounded-xl text-xs"
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={fetchVideos}
                    className="glass-button-primary px-4 py-2 text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    Refresh Directory
                  </button>
                </div>
              </div>

              {loadingVideos ? (
                <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading video collection...</div>
              ) : filteredVideos.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-white/10 rounded-2xl space-y-2">
                  <p className="font-bold text-white">No matching videos found.</p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-indigo-400 font-semibold hover:underline"
                    >
                      Clear search filter "{searchQuery}"
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => {
                        if (vid.status === "completed") {
                          handleSelectVideo(vid);
                        }
                      }}
                      className={`relative overflow-hidden glass-card glass-card-hover rounded-2xl p-5 group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                        vid.status === "completed" ? "cursor-pointer" : ""
                      }`}
                    >
                      {/* Left Gradient Strip Accent */}
                      <div className="w-1.5 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-cyan-400 absolute left-0 top-0 bottom-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 flex-1 min-w-0 pl-2">
                        {/* Media Box / Vector Play Icon Placeholder */}
                        <div className="w-full sm:w-40 h-24 bg-[#050811] rounded-xl shrink-0 relative flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-[1.02] transition-transform duration-300 overflow-hidden">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-4 h-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 glass-panel text-cyan-300 font-mono text-[10px] font-bold rounded border border-white/10">
                            {formatDuration(vid.duration_seconds)}
                          </span>
                        </div>

                        {/* Title & Info */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition leading-snug truncate">
                              {vid.title}
                            </h3>
                            {vid.status !== "completed" && (
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono uppercase tracking-wider shrink-0 border ${
                                  vid.status === "processing"
                                    ? "glass-badge-amber font-bold animate-pulse"
                                    : "glass-badge"
                                }`}
                              >
                                {vid.status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                            <span>File Size: <strong className="text-white">{formatBytes(vid.file_size_bytes)}</strong></span>
                            <span>•</span>
                            <span>Uploaded: <strong className="text-slate-300">{new Date(vid.created_at).toLocaleDateString()}</strong></span>
                          </div>

                          {/* Keywords */}
                          {vid.keywords && vid.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {vid.keywords.map((kw, i) => (
                                <span key={i} className="px-2.5 py-0.5 glass-badge text-[10px] font-mono rounded-lg font-bold">
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.08]">
                        {vid.status !== "completed" && (
                          (user?.role === "administrator" || user?.role === "content_creator" || user?.role === "educator" || vid.uploaded_by === user?.id) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcessVideo(vid.id);
                              }}
                              disabled={processingId === vid.id}
                              className="px-5 py-2.5 glass-button-primary disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                            >
                              {processingId === vid.id ? "Processing..." : "Run AI Processing"}
                            </button>
                          ) : (
                            <span className="px-4 py-2 glass-panel text-slate-400 rounded-xl text-xs font-mono italic">
                              Analysis Pending
                            </span>
                          )
                        )}

                        {(user?.role === "administrator" || vid.uploaded_by === user?.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(vid.id);
                            }}
                            className="px-3.5 py-2.5 glass-button-secondary hover:border-rose-500/40 hover:text-rose-400 rounded-xl text-xs font-medium"
                            title="Delete Video"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* TAB 2: SELECTED VIDEO WORKSTATION */}
        {activeTab === "details" && selectedVideo && (
          <div className="space-y-4">

            {/* Header bar */}
            <div className="glass-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  onClick={() => setActiveTab("library")}
                  className="text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline mb-1 block font-bold"
                >
                  &lt; Back to Video Collection
                </button>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white">{selectedVideo.title}</h2>
                  {selectedVideo.status !== "completed" && (
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider glass-badge-amber font-bold">
                      {selectedVideo.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(user?.role === "administrator" ||
                  user?.role === "content_creator" ||
                  user?.role === "educator" ||
                  selectedVideo.uploaded_by === user?.id) && (
                  <button
                    onClick={() => handleProcessVideo(selectedVideo.id)}
                    disabled={processingId === selectedVideo.id}
                    className="px-3.5 py-1.5 glass-button-primary text-white rounded-lg text-xs font-bold disabled:opacity-40 uppercase tracking-wider"
                  >
                    {processingId === selectedVideo.id ? "Processing..." : "Re-run AI Processing"}
                  </button>
                )}

                <button
                  onClick={handleBookmark}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isBookmarked ? "glass-badge text-indigo-300 font-bold" : "glass-button-secondary text-slate-300"
                  }`}
                >
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </button>

                <button
                  onClick={() => handleExport("txt")}
                  className="px-3 py-1.5 glass-button-secondary rounded-lg text-xs font-semibold"
                >
                  Export TXT
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="px-3 py-1.5 glass-button-secondary rounded-lg text-xs font-semibold"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Workstation 2-Row Compact Grid */}
            <div className="space-y-4">

              {/* ROW 1: Resizable 3-Column Workstation with Equal Height Cards */}
              <div id="workstation-row-1" className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-0 relative lg:h-[480px]">

                {/* Column 1: Key Moments & Highlights */}
                <div
                  style={{ width: `${colWidths.left}%` }}
                  className="w-full lg:w-auto glass-card p-4 rounded-xl space-y-3 flex flex-col h-full min-w-[200px]"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 shrink-0">
                    <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">Key Moments</h3>
                    <span className="text-[10px] text-slate-400 font-mono">Select timestamp</span>
                  </div>

                  {selectedVideo.key_moments && selectedVideo.key_moments.length > 0 ? (
                    <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 min-h-0">
                      {selectedVideo.key_moments.map((km, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSeekTo(km.start_seconds)}
                          className="p-3 glass-panel hover:bg-indigo-500/15 hover:border-indigo-400/40 rounded-lg cursor-pointer transition group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-white group-hover:text-indigo-300 transition line-clamp-1">
                              {km.title}
                            </span>
                            <span className="px-2 py-0.5 glass-badge text-cyan-300 font-mono text-[10px] font-bold rounded shrink-0">
                              {km.timestamp}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{km.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No key moments available.</p>
                  )}
                </div>

                {/* Resizable Drag Handle 1 */}
                <div
                  onMouseDown={(e) => handleMouseDownDivider("left", e)}
                  className="hidden lg:flex w-3 hover:w-4 cursor-col-resize bg-transparent hover:bg-indigo-500/20 rounded transition-all items-center justify-center group shrink-0 select-none z-10 h-full"
                  title="Drag left or right to resize columns"
                >
                  <div className="w-1 h-12 bg-white/20 group-hover:bg-indigo-400 rounded-full transition shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                </div>

                {/* Column 2: Video Playback */}
                <div
                  style={{ width: `${colWidths.center}%` }}
                  className="w-full lg:w-auto glass-panel-deep p-3 rounded-xl border border-white/[0.08] space-y-2 flex flex-col h-full justify-between min-w-[300px]"
                >
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Video Playback</h3>
                  </div>

                  <div className="bg-black/90 rounded-lg overflow-hidden flex-1 min-h-0 flex items-center justify-center border border-white/10 shadow-inner relative">
                    {videoError ? (
                      <div className="p-6 text-center flex flex-col items-center justify-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
                          ⚠️
                        </div>
                        <div className="text-xs font-semibold text-slate-200">
                          Video Playback Error
                        </div>
                        <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                          Unable to stream this video file from the server.
                        </p>
                        <a
                          href={videosApi.getVideoFileUrl(selectedVideo.id, selectedVideo)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-mono inline-block pt-1"
                        >
                          Click here to open video directly in new tab ↗
                        </a>
                      </div>
                    ) : (
                      <video
                        key={selectedVideo.id}
                        ref={videoRef}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain rounded-lg"
                        src={videosApi.getVideoFileUrl(selectedVideo.id, selectedVideo)}
                        onError={(e) => {
                          console.error("Video load error:", videoRef.current?.error, videoRef.current?.src);
                          setVideoError(true);
                        }}
                        onLoadedData={() => setVideoError(false)}
                      />
                    )}
                  </div>
                </div>

                {/* Resizable Drag Handle 2 */}
                <div
                  onMouseDown={(e) => handleMouseDownDivider("right", e)}
                  className="hidden lg:flex w-3 hover:w-4 cursor-col-resize bg-transparent hover:bg-indigo-500/20 rounded transition-all items-center justify-center group shrink-0 select-none z-10 h-full"
                  title="Drag left or right to resize columns"
                >
                  <div className="w-1 h-12 bg-white/20 group-hover:bg-indigo-400 rounded-full transition shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                </div>

                {/* Column 3: Speech-to-Text Transcript */}
                <div
                  style={{ width: `${colWidths.right}%` }}
                  className="w-full lg:w-auto glass-card p-4 rounded-xl space-y-3 flex flex-col h-full min-w-[200px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5 shrink-0">
                    <h3 className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">Transcript</h3>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search transcript..."
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        className="px-2.5 py-1 glass-input rounded-lg text-xs w-32 sm:w-40"
                      />

                      {(user?.role === "educator" || user?.role === "content_creator" || user?.role === "administrator") && (
                        <button
                          onClick={() => {
                            if (isEditingTranscript) {
                              handleSaveTranscript();
                            } else {
                              setIsEditingTranscript(true);
                            }
                          }}
                          className="px-2.5 py-1 glass-button-secondary text-white rounded-lg text-xs font-bold uppercase tracking-wider shrink-0"
                        >
                          {isEditingTranscript ? "Save" : "Edit"}
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditingTranscript ? (
                    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col">
                      <textarea
                        rows={10}
                        value={editedTranscriptText}
                        onChange={(e) => setEditedTranscriptText(e.target.value)}
                        className="w-full p-3 glass-input rounded-lg text-xs font-mono leading-relaxed flex-1 min-h-0"
                      />
                      <div className="flex justify-end gap-2 shrink-0">
                        <button
                          onClick={() => setIsEditingTranscript(false)}
                          className="px-3 py-1 glass-button-secondary text-xs rounded-lg font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTranscript}
                          className="px-3.5 py-1 glass-button-primary text-white text-xs rounded-lg font-bold uppercase tracking-wider"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto space-y-2 pr-1 flex-1 min-h-0">
                      {selectedVideo.transcript_segments && selectedVideo.transcript_segments.length > 0 ? (
                        selectedVideo.transcript_segments
                          .filter((seg) => !transcriptSearch || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                          .map((seg, idx) => {
                            const isActive = currentTime >= seg.start && currentTime <= (seg.end || seg.start + 5);
                            return (
                              <div
                                key={idx}
                                onClick={() => handleSeekTo(seg.start)}
                                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex gap-2 text-xs ${
                                  isActive
                                    ? "bg-indigo-500/20 border-l-4 border-indigo-400 border-indigo-400/60 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                    : "glass-panel hover:bg-white/[0.06] text-slate-300 border-white/[0.06]"
                                }`}
                              >
                                <span className="font-mono text-[10px] font-bold text-cyan-400 shrink-0">
                                  {formatDuration(seg.start)}
                                </span>
                                <span className={`leading-relaxed ${isActive ? "text-white font-bold" : "text-slate-300"}`}>
                                  {seg.text}
                                </span>
                              </div>
                            );
                          })
                      ) : (
                        <div className="p-3 text-xs text-slate-400 font-mono glass-panel rounded-lg whitespace-pre-wrap leading-relaxed">
                          {selectedVideo.transcript_text || "No transcript generated for this video."}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* ROW 2: Full Width AI Executive Summary & Insights */}
              <div className="glass-card p-5 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                    <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">AI Executive Summary & Insights</h3>
                  </div>

                  {selectedVideo.keywords && selectedVideo.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedVideo.keywords.map((kw, i) => {
                        const cleanKw = String(kw).startsWith("#") ? String(kw) : `#${kw}`;
                        return (
                          <span key={i} className="px-2.5 py-0.5 glass-badge text-[10px] font-mono font-bold rounded-md hover:border-indigo-400/40 transition shadow-sm">
                            {cleanKw}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Short Summary */}
                  <div className="glass-panel p-4 rounded-lg space-y-2 border border-indigo-500/20 bg-indigo-950/10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                      <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Executive Short Summary</h4>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-normal">{selectedVideo.short_summary || "No short summary available."}</p>
                  </div>

                  {/* Detailed Summary */}
                  <div className="glass-panel p-4 rounded-lg space-y-2 border border-purple-500/20 bg-purple-950/10 max-h-[380px] overflow-y-auto pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                      <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider">Detailed Content Breakdown</h4>
                    </div>
                    {renderFormattedDetailedSummary(selectedVideo.detailed_summary)}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS DASHBOARD */}
        {activeTab === "analytics" && user?.role !== "learner" && (
          <div className="space-y-8">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  <h2 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                    Content Intelligence & Media Analytics
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cross-video aggregation answering what content has been processed, how it is consumed, and what AI insights were extracted.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {user?.role === "administrator" && (
                  <>
                    <button
                      onClick={() => document.getElementById("admin-management")?.scrollIntoView({ behavior: "smooth" })}
                      className="px-3 py-1.5 glass-panel hover:bg-indigo-500/20 text-indigo-300 rounded-xl text-xs font-mono font-bold border border-indigo-500/30 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>↓</span> Users & Roles
                    </button>
                    <button
                      onClick={() => document.getElementById("admin-jobs")?.scrollIntoView({ behavior: "smooth" })}
                      className="px-3 py-1.5 glass-panel hover:bg-purple-500/20 text-purple-300 rounded-xl text-xs font-mono font-bold border border-purple-500/30 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>↓</span> Jobs Queue
                    </button>
                  </>
                )}
                <button
                  onClick={fetchAnalytics}
                  className="glass-button-primary px-4 py-2 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* TOP SECTION: OVERVIEW METRICS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Videos */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Videos</span>
                <span className="text-3xl font-black text-white mt-1.5 block font-mono group-hover:text-indigo-300 transition">
                  {analytics?.total_videos || 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {analytics?.completed_videos || 0} completed • {analytics?.processing_videos || 0} queue
                </span>
              </div>

              {/* Card 2: Total Hours Analyzed */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-400 to-indigo-500 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Hours Processed</span>
                <span className="text-3xl font-black text-purple-300 mt-1.5 block font-mono group-hover:text-purple-200 transition">
                  {((analytics?.total_duration_minutes || 0) / 60.0).toFixed(1)}<span className="text-lg font-bold text-slate-400">h</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {analytics?.total_duration_minutes || 0} total minutes
                </span>
              </div>

              {/* Card 3: Transcripts Generated */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Transcripts Generated</span>
                <span className="text-3xl font-black text-emerald-400 mt-1.5 block font-mono group-hover:text-emerald-300 transition">
                  {analytics?.total_transcripts ?? analytics?.completed_videos ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Whisper STT speech-to-text
                </span>
              </div>

              {/* Card 4: Summaries Generated */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Summaries Generated</span>
                <span className="text-3xl font-black text-amber-400 mt-1.5 block font-mono group-hover:text-amber-300 transition">
                  {analytics?.total_summaries ?? analytics?.completed_videos ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Short & Executive Reports
                </span>
              </div>

              {/* Card 5: Key Moments Detected */}
              <div className="glass-card glass-card-hover p-5 rounded-2xl relative overflow-hidden group">
                <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Key Moments Detected</span>
                <span className="text-3xl font-black text-cyan-400 mt-1.5 block font-mono group-hover:text-cyan-300 transition">
                  {analytics?.total_key_moments ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Timestamped chapters
                </span>
              </div>
            </div>

            {/* TIER 1: VIDEO ANALYTICS & PROCESSING VELOCITY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left 7 cols: Weekly Velocity Bar Chart */}
              <div className="lg:col-span-7 glass-card p-6 rounded-2xl flex flex-col justify-between space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      Videos Processed Over Time
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Daily media volume throughput over the last 7 days</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-indigo-500 to-cyan-400 inline-block"></span>
                    <span>Completed</span>
                  </div>
                </div>

                {/* SVG/CSS Clean Responsive Bar Chart */}
                <div className="pt-4 pb-2">
                  {analytics?.weekly_timeline && analytics.weekly_timeline.length > 0 ? (
                    <div className="flex items-end justify-between gap-2 sm:gap-4 h-48 px-2 border-b border-white/10 pb-2">
                      {(() => {
                        const maxVal = Math.max(...analytics.weekly_timeline.map((d) => d.count), 1);
                        return analytics.weekly_timeline.map((day, idx) => {
                          const heightPct = day.count > 0 ? Math.max((day.count / maxVal) * 100, 16) : 6;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                              <span className="text-[10px] font-mono font-bold text-cyan-300 opacity-0 group-hover:opacity-100 transition duration-150">
                                {day.count}
                              </span>
                              <div className="w-full max-w-[42px] bg-white/[0.04] rounded-t-lg flex items-end h-full p-1 group-hover:bg-white/[0.08] transition">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t-md transition-all duration-500 shadow-md ${
                                    day.count > 0
                                      ? "bg-gradient-to-t from-indigo-600 via-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                                      : "bg-white/10"
                                  }`}
                                ></div>
                              </div>
                              <div className="text-center pt-1">
                                <span className="block text-[11px] font-bold text-slate-300 font-mono">{day.day}</span>
                                <span className="block text-[9px] text-slate-500 font-mono">{day.date.slice(5)}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-500 font-mono">
                      No processing timeline history available.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/[0.06] text-xs text-slate-400 font-mono">
                  <span>Weekly Volume: <strong className="text-white">{analytics?.weekly_timeline?.reduce((acc, d) => acc + d.count, 0) || 0} videos</strong></span>
                  <span>Pipeline Success: <strong className="text-emerald-400">{analytics?.success_rate || 100}%</strong></span>
                </div>
              </div>

              {/* Right 5 cols: Key Performance Stats & Efficiency */}
              <div className="lg:col-span-5 glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="border-b border-white/[0.08] pb-3">
                  <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Pipeline Health & Performance
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Reliability, speed, and cloud resource metrics</p>
                </div>

                <div className="space-y-3 flex-1 justify-center flex flex-col">
                  <div className="flex items-center justify-between p-3 glass-panel rounded-xl">
                    <span className="text-xs text-slate-300">Processing Success Rate</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {analytics?.success_rate || 100}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-panel rounded-xl">
                    <span className="text-xs text-slate-300">Successfully Processed</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {analytics?.completed_videos || 0} <span className="text-xs text-slate-400 font-normal">videos</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-panel rounded-xl">
                    <span className="text-xs text-slate-300">Active / Queued Jobs</span>
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {analytics?.processing_videos || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-panel rounded-xl">
                    <span className="text-xs text-slate-300">Average Video Duration</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">
                      {formatDuration(analytics?.avg_video_duration_seconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 glass-panel rounded-xl">
                    <span className="text-xs text-slate-300">Total Cloud Storage</span>
                    <span className="text-sm font-bold font-mono text-purple-300">
                      {analytics?.total_storage_mb || 0} MB
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>CDN Delivery: <strong className="text-cyan-400">Cloudinary H.264</strong></span>
                  <span>Whisper STT: <strong className="text-emerald-400">Operational</strong></span>
                </div>
              </div>
            </div>

            {/* TIER 2: AI CONTENT INSIGHTS ⭐ (Top Topics & Extraction Health) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left 6 cols: Top Topics & Keywords Cloud */}
              <div className="lg:col-span-6 glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400 text-xs">⭐</span>
                        <h3 className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
                          AI Content Insights: Top Topics
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Concepts and subject themes automatically extracted by Groq LLM</p>
                    </div>

                    {selectedTopicFilter && (
                      <button
                        onClick={() => setSelectedTopicFilter(null)}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/30"
                      >
                        Clear Filter ✕
                      </button>
                    )}
                  </div>

                  <div className="pt-4 flex flex-wrap gap-2">
                    {analytics?.top_keywords && analytics.top_keywords.length > 0 ? (
                      analytics.top_keywords.map((kw, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (selectedTopicFilter === kw.keyword) {
                              setSelectedTopicFilter(null);
                            } else {
                              setSelectedTopicFilter(kw.keyword);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono transition flex items-center gap-1.5 ${
                            selectedTopicFilter === kw.keyword
                              ? "bg-indigo-600 text-white font-bold border border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                              : "glass-panel hover:bg-indigo-500/20 text-slate-300 hover:text-white border border-white/10"
                          }`}
                        >
                          <span className="text-indigo-400 font-bold">#</span>
                          <span>{kw.keyword}</span>
                          <span className="ml-1 px-1.5 py-0.2 bg-white/10 rounded-full text-[10px] text-cyan-300 font-bold">
                            {kw.count}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-6">
                        No topic keywords extracted yet. Process videos with AI to build your knowledge map.
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic pt-2 border-t border-white/[0.06]">
                  Tip: Click any topic tag to filter the Video Summary Reports catalog below.
                </p>
              </div>

              {/* Right 6 cols: AI Extraction Coverage */}
              <div className="lg:col-span-6 glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="border-b border-white/[0.08] pb-3">
                  <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                    AI Extraction Coverage & Density
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">How much raw video content has been structured into actionable intelligence</p>
                </div>

                <div className="space-y-4 flex-1 justify-center flex flex-col">
                  {/* Metric 1: Transcripts */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Transcription Coverage</span>
                      <span className="text-emerald-400 font-bold">
                        {Math.round(((analytics?.total_transcripts || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((analytics?.total_transcripts || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 2: Summaries */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Executive Summarization Rate</span>
                      <span className="text-purple-300 font-bold">
                        {Math.round(((analytics?.total_summaries || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-400 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((analytics?.total_summaries || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 3: Chaptering */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Average Key Moments Density</span>
                      <span className="text-cyan-300 font-bold">
                        {((analytics?.total_key_moments || 0) / Math.max(analytics?.completed_videos || 1, 1)).toFixed(1)} moments / video
                      </span>
                    </div>
                    <div className="w-full bg-slate-900/80 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-400 h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.round((((analytics?.total_key_moments || 0) / Math.max(analytics?.completed_videos || 1, 1)) / 10) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06] text-[11px] text-slate-400 font-mono">
                  All extracted outputs are fully editable, exportable as JSON/TXT, and indexed.
                </div>
              </div>
            </div>

            {/* TIER 3: SUMMARY REPORTS (PROCESSED VIDEO CATALOG & DRILLDOWN) */}
            <div className="glass-card p-6 sm:p-7 rounded-2xl space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                    Summary Reports & Video Intelligence Catalog
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Multi-dimensional status breakdown per video. Click "Open in Studio" to inspect transcripts, playback, and full summaries.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      placeholder="Search reports by title..."
                      value={analyticsReportSearch}
                      onChange={(e) => setAnalyticsReportSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 glass-input rounded-xl text-xs"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {selectedTopicFilter && (
                <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl flex items-center justify-between text-xs text-indigo-200">
                  <span>Filtered by topic: <strong className="text-white">#{selectedTopicFilter}</strong></span>
                  <button onClick={() => setSelectedTopicFilter(null)} className="text-xs font-bold text-cyan-400 hover:underline">
                    Clear Filter
                  </button>
                </div>
              )}

              {(() => {
                const reports = (analytics?.video_reports || []).filter((r) => {
                  if (analyticsReportSearch.trim()) {
                    const q = analyticsReportSearch.toLowerCase().trim();
                    if (!r.title?.toLowerCase().includes(q)) return false;
                  }
                  if (selectedTopicFilter) {
                    if (!r.keywords || !r.keywords.some((k) => k.toLowerCase() === selectedTopicFilter.toLowerCase())) {
                      return false;
                    }
                  }
                  return true;
                });

                if (reports.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs font-mono border border-dashed border-white/10 rounded-xl">
                      No video reports match the selected filters.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-200">
                      <thead className="glass-panel text-slate-400 uppercase text-[10px] font-semibold">
                        <tr>
                          <th className="py-3 px-4 rounded-l-lg">Video Title</th>
                          <th className="py-3 px-4">Duration</th>
                          <th className="py-3 px-4">Transcript</th>
                          <th className="py-3 px-4">AI Summary</th>
                          <th className="py-3 px-4">Key Moments</th>
                          <th className="py-3 px-4">Topics Detected</th>
                          <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {reports.map((rep) => (
                          <tr key={rep.id} className="hover:bg-white/[0.04] transition group">
                            <td className="py-3.5 px-4 font-bold text-white max-w-xs">
                              <span className="line-clamp-1 group-hover:text-indigo-300 transition">{rep.title}</span>
                              <span className="block text-[10px] text-slate-500 font-mono font-normal">
                                {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : ""}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-cyan-300">
                              {formatDuration(rep.duration_seconds)}
                            </td>
                            <td className="py-3.5 px-4">
                              {rep.has_transcript ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                                  ✓ Generated
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {rep.has_summary ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 font-bold">
                                  ✓ Generated
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              {rep.key_moments_count > 0 ? (
                                <button
                                  onClick={() => setSelectedTimelineVideoId(rep.id)}
                                  className="text-cyan-400 hover:text-cyan-300 underline font-bold"
                                  title="Inspect key moments timeline"
                                >
                                  {rep.key_moments_count} moments ↗
                                </button>
                              ) : (
                                <span className="text-slate-500">0 moments</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {rep.keywords && rep.keywords.length > 0 ? (
                                  rep.keywords.map((kw, ki) => (
                                    <span key={ki} className="text-[9px] font-mono px-1.5 py-0.5 glass-badge rounded text-indigo-300 font-bold">
                                      #{kw}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">None</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleOpenVideoFromAnalytics(rep.id)}
                                className="px-3 py-1.5 glass-button-primary text-white text-xs rounded-xl font-bold uppercase tracking-wider whitespace-nowrap inline-flex items-center gap-1"
                              >
                                <span>Open Studio</span>
                                <span className="text-[10px]">↗</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* TIER 4: KEY MOMENTS TIMELINE VISUALIZER */}
            {(() => {
              const currentVideo =
                (analytics?.video_reports || []).find((v) => v.id === selectedTimelineVideoId) ||
                (analytics?.video_reports || []).find((v) => v.key_moments_count > 0) ||
                (analytics?.video_reports || [])[0];

              const fullVideo = videos.find((v) => v.id === currentVideo?.id) || currentVideo;
              const moments = fullVideo?.key_moments || currentVideo?.key_moments_preview || [];
              const durationSec = fullVideo?.duration_seconds || 1;

              if (!currentVideo) return null;

              return (
                <div className="glass-card p-6 sm:p-7 rounded-2xl space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30 font-bold">
                          TIMELINE INSPECTOR
                        </span>
                        <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          {currentVideo.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Detected timestamp highlights and chapters plotted across video duration ({formatDuration(currentVideo.duration_seconds)}).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={currentVideo.id}
                        onChange={(e) => setSelectedTimelineVideoId(e.target.value)}
                        className="glass-input px-3 py-1.5 rounded-xl text-xs font-mono bg-[#070B14] text-white border border-white/10"
                      >
                        {(analytics?.video_reports || []).map((v) => (
                          <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                            {v.title} ({v.key_moments_count} moments)
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleOpenVideoFromAnalytics(currentVideo.id)}
                        className="px-3.5 py-1.5 glass-button-primary text-white text-xs font-bold rounded-xl whitespace-nowrap"
                      >
                        Play in Workstation ↗
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Timeline Bar */}
                  <div className="space-y-4 pt-2">
                    <div className="relative pt-6 pb-2 px-4">
                      {/* Base Track */}
                      <div className="h-2 w-full bg-slate-800/90 rounded-full relative overflow-visible border border-white/10">
                        {/* Glow Gradient Accent */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 opacity-60 rounded-full"></div>

                        {/* Milestone Pins */}
                        {moments.map((km, idx) => {
                          const s = km.start_seconds || 0;
                          const pct = Math.min(Math.max((s / durationSec) * 100, 3), 97);
                          return (
                            <div
                              key={idx}
                              style={{ left: `${pct}%` }}
                              className="absolute -top-3.5 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
                              title={`${km.timestamp} - ${km.title}`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-[#070B14] shadow-[0_0_10px_rgba(6,182,212,0.8)] group-hover:scale-125 transition-transform"></span>
                              <span className="mt-4 text-[9px] font-mono font-bold text-cyan-300 opacity-80 group-hover:opacity-100 whitespace-nowrap">
                                {km.timestamp}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Start / End Labels */}
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-3">
                        <span>0:00 (Start)</span>
                        <span>{formatDuration(currentVideo.duration_seconds)} (End)</span>
                      </div>
                    </div>

                    {/* Moments Cards Grid */}
                    {moments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                        {moments.map((km, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleOpenVideoFromAnalytics(currentVideo.id)}
                            className="p-3.5 glass-panel hover:bg-indigo-500/15 hover:border-indigo-400/40 rounded-xl transition cursor-pointer group space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300 glass-badge rounded">
                                {km.timestamp}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">Chapter #{idx + 1}</span>
                            </div>
                            <h4 className="font-bold text-xs text-white group-hover:text-indigo-300 transition line-clamp-1">
                              {km.title}
                            </h4>
                            {km.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {km.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic text-center py-4">
                        No key moments have been generated for this video yet. Run AI processing in the Studio to auto-chapter.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TIER 5: ADMINISTRATOR USER MANAGEMENT & SYSTEM HEALTH */}
            {user?.role === "administrator" && (
              <div id="admin-management" className="glass-card p-6 sm:p-7 rounded-2xl space-y-5 scroll-mt-24">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      Administrator User & Resource Management
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      System-wide platform utilization, user access permissions, and storage quotas.
                    </p>
                  </div>

                  {analytics?.admin_metrics && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 glass-badge font-mono text-[11px] font-bold rounded-lg text-indigo-300">
                        {analytics.admin_metrics.total_users} Users Registered
                      </span>
                      <span className="px-3 py-1 glass-badge font-mono text-[11px] font-bold rounded-lg text-purple-300">
                        {analytics.admin_metrics.total_storage_mb} MB Allocated
                      </span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="glass-panel text-slate-400 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">User Name</th>
                        <th className="py-3 px-4">Email Address</th>
                        <th className="py-3 px-4">System Role</th>
                        <th className="py-3 px-4">Videos Uploaded</th>
                        <th className="py-3 px-4 rounded-r-lg">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {adminUserStats.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.04] transition">
                          <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                          <td className="py-3.5 px-4 text-slate-400">{u.email}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <select
                              value={u.role}
                              disabled={updatingUserRoleId === u.id || u.email === user?.email}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="glass-input px-2.5 py-1 rounded-lg text-xs font-mono bg-[#070B14] text-white border border-white/15 cursor-pointer disabled:opacity-50"
                              title={u.email === user?.email ? "Cannot modify your own administrator role" : "Change user role"}
                            >
                              <option value="content_creator" className="bg-[#0B1020] text-white">Content Creator</option>
                              <option value="educator" className="bg-[#0B1020] text-white">Educator</option>
                              <option value="learner" className="bg-[#0B1020] text-white">Learner</option>
                              <option value="administrator" className="bg-[#0B1020] text-white">Administrator</option>
                            </select>
                            {updatingUserRoleId === u.id && (
                              <span className="ml-2 text-[10px] text-cyan-300 animate-pulse">Updating...</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">{u.videos_count}</td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px]">{new Date(u.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TIER 5B: ADMINISTRATOR AI PROCESSING JOBS QUEUE */}
            {user?.role === "administrator" && (
              <div id="admin-jobs" className="glass-card p-6 sm:p-7 rounded-2xl space-y-5 scroll-mt-24">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                      AI Video Processing Jobs Queue
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Monitor background Whisper STT, Groq LLM summarization, and key-moment extraction jobs across the entire platform.
                    </p>
                  </div>
                  <button
                    onClick={fetchAdminJobs}
                    className="glass-button-secondary px-3.5 py-1.5 rounded-lg text-xs font-mono shrink-0"
                  >
                    Refresh Jobs
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="glass-panel text-slate-400 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Job / Media</th>
                        <th className="py-3 px-4">Uploaded By</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">STT Transcript</th>
                        <th className="py-3 px-4">AI Summary</th>
                        <th className="py-3 px-4 rounded-r-lg">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {adminJobs && adminJobs.length > 0 ? (
                        adminJobs.map((j) => (
                          <tr key={j.id} className="hover:bg-white/[0.04] transition">
                            <td className="py-3 px-4 font-bold text-white max-w-xs truncate">{j.title}</td>
                            <td className="py-3 px-4 text-slate-300">
                              {j.uploader_name}{" "}
                              <span className="text-[10px] text-slate-500 font-mono">({j.uploader_email})</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-cyan-300">
                              {formatDuration(j.duration_seconds)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                                  j.status === "completed"
                                    ? "glass-badge-emerald text-emerald-300"
                                    : j.status === "processing"
                                    ? "glass-badge-amber text-amber-300 animate-pulse"
                                    : j.status === "failed"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "glass-badge"
                                }`}
                              >
                                {j.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {j.has_transcript ? (
                                <span className="text-emerald-400 font-bold">✓ Extracted</span>
                              ) : (
                                <span className="text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {j.has_summary ? (
                                <span className="text-purple-300 font-bold">✓ Generated</span>
                              ) : (
                                <span className="text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                              {j.created_at ? new Date(j.created_at).toLocaleDateString() : "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                            No processing jobs found in queue.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TIER 6: SYSTEM AUDIT & ACTIVITY HISTORY */}
            <div className="glass-card p-6 sm:p-7 rounded-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                  Recent Activity Audit Logs
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Timestamped operational events</span>
              </div>

              {analytics?.recent_activities?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="glass-panel text-slate-400 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Action</th>
                        <th className="py-3 px-4">Event Details</th>
                        <th className="py-3 px-4 rounded-r-lg">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {analytics.recent_activities.map((act) => (
                        <tr key={act.id} className="hover:bg-white/[0.04] transition">
                          <td className="py-3.5 px-4 font-bold text-indigo-300 font-mono text-[11px]">
                            {act.action}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                            {act.extra_data?.title ? (
                              <span>Video: <strong className="text-white">{act.extra_data.title}</strong></span>
                            ) : (
                              JSON.stringify(act.extra_data)
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                            {new Date(act.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-6 text-center">No recent activity recorded.</p>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
