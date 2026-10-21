import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  FolderGit2,
  Plus,
  Bug,
  Lightbulb,
  Layers,
  ChevronDown,
  CheckCircle2
} from 'lucide-react';

export default function ProjectBar() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    projectFeatures,
    setIsCreateProjectModalOpen,
    setIsCreateFeatureModalOpen
  } = useApp();

  // Aggregate stats across features in this project
  let totalBugs = 0;
  let openBugs = 0;
  let totalSuggestions = 0;
  let verifiedFeatures = 0;

  projectFeatures.forEach((f) => {
    if (f.status === 'verified') verifiedFeatures++;
    (f.bugs || []).forEach((b) => {
      totalBugs++;
      if (b.status !== 'verified') openBugs++;
    });
    totalSuggestions += (f.suggestions || []).length;
  });

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.85rem 1.4rem',
        marginTop: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {/* Project Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
            border: '1px solid var(--accent-dev-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-dev)'
          }}
        >
          <Building2 size={20} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Active Project:
            </span>
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.3rem 0.65rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {activeProject.description}
          </div>
        </div>
      </div>

      {/* Metrics & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Project KPI Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className="tag-pill"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              padding: '4px 9px',
              fontSize: '0.75rem'
            }}
          >
            <Layers size={12} color="var(--accent-dev)" />
            {projectFeatures.length} Features ({verifiedFeatures} Verified)
          </span>

          <span
            className="tag-pill"
            style={{
              background: openBugs > 0 ? 'var(--status-critical-bg)' : 'var(--status-passed-bg)',
              color: openBugs > 0 ? 'var(--status-critical)' : 'var(--status-passed)',
              border: `1px solid ${openBugs > 0 ? 'var(--status-critical-border)' : 'rgba(16, 185, 129, 0.3)'}`,
              padding: '4px 9px',
              fontSize: '0.75rem'
            }}
          >
            <Bug size={12} />
            {openBugs} Open Bugs
          </span>

          <span
            className="tag-pill"
            style={{
              background: 'rgba(234, 179, 8, 0.12)',
              color: '#eab308',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              padding: '4px 9px',
              fontSize: '0.75rem'
            }}
          >
            <Lightbulb size={12} />
            {totalSuggestions} QA Suggestions
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            onClick={() => setIsCreateProjectModalOpen(true)}
            title="Declare a new project"
          >
            <Plus size={13} />
            <span>New Project</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            onClick={() => setIsCreateFeatureModalOpen(true)}
            title={`Add feature to ${activeProject.name}`}
          >
            <Plus size={13} />
            <span>Add Feature</span>
          </button>
        </div>
      </div>
    </div>
  );
}
