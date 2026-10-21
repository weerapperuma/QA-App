import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Kanban,
  ListFilter,
  FlaskConical,
  ShieldCheck,
  Server,
  BarChart3
} from 'lucide-react';

export default function NavigationTabs() {
  const { activeTab, setActiveTab, tickets, projectFeatures, testSuites, environments, releases } = useApp();

  const totalTickets = tickets.length;
  const readyForQaCount = tickets.filter((t) => t.status === 'ready_for_qa').length;
  const activeSuitesCount = testSuites.length;
  const activeRelease = releases[0];

  const tabs = [
    {
      id: 'features',
      label: 'Feature Lifecycle',
      icon: Layers,
      badge: `${projectFeatures.length} features`
    },
    {
      id: 'board',
      label: 'Defect Kanban Board',
      icon: Kanban,
      badge: totalTickets
    },
    {
      id: 'tickets',
      label: 'Defect Explorer',
      icon: ListFilter,
      badge: `${readyForQaCount} retest`
    },
    {
      id: 'testruns',
      label: 'Test Run Studio',
      icon: FlaskConical,
      badge: activeSuitesCount
    },
    {
      id: 'release',
      label: 'Release Gate & Sign-off',
      icon: ShieldCheck,
      badge: activeRelease.gateChecks.zeroBlockers && activeRelease.gateChecks.devLeadSignoff.signed && activeRelease.gateChecks.qaLeadSignoff.signed ? 'GO' : 'PENDING'
    },
    {
      id: 'environments',
      label: 'Environment Matrix',
      icon: Server,
      badge: `${environments.length} clusters`
    },
    {
      id: 'analytics',
      label: 'Collaboration Velocity',
      icon: BarChart3
    }
  ];

  return (
    <div className="nav-tabs-bar">
      <div className="nav-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="nav-tab-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
