import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bug,
  Lightbulb,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  ExternalLink,
  Layers,
  X,
  Check,
  ChevronRight
} from 'lucide-react';

export default function DefectsListView() {
  const {
    allFeatureDefects,
    projectFeatures,
    activeProject,
    openFeature,
    updateFeatureBugStatus,
    updateSuggestionStatus,
    addBugToFeature,
    addSuggestionToFeature,
    team
  } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'bug' | 'suggestion'
  const [featureFilter, setFeatureFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Quick Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetFeatureId, setTargetFeatureId] = useState(projectFeatures[0]?.id || '');
  const [itemType, setItemType] = useState('bug'); // 'bug' | 'suggestion'
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Critical');
  const [priority, setPriority] = useState('High');
  const [reproSteps, setReproSteps] = useState('');
  const [notes, setNotes] = useState('');

  // Selected item modal for inspecting details
  const [viewItem, setViewItem] = useState(null);

  // Filtered defects
  const filteredItems = allFeatureDefects.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchFeat = (item.featureName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchFeat) return false;
    }
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (featureFilter !== 'all' && item.featureId !== featureFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'open' && (item.status === 'verified' || item.status === 'implemented')) return false;
      if (statusFilter === 'verified' && item.status !== 'verified' && item.status !== 'implemented') return false;
      if (statusFilter === 'ready_for_qa' && item.status !== 'ready_for_qa') return false;
    }
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    return true;
  });

  const totalBugs = allFeatureDefects.filter((d) => d.type === 'bug').length;
  const totalSuggs = allFeatureDefects.filter((d) => d.type === 'suggestion').length;
  const openCount = allFeatureDefects.filter((d) => d.status !== 'verified' && d.status !== 'implemented').length;

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!title.trim() || !targetFeatureId) return;

    if (itemType === 'bug') {
      addBugToFeature(targetFeatureId, {
        title,
        severity,
        reproSteps
      });
    } else {
      addSuggestionToFeature(targetFeatureId, {
        title,
        priority,
        notes
      });
    }

    setTitle('');
    setReproSteps('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            All Defects & Suggestions
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {allFeatureDefects.length} total items in {activeProject?.name} • {openCount} open • Grouped by Feature
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setTargetFeatureId(projectFeatures[0]?.id || '');
            setIsAddModalOpen(true);
          }}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
        >
          <Plus size={14} />
          <span>Log Bug or Suggestion</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.85rem'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search defects, bugs, suggestions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.45rem 0.75rem 0.45rem 2.2rem', fontSize: '0.82rem', width: '100%' }}
          />
        </div>

        {/* Type Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
          <button
            className={`persona-btn ${typeFilter === 'all' ? 'active-all' : ''}`}
            onClick={() => setTypeFilter('all')}
            style={{ fontSize: '0.76rem', padding: '0.3rem 0.75rem' }}
          >
            All ({allFeatureDefects.length})
          </button>
          <button
            className={`persona-btn ${typeFilter === 'bug' ? 'active-dev' : ''}`}
            onClick={() => setTypeFilter('bug')}
            style={{ fontSize: '0.76rem', padding: '0.3rem 0.75rem' }}
          >
            🐛 Bugs ({totalBugs})
          </button>
          <button
            className={`persona-btn ${typeFilter === 'suggestion' ? 'active-qa' : ''}`}
            onClick={() => setTypeFilter('suggestion')}
            style={{ fontSize: '0.76rem', padding: '0.3rem 0.75rem' }}
          >
            💡 Suggestions ({totalSuggs})
          </button>
        </div>

        {/* Feature Filter Dropdown */}
        <select
          className="filter-select"
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value)}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
        >
          <option value="all">All Features</option>
          {projectFeatures.map((f) => (
            <option key={f.id} value={f.id}>
              📁 {f.name}
            </option>
          ))}
        </select>

        {/* Status Filter Dropdown */}
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open / In Dev</option>
          <option value="ready_for_qa">Ready for Retest</option>
          <option value="verified">Verified & Closed</option>
        </select>
      </div>

      {/* Dense High-Capacity Table View */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          <h3>No defects or suggestions match the selected criteria</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
            Try clearing filters or search terms.
          </p>
        </div>
      ) : (
        <div className="tickets-table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Type & Severity</th>
                <th style={{ width: '110px' }}>ID</th>
                <th>Summary</th>
                <th style={{ width: '220px' }}>Linked Feature</th>
                <th style={{ width: '120px' }}>Assignees</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '140px', textAlign: 'right' }}>Workflow Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isBug = item.type === 'bug';
                const isVerified = item.status === 'verified' || item.status === 'implemented';
                const isReadyRetest = item.status === 'ready_for_qa';
                const isCritical = item.severity === 'Critical';

                const dev = team.find((m) => m.id === item.assignedDev);
                const qa = team.find((m) => m.id === item.assignedQa);

                return (
                  <tr
                    key={item.id}
                    onClick={() => setViewItem(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Type & Severity Badge */}
                    <td>
                      {isBug ? (
                        <span
                          className="tag-pill"
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 7px',
                            background: isCritical ? 'var(--status-critical-bg)' : 'var(--bg-surface)',
                            color: isCritical ? 'var(--status-critical)' : 'var(--text-primary)',
                            border: `1px solid ${isCritical ? 'var(--status-critical-border)' : 'var(--border-subtle)'}`
                          }}
                        >
                          <Bug size={11} />
                          {item.severity}
                        </span>
                      ) : (
                        <span
                          className="tag-pill"
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 7px',
                            background: 'rgba(234, 179, 8, 0.12)',
                            color: '#eab308',
                            border: '1px solid rgba(234, 179, 8, 0.3)'
                          }}
                        >
                          <Lightbulb size={11} />
                          Suggestion
                        </span>
                      )}
                    </td>

                    {/* ID */}
                    <td>
                      <span className="ticket-id" style={{ fontSize: '0.76rem' }}>
                        {item.id}
                      </span>
                    </td>

                    {/* Title */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                        {item.title}
                      </div>
                    </td>

                    {/* Linked Feature Pill */}
                    <td>
                      <span
                        className="tag-pill"
                        style={{
                          background: 'rgba(56, 189, 248, 0.08)',
                          color: 'var(--accent-dev)',
                          border: '1px solid var(--accent-dev-border)',
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const feat = projectFeatures.find((f) => f.id === item.featureId);
                          if (feat) openFeature(feat);
                        }}
                        title={`Click to open feature ${item.featureName}`}
                      >
                        <Layers size={11} />
                        {item.featureName}
                      </span>
                    </td>

                    {/* Assignees */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        {dev && (
                          <div
                            className="user-avatar-small"
                            style={{ background: dev.color, width: '20px', height: '20px', fontSize: '0.62rem' }}
                            title={`Dev: ${dev.name}`}
                          >
                            {dev.initials}
                          </div>
                        )}
                        {qa && (
                          <div
                            className="user-avatar-small"
                            style={{ background: qa.color, width: '20px', height: '20px', fontSize: '0.62rem' }}
                            title={`QA: ${qa.name}`}
                          >
                            {qa.initials}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td>
                      {isVerified ? (
                        <span className="tag-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem' }}>
                          Verified ✅
                        </span>
                      ) : isReadyRetest ? (
                        <span className="tag-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.72rem' }}>
                          Ready for Retest
                        </span>
                      ) : (
                        <span className="tag-pill" style={{ background: 'var(--status-critical-bg)', color: 'var(--status-critical)', fontSize: '0.72rem' }}>
                          Open / In Dev
                        </span>
                      )}
                    </td>

                    {/* Quick Row Action */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                        {item.status === 'open' || item.status === 'in_dev' ? (
                          <button
                            className="quick-advance-btn"
                            onClick={() => updateFeatureBugStatus(item.featureId, item.id, 'ready_for_qa')}
                            title="Developer marks fixed on staging"
                          >
                            <span>Dev Fixed ➔</span>
                          </button>
                        ) : null}

                        {item.status === 'ready_for_qa' ? (
                          <button
                            className="quick-advance-btn"
                            style={{ background: 'var(--accent-qa-subtle)', color: 'var(--accent-qa)', borderColor: 'var(--accent-qa-border)' }}
                            onClick={() => updateFeatureBugStatus(item.featureId, item.id, 'verified')}
                            title="QA confirms resolved"
                          >
                            <Check size={11} />
                            <span>QA Pass</span>
                          </button>
                        ) : null}

                        {isVerified && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-qa)', fontWeight: 600 }}>
                            Closed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Add Modal (Linked to Feature) */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                Log Bug or Suggestion Linked to Feature
              </span>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem}>
              <div className="modal-body single-col">
                {/* Select Type: Bug vs Suggestion */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className={`btn ${itemType === 'bug' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    onClick={() => setItemType('bug')}
                  >
                    <Bug size={14} />
                    <span>Defect / Bug</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${itemType === 'suggestion' ? 'btn-qa' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    onClick={() => setItemType('suggestion')}
                  >
                    <Lightbulb size={14} />
                    <span>QA Suggestion</span>
                  </button>
                </div>

                {/* Target Feature Selector */}
                <div className="form-group">
                  <label className="form-label">Link to Feature *</label>
                  <select
                    className="form-select"
                    value={targetFeatureId}
                    onChange={(e) => setTargetFeatureId(e.target.value)}
                    required
                  >
                    {projectFeatures.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name} ({f.code || f.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Summary / Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={itemType === 'bug' ? 'e.g. Phone number accepts letters on Safari...' : 'e.g. Add search-as-you-type filter to customer table...'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Severity / Priority */}
                {itemType === 'bug' ? (
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select
                      className="form-select"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="Critical">🔴 Critical (Release Blocker)</option>
                      <option value="High">🟠 High Priority</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🔵 Low</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                )}

                {/* Repro Steps or Notes */}
                {itemType === 'bug' ? (
                  <div className="form-group">
                    <label className="form-label">Steps to Reproduce</label>
                    <textarea
                      className="form-textarea"
                      placeholder="1. Navigate to screen&#10;2. Click action&#10;3. Observe crash..."
                      value={reproSteps}
                      onChange={(e) => setReproSteps(e.target.value)}
                      style={{ minHeight: '65px' }}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Improvement Notes / Benefit</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Why would this improve the user or testing experience?..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{ minHeight: '65px' }}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Save to Feature</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Item Detail Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="ticket-id">{viewItem.id}</span>
                <span className="tag-pill" style={{ background: 'var(--bg-surface)' }}>
                  📁 {viewItem.featureName}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setViewItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body single-col">
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                {viewItem.title}
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  Type: {viewItem.type.toUpperCase()}
                </span>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  Severity: {viewItem.severity}
                </span>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  Status: {viewItem.status}
                </span>
              </div>

              {viewItem.reproSteps && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Steps to Reproduce:
                  </strong>
                  <div className="code-block" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                    {viewItem.reproSteps}
                  </div>
                </div>
              )}

              {viewItem.notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Suggestion Notes:
                  </strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {viewItem.notes}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem' }}>
                {viewItem.status !== 'ready_for_qa' && viewItem.status !== 'verified' && (
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    onClick={() => {
                      updateFeatureBugStatus(viewItem.featureId, viewItem.id, 'ready_for_qa');
                      setViewItem(null);
                    }}
                  >
                    <span>Mark Fixed (Ready for Retest)</span>
                  </button>
                )}

                {viewItem.status !== 'verified' && (
                  <button
                    className="btn btn-qa"
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    onClick={() => {
                      updateFeatureBugStatus(viewItem.featureId, viewItem.id, 'verified');
                      setViewItem(null);
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>QA Pass & Close</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
