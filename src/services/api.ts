import type {
  AppointmentRecord,
  AppointmentStatus,
  AssistantDiagnostics,
  AssistantLanguage,
  DashboardStats,
  DetectedLanguage,
} from '../types/hospital';

export interface HealthResponse {
  status: string;
  aiMode: 'gemini' | 'demo';
  aiDiagnostics: AssistantDiagnostics;
  database: {
    engine: string;
    file: string;
    departmentsCount: number;
    doctorsCount: number;
  };
  timestamp: string;
}

export interface CreateAppointmentPayload {
  patientName: string;
  patientAge: number;
  contact: string;
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  timeSlot: string;
  reason?: string;
}

export interface AssistantApiResponse {
  reply: string;
  mode: 'gemini' | 'demo';
  detectedLanguage: DetectedLanguage;
  suggestedDepartmentId: string | null;
  suggestedDoctorId: string | null;
  suggestedAction: 'booking' | 'departments' | 'doctors' | 'tracker' | 'info' | null;
  isEmergency: boolean;
  followUpSuggestions: string[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health');
  return handleResponse<HealthResponse>(res);
}

export async function fetchAppointments(filters?: {
  status?: string;
  departmentId?: string;
  search?: string;
}): Promise<AppointmentRecord[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'All') {
    params.set('status', filters.status);
  }
  if (filters?.departmentId && filters.departmentId !== 'all') {
    params.set('departmentId', filters.departmentId);
  }
  if (filters?.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }
  const query = params.toString();
  const res = await fetch(`/api/appointments${query ? `?${query}` : ''}`);
  const data = await handleResponse<{ appointments: AppointmentRecord[] }>(res);
  return data.appointments;
}

export async function fetchAppointmentById(id: string): Promise<AppointmentRecord> {
  const res = await fetch(`/api/appointments/${encodeURIComponent(id.trim())}`);
  const data = await handleResponse<{ appointment: AppointmentRecord }>(res);
  return data.appointment;
}

export async function submitAppointment(
  payload: CreateAppointmentPayload,
): Promise<AppointmentRecord> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<{ appointment: AppointmentRecord }>(res);
  return data.appointment;
}

export async function patchAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<AppointmentRecord> {
  const res = await fetch(`/api/appointments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await handleResponse<{ appointment: AppointmentRecord }>(res);
  return data.appointment;
}

export async function removeAppointment(id: string): Promise<void> {
  const res = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await handleResponse<{ deleted: boolean }>(res);
}

export async function fetchAdminStats(): Promise<{
  stats: DashboardStats;
  aiMode: 'gemini' | 'demo';
  aiDiagnostics: AssistantDiagnostics;
  database: HealthResponse['database'];
}> {
  const res = await fetch('/api/admin/stats');
  return handleResponse(res);
}

export async function sendAssistantMessage(payload: {
  message: string;
  language: AssistantLanguage;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<AssistantApiResponse> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return await handleResponse<AssistantApiResponse>(res);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'The AI assistant request timed out after 35 seconds. Please check server connectivity and retry.',
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
