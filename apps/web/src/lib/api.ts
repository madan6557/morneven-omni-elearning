import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || "";
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use((response) => {
  if (typeof response.data === "string" && response.data.trimStart().startsWith("<")) {
    return Promise.reject(new Error("API returned HTML instead of JSON. Check VITE_API_URL."));
  }
  return response;
});

export default api;

export function ytId(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    return u.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

export function ytEmbed(url: string) {
  const id = ytId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

export function driveEmbed(url: string) {
  const match = url.match(/\/d\/([^\/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : url;
}
