const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getSubjects: () => request("/subjects"),
  createSubject: (name: string, weight = 1, color = "#D9E1F2") =>
    request("/subjects", { method: "POST", body: JSON.stringify({ name, weight, color }) }),
  createTopic: (subjectId: string, name: string) =>
    request(`/subjects/${subjectId}/topics`, { method: "POST", body: JSON.stringify({ name }) }),

  getSessions: (from: string, to: string) => request(`/sessions?from=${from}&to=${to}`),
  createSession: (payload: { subjectId: string; topicId?: string; date: string; type?: string; minutes?: number }) =>
    request("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  patchSession: (id: string, payload: Record<string, unknown>) =>
    request(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSession: (id: string) => request(`/sessions/${id}`, { method: "DELETE" }),

  getWeeklyStats: (from: string, weeks = 16) => request(`/stats/weekly?from=${from}&weeks=${weeks}`),
  getHoursStats: () => request("/stats/hours"),
};
