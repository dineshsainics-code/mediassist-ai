import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarPlus,
  ClipboardCheck,
  Home,
  Info,
  Menu,
  MessageSquareText,
  Phone,
  Stethoscope,
  X,
} from 'lucide-react';
import { HOSPITAL_PROFILE } from '../data/hospitalData';
import type { ModuleId } from '../types/hospital';

interface NavItem {
  id: ModuleId;
  label: string;
  section: 'patient' | 'operations';
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', section: 'patient', icon: Home },
  { id: 'assistant', label: 'AI Assistant', section: 'patient', icon: MessageSquareText },
  { id: 'departments', label: 'Departments', section: 'patient', icon: Building2 },
  { id: 'doctors', label: 'Doctor Directory', section: 'patient', icon: Stethoscope },
  { id: 'booking', label: 'Book Appointment', section: 'patient', icon: CalendarPlus },
  { id: 'tracker', label: 'Track Appointment', section: 'patient', icon: ClipboardCheck },
  { id: 'info', label: 'Hospital Info', section: 'patient', icon: Info },
  { id: 'admin', label: 'Admin Dashboard', section: 'operations', icon: BarChart3 },
];

const MODULE_TITLES: Record<ModuleId, string> = {
  home: 'Patient Portal',
  assistant: 'AI Patient Assistant',
  departments: 'Department Finder',
  doctors: 'Doctor Directory',
  booking: 'Appointment Booking',
  tracker: 'Appointment Tracker',
  info: 'Hospital Information',
  admin: 'Admin Dashboard',
};

interface SidebarLayoutProps {
  activeModule: ModuleId;
  onNavigate: (module: ModuleId) => void;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activeModule,
  onNavigate,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelect = (moduleId: ModuleId) => {
    onNavigate(moduleId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const patientLinks = NAV_ITEMS.filter((item) => item.section === 'patient');
  const operationsLinks = NAV_ITEMS.filter((item) => item.section === 'operations');

  const renderNavList = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeModule === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleSelect('home')}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              MediAssist AI
            </span>
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <div>
            <p className="px-3 mb-2 text-xs font-medium text-slate-400">Patient Services</p>
            {renderNavList(patientLinks)}
          </div>
          <div className="pt-4 border-t border-slate-100">
            <p className="px-3 mb-2 text-xs font-medium text-slate-400">Hospital Management</p>
            {renderNavList(operationsLinks)}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <p className="text-xs font-semibold text-slate-700">24/7 Emergency Helpline</p>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-xs font-medium text-blue-800 tabular-nums">
            <Phone className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            <span>{HOSPITAL_PROFILE.emergencyPhone}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Ambulance: {HOSPITAL_PROFILE.ambulanceHelpline}</p>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
              <button
                type="button"
                onClick={() => handleSelect('home')}
                className="flex items-center gap-2.5"
              >
                <span className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                </span>
                <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  MediAssist AI
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
              <div>
                <p className="px-3 mb-2 text-xs font-medium text-slate-400">Patient Services</p>
                {renderNavList(patientLinks)}
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="px-3 mb-2 text-xs font-medium text-slate-400">Hospital Management</p>
                {renderNavList(operationsLinks)}
              </div>
            </nav>
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">24/7 Emergency</p>
              <p className="mt-1 font-mono text-xs text-blue-800 tabular-nums">
                {HOSPITAL_PROFILE.emergencyPhone}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <button
                type="button"
                onClick={() => handleSelect('home')}
                className="font-display font-semibold text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
              >
                MediAssist AI
              </button>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {MODULE_TITLES[activeModule]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeModule !== 'booking' ? (
              <button
                type="button"
                onClick={() => handleSelect('booking')}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Book Appointment
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSelect('tracker')}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Track Status
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </main>

        <footer className="mt-auto border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              {HOSPITAL_PROFILE.hospitalName} · Powered by MediAssist AI · Fictional healthcare data
              for demonstration only.
            </p>
            <div className="flex items-center gap-4 whitespace-nowrap">
              <button
                type="button"
                onClick={() => handleSelect('info')}
                className="hover:text-blue-700 transition-colors"
              >
                Emergency &amp; Timings
              </button>
              <button
                type="button"
                onClick={() => handleSelect('assistant')}
                className="hover:text-blue-700 transition-colors"
              >
                Patient Assistant
              </button>
              <button
                type="button"
                onClick={() => handleSelect('admin')}
                className="hover:text-blue-700 transition-colors"
              >
                Admin Console
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
