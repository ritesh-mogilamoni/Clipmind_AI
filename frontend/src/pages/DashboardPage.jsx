import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { videosApi } from "../api/client";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  // Upload state
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const fileInputRef = useRef(null);

  const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
  const MAX_FILE_SIZE_MB = 500;

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const data = await videosApi.listVideos();
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleFileChange = (e) => {
    setUploadError("");
    setUploadSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Unsupported file format '${ext}'. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !title) {
      setUploadError("Please enter a title and choose a file.");
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
      fetchVideos();
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "N/A";
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">ClipMind AI</h1>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-900">{user?.name}</span>{" "}
              <span className="text-xs text-slate-500">({user?.role})</span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Upload Form Section */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Upload Video</h2>

          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
              Video uploaded successfully!
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video title"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Video File</label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".mp4,.mov,.avi,.webm,.mkv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-slate-500 mt-1">Allowed: MP4, MOV, AVI, WEBM, MKV</p>
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="text-xs text-slate-600">Uploading: {uploadProgress}%</div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile || !title}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload Video"}
            </button>
          </form>
        </div>

        {/* Video List Section */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Your Uploaded Videos ({videos.length})</h2>
            <button
              onClick={fetchVideos}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium border border-slate-200"
            >
              Refresh List
            </button>
          </div>

          {loadingVideos ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm border border-dashed border-slate-200 rounded">
              No videos uploaded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase text-xs border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Uploaded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {videos.map((vid) => (
                    <tr key={vid.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{vid.title}</td>
                      <td className="py-2.5 px-3 uppercase text-xs">{vid.format || "N/A"}</td>
                      <td className="py-2.5 px-3">{formatDuration(vid.duration_seconds)}</td>
                      <td className="py-2.5 px-3">{formatBytes(vid.file_size_bytes)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                          {vid.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">
                        {new Date(vid.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
