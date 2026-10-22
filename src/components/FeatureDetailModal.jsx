import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Layers,
  Bug,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Plus,
  GitPullRequest,
  ExternalLink,
  Code2,
  ShieldCheck,
  Server,
  ArrowRight,
  Sparkles,
  Check,
  FolderTree,
  FolderPlus,
  ChevronRight,
  Trash2,
  Edit2
} from 'lucide-react';

export default function FeatureDetailModal() {
  const {
    selectedFeature,
    closeFeature,
    openEditFeatureModal,
    updateFeatureStatus,
    addBugToFeature,
    updateFeatureBugStatus,
    deleteBugFromFeature,
    addSuggestionToFeature,
    updateSuggestionStatus,
    deleteSuggestionFromFeature,
    activeProject,
    projectFeatures,
    allModuleNames,
    openFeature,
    openCreateFeatureModal,
    updateFeatureModule,
    team
  } = useApp();

  // Inline Bug form state
  const [showAddBugForm, setShowAddBugForm] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugSeverity, setBugSeverity] = useState('Critical');
  const [bugRepro, setBugRepro] = useState('');
  const [bugExpected, setBugExpected] = useState('');
  const [bugActual, setBugActual] = useState('');

  // Inline Suggestion form state
  const [showAddSuggForm, setShowAddSuggForm] = useState(false);
  const [suggTitle, setSuggTitle] = useState('');
  const [suggPriority, setSuggPriority] = useState('High');
  const [suggNotes, setSuggNotes] = useState('');

  // Dev handoff state
  const [showHandoffBox, setShowHandoffBox] = useState(false);
  const [handoffBuild, setHandoffBuild] = useState('#413');
  const [handoffPr, setHandoffPr] = useState('');
  const [handoffNotes, setHandoffNotes] = useState('');

  if (!selectedFeature) return null;

  const dev = team.find((m) => m.id === selectedFeature.assignedDev);
  const qa = team.find((m) => m.id === selectedFeature.assignedQa);

  const bugs = selectedFeature.bugs || [];
  const openBugs = bugs.filter((b) => b.status !== 'verified');
  const criticalOpenBugs = openBugs.filter((b) => b.severity === 'Critical');
  const suggestions = selectedFeature.suggestions || [];

  const allBugsVerified = openBugs.length === 0 && bugs.length > 0;
  const canVerifyFeature = criticalOpenBugs.length === 0;

  const availableModules = allModuleNames && allModuleNames.length > 0
    ? allModuleNames
    : Array.from(new Set(projectFeatures.map((f) => f.moduleName).filter(Boolean)));

  const handleAddBugSubmit = (e) => {
    e.preventDefault();
    if (!bugTitle.trim()) return;

    addBugToFeature(selectedFeature.id, {
      title: bugTitle,
      severity: bugSeverity,
      reproSteps: bugRepro,
      expectedResult: bugExpected,
      actualResult: bugActual
    });

    setBugTitle('');
    setBugRepro('');
    setBugExpected('');
    setBugActual('');
    setShowAddBugForm(false);
  };

  const handleAddSuggSubmit = (e) => {
    e.preventDefault();
    if (!suggTitle.trim()) return;

    addSuggestionToFeature(selectedFeature.id, {
      title: suggTitle,
      priority: suggPriority,
      notes: suggNotes
    });

    setSuggTitle('');
    setSuggNotes('');
    setShowAddSuggForm(false);
  };

  const handleHandoffSubmit = (e) => {
    e.preventDefault();
    updateFeatureStatus(selectedFeature.id, 'ready_for_qa', {
      stagingBuild: handoffBuild,
      prLink: handoffPr || selectedFeature.prLink,
      devNotes: handoffNotes || selectedFeature.devNotes
    });
    setShowHandoffBox(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'backlog':
        return <span className="tag-pill" style={{ background: 'var(--bg-surface)' }}>Backlog</span>;
      case 'in_dev':
        return <span className="tag-pill" style={{ background: 'var(--accent-dev-subtle)', color: 'var(--accent-dev)', border: '1px solid var(--accent-dev-border)' }}>In Development</span>;
      case 'ready_for_qa':
        return <span className="tag-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>Ready for Retest</span>;
      case 'in_qa':
        return <span className="tag-pill" style={{ background: 'var(--accent-qa-subtle)', color: 'var(--accent-qa)', border: '1px solid var(--accent-qa-border)' }}>QA Verification</span>;
      case 'verified':
        return <span className="tag-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Verified & Closed</span>;
      default:
        return <span className="tag-pill">{status}</span>;
    }
  };

  return (
    <div className="modal-overlay" onClick={closeFeature}>
      <div className="modal-container" style={{ maxWidth: '1050px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className="ticket-id" style={{ fontSize: '1rem', color: 'var(--accent-dev)' }}>
              {selectedFeature.code || selectedFeature.id}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              in {activeProject?.name || 'Project'}
            </span>
            {getStatusBadge(selectedFeature.status)}

            {selectedFeature.moduleName && (
              <span
                className="tag-pill"
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: 'var(--accent-dev)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <FolderTree size={12} />
                Module: {selectedFeature.moduleName}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openEditFeatureModal(selectedFeature)}
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--accent-dev)',
                background: 'rgba(56, 189, 248, 0.1)',
                borderColor: 'var(--accent-dev-border)'
              }}
              title="Edit Feature details, module, and settings"
            >
              <Edit2 size={13} />
              <span>Edit Feature</span>
            </button>

            <button className="btn-icon" onClick={closeFeature} type="button">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body feature-modal-body">
          {/* Main Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Title & Description */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  {selectedFeature.name}
                </h2>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => openEditFeatureModal(selectedFeature)}
                  title="Edit Feature"
                  style={{ width: '28px', height: '28px', color: 'var(--accent-dev)' }}
                >
                  <Edit2 size={14} />
                </button>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                {selectedFeature.description || 'No description provided.'}
              </p>
            </div>

            {/* Developer Handoff Box */}
            <div className="handoff-box dev-box">
              <div className="handoff-box-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-dev)' }}>
                  <Code2 size={16} />
                  Developer Implementation & Staging Build
                </span>
                {selectedFeature.prLink && (
                  <a
                    href={selectedFeature.prLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: 'var(--accent-dev)',
                      fontSize: '0.75rem',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    <GitPullRequest size={12} />
                    PR Link
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Staging Build: </strong>
                  <span>{selectedFeature.stagingBuild || 'Pending Build Deploy'}</span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Target Release: </strong>
                  <span>{selectedFeature.targetRelease}</span>
                </div>
              </div>

              {selectedFeature.devNotes && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  <strong>Developer Notes: </strong>
                  {selectedFeature.devNotes}
                </div>
              )}

              {/* Dev: Push to Staging & Ready for Retest */}
              {selectedFeature.status === 'in_dev' && (
                <div style={{ marginTop: '0.5rem' }}>
                  {!showHandoffBox ? (
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                      onClick={() => setShowHandoffBox(true)}
                    >
                      <Server size={13} />
                      <span>Deploy to Staging & Notify QA</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--accent-dev-border)',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-dev)' }}>
                        Confirm Staging Handoff for {selectedFeature.name}
                      </span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="PR Link (e.g. https://github.com/...)"
                        value={handoffPr}
                        onChange={(e) => setHandoffPr(e.target.value)}
                        style={{ fontSize: '0.78rem', padding: '0.4rem' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Staging Build (e.g. #413)"
                        value={handoffBuild}
                        onChange={(e) => setHandoffBuild(e.target.value)}
                        style={{ fontSize: '0.78rem', padding: '0.4rem' }}
                      />
                      <textarea
                        className="form-textarea"
                        placeholder="What should QA test specifically?"
                        value={handoffNotes}
                        onChange={(e) => setHandoffNotes(e.target.value)}
                        style={{ fontSize: '0.78rem', minHeight: '60px' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem' }}
                          onClick={handleHandoffSubmit}
                        >
                          Mark Ready for Retest
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => setShowHandoffBox(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 1: QA DEFECTS & BUGS ON THIS FEATURE */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bug size={18} color="var(--status-critical)" />
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    Defects & Bugs on this Feature ({bugs.length})
                  </span>
                  {openBugs.length > 0 && (
                    <span className="tag-pill tag-severity-critical" style={{ fontSize: '0.7rem' }}>
                      {openBugs.length} Blocking
                    </span>
                  )}
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: 'var(--status-critical)' }}
                  onClick={() => setShowAddBugForm(!showAddBugForm)}
                >
                  <Plus size={13} />
                  <span>Log Bug on Feature</span>
                </button>
              </div>

              {/* Inline Add Bug Form */}
              {showAddBugForm && (
                <form
                  onSubmit={handleAddBugSubmit}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--status-critical-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-critical)' }}>
                    🐛 Report Defect Found on {selectedFeature.name}
                  </span>

                  <input
                    type="text"
                    className="form-input"
                    placeholder="Defect Title (e.g. Phone number accepts letters on Safari)..."
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    required
                  />

                  <div className="responsive-form-grid-2">
                    <div>
                      <label className="form-label">Severity</label>
                      <select
                        className="form-select"
                        value={bugSeverity}
                        onChange={(e) => setBugSeverity(e.target.value)}
                      >
                        <option value="Critical">🔴 Critical (Release Blocker)</option>
                        <option value="High">🟠 High Priority</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="Low">🔵 Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Steps to Reproduce</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="1. Enter email, 2. Submit..."
                        value={bugRepro}
                        onChange={(e) => setBugRepro(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="responsive-form-grid-2">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Expected behavior..."
                      value={bugExpected}
                      onChange={(e) => setBugExpected(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Actual failure observed..."
                      value={bugActual}
                      onChange={(e) => setBugActual(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowAddBugForm(false)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Save Bug & Notify Dev
                    </button>
                  </div>
                </form>
              )}

              {/* Bug List */}
              {bugs.length === 0 ? (
                <div
                  style={{
                    padding: '1.5rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}
                >
                  No bugs reported on this feature yet! Click "Log Bug on Feature" to add test findings.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {bugs.map((bug) => {
                    const isVerified = bug.status === 'verified';
                    const isReadyRetest = bug.status === 'ready_for_qa';
                    const isCritical = bug.severity === 'Critical';

                    return (
                      <div
                        key={bug.id}
                        style={{
                          background: isVerified ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)',
                          border: `1px solid ${
                            isVerified
                              ? 'rgba(16, 185, 129, 0.25)'
                              : isCritical
                              ? 'var(--status-critical-border)'
                              : 'var(--border-subtle)'
                          }`,
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="ticket-id" style={{ fontSize: '0.75rem' }}>
                              {bug.id}
                            </span>
                            <span
                              className="tag-pill"
                              style={{
                                background: isCritical ? 'var(--status-critical-bg)' : 'var(--bg-surface)',
                                color: isCritical ? 'var(--status-critical)' : 'var(--text-secondary)',
                                fontSize: '0.68rem'
                              }}
                            >
                              {bug.severity}
                            </span>
                            <span
                              className="tag-pill"
                              style={{
                                background: isVerified
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isReadyRetest
                                  ? 'rgba(99, 102, 241, 0.15)'
                                  : 'var(--status-critical-bg)',
                                color: isVerified ? '#10b981' : isReadyRetest ? '#818cf8' : 'var(--status-critical)',
                                fontSize: '0.68rem'
                              }}
                            >
                              {isVerified ? 'Verified ✅' : isReadyRetest ? 'Ready for Retest 🚀' : 'Open / In Dev ⚠️'}
                            </span>
                          </div>

                          {/* Quick Advance for this specific bug */}
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {bug.status === 'open' || bug.status === 'in_dev' ? (
                              <button
                                className="quick-advance-btn"
                                onClick={() => updateFeatureBugStatus(selectedFeature.id, bug.id, 'ready_for_qa')}
                                title="Developer marks this specific bug fixed"
                              >
                                <span>Dev Fixed ➔</span>
                              </button>
                            ) : null}

                            {bug.status === 'ready_for_qa' ? (
                              <button
                                className="quick-advance-btn"
                                style={{ background: 'var(--accent-qa-subtle)', color: 'var(--accent-qa)', borderColor: 'var(--accent-qa-border)' }}
                                onClick={() => updateFeatureBugStatus(selectedFeature.id, bug.id, 'verified')}
                                title="QA confirms bug is resolved"
                              >
                                <Check size={11} />
                                <span>QA Pass & Close</span>
                              </button>
                            ) : null}

                            {bug.status === 'verified' && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-qa)', fontWeight: 600 }}>
                                Verified
                              </span>
                            )}

                            <button
                              type="button"
                              className="btn-icon"
                              style={{
                                padding: '3px',
                                width: '24px',
                                height: '24px',
                                color: 'var(--status-critical)',
                                border: '1px solid var(--status-critical-border)',
                                background: 'var(--status-critical-bg)'
                              }}
                              onClick={() => {
                                if (window.confirm(`Delete defect [${bug.id}] "${bug.title}"?`)) {
                                  deleteBugFromFeature(selectedFeature.id, bug.id);
                                }
                              }}
                              title="Delete Defect"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {bug.title}
                        </div>

                        {bug.reproSteps && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <strong>Repro: </strong> {bug.reproSteps}
                          </div>
                        )}
                        {bug.devNote && (
                          <div style={{ fontSize: '0.78rem', color: '#c084fc', marginTop: '2px' }}>
                            <strong>Dev Note: </strong> {bug.devNote}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECTION 2: QA SUGGESTIONS & IMPROVEMENTS */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lightbulb size={18} color="#eab308" />
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    QA Usability Suggestions & Enhancements ({suggestions.length})
                  </span>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: '#eab308' }}
                  onClick={() => setShowAddSuggForm(!showAddSuggForm)}
                >
                  <Plus size={13} />
                  <span>Add Suggestion</span>
                </button>
              </div>

              {/* Inline Add Suggestion Form */}
              {showAddSuggForm && (
                <form
                  onSubmit={handleAddSuggSubmit}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eab308' }}>
                    💡 Suggest an Improvement for {selectedFeature.name}
                  </span>

                  <input
                    type="text"
                    className="form-input"
                    placeholder="Suggestion (e.g. Add search-as-you-type filter to customer table)..."
                    value={suggTitle}
                    onChange={(e) => setSuggTitle(e.target.value)}
                    required
                  />

                  <div className="responsive-form-grid-2">
                    <div>
                      <label className="form-label">Priority</label>
                      <select
                        className="form-select"
                        value={suggPriority}
                        onChange={(e) => setSuggPriority(e.target.value)}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Why is this helpful?</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Improves user efficiency when handling > 100 items..."
                        value={suggNotes}
                        onChange={(e) => setSuggNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowAddSuggForm(false)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Save Suggestion
                    </button>
                  </div>
                </form>
              )}

              {/* Suggestions List */}
              {suggestions.length === 0 ? (
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}
                >
                  No suggestions recorded yet. QA can suggest usability or polish enhancements here!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {suggestions.map((sugg) => (
                    <div
                      key={sugg.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '2px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#eab308' }}>
                            {sugg.id}
                          </span>
                          <span className="tag-pill" style={{ fontSize: '0.65rem', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                            {sugg.priority}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{sugg.title}</div>
                        {sugg.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sugg.notes}</div>
                        )}
                        {sugg.devNote && (
                          <div style={{ fontSize: '0.75rem', color: '#c084fc', marginTop: '2px' }}>
                            <strong>Dev Note: </strong> {sugg.devNote}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                        <select
                          className="form-select"
                          value={sugg.status}
                          onChange={(e) => updateSuggestionStatus(selectedFeature.id, sugg.id, e.target.value)}
                          style={{ fontSize: '0.75rem', padding: '0.3rem', width: 'auto' }}
                        >
                          <option value="open">Open</option>
                          <option value="accepted">Accepted</option>
                          <option value="implemented">Implemented</option>
                        </select>

                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            padding: '3px',
                            width: '24px',
                            height: '24px',
                            color: 'var(--status-critical)',
                            border: '1px solid var(--status-critical-border)',
                            background: 'var(--status-critical-bg)'
                          }}
                          onClick={() => {
                            if (window.confirm(`Delete suggestion [${sugg.id}] "${sugg.title}"?`)) {
                              deleteSuggestionFromFeature(selectedFeature.id, sugg.id);
                            }
                          }}
                          title="Delete Suggestion"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Quality Gate & Sign-off */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              height: 'fit-content'
            }}
          >
            {/* Feature Sign-off Gate */}
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.6rem'
                }}
              >
                Feature Sign-off Gate
              </span>

              {/* Condition 1: Critical Bugs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0',
                  fontSize: '0.82rem',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <span>0 Blocker Bugs</span>
                {criticalOpenBugs.length === 0 ? (
                  <span style={{ color: 'var(--accent-qa)', fontWeight: 700 }}>PASS ✅</span>
                ) : (
                  <span style={{ color: 'var(--status-critical)', fontWeight: 700 }}>
                    {criticalOpenBugs.length} FAIL ❌
                  </span>
                )}
              </div>

              {/* Condition 2: All Bugs Verified */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0',
                  fontSize: '0.82rem',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <span>All Bugs Verified</span>
                {openBugs.length === 0 ? (
                  <span style={{ color: 'var(--accent-qa)', fontWeight: 700 }}>100% ✅</span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {bugs.length - openBugs.length}/{bugs.length}
                  </span>
                )}
              </div>

              {/* Master Verify & Close Button */}
              <div style={{ marginTop: '1rem' }}>
                {selectedFeature.status !== 'verified' ? (
                  <button
                    className="btn btn-qa"
                    style={{ width: '100%', padding: '0.65rem' }}
                    onClick={() => updateFeatureStatus(selectedFeature.id, 'verified')}
                    disabled={!canVerifyFeature}
                    title={
                      !canVerifyFeature
                        ? 'Resolve all critical bugs before closing feature'
                        : 'Verify and officially close feature'
                    }
                  >
                    <CheckCircle2 size={16} />
                    <span>Verify & Close Feature</span>
                  </button>
                ) : (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      padding: '0.65rem',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <Sparkles size={16} />
                    <span>Feature Verified & Closed</span>
                  </div>
                )}

                {!canVerifyFeature && (
                  <div
                    style={{
                      fontSize: '0.73rem',
                      color: 'var(--status-critical)',
                      marginTop: '0.4rem',
                      lineHeight: 1.3
                    }}
                  >
                    ⚠️ Blocked: {criticalOpenBugs.length} critical defect(s) must be fixed and verified before sign-off.
                  </div>
                )}
              </div>
            </div>

            {/* Module Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <FolderTree size={13} color="var(--accent-dev)" />
                <span>Belongs to Module</span>
              </label>
              <select
                className="form-select"
                value={selectedFeature.moduleName || 'General'}
                onChange={(e) => updateFeatureModule(selectedFeature.id, e.target.value)}
              >
                {availableModules.map((m) => (
                  <option key={m} value={m}>
                    📁 {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Status Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Feature Lifecycle Status</label>
              <select
                className="form-select"
                value={selectedFeature.status}
                onChange={(e) => updateFeatureStatus(selectedFeature.id, e.target.value)}
              >
                <option value="in_dev">1. In Development</option>
                <option value="ready_for_qa">2. Ready for Retest (Staging)</option>
                <option value="in_qa">3. QA Verification & Feedback</option>
                <option value="verified">4. Verified & Closed</option>
              </select>
            </div>

            {/* Assigned Dev */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assigned Developer</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                {dev && (
                  <div className="user-avatar-small" style={{ background: dev.color }}>
                    {dev.initials}
                  </div>
                )}
                <span>{dev?.name || 'Unassigned'}</span>
              </div>
            </div>

            {/* Assigned QA */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assigned QA Lead</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                {qa && (
                  <div className="user-avatar-small" style={{ background: qa.color }}>
                    {qa.initials}
                  </div>
                )}
                <span>{qa?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
