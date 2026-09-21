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
  register: (email: string, password: string, name: string, examName: string, template: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name, examName, template }) }),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getAvailability: () => request("/schedule/availability"),
  saveAvailability: (windows: { weekday: number; start: string; end: string }[]) =>
    request("/schedule/availability", { method: "PUT", body: JSON.stringify({ windows }) }),
  getEvents: (from: string, to: string) => request(`/schedule/events?from=${from}&to=${to}`),
  getAllEvents: () => request("/schedule/events"),
  createEvent: (payload: Record<string, unknown>) => request("/schedule/events", { method: "POST", body: JSON.stringify(payload) }),
  deleteEvent: (id: string) => request(`/schedule/events/${id}`, { method: "DELETE" }),

  updateSubject: (id: string, payload: Record<string, unknown>) =>
    request(`/subjects/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSubject: (id: string) => request(`/subjects/${id}`, { method: "DELETE" }),
  updateTopic: (id: string, payload: Record<string, unknown>) =>
    request(`/subjects/topics/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTopic: (id: string) => request(`/subjects/topics/${id}`, { method: "DELETE" }),

  getSimulados: () => request("/simulados"),
  createSimulado: (payload: Record<string, unknown>) => request("/simulados", { method: "POST", body: JSON.stringify(payload) }),
  deleteSimulado: (id: string) => request(`/simulados/${id}`, { method: "DELETE" }),

  getErrors: () => request("/errors"),
  createError: (payload: Record<string, unknown>) => request("/errors", { method: "POST", body: JSON.stringify(payload) }),
  patchError: (id: string, payload: Record<string, unknown>) => request(`/errors/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteError: (id: string) => request(`/errors/${id}`, { method: "DELETE" }),

  getMe: () => request("/me"),
  updateMe: (payload: Record<string, unknown>) => request("/me", { method: "PATCH", body: JSON.stringify(payload) }),
  getDashboard: (today: string, from: string, to: string) => request(`/stats/dashboard?today=${today}&from=${from}&to=${to}`),
  getReviews: () => request("/sessions?kind=review"),

  getSubjects: () => request("/subjects"),
  createSubject: (name: string, weight = 1, color = "#D9E1F2") =>
    request("/subjects", { method: "POST", body: JSON.stringify({ name, weight, color }) }),
  createTopic: (subjectId: string, name: string) =>
    request(`/subjects/${subjectId}/topics`, { method: "POST", body: JSON.stringify({ name }) }),

  getSessions: (from: string, to: string) => request(`/sessions?from=${from}&to=${to}`),
  getBacklog: () => request("/sessions?status=POSTPONED"),
  createSession: (payload: { subjectId: string; topicId?: string; date: string; type?: string; minutes?: number; note?: string }) =>
    request("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  patchSession: (id: string, payload: Record<string, unknown>) =>
    request(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSession: (id: string) => request(`/sessions/${id}`, { method: "DELETE" }),

  getWeeklyStats: (from: string, weeks = 16) => request(`/stats/weekly?from=${from}&weeks=${weeks}`),
  getHoursStats: () => request("/stats/hours"),
};
