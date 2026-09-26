import React, { createContext, useContext, useState, useEffect } from 'react';
import { Business, User } from '../types';
import { fetchCurrentBusiness, fetchEmployees, resetDemoData as apiResetDemoData } from '../services/api';

interface AppContextType {
  business: Business | null;
  employees: User[];
  currentRole: 'OWNER' | 'EMPLOYEE';
  currentUser: User | null;
  isDemoMode: boolean;
  geminiConfigured: boolean;
  geminiModel: string;
  activeLanguage: string;
  setActiveLanguage: (lang: string) => void;
  switchUser: (user: User) => void;
  refreshData: () => Promise<void>;
  resetDemo: () => Promise<void>;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  activeNotification: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  dismissNotification: () => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash');
  const [activeLanguage, setActiveLanguage] = useState<string>('English');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [activeNotification, setActiveNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);

  const loadInitialData = async () => {
    try {
      const bizData = await fetchCurrentBusiness();
      setBusiness(bizData.business);
      setIsDemoMode(bizData.is_demo_mode);
      setGeminiConfigured(bizData.gemini_configured);
      setGeminiModel(bizData.model || 'gemini-2.5-flash');

      const emps = await fetchEmployees();
      setEmployees(emps);

      // Default active user is the Owner if none selected
      if (!currentUser) {
        const owner = emps.find((e) => e.role === 'OWNER') || emps[0];
        if (owner) setCurrentUser(owner);
      } else {
        // Refresh current user reference
        const updated = emps.find((e) => e.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const switchUser = (user: User) => {
    setCurrentUser(user);
    setActiveLanguage(user.preferred_language || 'English');
    showNotification(
      `Switched context to ${user.full_name} (${user.role === 'OWNER' ? 'Business Owner' : user.preferred_language + ' Learner'})`,
      'info'
    );
  };

  const showNotification = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    setActiveNotification({ message, type });
    setTimeout(() => {
      setActiveNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const dismissNotification = () => setActiveNotification(null);

  const resetDemo = async () => {
    try {
      await apiResetDemoData();
      await loadInitialData();
      showNotification('Demo data successfully reset to initial state!', 'success');
    } catch (err: any) {
      showNotification(`Failed to reset demo: ${err.message}`, 'error');
    }
  };

  const currentRole = currentUser?.role === 'OWNER' ? 'OWNER' : 'EMPLOYEE';

  return (
    <AppContext.Provider
      value={{
        business,
        employees,
        currentRole,
        currentUser,
        isDemoMode,
        geminiConfigured,
        geminiModel,
        activeLanguage,
        setActiveLanguage,
        switchUser,
        refreshData: loadInitialData,
        resetDemo,
        showNotification,
        activeNotification,
        dismissNotification,
        isOnboardingOpen,
        setIsOnboardingOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
