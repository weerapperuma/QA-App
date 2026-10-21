import React from 'react';
import { useApp } from '../context/AppContext';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Play,
  RotateCcw,
  Bug,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function TestRunStudio() {
  const {
    testSuites,
    activeTestSuiteId,
    setActiveTestSuiteId,
    executeTestStep,
    startBugFromTestStep,
    openTicket,
    team
  } = useApp();

  const currentSuite = testSuites.find((s) => s.id === activeTestSuiteId) || testSuites[0];

  if (!currentSuite) {
    return (
      <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-medium)' }}>
        <FlaskConical size={40} color="var(--accent-qa)" style={{ marginBottom: '1rem', opacity: 0.7 }} />
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>No Test Suites Active</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
          Test execution suites and QA test cases sync directly to Cloud Firestore. Add features and releases to track validation suites.
        </p>
      </div>
    );
  }

  // Calculate stats for current suite
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;
  let blockedSteps = 0;

  currentSuite.cases.forEach((c) => {
    c.steps.forEach((s) => {
      totalSteps++;
      if (s.status === 'passed') passedSteps++;
      else if (s.status === 'failed') failedSteps++;
      else if (s.status === 'blocked') blockedSteps++;
    });
  });

  const passPct = totalSteps > 0 ? (passedSteps / totalSteps) * 100 : 0;
  const failPct = totalSteps > 0 ? (failedSteps / totalSteps) * 100 : 0;
  const blockPct = totalSteps > 0 ? (blockedSteps / totalSteps) * 100 : 0;

  return (
    <div>
      {/* Test Suite Selector Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem'
        }}
      >
        {testSuites.map((suite) => {
          const isSelected = suite.id === currentSuite.id;
          const caseCount = suite.cases.length;
          const hasFails = suite.cases.some((c) => c.status === 'failed');

          return (
            <button
              key={suite.id}
              className={`btn ${isSelected ? 'btn-qa' : 'btn-secondary'}`}
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: '0.65rem 1.1rem',
                fontSize: '0.84rem'
              }}
              onClick={() => setActiveTestSuiteId(suite.id)}
            >
              <FlaskConical size={15} />
              <span>{suite.title}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: isSelected ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-surface)'
                }}
              >
                {caseCount} cases {hasFails ? '• ❌' : '• ✅'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Suite Header Info & Live Progress */}
      <div className="test-suite-header">
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{currentSuite.title}</h2>
            <span className="tag-pill tag-env">{currentSuite.environment}</span>
            <span
              className="tag-pill"
              style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
            >
              Target: {currentSuite.targetVersion}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {currentSuite.description}
          </p>

          {/* Progress Bar */}
          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                Verification Progress: {Math.round(passPct)}% Completed
              </span>
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <span style={{ color: 'var(--status-passed)' }}>{passedSteps} Passed</span>
                {failedSteps > 0 && (
                  <span style={{ color: 'var(--status-failed)' }}>{failedSteps} Failed</span>
                )}
                {blockedSteps > 0 && (
                  <span style={{ color: 'var(--status-medium)' }}>{blockedSteps} Blocked</span>
                )}
                <span style={{ color: 'var(--text-muted)' }}>
                  {totalSteps - passedSteps - failedSteps - blockedSteps} Pending
                </span>
              </div>
            </div>

            <div className="test-progress-bar-wrap">
              <div className="test-progress-passed" style={{ width: `${passPct}%` }}></div>
              <div className="test-progress-failed" style={{ width: `${failPct}%` }}></div>
              <div className="test-progress-blocked" style={{ width: `${blockPct}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Cases List */}
      <div>
        {currentSuite.cases.map((testCase) => {
          const assignee = team.find((m) => m.id === testCase.assignedTo);

          let caseBadgeStyle = { background: 'var(--bg-surface)', color: 'var(--text-muted)' };
          let caseStatusText = 'Pending Execution';

          if (testCase.status === 'passed') {
            caseBadgeStyle = { background: 'var(--status-passed-bg)', color: 'var(--status-passed)', border: '1px solid rgba(16, 185, 129, 0.3)' };
            caseStatusText = '✅ Passed';
          } else if (testCase.status === 'failed') {
            caseBadgeStyle = { background: 'var(--status-failed-bg)', color: 'var(--status-failed)', border: '1px solid rgba(239, 68, 68, 0.3)' };
            caseStatusText = '❌ Failed';
          } else if (testCase.status === 'blocked') {
            caseBadgeStyle = { background: 'var(--status-medium-bg)', color: 'var(--status-medium)', border: '1px solid rgba(234, 179, 8, 0.3)' };
            caseStatusText = '⚠️ Blocked';
          } else if (testCase.status === 'in_progress') {
            caseBadgeStyle = { background: 'var(--accent-dev-subtle)', color: 'var(--accent-dev)', border: '1px solid var(--accent-dev-border)' };
            caseStatusText = '⏳ In Progress';
          }

          return (
            <div key={testCase.id} className="test-case-card">
              {/* Header */}
              <div className="test-case-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="ticket-id" style={{ color: 'var(--accent-qa)' }}>
                    {testCase.id}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{testCase.title}</span>
                  <span className="tag-pill" style={caseBadgeStyle}>
                    {caseStatusText}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {testCase.linkedBug && (
                    <button
                      className="tag-pill tag-severity-critical"
                      style={{ cursor: 'pointer', padding: '3px 8px' }}
                      onClick={() => openTicket(testCase.linkedBug)}
                      title={`Linked to defect ${testCase.linkedBug}`}
                    >
                      <Bug size={11} />
                      <span>Bug: {testCase.linkedBug}</span>
                    </button>
                  )}

                  {assignee && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <div className="user-avatar-small" style={{ background: assignee.color }}>
                        {assignee.initials}
                      </div>
                      <span>{assignee.name.split(' ')[0]} (QA)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preconditions */}
              {testCase.precondition && (
                <div
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'var(--bg-card)',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <strong>Precondition: </strong> {testCase.precondition}
                </div>
              )}

              {/* Test Steps Table */}
              <table className="test-steps-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Action / Test Instruction</th>
                    <th>Expected Result</th>
                    <th style={{ width: '220px' }}>Verdict & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testCase.steps.map((step) => {
                    return (
                      <tr key={step.num}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {step.num}
                        </td>
                        <td>{step.action}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{step.expected}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              className={`test-step-status-btn ${step.status === 'passed' ? 'pass' : ''}`}
                              onClick={() => executeTestStep(currentSuite.id, testCase.id, step.num, 'passed')}
                              title="Mark step Passed"
                            >
                              Pass
                            </button>

                            <button
                              className={`test-step-status-btn ${step.status === 'failed' ? 'fail' : ''}`}
                              onClick={() => executeTestStep(currentSuite.id, testCase.id, step.num, 'failed')}
                              title="Mark step Failed"
                            >
                              Fail
                            </button>

                            <button
                              className={`test-step-status-btn ${step.status === 'blocked' ? 'block' : ''}`}
                              onClick={() => executeTestStep(currentSuite.id, testCase.id, step.num, 'blocked')}
                              title="Mark step Blocked"
                            >
                              Block
                            </button>

                            {/* If step failed, show 1-click Log Bug button! */}
                            {step.status === 'failed' && (
                              <button
                                className="btn btn-secondary"
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 7px',
                                  color: 'var(--status-critical)',
                                  borderColor: 'var(--status-critical-border)'
                                }}
                                onClick={() => startBugFromTestStep(currentSuite, testCase, step)}
                                title="1-click: Auto-generate bug report from this step"
                              >
                                <Bug size={11} />
                                <span>Log Bug</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
