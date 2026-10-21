import React from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export default function AnalyticsView() {
  const { tickets, testSuites } = useApp();

  // Component breakdown
  const componentCounts = {};
  tickets.forEach((t) => {
    componentCounts[t.component] = (componentCounts[t.component] || 0) + 1;
  });

  // Severity breakdown
  const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0, Minor: 0 };
  tickets.forEach((t) => {
    if (severityCounts[t.severity] !== undefined) {
      severityCounts[t.severity]++;
    }
  });

  // Status breakdown
  const reopenedCount = tickets.filter((t) => t.status === 'reopened').length;
  const verifiedCount = tickets.filter((t) => t.status === 'verified').length;
  const inDevCount = tickets.filter((t) => t.status === 'in_dev').length;
  const inQaCount = tickets.filter((t) => t.status === 'ready_for_qa' || t.status === 'in_qa').length;

  const totalClosedOrReopened = verifiedCount + reopenedCount;
  const firstTimePassRate = totalClosedOrReopened > 0
    ? Math.round((verifiedCount / totalClosedOrReopened) * 100)
    : 85;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
          Developer & QA Collaboration Analytics
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Handoff turnaround speed, defect density, bounce rates, and test coverage trends.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Metric 1: QA First-Time Pass Rate */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>First-Time Retest Pass Rate</span>
            <CheckCircle2 size={16} color="var(--accent-qa)" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: 'var(--accent-qa)' }}>
              {firstTimePassRate}%
            </span>
            <span className="kpi-subtext">Tickets passing QA on 1st retest</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {reopenedCount} ticket(s) currently bounced back to Developer.
          </div>
        </div>

        {/* Metric 2: Dev-to-QA Handoff Velocity */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>Average Verification Turnaround</span>
            <Clock size={16} color="var(--accent-dev)" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">1.8 hrs</span>
            <span className="kpi-subtext">Target SLA: &lt; 4 hrs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            94% of fixes deployed to Staging verified within same day.
          </div>
        </div>

        {/* Metric 3: Active In-Flight Work */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span>In-Flight Work Balance</span>
            <TrendingUp size={16} color="#818cf8" />
          </div>
          <div className="kpi-value-row">
            <span className="kpi-value">{inDevCount} Dev : {inQaCount} QA</span>
            <span className="kpi-subtext">Optimal load ratio</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Balanced pipeline between developers coding and QA verifying.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Defect Density by Component */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Defect Density by System Component
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {Object.entries(componentCounts).map(([comp, count]) => {
              const pct = Math.round((count / tickets.length) * 100);

              return (
                <div key={comp}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.3rem'
                    }}
                  >
                    <span>{comp}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {count} defects ({pct}%)
                    </span>
                  </div>

                  <div
                    style={{
                      height: '7px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)',
                        borderRadius: 'var(--radius-full)'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Distribution */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Defect Severity Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {Object.entries(severityCounts).map(([sev, count]) => {
              if (count === 0 && sev === 'Minor') return null;
              const pct = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;

              let barColor = 'var(--accent-dev)';
              if (sev === 'Critical') barColor = 'var(--status-critical)';
              else if (sev === 'High') barColor = 'var(--status-high)';
              else if (sev === 'Medium') barColor = 'var(--status-medium)';

              return (
                <div key={sev}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.3rem'
                    }}
                  >
                    <span>{sev} Priority</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {count} ({pct}%)
                    </span>
                  </div>

                  <div
                    style={{
                      height: '7px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: 'var(--radius-full)'
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
