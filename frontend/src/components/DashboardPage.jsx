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
    <div className="space-y-4">
      {blocks.map((block, bIdx) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return null;

        const firstLine = lines[0];
        const stepNum = String(bIdx + 1).padStart(2, "0");

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
            <div key={bIdx} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-semibold text-cyan-400 shrink-0">{stepNum}</span>
                <h5 className="text-xs font-semibold text-slate-100">{cleanHeading}</h5>
              </div>
              {contentLines.length > 0 && (
                <div className="pl-4 space-y-1.5 border-l border-white/[0.08] ml-2">
                  {contentLines.map((line, lIdx) => {
                    const isBullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ");
                    if (isBullet) {
                      const bulletContent = line.replace(/^[-*•]\s*/, "").trim();
                      return (
                        <div key={lIdx} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                          <span className="text-slate-500 font-bold mt-0.5">•</span>
                          <span>{bulletContent}</span>
                        </div>
                      );
                    }
                    return (
                      <p key={lIdx} className="text-xs text-slate-300 leading-relaxed">
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
          <div key={bIdx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const isBullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ");
              if (isBullet) {
                const bulletContent = line.replace(/^[-*•]\s*/, "").trim();
                return (
                  <div key={lIdx} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                    <span className="text-slate-500 font-bold mt-0.5">•</span>
                    <span>{bulletContent}</span>
                  </div>
                );
              }
              return (
                <p key={lIdx} className="text-xs text-slate-300 leading-relaxed">
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
  const [learnerViewMode, setLearnerViewMode] = useState("library"); // "library", "bookmarks", or "history"
  const [creatorCatalogMode, setCreatorCatalogMode] = useState("my_uploads"); // "my_uploads" or "explore"

  // Learning History, Profile & Sharing State
  const [studyHistory, setStudyHistory] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [shareSuccessToast, setShareSuccessToast] = useState("");

  const handleToggleVisibility = async (videoId, currentVisibility) => {
    const nextVis = currentVisibility === "private" ? "public" : "private";
    try {
      await videosApi.updateVisibility(videoId, nextVis);
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, visibility: nextVis } : v))
      );
      if (selectedVideo?.id === videoId) {
        setSelectedVideo((prev) => ({ ...prev, visibility: nextVis }));
      }
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
      alert(err.response?.data?.detail || "Failed to update video visibility.");
    }
  };

  const fetchBookmarks = async () => {
    try {
      const data = await videosApi.getMyBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to fetch bookmarks:", err);
    }
  };

  const fetchStudyHistory = async () => {
    try {
      const data = await videosApi.getStudyHistory();
      setStudyHistory(data);
    } catch (err) {
      console.error("Failed to fetch study history:", err);
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
    fetchStudyHistory();
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
    setIsBookmarked(bookmarks.some((b) => b.video?.id === video.id));
    videosApi.recordStudy(video.id).then(() => fetchStudyHistory()).catch(() => {});
  };

  const handleShareWithStudents = () => {
    if (!selectedVideo) return;
    const directUrl = typeof window !== "undefined" ? window.location.href : "";
    const keyMomentsText = (selectedVideo.key_moments || [])
      .slice(0, 5)
      .map((km) => `• [${km.timestamp}] ${km.title}: ${km.description || ""}`)
      .join("\n");
    const shareText = `LECTURE STUDY GUIDE: ${selectedVideo.title}\n\n` +
      `Executive Summary:\n${selectedVideo.short_summary || "Summary pending."}\n\n` +
      `Key Chapters:\n${keyMomentsText || "Review transcript for chapters."}\n\n` +
      `Study in ClipMind AI Studio: ${directUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setShareSuccessToast("Lecture study notes copied to clipboard! Ready to share with students.");
        setTimeout(() => setShareSuccessToast(""), 4500);
      }).catch(() => {
        alert("Copied study notes!");
      });
    }
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
    if (user?.role === "content_creator" || user?.role === "educator") {
      if (creatorCatalogMode === "my_uploads" && vid.uploaded_by !== user?.id) {
        return false;
      }
      if (creatorCatalogMode === "explore" && (vid.uploaded_by === user?.id || vid.visibility !== "public")) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = vid.title?.toLowerCase().includes(q);
    const kwMatch = vid.keywords && vid.keywords.some((kw) => kw.toLowerCase().includes(q));
    const formatMatch = vid.format && vid.format.toLowerCase().includes(q);
    return titleMatch || kwMatch || formatMatch;
  });

  return (
    <div className="min-h-screen bg-[#0B0D14] text-[#F8FAFC] font-sans antialiased selection:bg-indigo-600/30 selection:text-indigo-200 relative">
      {/* CLEAN APP HEADER */}
      <header className="bg-[#111522]/95 backdrop-blur-md sticky top-0 z-50 border-b border-white/[0.08]">
        <div className="w-full px-5 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-sm">
              CM
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white block">ClipMind AI</span>
              <p className="text-[11px] text-slate-400 font-sans">
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
            <nav className="flex items-center gap-1 bg-[#161B28] p-1 rounded-lg border border-white/[0.06]">
              <button
                onClick={() => {
                  setActiveTab("library");
                  setLearnerViewMode("library");
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "library" && learnerViewMode === "library"
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
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
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "library" && learnerViewMode === "bookmarks"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
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
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === "analytics"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
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
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Admin & Roles</span>
                </button>
              )}
            </nav>

            <div className="flex items-center gap-3 border-l border-white/[0.08] pl-4 text-xs">
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-right hidden sm:block hover:opacity-90 transition group text-left"
                title="View Profile Details"
              >
                <span className="block font-medium text-slate-200 text-xs group-hover:text-white transition flex items-center gap-1">
                  {user?.name}
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <span className="inline-block px-1.5 py-0.2 text-[9px] font-mono font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-500/20 rounded uppercase">
                  {user?.role?.replace("_", " ")}
                </span>
              </button>

              <button
                onClick={logout}
                className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                Logout
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* SHARE SUCCESS TOAST */}
      {shareSuccessToast && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-emerald-500/30">
          <span className="w-4 h-4 rounded-full bg-white text-emerald-600 font-bold flex items-center justify-center text-[10px]">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span>{shareSuccessToast}</span>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="surface-card max-w-md w-full p-6 sm:p-7 rounded-xl border border-white/[0.1] shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-bold w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center gap-4 border-b border-white/[0.08] pb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{user?.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-mono font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-500/25 rounded uppercase">
                  {user?.role?.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                <span className="text-slate-400">Account Status</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Active</span>
                </span>
              </div>

              {(user?.role === "content_creator" || user?.role === "educator") && (
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-slate-400">Videos Uploaded</span>
                  <span className="font-mono text-white font-semibold">
                    {videos.filter((v) => v.uploaded_by === user?.id).length} videos
                  </span>
                </div>
              )}

              {user?.role === "learner" && (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                    <span className="text-slate-400">Saved Bookmarks</span>
                    <span className="font-mono text-indigo-300 font-semibold">{bookmarks.length} saved</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                    <span className="text-slate-400">Lectures Studied</span>
                    <span className="font-mono text-cyan-300 font-semibold">{studyHistory.length} recorded</span>
                  </div>
                </>
              )}

              {user?.role === "administrator" && (
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-slate-400">Platform Permissions</span>
                  <span className="text-indigo-300 font-mono font-medium">Full Access</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 btn-primary text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING NOTIFICATION BAR */}
      {processMsg && (
        <div className="bg-indigo-900/90 text-indigo-100 px-4 py-2 text-center text-xs font-mono font-medium flex items-center justify-center gap-2 border-b border-indigo-500/30 relative z-40">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          {processMsg}
        </div>
      )}

      {/* MAIN STUDIO CONTAINER */}
      <main className="w-full px-3 sm:px-6 py-5 space-y-6 relative z-10">

        {/* TAB 1: COLLECTION & UPLOAD */}
        {activeTab === "library" && (
          <div className="space-y-8">

            {/* Upload Area */}
            {user?.role !== "learner" ? (
              <div className="surface-card p-6 sm:p-7 rounded-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-sm font-semibold text-white tracking-wide">Upload & Process Media</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Upload a local video file or import directly from an online video link.</p>
                  </div>

                  <div className="flex items-center gap-1 bg-[#161B28] p-1 rounded-lg border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setUploadMode("file")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        uploadMode === "file" ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("url")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        uploadMode === "url" ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Import Video URL
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg font-medium">
                    {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg font-medium">
                    Video imported successfully! Click "Run AI Processing" on the video card below if not processing automatically.
                  </div>
                )}

                {uploadMode === "url" ? (
                  <form onSubmit={handleUrlImportSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Online Video URL Link</label>
                      <input
                        type="url"
                        required
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Paste online video URL (e.g. YouTube, Vimeo, or direct .mp4 link)..."
                        className="w-full px-3.5 py-2.5 surface-input rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Video Title (Optional)</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Custom video title (leave empty to auto-extract from video link)"
                        className="w-full px-3.5 py-2.5 surface-input rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploading || !videoUrl}
                      className="w-full py-2.5 btn-primary text-white font-semibold text-xs rounded-lg uppercase tracking-wider disabled:opacity-40"
                    >
                      {uploading ? "Downloading & Processing Online Video..." : "Import & Process Video Link"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleUploadSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Video Title</label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Enter video title"
                          className="w-full px-3.5 py-2.5 surface-input rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Media File</label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept=".mp4,.mov,.avi,.webm,.mkv"
                          onChange={handleFileChange}
                          className="w-full text-xs text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 cursor-pointer surface-input rounded-lg p-1"
                        />
                      </div>
                    </div>

                    {/* Clean Dropzone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`border border-dashed rounded-xl p-7 text-center transition cursor-pointer ${
                        isDragOver
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-white/15 bg-[#161B28]/30 hover:border-white/30 hover:bg-[#161B28]/50"
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {selectedFile ? (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-indigo-300 block">{selectedFile.name}</span>
                          <span className="text-[11px] text-cyan-400 font-mono block">{formatBytes(selectedFile.size)}</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-slate-200 block">Drag and drop video file here, or click to browse</span>
                          <span className="text-[11px] text-slate-400 block">MP4, MOV, AVI, WEBM, MKV (Maximum size: 500 MB)</span>
                        </div>
                      )}
                    </div>

                    {uploading && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-300 font-mono">
                          <span>Uploading File...</span>
                          <span className="text-cyan-400 font-semibold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-[#161B28] rounded-full h-1.5 overflow-hidden border border-white/[0.08]">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={uploading || !selectedFile || !title}
                      className="w-full py-2.5 btn-primary text-white font-semibold text-xs rounded-lg uppercase tracking-wider disabled:opacity-40"
                    >
                      {uploading ? `Uploading (${uploadProgress}%)...` : "Upload Media File"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="surface-card p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <h3 className="text-sm font-semibold text-white">Learner Study Portal</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Browse educational lectures, search transcripts, and study AI-extracted summaries & chapters.</p>
                </div>

                <div className="flex items-center gap-1 bg-[#161B28] p-1 rounded-lg border border-white/[0.06]">
                  <button
                    onClick={() => setLearnerViewMode("library")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      learnerViewMode === "library" ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    All Lectures ({videos.length})
                  </button>
                  <button
                    onClick={() => setLearnerViewMode("bookmarks")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      learnerViewMode === "bookmarks" ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    My Bookmarks ({bookmarks.length})
                  </button>
                  <button
                    onClick={() => {
                      setLearnerViewMode("history");
                      fetchStudyHistory();
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      learnerViewMode === "history" ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Study History ({studyHistory.length})
                  </button>
                </div>
              </div>
            )}

            {/* Learner Bookmarks View */}
            {user?.role === "learner" && learnerViewMode === "bookmarks" ? (
              <div className="surface-card p-6 sm:p-7 rounded-xl space-y-5">
                <div className="border-b border-white/[0.08] pb-4">
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    My Bookmarked Lectures & Highlights ({bookmarks.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your saved study materials. Click "Study Now" to jump directly into playback, notes, and key moments.
                  </p>
                </div>

                {bookmarks.length === 0 ? (
                  <div className="py-14 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-xl space-y-1.5">
                    <p className="font-semibold text-white">No bookmarked lectures yet.</p>
                    <p className="text-slate-400 text-xs">Click "Bookmark" while studying any video in the workstation to save it here!</p>
                    <button
                      onClick={() => setLearnerViewMode("library")}
                      className="text-xs font-medium text-indigo-400 hover:underline pt-2 inline-block"
                    >
                      Browse All Lectures →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookmarks.map((bm) => (
                      <div
                        key={bm.bookmark_id}
                        className="surface-panel surface-card-hover p-4 rounded-xl flex flex-col justify-between space-y-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/25 rounded">
                              SAVED
                            </span>
                            <button
                              onClick={() => handleRemoveBookmark(bm.bookmark_id)}
                              className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                              title="Remove bookmark"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <h3 className="font-semibold text-sm text-white mt-2 group-hover:text-indigo-300 transition line-clamp-1">
                            {bm.video?.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {bm.video?.short_summary || "No summary available."}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                          <span className="font-mono text-[10px] text-cyan-400 font-semibold">
                            {formatDuration(bm.video?.duration_seconds)}
                          </span>
                          <button
                            onClick={() => handleOpenVideoFromAnalytics(bm.video?.id)}
                            className="px-3 py-1.5 btn-primary text-white text-xs font-semibold rounded-lg"
                          >
                            Study Now ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : user?.role === "learner" && learnerViewMode === "history" ? (
              <div className="surface-card p-6 sm:p-7 rounded-xl space-y-5">
                <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white tracking-wide">
                      Recent Learning & Study History ({studyHistory.length})
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Lectures you have recently opened and studied. Click "Resume Study" to continue where you left off.
                    </p>
                  </div>
                  <button
                    onClick={fetchStudyHistory}
                    className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium"
                  >
                    Refresh History
                  </button>
                </div>

                {studyHistory.length === 0 ? (
                  <div className="py-14 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-xl space-y-1.5">
                    <p className="font-semibold text-white">No learning history recorded yet.</p>
                    <p className="text-slate-400 text-xs">When you open and study any lecture in the workstation, it will appear here.</p>
                    <button
                      onClick={() => setLearnerViewMode("library")}
                      className="text-xs font-medium text-indigo-400 hover:underline pt-2 inline-block"
                    >
                      Browse All Lectures →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {studyHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="surface-panel surface-card-hover p-4 rounded-xl flex flex-col justify-between space-y-3 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-300 bg-indigo-950/60 border border-indigo-500/25 rounded">
                              STUDIED
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-white mt-2 group-hover:text-indigo-300 transition line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.short_summary || "Video lecture study session."}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                          <span className="font-mono text-[10px] text-cyan-400 font-semibold">
                            {formatDuration(item.duration_seconds)}
                          </span>
                          <button
                            onClick={() => handleOpenVideoFromAnalytics(item.video_id)}
                            className="px-3 py-1.5 btn-primary text-white text-xs font-semibold rounded-lg"
                          >
                            Resume Study ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="surface-card p-6 sm:p-7 rounded-xl space-y-5">
              
              {/* Creator & Educator Catalog Switcher */}
              {(user?.role === "content_creator" || user?.role === "educator") && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-1 bg-[#161B28] rounded-xl border border-white/[0.06]">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCreatorCatalogMode("my_uploads")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                        creatorCatalogMode === "my_uploads"
                          ? "bg-indigo-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span>My Uploads ({videos.filter((v) => v.uploaded_by === user?.id).length})</span>
                    </button>
                    <button
                      onClick={() => setCreatorCatalogMode("explore")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                        creatorCatalogMode === "explore"
                          ? "bg-indigo-600 text-white font-semibold shadow-sm"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span>Explore Community ({videos.filter((v) => v.uploaded_by !== user?.id && v.visibility === "public").length})</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-sans px-2 hidden sm:inline-block">
                    {creatorCatalogMode === "my_uploads" ? "Manage and edit your uploads" : "Watch & study public lectures from other creators"}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4 relative z-10">
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    {user?.role === "administrator"
                      ? `System Video Repository (${filteredVideos.length})`
                      : creatorCatalogMode === "explore"
                      ? `Community Videos (${filteredVideos.length})`
                      : `My Video Library (${filteredVideos.length})`}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {creatorCatalogMode === "explore"
                      ? "Browse, watch, and search transcripts of publicly published videos."
                      : "Manage your videos, run AI processing, toggle privacy, and review transcripts."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Field */}
                  <div className="relative flex-1 sm:w-64">
                    <input
                      type="text"
                      placeholder="Search videos by title or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 surface-input rounded-lg text-xs"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition"
                        title="Clear search"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={fetchVideos}
                    className="btn-secondary px-3.5 py-2 text-white rounded-lg text-xs font-medium shrink-0"
                  >
                    Refresh Directory
                  </button>
                </div>
              </div>

              {loadingVideos ? (
                <div className="py-14 text-center text-slate-400 text-xs font-mono">Loading video collection...</div>
              ) : filteredVideos.length === 0 ? (
                <div className="py-14 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-xl space-y-1.5">
                  <p className="font-semibold text-white">
                    {creatorCatalogMode === "explore"
                      ? "No community videos available yet."
                      : "No videos uploaded yet."}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {creatorCatalogMode === "explore"
                      ? "When other creators or educators publish public videos, they will appear here."
                      : "Upload a video above or import a video URL to get started."}
                  </p>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-indigo-400 font-medium hover:underline pt-2 block"
                    >
                      Clear search filter "{searchQuery}"
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVideos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => {
                        if (vid.status === "completed") {
                          handleSelectVideo(vid);
                        }
                      }}
                      className={`surface-card surface-card-hover rounded-xl p-4 group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                        vid.status === "completed" ? "cursor-pointer" : ""
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
                        {/* Media Box / Video Thumbnail Placeholder */}
                        <div className="w-full sm:w-36 h-22 bg-[#0E121F] rounded-lg shrink-0 relative flex items-center justify-center border border-white/[0.08] group-hover:border-white/[0.16] transition-colors overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                            <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-[#0B0D14]/90 text-cyan-400 font-mono text-[10px] font-semibold rounded border border-white/[0.08]">
                            {formatDuration(vid.duration_seconds)}
                          </span>
                        </div>

                        {/* Title & Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition leading-snug truncate">
                              {vid.title}
                            </h3>

                            {/* Visibility Badge & Toggle */}
                            {vid.uploaded_by === user?.id ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleVisibility(vid.id, vid.visibility || "public");
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase border flex items-center gap-1 transition ${
                                  vid.visibility === "private"
                                    ? "bg-amber-950/40 text-amber-300 border-amber-500/25 hover:bg-amber-950/60"
                                    : "bg-emerald-950/40 text-emerald-300 border-emerald-500/25 hover:bg-emerald-950/60"
                                }`}
                                title={`Click to change visibility to ${vid.visibility === "private" ? "Public" : "Private"}`}
                              >
                                {vid.visibility === "private" ? (
                                  <>
                                    <svg className="w-2.5 h-2.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span>Private</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-2.5 h-2.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Public</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.08] flex items-center gap-1">
                                <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Public</span>
                              </span>
                            )}

                            {vid.status !== "completed" && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider shrink-0 border ${
                                  vid.status === "processing"
                                    ? "text-amber-400 bg-amber-500/10 border-amber-500/20 font-medium animate-pulse"
                                    : "surface-badge"
                                }`}
                              >
                                {vid.status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
                            <span>{formatBytes(vid.file_size_bytes)}</span>
                            <span className="text-slate-600">·</span>
                            <span>{new Date(vid.created_at).toLocaleDateString()}</span>
                            {vid.uploaded_by !== user?.id && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-cyan-400 font-sans">Community</span>
                              </>
                            )}
                          </div>

                          {/* Unboxed Inline Keywords */}
                          {vid.keywords && vid.keywords.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs text-slate-400">
                              {vid.keywords.slice(0, 4).map((kw, i) => (
                                <React.Fragment key={i}>
                                  <span className="hover:text-slate-200 transition-colors">#{kw.replace(/^#/, "")}</span>
                                  {i < Math.min(vid.keywords.length - 1, 3) && <span className="text-slate-600">·</span>}
                                </React.Fragment>
                              ))}
                              {vid.keywords.length > 4 && (
                                <span className="text-[11px] text-slate-500 font-mono">+{vid.keywords.length - 4} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
                        {vid.status === "completed" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectVideo(vid);
                            }}
                            className="px-3.5 py-1.5 btn-primary text-white rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5"
                          >
                            <span>Open</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </button>
                        )}

                        {vid.status !== "completed" && (
                          (user?.role === "administrator" || vid.uploaded_by === user?.id) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProcessVideo(vid.id);
                              }}
                              disabled={processingId === vid.id}
                              className="px-4 py-2 btn-primary disabled:opacity-40 text-white rounded-lg text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                            >
                              {processingId === vid.id ? "Processing..." : "Run AI Processing"}
                            </button>
                          ) : (
                            <span className="px-3 py-1.5 surface-panel text-slate-400 rounded-lg text-xs font-mono italic">
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
                            className="px-3 py-1.5 btn-secondary hover:border-rose-500/30 hover:text-rose-400 rounded-lg text-xs font-medium"
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
          <div className="space-y-5">

            {/* Header bar */}
            <div className="surface-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <button
                  onClick={() => setActiveTab("library")}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition mb-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Video Library</span>
                </button>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-semibold text-white">{selectedVideo.title}</h2>
                  {selectedVideo.status !== "completed" && (
                    <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 font-medium rounded">
                      {selectedVideo.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(user?.role === "administrator" || selectedVideo.uploaded_by === user?.id) && (
                  <button
                    onClick={() => handleProcessVideo(selectedVideo.id)}
                    disabled={processingId === selectedVideo.id}
                    className="px-3.5 py-1.5 btn-primary text-white rounded-lg text-xs font-semibold disabled:opacity-40 uppercase tracking-wider"
                  >
                    {processingId === selectedVideo.id ? "Processing..." : "Re-run AI Processing"}
                  </button>
                )}

                <button
                  onClick={handleBookmark}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isBookmarked ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" : "btn-secondary text-slate-300"
                  }`}
                >
                  {isBookmarked ? "Bookmarked" : "Bookmark"}
                </button>

                {(user?.role === "educator" || user?.role === "administrator") && (
                  <button
                    onClick={handleShareWithStudents}
                    className="px-3 py-1.5 btn-secondary hover:border-indigo-400/40 hover:text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-1.5"
                    title="Copy formatted study guide to clipboard to share with students"
                  >
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Share with Students</span>
                  </button>
                )}

                {(user?.role === "content_creator" || user?.role === "educator" || user?.role === "administrator") && (
                  <>
                    <button
                      onClick={() => handleExport("txt")}
                      className="px-3 py-1.5 btn-secondary rounded-lg text-xs font-medium"
                    >
                      Export TXT
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      className="px-3 py-1.5 btn-secondary rounded-lg text-xs font-medium"
                    >
                      Export JSON
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Workstation Content Grid */}
            <div className="space-y-5">

              {/* ROW 1: Resizable 3-Column Workstation with Equal Height Panels */}
              <div id="workstation-row-1" className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-0 relative lg:h-[480px]">

                {/* Column 1: Connected Vertical Key Moments Timeline */}
                <div
                  style={{ width: `${colWidths.left}%` }}
                  className="w-full lg:w-auto surface-card p-4 rounded-xl space-y-3 flex flex-col h-full min-w-[200px]"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 shrink-0">
                    <h3 className="text-xs font-semibold text-slate-200 tracking-wide">Key Moments</h3>
                    <span className="text-[10px] text-slate-400 font-sans">Click to seek</span>
                  </div>

                  {selectedVideo.key_moments && selectedVideo.key_moments.length > 0 ? (
                    <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0 pl-1 pt-1">
                      {selectedVideo.key_moments.map((km, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSeekTo(km.start_seconds)}
                          className="relative pl-5 pb-3 border-l border-white/[0.1] last:border-l-0 last:pb-0 cursor-pointer group"
                        >
                          {/* Milestone Node */}
                          <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-[#111522] group-hover:scale-125 transition-transform"></span>

                          <span className="font-mono text-[10px] font-semibold text-cyan-400 group-hover:text-cyan-300 block">
                            {km.timestamp}
                          </span>
                          <h4 className="font-semibold text-xs text-white group-hover:text-indigo-300 transition line-clamp-1 mt-0.5">
                            {km.title}
                          </h4>
                          {km.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                              {km.description}
                            </p>
                          )}
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
                  className="hidden lg:flex w-3 hover:w-4 cursor-col-resize bg-transparent hover:bg-white/[0.03] rounded transition-all items-center justify-center group shrink-0 select-none z-10 h-full"
                  title="Drag left or right to resize columns"
                >
                  <div className="w-0.5 h-10 bg-white/20 group-hover:bg-indigo-400 rounded-full transition"></div>
                </div>

                {/* Column 2: Video Playback (HERO) */}
                <div
                  style={{ width: `${colWidths.center}%` }}
                  className="w-full lg:w-auto surface-card p-3 rounded-xl space-y-2 flex flex-col h-full justify-between min-w-[300px]"
                >
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <h3 className="text-xs font-semibold text-slate-200">Video Playback</h3>
                  </div>

                  <div className="bg-black rounded-lg overflow-hidden flex-1 min-h-0 flex items-center justify-center border border-white/[0.08] relative">
                    {videoError ? (
                      <div className="p-6 text-center flex flex-col items-center justify-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
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
                  className="hidden lg:flex w-3 hover:w-4 cursor-col-resize bg-transparent hover:bg-white/[0.03] rounded transition-all items-center justify-center group shrink-0 select-none z-10 h-full"
                  title="Drag left or right to resize columns"
                >
                  <div className="w-0.5 h-10 bg-white/20 group-hover:bg-indigo-400 rounded-full transition"></div>
                </div>

                {/* Column 3: Synchronized Speech-to-Text Transcript */}
                <div
                  style={{ width: `${colWidths.right}%` }}
                  className="w-full lg:w-auto surface-card p-4 rounded-xl space-y-3 flex flex-col h-full min-w-[200px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5 shrink-0">
                    <h3 className="text-xs font-semibold text-slate-200">Transcript</h3>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search transcript..."
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        className="px-2.5 py-1 surface-input rounded-md text-xs w-32 sm:w-36"
                      />

                      {(user?.role === "administrator" || selectedVideo.uploaded_by === user?.id) && (
                        <button
                          onClick={() => {
                            if (isEditingTranscript) {
                              handleSaveTranscript();
                            } else {
                              setIsEditingTranscript(true);
                            }
                          }}
                          className="px-2.5 py-1 btn-secondary text-white rounded-md text-xs font-medium uppercase tracking-wider shrink-0"
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
                        className="w-full p-3 surface-input rounded-lg text-xs font-mono leading-relaxed flex-1 min-h-0"
                      />
                      <div className="flex justify-end gap-2 shrink-0">
                        <button
                          onClick={() => setIsEditingTranscript(false)}
                          className="px-3 py-1 btn-secondary text-xs rounded-lg font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTranscript}
                          className="px-3.5 py-1 btn-primary text-white text-xs rounded-lg font-semibold uppercase tracking-wider"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 min-h-0">
                      {selectedVideo.transcript_segments && selectedVideo.transcript_segments.length > 0 ? (
                        selectedVideo.transcript_segments
                          .filter((seg) => !transcriptSearch || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                          .map((seg, idx) => {
                            const isActive = currentTime >= seg.start && currentTime <= (seg.end || seg.start + 5);
                            return (
                              <div
                                key={idx}
                                onClick={() => handleSeekTo(seg.start)}
                                className={`p-2 rounded-lg transition-colors cursor-pointer text-xs flex flex-col gap-0.5 ${
                                  isActive
                                    ? "bg-indigo-950/50 border-l-2 border-indigo-500 text-white font-medium"
                                    : "hover:bg-white/[0.03] text-slate-300"
                                }`}
                              >
                                <span className="font-mono text-[10px] font-semibold text-cyan-400">
                                  {formatDuration(seg.start)}
                                </span>
                                <p className={`leading-relaxed ${isActive ? "text-white font-medium" : "text-slate-300 hover:text-slate-100"}`}>
                                  {seg.text}
                                </p>
                              </div>
                            );
                          })
                      ) : (
                        <div className="p-3 text-xs text-slate-400 font-mono surface-panel rounded-lg whitespace-pre-wrap leading-relaxed">
                          {selectedVideo.transcript_text || "No transcript generated for this video."}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* ROW 2: Unboxed AI Content Analysis */}
              <div className="surface-card p-6 rounded-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <h3 className="text-sm font-semibold text-white tracking-wide">
                      AI Content Analysis
                    </h3>
                  </div>

                  {/* Unboxed Inline Topics */}
                  {selectedVideo.keywords && selectedVideo.keywords.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      {selectedVideo.keywords.map((kw, i) => {
                        const cleanKw = String(kw).replace(/^#/, "");
                        return (
                          <React.Fragment key={i}>
                            <span className="hover:text-slate-200 transition-colors">#{cleanKw}</span>
                            {i < selectedVideo.keywords.length - 1 && <span className="text-slate-600">·</span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Executive Short Summary */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      <span>Executive Summary</span>
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed font-normal">{selectedVideo.short_summary || "No short summary available."}</p>
                  </div>

                  {/* Detailed Content Breakdown */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      <span>Key Themes & Detailed Breakdown</span>
                    </h4>
                    {renderFormattedDetailedSummary(selectedVideo.detailed_summary)}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS DASHBOARD */}
        {activeTab === "analytics" && user?.role !== "learner" && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    Content Intelligence & Media Analytics
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cross-video aggregation answering what content has been processed, how it is consumed, and what AI insights were extracted.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {user?.role === "administrator" && (
                  <>
                    <button
                      onClick={() => document.getElementById("admin-management")?.scrollIntoView({ behavior: "smooth" })}
                      className="px-3 py-1.5 btn-secondary rounded-lg text-xs font-mono font-medium flex items-center gap-1.5"
                    >
                      <span>↓</span> Users & Roles
                    </button>
                    <button
                      onClick={() => document.getElementById("admin-jobs")?.scrollIntoView({ behavior: "smooth" })}
                      className="px-3 py-1.5 btn-secondary rounded-lg text-xs font-mono font-medium flex items-center gap-1.5"
                    >
                      <span>↓</span> Jobs Queue
                    </button>
                  </>
                )}
                <button
                  onClick={fetchAnalytics}
                  className="btn-primary px-3.5 py-1.5 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* TOP SECTION: OVERVIEW METRICS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Card 1: Total Videos */}
              <div className="surface-card surface-card-hover p-4 sm:p-5 rounded-xl">
                <span className="text-xs font-medium text-slate-400 block">Total Videos</span>
                <span className="text-2xl font-bold font-mono text-white mt-1 block">
                  {analytics?.total_videos || 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-sans">
                  {analytics?.completed_videos || 0} completed · {analytics?.processing_videos || 0} queue
                </span>
              </div>

              {/* Card 2: Total Hours Analyzed */}
              <div className="surface-card surface-card-hover p-4 sm:p-5 rounded-xl">
                <span className="text-xs font-medium text-slate-400 block">Total Hours Processed</span>
                <span className="text-2xl font-bold font-mono text-indigo-300 mt-1 block">
                  {((analytics?.total_duration_minutes || 0) / 60.0).toFixed(1)}<span className="text-sm font-medium text-slate-400 ml-0.5">h</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-sans">
                  {analytics?.total_duration_minutes || 0} total minutes
                </span>
              </div>

              {/* Card 3: Transcripts Generated */}
              <div className="surface-card surface-card-hover p-4 sm:p-5 rounded-xl">
                <span className="text-xs font-medium text-slate-400 block">Transcripts Generated</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {analytics?.total_transcripts ?? analytics?.completed_videos ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-sans">
                  Whisper STT speech-to-text
                </span>
              </div>

              {/* Card 4: Summaries Generated */}
              <div className="surface-card surface-card-hover p-4 sm:p-5 rounded-xl">
                <span className="text-xs font-medium text-slate-400 block">Summaries Generated</span>
                <span className="text-2xl font-bold font-mono text-amber-300 mt-1 block">
                  {analytics?.total_summaries ?? analytics?.completed_videos ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-sans">
                  Short & Executive Reports
                </span>
              </div>

              {/* Card 5: Key Moments Detected */}
              <div className="surface-card surface-card-hover p-4 sm:p-5 rounded-xl">
                <span className="text-xs font-medium text-slate-400 block">Key Moments Detected</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                  {analytics?.total_key_moments ?? 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block font-sans">
                  Timestamped chapters
                </span>
              </div>
            </div>

            {/* TIER 1: VIDEO ANALYTICS & PROCESSING VELOCITY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* Left 7 cols: Weekly Velocity Bar Chart */}
              <div className="lg:col-span-7 surface-card p-5 sm:p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
                      Videos Processed Over Time
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Daily media volume throughput over the last 7 days</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-sans">
                    <span className="w-2 h-2 rounded bg-indigo-600 inline-block"></span>
                    <span>Completed</span>
                  </div>
                </div>

                {/* SVG/CSS Clean Responsive Bar Chart */}
                <div className="pt-3 pb-1">
                  {analytics?.weekly_timeline && analytics.weekly_timeline.length > 0 ? (
                    <div className="flex items-end justify-between gap-2 sm:gap-4 h-44 px-2 border-b border-white/[0.08] pb-2">
                      {(() => {
                        const maxVal = Math.max(...analytics.weekly_timeline.map((d) => d.count), 1);
                        return analytics.weekly_timeline.map((day, idx) => {
                          const heightPct = day.count > 0 ? Math.max((day.count / maxVal) * 100, 16) : 6;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                              <span className="text-[10px] font-mono font-semibold text-cyan-400 opacity-0 group-hover:opacity-100 transition duration-150">
                                {day.count}
                              </span>
                              <div className="w-full max-w-[40px] bg-white/[0.02] rounded-t flex items-end h-full p-0.5 group-hover:bg-white/[0.06] transition">
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-full rounded-t transition-all duration-300 ${
                                    day.count > 0
                                      ? "bg-indigo-600 hover:bg-indigo-500"
                                      : "bg-white/10"
                                  }`}
                                ></div>
                              </div>
                              <div className="text-center pt-1">
                                <span className="block text-[11px] font-medium text-slate-300 font-mono">{day.day}</span>
                                <span className="block text-[9px] text-slate-500 font-mono">{day.date.slice(5)}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-500 font-mono">
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
              <div className="lg:col-span-5 surface-card p-5 sm:p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="border-b border-white/[0.08] pb-3">
                  <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
                    Pipeline Health & Performance
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Reliability, speed, and cloud resource metrics</p>
                </div>

                <div className="space-y-2.5 flex-1 justify-center flex flex-col">
                  <div className="flex items-center justify-between p-2.5 surface-panel rounded-lg">
                    <span className="text-xs text-slate-300">Processing Success Rate</span>
                    <span className="text-xs font-semibold font-mono text-emerald-400">
                      {analytics?.success_rate || 100}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 surface-panel rounded-lg">
                    <span className="text-xs text-slate-300">Successfully Processed</span>
                    <span className="text-xs font-semibold font-mono text-white">
                      {analytics?.completed_videos || 0} <span className="text-[11px] text-slate-400 font-normal">videos</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 surface-panel rounded-lg">
                    <span className="text-xs text-slate-300">Active / Queued Jobs</span>
                    <span className="text-xs font-semibold font-mono text-amber-400">
                      {analytics?.processing_videos || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 surface-panel rounded-lg">
                    <span className="text-xs text-slate-300">Average Video Duration</span>
                    <span className="text-xs font-semibold font-mono text-cyan-400">
                      {formatDuration(analytics?.avg_video_duration_seconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 surface-panel rounded-lg">
                    <span className="text-xs text-slate-300">Total Cloud Storage</span>
                    <span className="text-xs font-semibold font-mono text-indigo-300">
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

            {/* TIER 2: AI CONTENT INSIGHTS (Top Topics & Extraction Health) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* Left 6 cols: Top Topics & Keywords Cloud */}
              <div className="lg:col-span-6 surface-card p-5 sm:p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
                        AI Content Insights: Top Topics
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">Concepts and subject themes automatically extracted by Groq LLM</p>
                    </div>

                    {selectedTopicFilter && (
                      <button
                        onClick={() => setSelectedTopicFilter(null)}
                        className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/25 flex items-center gap-1"
                      >
                        <span>Clear Filter</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="pt-3 flex flex-wrap gap-2">
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
                          className={`px-3 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                            selectedTopicFilter === kw.keyword
                              ? "bg-indigo-600 text-white font-semibold shadow-sm"
                              : "surface-panel hover:bg-white/[0.06] text-slate-300 hover:text-white border border-white/[0.08]"
                          }`}
                        >
                          <span className="text-indigo-400">#</span>
                          <span>{kw.keyword}</span>
                          <span className="ml-1 px-1.5 py-0.2 bg-white/10 rounded-full text-[10px] text-cyan-400 font-semibold">
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
              <div className="lg:col-span-6 surface-card p-5 sm:p-6 rounded-xl flex flex-col justify-between space-y-4">
                <div className="border-b border-white/[0.08] pb-3">
                  <h3 className="text-xs font-semibold text-slate-200 tracking-wide">
                    AI Extraction Coverage & Density
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">How much raw video content has been structured into actionable intelligence</p>
                </div>

                <div className="space-y-4 flex-1 justify-center flex flex-col">
                  {/* Metric 1: Transcripts */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Transcription Coverage</span>
                      <span className="text-emerald-400 font-semibold">
                        {Math.round(((analytics?.total_transcripts || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0E121F] rounded-full h-1.5 overflow-hidden border border-white/[0.08]">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((analytics?.total_transcripts || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 2: Summaries */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Executive Summarization Rate</span>
                      <span className="text-indigo-300 font-semibold">
                        {Math.round(((analytics?.total_summaries || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-[#0E121F] rounded-full h-1.5 overflow-hidden border border-white/[0.08]">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, Math.round(((analytics?.total_summaries || 0) / Math.max(analytics?.total_videos || 1, 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric 3: Chaptering */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">Average Key Moments Density</span>
                      <span className="text-cyan-400 font-semibold">
                        {((analytics?.total_key_moments || 0) / Math.max(analytics?.completed_videos || 1, 1)).toFixed(1)} moments / video
                      </span>
                    </div>
                    <div className="w-full bg-[#0E121F] rounded-full h-1.5 overflow-hidden border border-white/[0.08]">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
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
            <div className="surface-card p-5 sm:p-6 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Summary Reports & Video Intelligence Catalog
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-dimensional status breakdown per video. Click "Open in Studio" to inspect transcripts, playback, and full summaries.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 sm:w-60">
                    <input
                      type="text"
                      placeholder="Search reports by title..."
                      value={analyticsReportSearch}
                      onChange={(e) => setAnalyticsReportSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 surface-input rounded-lg text-xs"
                    />
                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {selectedTopicFilter && (
                <div className="p-2.5 bg-indigo-950/40 border border-indigo-500/25 rounded-lg flex items-center justify-between text-xs text-indigo-200">
                  <span>Filtered by topic: <strong className="text-white">#{selectedTopicFilter}</strong></span>
                  <button onClick={() => setSelectedTopicFilter(null)} className="text-xs font-semibold text-cyan-400 hover:underline">
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
                      <thead className="bg-[#161B28] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/[0.08]">
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
                          <tr key={rep.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-3.5 px-4 max-w-xs">
                              <span className="line-clamp-1 font-medium text-slate-200 group-hover:text-white transition-colors">{rep.title}</span>
                              <span className="block text-[10px] text-slate-500 font-mono font-normal mt-0.5">
                                {rep.created_at ? new Date(rep.created_at).toLocaleDateString() : ""}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-cyan-400">
                              {formatDuration(rep.duration_seconds)}
                            </td>
                            <td className="py-3.5 px-4">
                              {rep.has_transcript ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Ready</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {rep.has_summary ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-medium">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Ready</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px]">
                              {rep.key_moments_count > 0 ? (
                                <button
                                  onClick={() => setSelectedTimelineVideoId(rep.id)}
                                  className="text-cyan-400 hover:text-cyan-300 underline font-medium inline-flex items-center gap-1"
                                  title="Inspect key moments timeline"
                                >
                                  <span>{rep.key_moments_count} moments</span>
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="text-slate-500">0 moments</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="max-w-[200px]">
                                {rep.keywords && rep.keywords.length > 0 ? (
                                  <span className="text-[11px] text-slate-400 truncate block" title={rep.keywords.join(", ")}>
                                    {rep.keywords.slice(0, 3).join(" · ")}
                                    {rep.keywords.length > 3 ? ` · +${rep.keywords.length - 3}` : ""}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">None</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleOpenVideoFromAnalytics(rep.id)}
                                className="btn-secondary px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap inline-flex items-center gap-1.5 group-hover:border-indigo-500/40"
                              >
                                <span>Open Studio</span>
                                <svg className="w-3 h-3 text-slate-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
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
                <div className="surface-card p-6 sm:p-7 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20 font-medium uppercase tracking-wider">
                          Timeline Inspector
                        </span>
                        <h3 className="text-sm font-semibold text-white">
                          {currentVideo.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Detected timestamp highlights and chapters plotted across video timeline ({formatDuration(currentVideo.duration_seconds)}).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={currentVideo.id}
                        onChange={(e) => setSelectedTimelineVideoId(e.target.value)}
                        className="surface-input px-3 py-1.5 rounded-lg text-xs font-mono"
                      >
                        {(analytics?.video_reports || []).map((v) => (
                          <option key={v.id} value={v.id} className="bg-[#111522] text-white">
                            {v.title} ({v.key_moments_count} moments)
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleOpenVideoFromAnalytics(currentVideo.id)}
                        className="btn-primary px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap inline-flex items-center gap-1.5"
                      >
                        <span>Open in Studio</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Timeline Bar */}
                  <div className="space-y-4 pt-2">
                    <div className="relative pt-6 pb-2 px-4">
                      {/* Base Track */}
                      <div className="h-2 w-full bg-[#161B28] rounded-full relative overflow-visible border border-white/[0.08]">
                        {/* Subtle Cyan Progress Line */}
                        <div className="absolute inset-0 bg-cyan-500/20 rounded-full"></div>

                        {/* Milestone Pins */}
                        {moments.map((km, idx) => {
                          const s = km.start_seconds || 0;
                          const pct = Math.min(Math.max((s / durationSec) * 100, 3), 97);
                          return (
                            <div
                              key={idx}
                              style={{ left: `${pct}%` }}
                              className="absolute -top-3 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
                              title={`${km.timestamp} - ${km.title}`}
                            >
                              <span className="w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#111522] group-hover:scale-125 transition-transform"></span>
                              <span className="mt-3.5 text-[10px] font-mono text-cyan-400/80 group-hover:text-cyan-300 whitespace-nowrap">
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
                            className="p-3.5 surface-panel hover:border-indigo-500/30 transition-colors cursor-pointer group space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono font-semibold text-cyan-400">
                                {km.timestamp}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                            </div>
                            <h4 className="font-medium text-xs text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
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

            {/* CLASSROOM CONTENT ANALYTICS & STUDENT ENGAGEMENT (For Educators and Administrators) */}
            {(user?.role === "educator" || user?.role === "administrator") && analytics?.classroom_engagement && (
              <div className="surface-card p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Classroom Content Analytics & Student Engagement
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitor learner study activity, engagement events, and completion history across course lectures.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 rounded border border-cyan-500/20 font-medium">
                    {analytics.classroom_engagement.length} Study Events Logged
                  </span>
                </div>

                {analytics.classroom_engagement.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-xl space-y-1">
                    <p className="font-semibold text-white">No student study activity recorded yet.</p>
                    <p className="text-slate-400 text-xs">When learners open and study your lectures, their engagement will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-200">
                      <thead className="bg-[#161B28] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/[0.08]">
                        <tr>
                          <th className="py-3 px-4 rounded-l-lg">Student Name</th>
                          <th className="py-3 px-4">Student Email</th>
                          <th className="py-3 px-4">Lecture Studied</th>
                          <th className="py-3 px-4 rounded-r-lg">Activity Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {analytics.classroom_engagement.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-white">{item.student_name}</td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{item.student_email}</td>
                            <td className="py-3.5 px-4 text-indigo-300 font-medium">{item.lecture_title}</td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                              {item.studied_at ? new Date(item.studied_at).toLocaleString() : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TIER 5: ADMINISTRATOR USER MANAGEMENT & SYSTEM HEALTH */}
            {user?.role === "administrator" && (
              <div id="admin-management" className="surface-card p-6 sm:p-7 space-y-5 scroll-mt-24">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Administrator User & Resource Management
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      System-wide platform utilization, user access permissions, and storage quotas.
                    </p>
                  </div>

                  {analytics?.admin_metrics && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-[11px] font-mono text-slate-300 bg-[#161B28] rounded border border-white/[0.08]">
                        {analytics.admin_metrics.total_users} Users Registered
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 rounded border border-cyan-500/20 font-medium">
                        {analytics.admin_metrics.total_storage_mb} MB Allocated
                      </span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-[#161B28] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/[0.08]">
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
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{u.email}</td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <select
                              value={u.role}
                              disabled={updatingUserRoleId === u.id || u.email === user?.email}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="surface-input px-2.5 py-1 rounded-md text-xs font-mono cursor-pointer disabled:opacity-50"
                              title={u.email === user?.email ? "Cannot modify your own administrator role" : "Change user role"}
                            >
                              <option value="content_creator" className="bg-[#111522] text-white">Content Creator</option>
                              <option value="educator" className="bg-[#111522] text-white">Educator</option>
                              <option value="learner" className="bg-[#111522] text-white">Learner</option>
                              <option value="administrator" className="bg-[#111522] text-white">Administrator</option>
                            </select>
                            {updatingUserRoleId === u.id && (
                              <span className="ml-2 text-[10px] text-cyan-400 animate-pulse">Updating...</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-400 font-mono">{u.videos_count}</td>
                          <td className="py-3.5 px-4 text-slate-400 text-[11px] font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TIER 5B: ADMINISTRATOR AI PROCESSING JOBS QUEUE */}
            {user?.role === "administrator" && (
              <div id="admin-jobs" className="surface-card p-6 sm:p-7 space-y-5 scroll-mt-24">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      AI Video Processing Jobs Queue
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Monitor background Whisper STT, Groq LLM summarization, and key-moment extraction jobs across the entire platform.
                    </p>
                  </div>
                  <button
                    onClick={fetchAdminJobs}
                    className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-mono shrink-0"
                  >
                    Refresh Jobs
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-[#161B28] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/[0.08]">
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
                          <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 font-semibold text-white max-w-xs truncate">{j.title}</td>
                            <td className="py-3 px-4 text-slate-300">
                              {j.uploader_name}{" "}
                              <span className="text-[10px] text-slate-500 font-mono">({j.uploader_email})</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-cyan-400">
                              {formatDuration(j.duration_seconds)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-medium ${
                                  j.status === "completed"
                                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                    : j.status === "processing"
                                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse"
                                    : j.status === "failed"
                                    ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                    : "text-slate-400 bg-slate-500/10 border border-slate-500/20"
                                }`}
                              >
                                {j.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {j.has_transcript ? (
                                <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Ready</span>
                                </span>
                              ) : (
                                <span className="text-slate-500">Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {j.has_summary ? (
                                <span className="text-indigo-300 font-medium inline-flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Ready</span>
                                </span>
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
            <div className="surface-card p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Platform Activity Audit Logs
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Chronological system events and operational activity stream</p>
                </div>
                <span className="text-[10px] font-mono text-slate-500">Real-time DB events</span>
              </div>

              {analytics?.recent_activities?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-[#161B28] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/[0.08]">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">User</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Event Details</th>
                        <th className="py-3 px-4 rounded-r-lg">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {analytics.recent_activities.map((act) => (
                        <tr key={act.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white font-mono text-[11px]">
                            {act.user_name || "User"}
                            {act.user_email && (
                              <span className="text-[10px] text-slate-500 font-mono block font-normal">{act.user_email}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase ${
                              act.action === "study_video"
                                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                                : act.action === "process_video"
                                ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                                : act.action === "upload_video"
                                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                : "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                            }`}>
                              {act.action?.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                            {act.extra_data?.title ? (
                              <span>Video: <strong className="text-white font-medium">{act.extra_data.title}</strong></span>
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

            {/* TIER 7: PLATFORM CONFIGURATION & SYSTEM HEALTH */}
            {analytics?.system_settings && (
              <div className="surface-card p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Platform Configuration & Service Health
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Operational status of external cloud integrations, AI pipelines, and storage drivers.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {analytics.system_settings.system_status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="surface-panel p-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Cloud Storage Driver</span>
                    <h4 className="text-xs font-semibold text-cyan-400 font-mono">{analytics.system_settings.storage_provider}</h4>
                    <p className="text-[11px] text-slate-400">Persistent video storage & global CDN delivery</p>
                  </div>

                  <div className="surface-panel p-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Speech-To-Text AI Model</span>
                    <h4 className="text-xs font-semibold text-emerald-400 font-mono">{analytics.system_settings.stt_engine}</h4>
                    <p className="text-[11px] text-slate-400">Timestamped audio transcription engine</p>
                  </div>

                  <div className="surface-panel p-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">NLP Summarization Engine</span>
                    <h4 className="text-xs font-semibold text-indigo-300 font-mono">{analytics.system_settings.nlp_engine}</h4>
                    <p className="text-[11px] text-slate-400">Executive summaries & semantic key moments</p>
                  </div>

                  <div className="surface-panel p-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Database Architecture</span>
                    <h4 className="text-xs font-semibold text-slate-200 font-mono">{analytics.system_settings.database}</h4>
                    <p className="text-[11px] text-slate-400">Relational data warehouse with full RBAC schema</p>
                  </div>

                  <div className="surface-panel p-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Media Ingestion Limits</span>
                    <h4 className="text-xs font-semibold text-amber-400 font-mono">Max {analytics.system_settings.max_upload_size}</h4>
                    <p className="text-[11px] text-slate-400">Supports {analytics.system_settings.supported_formats}</p>
                  </div>

                  <div className="surface-panel p-4 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Platform Release</span>
                    <h4 className="text-xs font-semibold text-white font-mono">{analytics.system_settings.version}</h4>
                    <p className="text-[11px] text-slate-400">FastAPI backend & Next.js frontend</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
