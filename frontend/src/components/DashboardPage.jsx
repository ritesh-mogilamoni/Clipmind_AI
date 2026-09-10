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
  const [currentTime, setCurrentTime] = useState(0);

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [adminUserStats, setAdminUserStats] = useState([]);

  const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm", ".mkv"];

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const data = await videosApi.listVideos();
      setVideos(data);
      if (selectedVideo) {
        const updated = data.find((v) => v.id === selectedVideo.id);
        if (updated) setSelectedVideo(updated);
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

  useEffect(() => {
    fetchVideos();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    setVideoError(false);
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
      await videosApi.uploadVideo(title, selectedFile, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
      });

      setUploadSuccess(true);
      setTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchVideos();
      fetchAnalytics();
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
      await fetchVideos();
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
      setSelectedVideo(result);
      setActiveTab("details");
      setProcessMsg("Processing completed successfully.");
      await fetchVideos();
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
    setSelectedVideo(video);
    setEditedTranscriptText(video.transcript_text || "");
    setActiveTab("details");
    setIsBookmarked(false);
  };

  const handleSaveTranscript = async () => {
    if (!selectedVideo) return;
    try {
      const updated = await videosApi.updateTranscript(selectedVideo.id, editedTranscriptText, selectedVideo.transcript_segments);
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
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await videosApi.deleteVideo(videoId);
      if (selectedVideo?.id === videoId) setSelectedVideo(null);
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
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
              <p className="text-[10px] text-cyan-400 font-mono font-semibold">Intelligence Studio</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4 shrink-0">
            <nav className="flex items-center gap-1.5 glass-panel p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("library")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === "library"
                    ? "glass-button-primary text-white shadow-sm font-bold"
                    : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                Videos ({videos.length})
              </button>

              {user?.role !== "learner" && (
                <button
                  onClick={() => {
                    fetchAnalytics();
                    setActiveTab("analytics");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeTab === "analytics"
                      ? "glass-button-primary text-white shadow-sm font-bold"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  Analytics
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
              <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Learner Access Mode</h3>
                  <p className="text-xs text-slate-400 mt-1">Browse processed video recordings, inspect transcripts, read summaries, and view key moments.</p>
                </div>
                <span className="glass-badge-emerald px-3 py-1.5 font-mono text-[11px] font-bold rounded-xl uppercase">
                  Learner Portal
                </span>
              </div>
            )}

            {/* Processed Video Repository Container */}
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
                          href={videosApi.getVideoFileUrl(selectedVideo.id)}
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
                        src={videosApi.getVideoFileUrl(selectedVideo.id)}
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
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">Content Intelligence & Metrics</h2>
                <p className="text-xs text-slate-400 mt-1">Platform statistics on videos analyzed, processing speed, and user activity.</p>
              </div>

              <button
                onClick={fetchAnalytics}
                className="glass-button-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Refresh Data
              </button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card glass-card-hover p-6 rounded-2xl relative overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Videos</span>
                <span className="text-3xl font-black text-white mt-2 block font-mono">{analytics?.total_videos || 0}</span>
              </div>
              <div className="glass-card glass-card-hover p-6 rounded-2xl relative overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">Completed AI Analyses</span>
                <span className="text-3xl font-black text-emerald-400 mt-2 block font-mono">{analytics?.completed_videos || 0}</span>
              </div>
              <div className="glass-card glass-card-hover p-6 rounded-2xl relative overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">Processing Queue</span>
                <span className="text-3xl font-black text-amber-400 mt-2 block font-mono">{analytics?.processing_videos || 0}</span>
              </div>
              <div className="glass-card glass-card-hover p-6 rounded-2xl relative overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-400 absolute top-0 left-0 right-0 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></div>
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Hours Analyzed</span>
                <span className="text-3xl font-black text-violet-400 mt-2 block font-mono">{((analytics?.total_duration_minutes || 0) / 60.0).toFixed(1)} hrs</span>
              </div>
            </div>

            {/* Activity History Table */}
            <div className="glass-card p-7 rounded-2xl space-y-5">
              <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">Recent Activity Logs</h3>
              {analytics?.recent_activities?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="glass-panel text-slate-400 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Action</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4 rounded-r-lg">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {analytics.recent_activities.map((act) => (
                        <tr key={act.id} className="hover:bg-white/[0.04] transition">
                          <td className="py-3.5 px-4 font-bold text-indigo-300">{act.action}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">{JSON.stringify(act.extra_data)}</td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-400">{new Date(act.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-6 text-center">No activity recorded.</p>
              )}
            </div>

            {/* Administrator Management Panel */}
            {user?.role === "administrator" && (
              <div className="glass-card p-7 rounded-2xl space-y-5">
                <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">Administrator User Management</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="glass-panel text-slate-400 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Videos Uploaded</th>
                        <th className="py-3 px-4 rounded-r-lg">Joined At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {adminUserStats.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.04] transition">
                          <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                          <td className="py-3.5 px-4 text-slate-400">{u.email}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-300 font-bold">
                            <span className="glass-badge px-2 py-0.5 rounded uppercase">{u.role}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-400">{u.videos_count}</td>
                          <td className="py-3.5 px-4 text-slate-400">{new Date(u.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
