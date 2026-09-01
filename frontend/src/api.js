import axios from "axios";

const rawBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const API = axios.create({ baseURL: rawBase });

API.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
