import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Server,
  Activity,
  GitBranch,
  GitCommit,
  Clock,
  ExternalLink,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';

export default function EnvironmentMatrix() {
  const { environments, pingEnvironment, simulateDeployToStaging } = useApp();

  return (
    <div>
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            Environment Infrastructure Matrix
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time deployment tracking, cluster health diagnostics, and developer staging triggers.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => simulateDeployToStaging('main', '7a10cd2')}
        >
          <Play size={14} />
          <span>Trigger Staging Deploy</span>
        </button>
      </div>

      <div className="env-grid">
        {environments.map((env) => {
          const isHealthy = env.status === 'healthy';

          return (
            <div key={env.id} className="env-card">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      background: isHealthy ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isHealthy ? 'var(--accent-qa)' : 'var(--status-critical)'
                    }}
                  >
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700 }}>{env.name}</h3>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {env.cluster}
                    </span>
                  </div>
                </div>

                <span
                  className="tag-pill"
                  style={{
                    background: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    color: isHealthy ? '#10b981' : '#f43f5e',
                    border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                  }}
                >
                  <span className={isHealthy ? 'pulse-dot' : ''} style={{ background: isHealthy ? '#10b981' : '#f43f5e' }}></span>
                  {env.status.toUpperCase()}
                </span>
              </div>

              {/* Deployment Details */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <GitBranch size={13} />
                    Branch
                  </span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{env.branch}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <GitCommit size={13} />
                    Commit SHA
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-dev)' }}>
                    {env.commit} (Build #{env.buildNumber})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} />
                    Last Deployed
                  </span>
                  <span>{env.lastDeploy}</span>
                </div>
              </div>

              {/* Health Diagnostics & Ping */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={15} color={isHealthy ? 'var(--accent-qa)' : 'var(--status-critical)'} />
                  <span style={{ color: 'var(--text-secondary)' }}>Latency:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{env.latencyMs}ms</strong>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                  onClick={() => pingEnvironment(env.id)}
                  title="Ping cluster health endpoint"
                >
                  <Zap size={12} color="#f59e0b" />
                  <span>Ping</span>
                </button>
              </div>

              {/* URL Link */}
              <a
                href={env.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Navigating to ${env.url} in new tab.`);
                }}
              >
                <span>{env.url}</span>
                <ExternalLink size={11} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
