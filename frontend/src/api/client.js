import axios from "axios";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const API_BASE_URL = rawApiUrl.trim().replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("clipmind_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  signup: async (userData) => {
    const response = await api.post("/auth/signup", userData);
    return response.data;
  },
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    const response = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export const videosApi = {
  importVideoUrl: async (url, title) => {
    const response = await api.post("/videos/import-url", { url, title });
    return response.data;
  },
  uploadVideo: async (title, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    const response = await api.post("/videos/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    });
    return response.data;
  },
  listVideos: async () => {
    const response = await api.get("/videos/");
    return response.data;
  },
  getVideo: async (id) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },
  getVideoFileUrl: (id, video = null) => {
    if (video && video.storage_path && (video.storage_path.startsWith("http://") || video.storage_path.startsWith("https://"))) {
      let url = video.storage_path;
      if (url.includes("res.cloudinary.com")) {
        url = url.replace(/\.[a-zA-Z0-9]+$/, ".mp4");
      }
      return url;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("clipmind_token") : "";
    return `${API_BASE_URL}/videos/${id}/file?token=${token}`;
  },
  processVideo: async (id) => {
    const response = await api.post(`/videos/${id}/process`);
    return response.data;
  },
  updateTranscript: async (id, transcript_text, segments) => {
    const response = await api.put(`/videos/${id}/transcript`, {
      transcript_text,
      segments,
    });
    return response.data;
  },
  exportVideo: async (id, format = "txt") => {
    if (format === "json") {
      const response = await api.get(`/videos/${id}/export?format=json`);
      return response.data;
    }
    const response = await api.get(`/videos/${id}/export?format=txt`, {
      responseType: "blob",
    });
    return response.data;
  },
  deleteVideo: async (id) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },
  bookmarkVideo: async (id, note) => {
    const formData = new FormData();
    if (note) formData.append("note", note);
    const response = await api.post(`/videos/${id}/bookmark`, formData);
    return response.data;
  },
  getMyBookmarks: async () => {
    const response = await api.get("/videos/bookmarks/me");
    return response.data;
  },
  deleteBookmark: async (bookmarkId) => {
    const response = await api.delete(`/videos/bookmarks/${bookmarkId}`);
    return response.data;
  },
  recordStudy: async (videoId) => {
    const response = await api.post(`/videos/${videoId}/study`);
    return response.data;
  },
  getStudyHistory: async () => {
    const response = await api.get("/videos/history/me");
    return response.data;
  },
};

export const analyticsApi = {
  getDashboardStats: async () => {
    const response = await api.get("/analytics/dashboard");
    return response.data;
  },
  getAdminUserStats: async () => {
    const response = await api.get("/analytics/admin/users");
    return response.data;
  },
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/analytics/admin/users/${userId}/role`, { role });
    return response.data;
  },
  getAdminJobs: async () => {
    const response = await api.get("/analytics/admin/jobs");
    return response.data;
  },
};

export default api;
