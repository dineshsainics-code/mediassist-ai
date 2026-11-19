import React, { useCallback, useEffect, useState } from 'react';
import { AdminDashboardModule } from './components/AdminDashboardModule';
import {
  AssistantModule,
  createAssistantWelcomeMessage,
} from './components/AssistantModule';
import { BookingModule } from './components/BookingModule';
import { DepartmentsModule } from './components/DepartmentsModule';
import { DoctorsModule } from './components/DoctorsModule';
import { HomeModule } from './components/HomeModule';
import { HospitalInfoModule } from './components/HospitalInfoModule';
import { SidebarLayout } from './components/SidebarLayout';
import { TrackerModule } from './components/TrackerModule';
import { fetchAdminStats } from './services/api';
import type {
  AppointmentRecord,
  AssistantDiagnostics,
  AssistantLanguage,
  BookingPrefill,
  ChatMessage,
  DashboardStats,
  ModuleId,
} from './types/hospital';

const CHAT_SESSION_STORAGE_KEY = 'mediassist_assistant_session_v2';

interface StoredChatSession {
  language: AssistantLanguage;
  messages: ChatMessage[];
}

function isValidAssistantLanguage(value: unknown): value is AssistantLanguage {
  return value === 'auto' || value === 'en' || value === 'hi' || value === 'hinglish';
}

function loadStoredChatSession(): StoredChatSession {
  try {
    const raw = window.sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (!raw) {
      return {
        language: 'auto',
        messages: [createAssistantWelcomeMessage('auto')],
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredChatSession>;
    const lang: AssistantLanguage = isValidAssistantLanguage(parsed.language)
      ? parsed.language
      : 'auto';
    const msgs =
      Array.isArray(parsed.messages) && parsed.messages.length > 0
        ? parsed.messages
        : [createAssistantWelcomeMessage(lang)];
    return { language: lang, messages: msgs };
  } catch {
    return {
      language: 'auto',
      messages: [createAssistantWelcomeMessage('auto')],
    };
  }
}

export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('home');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aiMode, setAiMode] = useState<'gemini' | 'demo' | null>(null);
  const [aiDiagnostics, setAiDiagnostics] = useState<AssistantDiagnostics | null>(null);
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | undefined>(undefined);
  const [doctorDeptFilter, setDoctorDeptFilter] = useState<string>('all');
  const [trackerTargetId, setTrackerTargetId] = useState<string>('');
  const [recentAppointments, setRecentAppointments] = useState<AppointmentRecord[]>([]);

  const initialChatSession = loadStoredChatSession();
  const [assistantLanguage, setAssistantLanguage] = useState<AssistantLanguage>(
    initialChatSession.language,
  );
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>(
    initialChatSession.messages,
  );

  useEffect(() => {
    try {
      const payload: StoredChatSession = {
        language: assistantLanguage,
        messages: assistantMessages.slice(-40),
      };
      window.sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage unavailable
    }
  }, [assistantLanguage, assistantMessages]);

  const loadLiveOverview = useCallback(async () => {
    try {
      const res = await fetchAdminStats();
      setStats(res.stats);
      setAiMode(res.aiMode);
      setAiDiagnostics(res.aiDiagnostics);
      setRecentAppointments(res.stats.recentAppointments);
    } catch {
      // Handled gracefully inside individual data views
    }
  }, []);

  useEffect(() => {
    void loadLiveOverview();
  }, [loadLiveOverview]);

  const handleNavigate = (moduleId: ModuleId) => {
    if (moduleId === 'doctors' && activeModule !== 'departments' && activeModule !== 'assistant') {
      setDoctorDeptFilter('all');
    }
    setActiveModule(moduleId);
  };

  const handleStartBooking = (prefill?: BookingPrefill) => {
    setBookingPrefill(prefill);
    setActiveModule('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDepartmentDoctors = (departmentId: string) => {
    setDoctorDeptFilter(departmentId);
    setActiveModule('doctors');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTrackAppointment = (appointmentId: string) => {
    setTrackerTargetId(appointmentId);
    setActiveModule('tracker');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAppointmentCreated = (record: AppointmentRecord) => {
    setRecentAppointments((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
    void loadLiveOverview();
  };

  const handleStatsUpdated = useCallback((nextStats: DashboardStats) => {
    setStats(nextStats);
    setRecentAppointments(nextStats.recentAppointments);
  }, []);

  const handleAssistantLanguageChange = (nextLang: AssistantLanguage) => {
    setAssistantLanguage(nextLang);
    setAssistantMessages((prev) =>
      prev.length <= 1 ? [createAssistantWelcomeMessage(nextLang)] : prev,
    );
  };

  const handleResetAssistantChat = () => {
    setAssistantMessages([createAssistantWelcomeMessage(assistantLanguage)]);
  };

  return (
    <SidebarLayout activeModule={activeModule} onNavigate={handleNavigate}>
      {activeModule === 'home' && (
        <HomeModule
          stats={stats}
          onNavigate={handleNavigate}
          onStartBooking={handleStartBooking}
        />
      )}

      {activeModule === 'assistant' && (
        <AssistantModule
          aiMode={aiMode}
          aiDiagnostics={aiDiagnostics}
          language={assistantLanguage}
          messages={assistantMessages}
          onLanguageChange={handleAssistantLanguageChange}
          onMessagesChange={setAssistantMessages}
          onResetChat={handleResetAssistantChat}
          onNavigate={handleNavigate}
          onViewDepartmentDoctors={handleViewDepartmentDoctors}
          onStartBooking={handleStartBooking}
        />
      )}

      {activeModule === 'departments' && (
        <DepartmentsModule
          onStartBooking={handleStartBooking}
          onViewDepartmentDoctors={handleViewDepartmentDoctors}
        />
      )}

      {activeModule === 'doctors' && (
        <DoctorsModule
          initialDepartmentFilter={doctorDeptFilter}
          onStartBooking={handleStartBooking}
        />
      )}

      {activeModule === 'booking' && (
        <BookingModule
          prefill={bookingPrefill}
          onAppointmentCreated={handleAppointmentCreated}
          onTrackAppointment={handleTrackAppointment}
        />
      )}

      {activeModule === 'tracker' && (
        <TrackerModule
          initialAppointmentId={trackerTargetId}
          recentAppointments={recentAppointments}
          onBookNew={() => handleStartBooking()}
        />
      )}

      {activeModule === 'info' && (
        <HospitalInfoModule onStartBooking={handleStartBooking} />
      )}

      {activeModule === 'admin' && (
        <AdminDashboardModule
          onStatsUpdated={handleStatsUpdated}
          onTrackAppointment={handleTrackAppointment}
        />
      )}
    </SidebarLayout>
  );
}

export default App;
