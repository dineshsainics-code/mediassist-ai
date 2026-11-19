import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarPlus,
  ClipboardCheck,
  Info,
  Loader2,
  Phone,
  RotateCcw,
  Send,
  ShieldAlert,
  Stethoscope,
} from 'lucide-react';
import { getDepartmentById, getDoctorById, HOSPITAL_PROFILE } from '../data/hospitalData';
import { sendAssistantMessage } from '../services/api';
import type {
  AssistantDiagnostics,
  AssistantLanguage,
  BookingPrefill,
  ChatMessage,
  ModuleId,
} from '../types/hospital';

interface AssistantModuleProps {
  aiMode: 'gemini' | 'demo' | null;
  aiDiagnostics: AssistantDiagnostics | null;
  language: AssistantLanguage;
  messages: ChatMessage[];
  onLanguageChange: (language: AssistantLanguage) => void;
  onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onResetChat: () => void;
  onNavigate: (module: ModuleId) => void;
  onViewDepartmentDoctors: (departmentId: string) => void;
  onStartBooking: (prefill?: BookingPrefill) => void;
}

const STARTER_PROMPTS: Record<AssistantLanguage, string[]> = {
  auto: [
    'Which department handles knee and joint pain?',
    'अस्पताल के सभी 6 विभागों और उनके फ्लोर के बारे में बताएं',
    'Mujhe ghutne me dard hai, kis doctor se milna chahiye?',
    'How do I book and track an outpatient appointment?',
    'Hospital ke OPD timings aur emergency numbers kya hain?',
  ],
  en: [
    'Explain all 6 hospital departments and their floors',
    'Which doctors speak Hindi and what are their OPD hours?',
    'Which department handles knee and joint pain?',
    'How do I book and track an outpatient appointment?',
    'What are the hospital visiting hours and emergency numbers?',
  ],
  hi: [
    'अस्पताल के सभी 6 विभागों और उनके फ्लोर के बारे में बताएं',
    'हिंदी बोलने वाले डॉक्टर कौन-कौन हैं और उनके ओपीडी समय क्या हैं?',
    'घुटने या जोड़ों के दर्द के लिए किस विभाग में जाना चाहिए?',
    'मैं अपना अपॉइंटमेंट कैसे बुक और ट्रैक कर सकता हूँ?',
    'अस्पताल के आपातकालीन नंबर और मिलने के समय क्या हैं?',
  ],
  hinglish: [
    'Hospital ke sabhi 6 departments aur unke floors ke baare me bataiye',
    'Kaunse doctors Hindi bolte hain aur unke OPD timings kya hain?',
    'Mujhe ghutne me dard hai, kis department me jana chahiye?',
    'Apna appointment kaise book aur track karein?',
    'Hospital ke emergency numbers aur visiting hours kya hain?',
  ],
};

export function createAssistantWelcomeMessage(language: AssistantLanguage): ChatMessage {
  let content: string;
  let followUpSuggestions: string[];

  if (language === 'hi') {
    content = `नमस्ते! मैं MediAssist AI हूँ — ${HOSPITAL_PROFILE.hindiHospitalName} का स्वचालित रोगी सहायता गाइड (मैं डॉक्टर नहीं हूँ)।\n\nमैं आपको हमारे 6 विभागों को समझने, डॉक्टर डायरेक्टरी में विशेषज्ञों के समय देखने, अपॉइंटमेंट बुक करने, और अस्पताल के समय व आपातकालीन संपर्क जानने में मदद कर सकता हूँ।\n\nकृपया ध्यान दें: मैं किसी बीमारी का निदान नहीं करता, दवा नहीं लिखता और उपचार की सलाह नहीं देता। आप आज किस सेवा के बारे में पूछना चाहते हैं?`;
    followUpSuggestions = [
      'सभी 6 विभागों के बारे में बताएं',
      'अपॉइंटमेंट बुक करने की प्रक्रिया बताएं',
    ];
  } else if (language === 'hinglish') {
    content = `Namaste! Main MediAssist AI hoon — ${HOSPITAL_PROFILE.hospitalName} ka automated patient navigation guide (main doctor nahi hoon).\n\nMain aapko hamare 6 departments samjhane, Doctor Directory me specialists ke timings dekhne, appointment book/track karne, aur hospital contacts batane me help kar sakta hoon.\n\nDhyan dein: Main kisi bimari ka diagnosis nahi karta aur na hi koi dawai prescribe karta hoon. Aaj aapko kis service ke baare me jaankari chahiye?`;
    followUpSuggestions = [
      'Sabhi 6 departments ke baare me bataiye',
      'Appointment book karne ka process bataiye',
    ];
  } else {
    content = `Hello! I am MediAssist AI, the automated patient navigation assistant for ${HOSPITAL_PROFILE.hospitalName} (I am an AI guide, not a doctor).\n\nYou can write in English, हिन्दी (Hindi), or Hinglish — I will reply in the same language and script. I can explain our 6 departments, browse doctor schedules, walk you through booking or tracking an appointment, and share hospital timings.\n\nPlease note: I never diagnose diseases, prescribe medicines, or recommend treatments. How can I help you navigate our hospital today?`;
    followUpSuggestions = [
      'Explain all 6 hospital departments',
      'अस्पताल के समय क्या हैं?',
      'Appointment kaise book karein?',
    ];
  }

  return {
    id: `welcome-${language}`,
    role: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content,
    suggestedAction: null,
    suggestedDepartmentId: null,
    suggestedDoctorId: null,
    isEmergency: false,
    followUpSuggestions,
  };
}

export const AssistantModule: React.FC<AssistantModuleProps> = ({
  aiMode,
  aiDiagnostics,
  language,
  messages,
  onLanguageChange,
  onMessagesChange,
  onResetChat,
  onNavigate,
  onViewDepartmentDoctors,
  onStartBooking,
}) => {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<'gemini' | 'demo' | null>(aiMode);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (aiMode !== null) {
      setRuntimeMode(aiMode);
    }
  }, [aiMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, errorMessage]);

  const handleLanguageSwitch = (nextLang: AssistantLanguage) => {
    if (nextLang === language) return;
    onLanguageChange(nextLang);
    setErrorMessage(null);
    setLastFailedPrompt(null);
  };

  const handleReset = () => {
    onResetChat();
    setErrorMessage(null);
    setLastFailedPrompt(null);
    setInput('');
  };

  const dispatchMessage = async (text: string, appendUserTurn: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    let conversationSnapshot = messages;
    if (appendUserTurn) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      conversationSnapshot = [...messages, userMsg];
      onMessagesChange(conversationSnapshot);
      setInput('');
    }

    setErrorMessage(null);
    setLastFailedPrompt(null);
    setIsSending(true);

    try {
      // Keep only completed alternating turns prior to the current prompt
      const priorTurns = conversationSnapshot
        .filter((m) => !m.id.startsWith('welcome-'))
        .slice(0, -1);

      const historyPayload: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      for (const turn of priorTurns) {
        const last = historyPayload[historyPayload.length - 1];
        if (last && last.role === turn.role) {
          historyPayload[historyPayload.length - 1] = { role: turn.role, content: turn.content };
        } else {
          historyPayload.push({ role: turn.role, content: turn.content });
        }
      }
      // Drop leading assistant turn or trailing unanswered user turn so Gemini receives clean alternating pairs
      while (historyPayload.length > 0 && historyPayload[0].role === 'assistant') {
        historyPayload.shift();
      }
      while (historyPayload.length > 0 && historyPayload[historyPayload.length - 1].role === 'user') {
        historyPayload.pop();
      }

      const response = await sendAssistantMessage({
        message: trimmed,
        language,
        history: historyPayload.slice(-24),
      });

      setRuntimeMode(response.mode);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedDepartmentId: response.suggestedDepartmentId,
        suggestedDoctorId: response.suggestedDoctorId,
        suggestedAction: response.suggestedAction,
        followUpSuggestions: response.followUpSuggestions,
        isEmergency: response.isEmergency,
        detectedLanguage: response.detectedLanguage,
        mode: response.mode,
      };
      onMessagesChange((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach the assistant backend. Please check server connectivity and try again.';
      setErrorMessage(msg);
      setLastFailedPrompt(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void dispatchMessage(input, true);
  };

  const latestAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
  const sessionTurnCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="space-y-6">
      {/* Header & Language Switch */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-blue-700">
            Hospital Navigation Assistant · English, हिन्दी &amp; Hinglish · Session Context (
            {sessionTurnCount} {sessionTurnCount === 1 ? 'query' : 'queries'})
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            AI Patient Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ask in English, Hindi (देवनागरी), or Hinglish for hospital departments, Doctor
            Directory, appointment booking, and timings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            role="group"
            aria-label="Assistant response language"
            className="inline-flex items-center p-1 rounded-lg bg-slate-200/70"
          >
            {(
              [
                { id: 'auto', label: 'Auto' },
                { id: 'en', label: 'English' },
                { id: 'hi', label: 'हिन्दी' },
                { id: 'hinglish', label: 'Hinglish' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleLanguageSwitch(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  language === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Clearly Labelled Demo Mode Banner with Exact Missing Configuration Details */}
      {runtimeMode === 'demo' && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 flex items-start gap-3 text-sm text-amber-950"
        >
          <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p>
              <span className="font-semibold">Demo Mode Active (Gemini API Not Configured):</span>{' '}
              {aiDiagnostics?.configurationHelp ??
                'Server environment variable GEMINI_API_KEY is not set. Configure GEMINI_API_KEY in Settings > Secrets or a server .env file and restart the server for live Gemini AI responses.'}
            </p>
            <p className="text-xs text-amber-900">
              Missing config:{' '}
              <code className="font-mono font-semibold">
                {aiDiagnostics?.missingEnvVars.join(', ') || 'GEMINI_API_KEY'}
              </code>{' '}
              · Currently using the built-in trilingual hospital navigation guide (English, हिन्दी,
              Hinglish).
            </p>
          </div>
        </div>
      )}

      {/* Main Split: Chat Viewport + Quick Starters & Safety Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chat Thread */}
        <section
          aria-label="Patient assistant conversation"
          className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[610px]"
        >
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const suggestedDept = msg.suggestedDepartmentId
                ? getDepartmentById(msg.suggestedDepartmentId)
                : undefined;
              const suggestedDoc = msg.suggestedDoctorId
                ? getDoctorById(msg.suggestedDoctorId)
                : undefined;
              const isLatestAssistant = !isUser && msg.id === latestAssistantId;
              const msgLang = msg.detectedLanguage ?? (language === 'auto' ? 'en' : language);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {isUser ? 'You' : 'MediAssist AI'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{msg.timestamp}</span>
                    {!isUser && msg.detectedLanguage && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {msg.detectedLanguage === 'hi'
                            ? 'हिन्दी'
                            : msg.detectedLanguage === 'hinglish'
                              ? 'Hinglish'
                              : 'English'}
                        </span>
                      </>
                    )}
                    {!isUser && msg.mode === 'demo' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700">Demo Mode</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      isUser
                        ? 'bg-blue-700 text-white'
                        : msg.isEmergency
                          ? 'bg-red-50 border border-red-200 text-red-950'
                          : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Emergency Escalation Strip */}
                  {!isUser && msg.isEmergency && (
                    <div className="mt-2.5 w-full max-w-[90%] bg-white border border-red-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 text-xs text-red-900">
                        <Phone className="w-4 h-4 text-red-700 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">
                            {msgLang === 'hi'
                              ? 'तत्काल आपातकालीन सहायता (24/7)'
                              : msgLang === 'hinglish'
                                ? 'Turant Emergency Care (24/7)'
                                : 'Immediate Emergency Care (24/7)'}
                          </p>
                          <p className="mt-0.5 font-mono tabular-nums">
                            Emergency: {HOSPITAL_PROFILE.emergencyPhone} · Ambulance:{' '}
                            {HOSPITAL_PROFILE.ambulanceHelpline}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('info')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>
                          {msgLang === 'hi'
                            ? 'आपातकालीन जानकारी'
                            : msgLang === 'hinglish'
                              ? 'Emergency Info Dekhein'
                              : 'Emergency Info'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {/* Contextual Navigation Action Buttons */}
                  {!isUser &&
                    !msg.isEmergency &&
                    (suggestedDept || suggestedDoc || msg.suggestedAction) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {suggestedDoc && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartBooking({
                                departmentId: suggestedDoc.departmentId,
                                doctorId: suggestedDoc.id,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? `${suggestedDoc.name} के साथ बुक करें`
                                : msgLang === 'hinglish'
                                  ? `${suggestedDoc.name} ke saath Book karein`
                                  : `Book with ${suggestedDoc.name}`}
                            </span>
                          </button>
                        )}

                        {!suggestedDoc && suggestedDept && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartBooking({
                                departmentId: suggestedDept.id,
                                doctorId: suggestedDept.leadDoctorId,
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? `${suggestedDept.name} अपॉइंटमेंट बुक करें`
                                : msgLang === 'hinglish'
                                  ? `${suggestedDept.name} Appointment Book karein`
                                  : `Book ${suggestedDept.name}`}
                            </span>
                          </button>
                        )}

                        {suggestedDept && (
                          <button
                            type="button"
                            onClick={() => onViewDepartmentDoctors(suggestedDept.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? `${suggestedDept.name} डॉक्टर देखें`
                                : msgLang === 'hinglish'
                                  ? `${suggestedDept.name} Doctors Dekhein`
                                  : `View ${suggestedDept.name} Doctors`}
                            </span>
                          </button>
                        )}

                        {msg.suggestedAction === 'doctors' && !suggestedDept && (
                          <button
                            type="button"
                            onClick={() => onNavigate('doctors')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? 'डॉक्टर डायरेक्टरी खोलें'
                                : msgLang === 'hinglish'
                                  ? 'Doctor Directory Kholein'
                                  : 'Open Doctor Directory'}
                            </span>
                          </button>
                        )}

                        {msg.suggestedAction === 'departments' && !suggestedDept && (
                          <button
                            type="button"
                            onClick={() => onNavigate('departments')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? 'सभी विभाग देखें'
                                : msgLang === 'hinglish'
                                  ? 'Department Finder Kholein'
                                  : 'Open Department Finder'}
                            </span>
                          </button>
                        )}

                        {msg.suggestedAction === 'tracker' && (
                          <button
                            type="button"
                            onClick={() => onNavigate('tracker')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? 'अपॉइंटमेंट ट्रैक करें'
                                : msgLang === 'hinglish'
                                  ? 'Appointment Track karein'
                                  : 'Open Appointment Tracker'}
                            </span>
                          </button>
                        )}

                        {msg.suggestedAction === 'info' && (
                          <button
                            type="button"
                            onClick={() => onNavigate('info')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <Info className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>
                              {msgLang === 'hi'
                                ? 'अस्पताल समय और संपर्क'
                                : msgLang === 'hinglish'
                                  ? 'Hospital Timings & Contacts'
                                  : 'Hospital Timings & Contacts'}
                            </span>
                          </button>
                        )}

                        {msg.suggestedAction === 'booking' &&
                          !suggestedDept &&
                          !suggestedDoc && (
                            <button
                              type="button"
                              onClick={() => onStartBooking()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>
                                {msgLang === 'hi'
                                  ? 'अपॉइंटमेंट बुकिंग खोलें'
                                  : msgLang === 'hinglish'
                                    ? 'Appointment Booking Kholein'
                                    : 'Go to Appointment Booking'}
                              </span>
                            </button>
                          )}
                      </div>
                    )}

                  {/* Dynamic Follow-Up Question Buttons on Latest Assistant Turn */}
                  {isLatestAssistant &&
                    msg.followUpSuggestions &&
                    msg.followUpSuggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 max-w-[90%]">
                        {msg.followUpSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            disabled={isSending}
                            onClick={() => void dispatchMessage(suggestion, true)}
                            className="text-left px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/60 text-xs text-slate-700 hover:text-blue-900 transition-colors disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {isSending && (
              <div
                aria-live="polite"
                className="flex items-center gap-2.5 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 w-fit"
              >
                <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" aria-hidden="true" />
                <span>
                  {language === 'hi'
                    ? 'MediAssist AI उत्तर तैयार कर रहा है...'
                    : language === 'hinglish'
                      ? 'MediAssist AI aapka jawab taiyaar kar raha hai...'
                      : 'MediAssist AI is preparing hospital guidance...'}
                </span>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-red-800"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
                {lastFailedPrompt && (
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void dispatchMessage(lastFailedPrompt, false)}
                    className="px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-xs font-medium text-red-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
                  >
                    {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
                  </button>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Composer */}
          <form
            onSubmit={handleFormSubmit}
            className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center gap-3 rounded-b-xl"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask a hospital question
            </label>
            <input
              id="assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              placeholder={
                language === 'hi'
                  ? 'विभाग, डॉक्टर, समय या अपॉइंटमेंट के बारे में पूछें...'
                  : language === 'hinglish'
                    ? 'Department, doctor, timings ya appointment ke baare me poochein...'
                    : 'Type in English, हिन्दी, or Hinglish...'
              }
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 text-white text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{language === 'hi' ? 'भेजें' : 'Send'}</span>
            </button>
          </form>
        </section>

        {/* Right Side: Suggested Questions, Quick Shortcuts & Safety Policy */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              {language === 'hi'
                ? 'सुझाए गए प्रश्न (Suggested Questions)'
                : language === 'hinglish'
                  ? 'Suggested Questions (Hinglish)'
                  : 'Suggested Questions'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {language === 'hi'
                ? 'किसी भी प्रश्न पर क्लिक करके तुरंत उत्तर पाएं।'
                : language === 'hinglish'
                  ? 'Kisi bhi sawaal par click karke turant jawab paayein.'
                  : 'Try any prompt in English, हिन्दी, or Hinglish.'}
            </p>
            <div className="mt-4 space-y-2">
              {STARTER_PROMPTS[language].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isSending}
                  onClick={() => void dispatchMessage(prompt, true)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs text-slate-700 hover:text-blue-900 transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              {language === 'hi' ? 'अस्पताल मॉड्यूल शॉर्टकट' : 'Direct Hospital Shortcuts'}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('departments')}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-xs font-medium text-slate-700 text-left transition-colors"
              >
                Departments
              </button>
              <button
                type="button"
                onClick={() => onNavigate('doctors')}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-xs font-medium text-slate-700 text-left transition-colors"
              >
                Doctor Directory
              </button>
              <button
                type="button"
                onClick={() => onStartBooking()}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-xs font-medium text-slate-700 text-left transition-colors"
              >
                Book Appointment
              </button>
              <button
                type="button"
                onClick={() => onNavigate('tracker')}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-xs font-medium text-slate-700 text-left transition-colors"
              >
                Track Status
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <h2 className="font-display text-sm font-semibold">
                {language === 'hi' ? 'सुरक्षा एवं सीमाएं' : 'Medical Safety Scope'}
              </h2>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {language === 'hi'
                ? 'MediAssist AI एक स्वचालित अस्पताल गाइड है, डॉक्टर नहीं। यह किसी बीमारी का निदान नहीं करता, दवा नहीं बताता और उपचार की सलाह नहीं देता।'
                : language === 'hinglish'
                  ? 'MediAssist AI ek automated hospital guide hai, doctor nahi. Yeh kisi bimari ka diagnosis nahi karta aur na hi dawai prescribe karta hai.'
                  : 'MediAssist AI is an automated hospital guide, not a doctor. It never diagnoses diseases, prescribes medicines, or recommends treatments.'}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">
                {language === 'hi' ? 'चिकित्सीय आपातकाल?' : 'Medical Emergency?'}
              </p>
              <p>
                Call{' '}
                <span className="font-mono font-medium text-blue-800">
                  {HOSPITAL_PROFILE.emergencyPhone}
                </span>{' '}
                or Ambulance{' '}
                <span className="font-mono font-medium text-blue-800">
                  {HOSPITAL_PROFILE.ambulanceHelpline}
                </span>
                .
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
