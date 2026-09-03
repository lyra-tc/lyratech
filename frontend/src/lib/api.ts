const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuthRedirect?: boolean } = {}
): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Auth travels in an httpOnly session cookie, so every request must send
  // credentials (the frontend and API share the lyratech.com.mx parent domain).
  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !skipAuthRedirect) {
    window.location.href = "/dashboard/login";
    throw new Error("No autorizado");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const detail = Array.isArray(err.detail)
      ? err.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join(", ")
      : err.detail;
    throw new ApiError(
      detail || "Error en la solicitud",
      res.status,
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface UserInfo {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_superadmin: boolean;
  created_at: string;
}

export interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  message?: string;
  created_at: string;
}

export interface LeadManualCreate {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  message?: string;
}

export interface LeadSubmit {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  message?: string;
  turnstile_token: string;
}

export type ProspectStatus = "meeting_to_schedule" | "call_later" | "meeting_scheduled" | "lost";

export interface Prospect {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  status: ProspectStatus;
  source?: string;
  notes?: string;
  assigned_to?: number;
  created_at: string;
  updated_at: string;
}

export interface ProspectCreate {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  service?: string;
  status?: ProspectStatus;
  source?: string;
  notes?: string;
}

export const auth = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuthRedirect: true,
    }),
  register: (email: string, full_name: string, password: string) =>
    request<UserInfo>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, full_name, password }),
    }),
  me: (options?: { skipAuthRedirect?: boolean }) =>
    request<UserInfo>("/api/auth/me", options),
  logout: () =>
    request<void>("/api/auth/logout", { method: "POST", skipAuthRedirect: true }),
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

export const usersApi = {
  list: () => request<UserInfo[]>("/api/users/"),
  update: (id: number, data: { is_active?: boolean; is_admin?: boolean }) =>
    request<UserInfo>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  resetPassword: (id: number, new_password: string) =>
    request<void>(`/api/users/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ new_password }),
    }),
  remove: (id: number) =>
    request<void>(`/api/users/${id}`, {
      method: "DELETE",
    }),
};

export const leadsApi = {
  list: () => request<Lead[]>("/api/leads/"),
  createManual: (data: LeadManualCreate) =>
    request<Lead>("/api/leads/manual", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<LeadManualCreate>) =>
    request<Lead>(`/api/leads/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/api/leads/${id}`, { method: "DELETE" }),
};

export async function submitLead(data: LeadSubmit): Promise<Lead> {
  const res = await fetch(`${API_URL}/api/leads/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(err.detail || "Error en la solicitud", res.status);
  }
  return res.json();
}

export const prospectsApi = {
  list: () => request<Prospect[]>("/api/prospects/"),
  create: (data: ProspectCreate) =>
    request<Prospect>("/api/prospects/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<ProspectCreate>) =>
    request<Prospect>(`/api/prospects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) =>
    request<void>(`/api/prospects/${id}`, { method: "DELETE" }),
};

export interface NotificationRecipient {
  id: number;
  email: string;
  created_at: string;
}

export interface NotificationTestResponse {
  message: string;
}

export const notificationsApi = {
  list: () => request<NotificationRecipient[]>("/api/notifications/recipients"),
  create: (email: string) =>
    request<NotificationRecipient>("/api/notifications/recipients", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  sendTest: (id: number) =>
    request<NotificationTestResponse>(`/api/notifications/recipients/${id}/test`, {
      method: "POST",
    }),
  remove: (id: number) =>
    request<void>(`/api/notifications/recipients/${id}`, { method: "DELETE" }),
};

// --- Diagnostic GO -----------------------------------------------------

export interface DiagnosticActiveOption {
  value: string;
  label: string;
}

export interface DiagnosticActiveQuestion {
  key: string;
  type: "single_choice" | "multi_choice" | "open_text";
  sort_order: number;
  is_required: boolean;
  label: string;
  placeholder: string;
  help_text: string;
  options: DiagnosticActiveOption[];
}

export interface DiagnosticSubmitPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  locale: string;
  answers: Record<string, string[]>;
  turnstile_token: string;
}

export interface DiagnosticSubmitResult {
  submission_id: number;
  headline: string;
  summary: string;
  recommended_service: string;
  secondary_service?: string;
  why_it_fits: string;
  key_opportunities: string[];
  suggested_next_steps: string[];
  confidence_note: string;
  service_scores: Record<string, number>;
}

export async function getActiveDiagnosticQuestions(
  locale: string
): Promise<DiagnosticActiveQuestion[]> {
  const res = await fetch(
    `${API_URL}/api/diagnostics/questions/active?locale=${encodeURIComponent(locale)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(err.detail || "Error en la solicitud", res.status);
  }
  return res.json();
}

export async function submitDiagnostic(
  data: DiagnosticSubmitPayload
): Promise<DiagnosticSubmitResult> {
  const res = await fetch(`${API_URL}/api/diagnostics/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(err.detail || "Error en la solicitud", res.status);
  }
  return res.json();
}

export interface DiagnosticSubmissionListItem {
  id: number;
  name: string;
  email: string;
  company?: string;
  locale: string;
  recommended_primary_service: string;
  recommended_secondary_service?: string;
  email_delivery_status: string;
  email_provider_id?: string;
  conversion_status: string;
  converted_prospect_id?: number;
  created_at: string;
}

export interface DiagnosticSubmissionDetail extends DiagnosticSubmissionListItem {
  phone?: string;
  raw_answers_json: Record<string, string[]>;
  normalized_answers_en_json: Record<string, string[]>;
  service_scores_json: Record<string, number>;
  automation_approach?: string;
  llm_provider?: string;
  llm_model?: string;
  llm_response_json?: Record<string, unknown>;
  llm_status: string;
  email_delivery_error?: string;
}

export interface DiagnosticQuestionOption {
  value: string;
  labels: Record<string, string>;
  score_weights: Record<string, number>;
}

export interface DiagnosticQuestionConfig {
  labels: Record<string, string>;
  placeholder: Record<string, string>;
  help_text: Record<string, string>;
  options: DiagnosticQuestionOption[];
}

export interface DiagnosticQuestion {
  id: number;
  key: string;
  type: string;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
  config_json: DiagnosticQuestionConfig;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticQuestionInput {
  key: string;
  type: string;
  sort_order: number;
  is_active: boolean;
  is_required: boolean;
  config_json: DiagnosticQuestionConfig;
}

export const diagnosticsApi = {
  listSubmissions: (search = "", conversion = "") => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (conversion) params.set("conversion", conversion);
    const qs = params.toString();
    return request<DiagnosticSubmissionListItem[]>(
      `/api/diagnostics/submissions${qs ? `?${qs}` : ""}`
    );
  },
  getSubmission: (id: number) =>
    request<DiagnosticSubmissionDetail>(`/api/diagnostics/submissions/${id}`),
  refreshEmailStatus: () =>
    request<DiagnosticSubmissionListItem[]>(
      "/api/diagnostics/submissions/refresh-email-status",
      { method: "POST" }
    ),
  markConverted: (submissionId: number, prospectId: number) =>
    request<DiagnosticSubmissionDetail>(
      `/api/diagnostics/submissions/${submissionId}/mark-converted`,
      { method: "POST", body: JSON.stringify({ prospect_id: prospectId }) }
    ),
  removeSubmission: (id: number) =>
    request<void>(`/api/diagnostics/submissions/${id}`, { method: "DELETE" }),
  listQuestions: () => request<DiagnosticQuestion[]>("/api/diagnostics/questions"),
  createQuestion: (data: DiagnosticQuestionInput) =>
    request<DiagnosticQuestion>("/api/diagnostics/questions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateQuestion: (id: number, data: Partial<DiagnosticQuestionInput>) =>
    request<DiagnosticQuestion>(`/api/diagnostics/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  reorderQuestions: (orderedIds: number[]) =>
    request<void>("/api/diagnostics/questions/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ordered_ids: orderedIds }),
    }),
};
