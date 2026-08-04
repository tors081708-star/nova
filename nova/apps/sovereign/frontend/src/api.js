import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 120000 });

export const api = {
  getSettings: () => http.get("/settings").then((r) => r.data),
  saveSettings: (body) => http.post("/settings", body).then((r) => r.data),
  getModels: () => http.get("/models").then((r) => r.data),
  chat: (body) => http.post("/chat", body).then((r) => r.data),
  getSessions: () => http.get("/sessions").then((r) => r.data),
  getHistory: (id) => http.get(`/history/${id}`).then((r) => r.data),
  plan: (body) => http.post("/agents/plan", body).then((r) => r.data),
  dispatch: (body) => http.post("/agents/dispatch", body).then((r) => r.data),
  critic: (body) => http.post("/agents/critic", body).then((r) => r.data),
  runs: () => http.get("/agents/runs").then((r) => r.data),
  systemHealth: () => http.get("/system/health").then((r) => r.data),
  prove: () => http.post("/system/prove").then((r) => r.data),
};

export function errText(e) {
  return e?.response?.data?.detail || e?.message || "Something went wrong";
}
