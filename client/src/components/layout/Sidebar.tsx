import React from 'react';
import {
  LayoutDashboard,
  Video,
  BookOpen,
  Users,
  Bot,
  BarChart3,
  Settings,
  Sparkles,
  GraduationCap,
  Building2,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export type NavigationTab =
  | 'overview'
  | 'create'
  | 'library'
  | 'employees'
  | 'assistant'
  | 'analytics'
  | 'settings'
  | 'learn';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { business, employees, currentUser, currentRole, switchUser, setIsOnboardingOpen } =
    useApp();

  const ownerNavItems: { id: NavigationTab; label: string; icon: React.FC<any>; badge?: string }[] =
    [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'create', label: 'Create Training', icon: Video, badge: 'AI' },
      { id: 'library', label: 'Training Library', icon: BookOpen },
      { id: 'employees', label: 'Employees', icon: Users },
      { id: 'assistant', label: 'AI Knowledge Assistant', icon: Bot },
      { id: 'analytics', label: 'Training Analytics', icon: BarChart3 },
      { id: 'settings', label: 'Business Settings', icon: Settings },
    ];

  const employeeNavItems: { id: NavigationTab; label: string; icon: React.FC<any>; badge?: string }[] = [
    { id: 'learn', label: 'My Assigned Training', icon: GraduationCap },
    { id: 'assistant', label: 'AI Knowledge Assistant', icon: Bot },
  ];

  const navItems = currentRole === 'OWNER' ? ownerNavItems : employeeNavItems;

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B1220] border-r border-[#2A3C5B]/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1E2D47]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#182337] to-[#0B1220] border border-[#B8F34A]/40 flex items-center justify-center shadow-glow-lime">
              <span className="font-extrabold text-[#B8F34A] text-xl tracking-wider">Z</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-white">ZOTOZ</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B8F34A]/15 text-[#B8F34A] uppercase tracking-wider border border-[#B8F34A]/30">
                  Capture
                </span>
              </div>
              <p className="text-[11px] text-[#9CAFC8] tracking-tight">Record Once. Train Every Employee.</p>
            </div>
          </div>

          {/* Active Business Widget */}
          <div className="mt-4 p-2.5 rounded-lg bg-[#182337] border border-[#2A3C5B] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building2 className="w-4 h-4 text-[#B8F34A] shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {business?.name || 'Apex Supplies'}
                </p>
                <p className="text-[10px] text-[#9CAFC8] truncate">
                  {business?.category || 'SME · Business supplies'} • {business?.location || 'Pune'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOnboardingOpen(true)}
              title="Add or configure business profile"
              className="text-[10px] text-[#B8F34A] hover:underline shrink-0 ml-1"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9CAFC8]/70">
              {currentRole === 'OWNER' ? 'Owner Management' : 'Employee Learning Portal'}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#182337] text-[#9CAFC8] border border-[#2A3C5B]">
              {currentRole}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-[#182337] text-white border-l-4 border-l-[#B8F34A] border-y border-r border-[#2A3C5B] shadow-sm'
                    : 'text-[#9CAFC8] hover:text-white hover:bg-[#182337]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#B8F34A]' : 'text-[#9CAFC8] group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#B8F34A] text-[#0B1220]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Demo Persona Switcher Box (Crucial for Demo / Startup Judges) */}
        <div className="p-3 border-t border-[#1E2D47] bg-[#10192A]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#B8F34A]" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-white">
                Demo Persona Switcher
              </span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-medium">
              Demo Tool
            </span>
          </div>
          <p className="text-[10px] text-[#9CAFC8] mb-2 leading-tight">
            Switch between Owner and frontline employees to test the full learning loop.
          </p>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {employees.map((emp) => {
              const isSelected = currentUser?.id === emp.id;
              const isOwner = emp.role === 'OWNER';
              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    switchUser(emp);
                    if (isOwner) {
                      onSelectTab('overview');
                    } else {
                      onSelectTab('learn');
                    }
                  }}
                  className={`w-full text-left p-2 rounded-md text-xs flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#182337] text-white border border-[#B8F34A] shadow-sm'
                      : 'bg-[#0B1220]/60 hover:bg-[#182337]/70 text-[#9CAFC8] border border-transparent'
                  }`}
                >
                  <div className="truncate">
                    <p className={`font-semibold truncate ${isSelected ? 'text-white' : ''}`}>
                      {emp.full_name}
                    </p>
                    <p className="text-[10px] text-[#8496B0]">
                      {isOwner ? '👑 Owner Admin' : `🗣 ${emp.preferred_language} Learner`}
                    </p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#B8F34A] shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};
