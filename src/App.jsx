import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import FeatureBoard from './components/FeatureBoard';
import DefectsListView from './components/DefectsListView';
import ReleaseGate from './components/ReleaseGate';
import FeatureDetailModal from './components/FeatureDetailModal';
import TicketDetailModal from './components/TicketDetailModal';
import CreateTicketModal from './components/CreateTicketModal';
import CreateProjectModal from './components/CreateProjectModal';
import CreateFeatureModal from './components/CreateFeatureModal';
import EditFeatureModal from './components/EditFeatureModal';
import CreateModuleModal from './components/CreateModuleModal';
import UserManagementModal from './components/UserManagementModal';
import NotificationToast from './components/NotificationToast';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './components/Login';

function MainApp() {
  const { activeTab, isAuthenticated } = useApp();

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
        {activeTab === 'board' && <DefectsListView />}
        {activeTab === 'release' && <ReleaseGate />}
      </main>

      {/* Interactive Modals & Toasts */}
      <FeatureDetailModal />
      <TicketDetailModal />
      <CreateTicketModal />
      <CreateProjectModal />
      <CreateFeatureModal />
      <EditFeatureModal />
      <CreateModuleModal />
      <UserManagementModal />
      <NotificationToast />
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
