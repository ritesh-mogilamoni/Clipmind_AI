import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to inject JWT token into authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("clipmind_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper API functions
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
};

export default api;
