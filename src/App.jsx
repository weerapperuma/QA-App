import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import FeatureBoard from './components/FeatureBoard';
import ReleaseGate from './components/ReleaseGate';
import FeatureDetailModal from './components/FeatureDetailModal';
import { MoveToFutureModal } from './components/FutureImprovements';
import TicketDetailModal from './components/TicketDetailModal';
import CreateTicketModal from './components/CreateTicketModal';
import CreateProjectModal from './components/CreateProjectModal';
import CreateFeatureModal from './components/CreateFeatureModal';
import EditFeatureModal from './components/EditFeatureModal';
import CreateModuleModal from './components/CreateModuleModal';
import NotificationToast from './components/NotificationToast';
import PersonalToasts from './components/PersonalToasts';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './components/Login';
import ProfilePage from './components/ProfilePage';
import FutureImprovementsPage from './components/FutureImprovementsPage';
import TestingPage from './components/TestingPage';
import { TESTING_TAB_IDS } from './utils/testingTabs';
import AdminActivityPage from './components/AdminActivityPage';

function MainApp() {
  const { activeTab: requestedTab, isAuthenticated, needsProjectSelection, currentUser } = useApp();
  // Workspace pages stay locked until a working project is chosen (shown on My Profile)
  const WORKSPACE_TABS = ['features', ...TESTING_TAB_IDS, 'release', 'improvements'];
  const activeTab = needsProjectSelection && WORKSPACE_TABS.includes(requestedTab) ? 'profile' : requestedTab;

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <Login />
        <NotificationToast />
      </div>
    );
  }

  return (
    <div className={`app-container ${activeTab === 'features' ? 'app-features-active' : ''}`}>
      <Header />

      <main className={`main-content ${activeTab === 'features' ? 'main-content-features' : ''}`}>
        {activeTab === 'features' && <FeatureBoard />}
        {activeTab === 'release' && <ReleaseGate />}
        {activeTab === 'improvements' && <FutureImprovementsPage />}
        {TESTING_TAB_IDS.includes(activeTab) && <TestingPage section={activeTab} />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'admin' && <AdminActivityPage />}
      </main>

      {/* Interactive Modals & Toasts */}
      <FeatureDetailModal />
      <MoveToFutureModal />
      <TicketDetailModal />
      <CreateTicketModal />
      <CreateProjectModal />
      <CreateFeatureModal />
      <EditFeatureModal />
      <CreateModuleModal />
      <NotificationToast />
      <PersonalToasts key={currentUser?.id || 'anon'} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ErrorBoundary>
  );
}
