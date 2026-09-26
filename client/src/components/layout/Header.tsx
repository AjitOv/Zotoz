import React from 'react';
import {
  Menu,
  Sparkles,
  RotateCcw,
  Globe,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMobileNav: () => void;
  onNavigateToSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileNav,
  onNavigateToSettings,
}) => {
  const {
    currentUser,
    currentRole,
    geminiConfigured,
    geminiModel,
    isDemoMode,
    resetDemo,
    activeNotification,
    dismissNotification,
  } = useApp();

  const getTabTitle = (tab: NavigationTab): { title: string; subtitle: string } => {
    switch (tab) {
      case 'overview':
        return {
          title: 'Business Overview',
          subtitle: 'Operational training readiness, knowledge capture metrics, and team health.',
        };
      case 'create':
        return {
          title: 'Capture Business Knowledge',
          subtitle: 'Record or upload video/audio to auto-generate structured multilingual SOPs.',
        };
      case 'library':
        return {
          title: 'Training Library',
          subtitle: 'Review, edit, translate, version, and publish verified standard operating procedures.',
        };
      case 'employees':
        return {
          title: 'Team & Training Assignments',
          subtitle: 'Assign procedures to frontline staff, set deadlines, and track individual progress.',
        };
      case 'assistant':
        return {
          title: 'AI Knowledge Assistant',
          subtitle: 'Grounded business companion strictly answering from your approved SOPs.',
        };
      case 'analytics':
        return {
          title: 'Training Analytics & Audit',
          subtitle: 'Measure comprehension, track weak operational areas, and review quiz scores.',
        };
      case 'settings':
        return {
          title: 'Business & AI Settings',
          subtitle: 'Manage Gemini Flash credentials, languages, and demonstration presets.',
        };
      case 'learn':
        return {
          title: 'My Training Portal',
          subtitle: `Step-by-step interactive procedures assigned to ${currentUser?.full_name}.`,
        };
      default:
        return { title: 'Zotoz Capture', subtitle: 'Record Once. Train Every Employee.' };
    }
  };

  const { title, subtitle } = getTabTitle(currentTab);

  return (
    <header className="sticky top-0 z-30 bg-[#0B1220]/90 backdrop-blur-md border-b border-[#2A3C5B]">
      {/* Toast Notification Banner if present */}
      {activeNotification && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between transition-all ${
            activeNotification.type === 'success'
              ? 'bg-[#B8F34A]/15 text-[#B8F34A] border-b border-[#B8F34A]/30'
              : activeNotification.type === 'error'
              ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
              : activeNotification.type === 'warning'
              ? 'bg-amber-500/20 text-amber-300 border-b border-amber-500/30'
              : 'bg-blue-500/20 text-blue-300 border-b border-blue-500/30'
          }`}
        >
          <div className="flex items-center gap-2 max-w-4xl truncate">
            {activeNotification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : activeNotification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium truncate">{activeNotification.message}</span>
          </div>
          <button
            onClick={dismissNotification}
            className="p-1 hover:opacity-80 rounded"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="px-4 md:px-8 py-3.5 flex items-center justify-between">
        {/* Left: Mobile Toggle + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="p-2 -ml-2 rounded-lg text-[#9CAFC8] hover:text-white hover:bg-[#182337] md:hidden"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs text-[#9CAFC8] hidden sm:block leading-tight">{subtitle}</p>
          </div>
        </div>

        {/* Right: Status Pills & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Gemini Flash Status Pill */}
          <button
            onClick={onNavigateToSettings}
            title={
              geminiConfigured
                ? `Using ${geminiModel} for live AI generation`
                : 'Click to configure Gemini API Key for live AI generation'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              geminiConfigured
                ? 'bg-[#B8F34A]/10 text-[#B8F34A] border-[#B8F34A]/30 hover:bg-[#B8F34A]/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                geminiConfigured ? 'bg-[#B8F34A] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">
              {geminiConfigured ? `Gemini Flash Active` : `Demo Mode (Simulated AI)`}
            </span>
            <span className="sm:hidden">{geminiConfigured ? 'Gemini' : 'Demo'}</span>
          </button>

          {/* Reset Demo State Action */}
          <button
            onClick={() => {
              if (window.confirm('Reset all demo modules, employee progress, and quiz attempts to initial sample state?')) {
                resetDemo();
              }
            }}
            title="Reset data back to pristine demo state"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#9CAFC8] hover:text-white bg-[#182337] hover:bg-[#253757] border border-[#2A3C5B] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Demo Data</span>
          </button>

          {/* Current User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#2A3C5B]">
            <div className="w-8 h-8 rounded-full bg-[#182337] border border-[#2A3C5B] flex items-center justify-center text-xs font-bold text-[#B8F34A]">
              {currentUser?.full_name ? currentUser.full_name.charAt(0) : 'U'}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <p className="font-semibold text-white leading-none truncate max-w-[120px]">
                {currentUser?.full_name || 'Guest'}
              </p>
              <p className="text-[10px] text-[#9CAFC8] leading-tight">
                {currentRole === 'OWNER' ? 'Owner Admin' : `${currentUser?.preferred_language}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
