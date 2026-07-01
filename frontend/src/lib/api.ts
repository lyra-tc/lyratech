const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lyratech_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("lyratech_token");
    localStorage.removeItem("lyratech_user");
    window.location.href = "/dashboard/login";
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(err.detail || "Error en la solicitud");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface UserInfo {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: LeadStatus;
  source?: string;
  notes?: string;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "closed"
  | "lost";

export interface LeadCreate {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: LeadStatus;
  source?: string;
  notes?: string;
}

export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, full_name: string, password: string) =>
    request<UserInfo>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, full_name, password }),
    }),
  me: () => request<UserInfo>("/api/auth/me"),
  updateProfile: (data: { full_name?: string; email?: string }) =>
    request<UserInfo>("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  changePassword: (current_password: string, new_password: string) =>
    request<void>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ current_password, new_password }),
    }),
};

export const leadsApi = {
  list: () => request<Lead[]>("/api/leads/"),
  create: (data: LeadCreate) =>
    request<Lead>("/api/leads/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<LeadCreate> & { status?: LeadStatus }) =>
    request<Lead>(`/api/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<void>(`/api/leads/${id}`, { method: "DELETE" }),
};
