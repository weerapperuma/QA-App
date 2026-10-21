import React from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertOctagon,
  Inbox,
  CheckCircle,
  GitCommit,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function MetricsBar() {
  const { tickets, testSuites, environments, setActiveTab, setFilters } = useApp();

  const criticalBlockers = tickets.filter(
    (t) => t.severity === 'Critical' && t.status !== 'verified'
  );
  const readyForRetest = tickets.filter((t) => t.status === 'ready_for_qa');
  const staging = environments.find((e) => e.id === 'staging') || environments[0];

  // Calculate overall test pass rate across all cases in all suites
  let totalSteps = 0;
  let passedSteps = 0;
  testSuites.forEach((suite) => {
    suite.cases.forEach((c) => {
      c.steps.forEach((s) => {
        totalSteps++;
        if (s.status === 'passed') passedSteps++;
      });
    });
  });
  const passRate = totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 100;

  return (
    <div className="kpi-grid">
      {/* Critical Blockers */}
      <div
        className="kpi-card"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          setFilters((prev) => ({ ...prev, severity: 'Critical', status: 'all' }));
          setActiveTab('board');
        }}
        title="Click to filter critical blockers on board"
      >
        <div className="kpi-header">
          <span>Critical Blockers</span>
          <AlertOctagon size={16} color={criticalBlockers.length > 0 ? 'var(--status-critical)' : 'var(--accent-qa)'} />
        </div>
        <div className="kpi-value-row">
          <span
            className="kpi-value"
            style={{ color: criticalBlockers.length > 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}
          >
            {criticalBlockers.length}
          </span>
          <span className="kpi-subtext">
            {criticalBlockers.length > 0 ? 'Must fix for release' : 'All clear for ship'}
          </span>
        </div>
      </div>

      {/* Ready for Retest */}
      <div
        className="kpi-card"
        style={{ cursor: 'pointer' }}
        onClick={() => {
          setFilters((prev) => ({ ...prev, status: 'ready_for_qa' }));
          setActiveTab('board');
        }}
        title="Click to filter Ready for QA tickets"
      >
        <div className="kpi-header">
          <span>Ready for Retest</span>
          <Inbox size={16} color="var(--accent-qa)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: 'var(--accent-qa)' }}>
            {readyForRetest.length}
          </span>
          <span className="kpi-subtext">Deployed on Staging</span>
        </div>
      </div>

      {/* Test Pass Rate */}
      <div
        className="kpi-card"
        style={{ cursor: 'pointer' }}
        onClick={() => setActiveTab('testruns')}
        title="Click to view Test Run Studio"
      >
        <div className="kpi-header">
          <span>Test Suite Pass Rate</span>
          <CheckCircle size={16} color="var(--accent-dev)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{passRate}%</span>
          <span className="kpi-subtext">{passedSteps}/{totalSteps} steps verified</span>
        </div>
      </div>

      {/* Staging Build */}
      <div
        className="kpi-card"
        style={{ cursor: 'pointer' }}
        onClick={() => setActiveTab('environments')}
        title="Click to view Environment Matrix"
      >
        <div className="kpi-header">
          <span>Active Staging Build</span>
          <GitCommit size={16} color="#818cf8" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ fontSize: '1.4rem', fontFamily: 'var(--font-mono)' }}>
            {staging.commit}
          </span>
          <span className="kpi-subtext">Build {staging.buildNumber}</span>
        </div>
      </div>

      {/* Turnaround Time */}
      <div className="kpi-card">
        <div className="kpi-header">
          <span>QA Turnaround Avg</span>
          <Clock size={16} color="var(--text-muted)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">1.8h</span>
          <span className="kpi-subtext">Dev fix to QA verify</span>
        </div>
      </div>
    </div>
  );
}
