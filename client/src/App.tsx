import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { Overview } from './pages/Overview';
import { CreateTraining } from './pages/CreateTraining';
import { TrainingLibrary } from './pages/TrainingLibrary';
import { Employees } from './pages/Employees';
import { KnowledgeAssistant } from './pages/KnowledgeAssistant';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { EmployeeView } from './components/player/EmployeeView';

const MainLayout: React.FC = () => {
  const { currentRole } = useApp();
  const [currentTab, setCurrentTab] = useState<NavigationTab>(
    currentRole === 'OWNER' ? 'overview' : 'learn'
  );
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);

  // If role switches, adapt default tab
  React.useEffect(() => {
    if (currentRole === 'EMPLOYEE' && currentTab !== 'assistant') {
      setCurrentTab('learn');
    } else if (currentRole === 'OWNER' && currentTab === 'learn') {
      setCurrentTab('overview');
    }
  }, [currentRole]);

  return (
    <div className="min-h-screen bg-[#0B1220] text-white flex flex-col md:flex-row font-sans selection:bg-[#B8F34A] selection:text-[#0B1220]">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedTrainingId(null);
        }}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-h-screen">
        {/* Sticky Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onNavigateToSettings={() => setCurrentTab('settings')}
        />

        {/* Page Content Body */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <Overview onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'create' && (
            <CreateTraining
              onNavigate={(tab) => setCurrentTab(tab)}
              onTrainingCreated={(id) => {
                setSelectedTrainingId(id);
                setCurrentTab('library');
              }}
            />
          )}

          {currentTab === 'library' && (
            <TrainingLibrary
              onNavigate={(tab) => setCurrentTab(tab)}
              selectedTrainingId={selectedTrainingId}
            />
          )}

          {currentTab === 'employees' && <Employees />}

          {currentTab === 'assistant' && <KnowledgeAssistant />}

          {currentTab === 'analytics' && <Analytics />}

          {currentTab === 'settings' && <Settings />}

          {currentTab === 'learn' && (
            <EmployeeView onNavigate={(tab) => setCurrentTab(tab)} />
          )}
        </main>
      </div>

      {/* Business Setup Wizard Modal */}
      <OnboardingModal />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
