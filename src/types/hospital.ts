export type ModuleId =
  | 'home'
  | 'assistant'
  | 'departments'
  | 'doctors'
  | 'booking'
  | 'tracker'
  | 'info'
  | 'admin';

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export type AssistantLanguage = 'auto' | 'en' | 'hi' | 'hinglish';

export type DetectedLanguage = 'en' | 'hi' | 'hinglish';

export interface Department {
  id: string;
  name: string;
  hindiName: string;
  tagline: string;
  hindiTagline?: string;
  description: string;
  hindiDescription?: string;
  floor: string;
  wing: string;
  opdHours: string;
  consultationDeskExt: string;
  conditions: string[];
  services: string[];
  keywords: string[];
  leadDoctorId: string;
  teamSize: number;
}

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  departmentId: string;
  departmentName: string;
  specialization: string;
  experienceYears: number;
  languages: string[];
  availabilityDays: string;
  availabilityHours: string;
  availableToday: boolean;
  roomNumber: string;
  consultationFee: number;
  slots: string[];
  bio: string;
  photoUrl: string;
  initials: string;
}

export interface AppointmentRecord {
  id: string;
  patientName: string;
  patientAge: number;
  contact: string;
  departmentId: string;
  departmentName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalAppointments: number;
  pendingCount: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName: string;
    count: number;
  }>;
  statusBreakdown: Array<{
    status: AppointmentStatus;
    count: number;
  }>;
  recentAppointments: AppointmentRecord[];
}

export interface AssistantDiagnostics {
  configured: boolean;
  mode: 'gemini' | 'demo';
  model: string;
  missingEnvVars: string[];
  configurationHelp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedDepartmentId?: string | null;
  suggestedDoctorId?: string | null;
  suggestedAction?: 'booking' | 'departments' | 'doctors' | 'tracker' | 'info' | null;
  followUpSuggestions?: string[];
  isEmergency?: boolean;
  detectedLanguage?: DetectedLanguage;
  mode?: 'gemini' | 'demo';
}

export interface BookingPrefill {
  departmentId?: string;
  doctorId?: string;
  timeSlot?: string;
}
