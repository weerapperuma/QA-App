import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Code2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  ArrowRight,
  ShieldAlert,
  Server,
  ShieldCheck
} from 'lucide-react';

export default function RoleBanner() {
  const {
    role,
    tickets,
    setActiveTab,
    setFilters,
    simulateDeployToStaging,
    releases,
    currentUser,
    setIsUserManagementModalOpen
  } = useApp();

  const devTicketsToFix = tickets.filter(
    (t) => t.status === 'in_dev' || t.status === 'reopened'
  );
  const readyForQaTickets = tickets.filter((t) => t.status === 'ready_for_qa');
  const criticalBlockers = tickets.filter(
    (t) => t.severity === 'Critical' && t.status !== 'verified'
  );
  const activeRelease = releases[0];

  if (currentUser?.role === 'admin' && (role === 'all' || role === 'admin')) {
    return (
      <div
        className="role-banner"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.05))',
          borderColor: 'rgba(139, 92, 246, 0.35)',
          borderLeft: '4px solid #8b5cf6'
        }}
      >
        <div className="role-banner-content">
          <div
            className="role-banner-icon"
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="role-banner-title" style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Super Admin Console</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(139, 92, 246, 0.25)',
                  color: '#ddd6fe',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                FULL ACCESS
              </span>
            </div>
            <div className="role-banner-desc">
              Manage user credentials & roles, oversee feature delivery, and orchestrate production quality gates.
            </div>
          </div>
        </div>

        <div className="role-banner-actions">
          <button
            className="btn"
            onClick={() => setIsUserManagementModalOpen(true)}
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#ddd6fe',
              border: '1px solid rgba(139, 92, 246, 0.45)',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <ShieldCheck size={14} color="#c084fc" />
            <span>Manage Team Accounts</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setActiveTab('release')}
          >
            <span>Release Gate ({activeRelease?.version || 'v2.4.0'})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  if (role === 'developer') {
    return (
      <div className="role-banner dev">
        <div className="role-banner-content">
          <div className="role-banner-icon">
            <Code2 size={24} />
          </div>
          <div>
            <div className="role-banner-title">
              👨‍💻 Developer Focus: {devTicketsToFix.length} Tickets Awaiting Code Fix or Investigation
            </div>
            <div className="role-banner-desc">
              {readyForQaTickets.length > 0
                ? `${readyForQaTickets.length} tickets are currently deployed to Staging undergoing QA verification. Be ready to assist if edge-case logs are requested.`
                : 'All fixed PRs have been validated by QA. Great job! Check backlogged items for sprint 25.'}
            </div>
          </div>
        </div>

        <div className="role-banner-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFilters((prev) => ({ ...prev, status: 'in_dev' }));
              setActiveTab('board');
            }}
          >
            <span>View My In-Dev Queue ({devTicketsToFix.length})</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => simulateDeployToStaging('main', '4f92bc1')}
            title="Simulate pushing a new build to Staging Alpha"
          >
            <Server size={14} />
            <span>Deploy Build to Staging</span>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'qa') {
    return (
      <div className="role-banner qa">
        <div className="role-banner-content">
          <div className="role-banner-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="role-banner-title">
              🧪 QA Engineer Focus: {readyForQaTickets.length} Tickets Deployed & Ready for Retest!
            </div>
            <div className="role-banner-desc">
              Release <strong>{activeRelease.version}</strong> has{' '}
              {criticalBlockers.length > 0 ? (
                <span style={{ color: 'var(--status-critical)', fontWeight: 700 }}>
                  {criticalBlockers.length} Critical Blocker(s)
                </span>
              ) : (
                '0 blockers'
              )}{' '}
              remaining before production sign-off.
            </div>
          </div>
        </div>

        <div className="role-banner-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setFilters((prev) => ({ ...prev, status: 'ready_for_qa' }));
              setActiveTab('board');
            }}
          >
            <span>Filter Ready for Retest ({readyForQaTickets.length})</span>
          </button>

          <button
            className="btn btn-qa"
            onClick={() => setActiveTab('release')}
          >
            <ShieldAlert size={14} />
            <span>Review Release Gate</span>
          </button>
        </div>
      </div>
    );
  }

  // Role: All
  return (
    <div className="role-banner all">
      <div className="role-banner-content">
        <div className="role-banner-icon">
          <Zap size={24} />
        </div>
        <div>
          <div className="role-banner-title">
            Team Overview: Release {activeRelease.version} Handoff in Progress
          </div>
          <div className="role-banner-desc">
            {criticalBlockers.length} Critical Blockers open • {readyForQaTickets.length} Tickets deployed on Staging awaiting verification • Target release: {activeRelease.targetDate}
          </div>
        </div>
      </div>

      <div className="role-banner-actions">
        <button
          className="btn btn-secondary"
          onClick={() => setActiveTab('testruns')}
        >
          <span>Run Test Matrix</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
