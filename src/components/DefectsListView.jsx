import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bug,
  Lightbulb,
  Search,
  CheckCircle2,
  Plus,
  Layers,
  X,
  Check,
  Trash2,
  Edit2,
  Code2
} from 'lucide-react';

export default function DefectsListView() {
  const {
    allFeatureDefects,
    projectFeatures,
    activeProject,
    openFeature,
    updateFeatureBugStatus,
    updateFeatureBug,
    updateSuggestionStatus,
    updateFeatureSuggestion,
    addBugToFeature,
    addSuggestionToFeature,
    deleteBugFromFeature,
    deleteSuggestionFromFeature
  } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'bug' | 'suggestion'
  const [featureFilter, setFeatureFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Quick Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetFeatureId, setTargetFeatureId] = useState(projectFeatures[0]?.id || '');
  const [itemType, setItemType] = useState('bug'); // 'bug' | 'suggestion'
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Critical');
  const [priority, setPriority] = useState('High');
  const [reproSteps, setReproSteps] = useState('');
  const [notes, setNotes] = useState('');

  // Dev Fixed Note Modal state
  const [isDevFixedModalOpen, setIsDevFixedModalOpen] = useState(false);
  const [devFixedTarget, setDevFixedTarget] = useState(null);
  const [devNoteText, setDevNoteText] = useState('');

  // Edit Modal state
  const [editItem, setEditItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSeverity, setEditSeverity] = useState('Medium');
  const [editReproSteps, setEditReproSteps] = useState('');
  const [editDevNote, setEditDevNote] = useState('');
  const [editStatus, setEditStatus] = useState('open');

  // Selected item modal for inspecting details
  const [viewItem, setViewItem] = useState(null);

  const getSeverityColor = (sev) => {
    switch ((sev || '').toLowerCase()) {
      case 'critical':
        return 'var(--status-critical)';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#38bdf8';
      default:
        return 'var(--text-secondary)';
    }
  };

  // Filtered defects
  const filteredItems = allFeatureDefects.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchFeat = (item.featureName || '').toLowerCase().includes(q);
      const matchDevNote = (item.devNote || '').toLowerCase().includes(q);
      if (!matchTitle && !matchFeat && !matchDevNote) return false;
    }
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (featureFilter !== 'all' && item.featureId !== featureFilter) return false;
    if (statusFilter !== 'all') {
      const s = item.status || 'open';
      if (statusFilter === 'open' && s !== 'open' && s !== 'new') return false;
      if (statusFilter === 'in_dev' && s !== 'in_dev') return false;
      if (statusFilter === 'ready_for_qa' && s !== 'ready_for_qa') return false;
      if (statusFilter === 'verified' && s !== 'verified' && s !== 'implemented') return false;
    }
    return true;
  });

  const totalBugs = allFeatureDefects.filter((d) => d.type === 'bug').length;
  const totalSuggs = allFeatureDefects.filter((d) => d.type === 'suggestion').length;
  const openCount = allFeatureDefects.filter((d) => d.status !== 'verified' && d.status !== 'implemented').length;

  // Add Item
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!title.trim() || !targetFeatureId) return;

    if (itemType === 'bug') {
      addBugToFeature(targetFeatureId, {
        title: title.trim(),
        severity,
        reproSteps: reproSteps.trim()
      });
    } else {
      addSuggestionToFeature(targetFeatureId, {
        title: title.trim(),
        priority,
        notes: notes.trim()
      });
    }

    setTitle('');
    setReproSteps('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  // Workflow Action Handlers
  const handleMoveToInDev = (item) => {
    if (item.type === 'suggestion') {
      updateSuggestionStatus(item.featureId, item.id, 'in_dev');
    } else {
      updateFeatureBugStatus(item.featureId, item.id, 'in_dev');
    }
  };

  const openDevFixedModal = (item) => {
    setDevFixedTarget(item);
    setDevNoteText(item.devNote || '');
    setIsDevFixedModalOpen(true);
  };

  const handleConfirmDevFixed = (e) => {
    e.preventDefault();
    if (!devFixedTarget) return;

    const extra = { devNote: devNoteText.trim() };
    if (devFixedTarget.type === 'suggestion') {
      updateSuggestionStatus(devFixedTarget.featureId, devFixedTarget.id, 'ready_for_qa', extra);
    } else {
      updateFeatureBugStatus(devFixedTarget.featureId, devFixedTarget.id, 'ready_for_qa', extra);
    }

    setIsDevFixedModalOpen(false);
    setDevFixedTarget(null);
    setDevNoteText('');
  };

  const handleQAPass = (item) => {
    if (item.type === 'suggestion') {
      updateSuggestionStatus(item.featureId, item.id, 'verified');
    } else {
      updateFeatureBugStatus(item.featureId, item.id, 'verified');
    }
  };

  const handleReopen = (item) => {
    if (window.confirm(`Reopen this ${item.type === 'bug' ? 'defect' : 'suggestion'}?`)) {
      if (item.type === 'suggestion') {
        updateSuggestionStatus(item.featureId, item.id, 'open');
      } else {
        updateFeatureBugStatus(item.featureId, item.id, 'open');
      }
    }
  };

  // Edit Handlers
  const openEditModal = (item) => {
    setEditItem(item);
    setEditTitle(item.title || '');
    setEditSeverity(item.severity || item.priority || 'Medium');
    setEditReproSteps(item.reproSteps || item.notes || '');
    setEditDevNote(item.devNote || '');
    setEditStatus(item.status || 'open');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editItem || !editTitle.trim()) return;

    if (editItem.type === 'suggestion') {
      updateFeatureSuggestion(editItem.featureId, editItem.id, {
        title: editTitle.trim(),
        priority: editSeverity,
        notes: editReproSteps.trim(),
        devNote: editDevNote.trim(),
        status: editStatus
      });
    } else {
      updateFeatureBug(editItem.featureId, editItem.id, {
        title: editTitle.trim(),
        severity: editSeverity,
        reproSteps: editReproSteps.trim(),
        devNote: editDevNote.trim(),
        status: editStatus
      });
    }

    setEditItem(null);
  };

  // Delete Handler
  const handleDelete = (item) => {
    if (window.confirm(`Delete ${item.type === 'bug' ? 'defect' : 'suggestion'} "${item.title}"?`)) {
      if (item.type === 'suggestion') {
        deleteSuggestionFromFeature(item.featureId, item.id);
      } else {
        deleteBugFromFeature(item.featureId, item.id);
      }
    }
  };

  // Status Lifecycle Action Button
  const renderStatusButton = (item) => {
    const status = item.status || 'open';

    if (status === 'open' || status === 'new') {
      return (
        <button
          type="button"
          className="status-flow-btn in-dev-action"
          onClick={() => handleMoveToInDev(item)}
          title="Developer: Click to move to In Development"
        >
          <Code2 size={12} />
          <span>In Dev</span>
        </button>
      );
    }

    if (status === 'in_dev') {
      return (
        <button
          type="button"
          className="status-flow-btn dev-fixed-action"
          onClick={() => openDevFixedModal(item)}
          title="Developer: Click to add resolution note and mark as Dev Fixed"
        >
          <Check size={12} />
          <span>Dev Fixed</span>
        </button>
      );
    }

    if (status === 'ready_for_qa') {
      return (
        <button
          type="button"
          className="status-flow-btn qa-passed-action"
          onClick={() => handleQAPass(item)}
          title="QA: Click to verify fix and pass"
        >
          <CheckCircle2 size={12} />
          <span>QA Passed</span>
        </button>
      );
    }

    // Verified / Implemented / Closed
    return (
      <button
        type="button"
        className="status-flow-btn closed-action"
        onClick={() => handleReopen(item)}
        title="Verified & Closed. Click to reopen if needed"
      >
        <CheckCircle2 size={12} />
        <span>Passed</span>
      </button>
    );
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
        className="defects-filter-bar"
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
        <div className="search-input-wrap" style={{ position: 'relative', minWidth: '220px', flex: '1 1 240px' }}>
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
        <div className="defects-type-pills" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-full)', overflowX: 'auto' }}>
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

        {/* Filter Dropdowns */}
        <div className="defects-filter-selects" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
            <option value="open">Needs Dev (In Dev)</option>
            <option value="in_dev">In Development</option>
            <option value="ready_for_qa">Dev Fixed (Ready for QA)</option>
            <option value="verified">QA Passed (Closed)</option>
          </select>
        </div>
      </div>

      {/* Simplified High-Capacity Table View */}
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
                <th>Summary</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Type</th>
                <th style={{ width: '200px' }}>Linked Feature</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isBug = item.type === 'bug';
                const sevColor = getSeverityColor(item.severity);

                return (
                  <tr
                    key={item.id}
                    onClick={() => setViewItem(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Summary */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                        {item.title}
                      </div>
                      {item.devNote && (
                        <div className="summary-dev-note">
                          <span className="summary-dev-badge">Dev Note</span>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            "{item.devNote}"
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Type & Severity Icon */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {isBug ? (
                          <div
                            className="type-icon-box"
                            style={{
                              background: item.severity === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                              border: `1px solid ${sevColor}`,
                              color: sevColor
                            }}
                            title={`Defect (${item.severity || 'Medium'})`}
                          >
                            <Bug size={14} />
                          </div>
                        ) : (
                          <div
                            className="type-icon-box"
                            style={{
                              background: 'rgba(234, 179, 8, 0.12)',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              color: '#eab308'
                            }}
                            title={`Suggestion (${item.priority || 'Medium'})`}
                          >
                            <Lightbulb size={14} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Linked Feature */}
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
                        <span>{item.featureName}</span>
                      </span>
                    </td>

                    {/* Status Lifecycle Button */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {renderStatusButton(item)}
                      </div>
                    </td>

                    {/* Actions: Edit & Delete Icons */}
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            width: '26px',
                            height: '26px',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-surface)'
                          }}
                          onClick={() => openEditModal(item)}
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            width: '26px',
                            height: '26px',
                            color: 'var(--status-critical)',
                            border: '1px solid var(--status-critical-border)',
                            background: 'var(--status-critical-bg)'
                          }}
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dev Fixed Note Modal */}
      {isDevFixedModalOpen && devFixedTarget && (
        <div className="modal-overlay" onClick={() => setIsDevFixedModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', display: 'block' }}>
                  Mark as Dev Fixed
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Handover to QA for verification
                </span>
              </div>
              <button className="btn-icon" onClick={() => setIsDevFixedModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDevFixed}>
              <div className="modal-body single-col">
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Target {devFixedTarget.type === 'bug' ? 'Defect' : 'Suggestion'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {devFixedTarget.title}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Developer Resolution Note (What was done?)
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Fixed null check on Safari, updated input validation pattern, and tested locally on staging..."
                    value={devNoteText}
                    onChange={(e) => setDevNoteText(e.target.value)}
                    style={{ minHeight: '90px' }}
                    autoFocus
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    This note will be shown directly to QA during retest verification.
                  </span>
                </div>
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
                <button type="button" className="btn btn-secondary" onClick={() => setIsDevFixedModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    borderColor: 'rgba(139, 92, 246, 0.4)'
                  }}
                >
                  <Check size={14} />
                  <span>Confirm Dev Fixed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Defect / Suggestion Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                Edit {editItem.type === 'bug' ? 'Defect' : 'Suggestion'}
              </span>
              <button className="btn-icon" onClick={() => setEditItem(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body single-col">
                <div className="form-group">
                  <label className="form-label">Summary / Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="responsive-form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      {editItem.type === 'bug' ? 'Severity' : 'Priority'}
                    </label>
                    <select
                      className="form-select"
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value)}
                    >
                      <option value="Critical">🔴 Critical (Blocker)</option>
                      <option value="High">🟠 High</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🔵 Low</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="open">Needs Dev (In Dev)</option>
                      <option value="in_dev">In Development</option>
                      <option value="ready_for_qa">Dev Fixed (Ready for QA)</option>
                      <option value="verified">QA Passed (Closed)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editItem.type === 'bug' ? 'Steps to Reproduce' : 'Suggestion Details'}
                  </label>
                  <textarea
                    className="form-textarea"
                    value={editReproSteps}
                    onChange={(e) => setEditReproSteps(e.target.value)}
                    style={{ minHeight: '75px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Developer Resolution Note</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Details of fix applied..."
                    value={editDevNote}
                    onChange={(e) => setEditDevNote(e.target.value)}
                    style={{ minHeight: '65px' }}
                  />
                </div>
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
                <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
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
                <span className="tag-pill" style={{ background: 'var(--bg-surface)' }}>
                  📁 {viewItem.featureName}
                </span>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  {viewItem.type.toUpperCase()}
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

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)', color: getSeverityColor(viewItem.severity) }}>
                  Severity: {viewItem.severity}
                </span>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  Status: {viewItem.status || 'open'}
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

              {viewItem.devNote && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#c084fc', display: 'block', marginBottom: '4px' }}>
                    Developer Resolution Note:
                  </strong>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', margin: 0 }}>
                    {viewItem.devNote}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {renderStatusButton(viewItem)}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => {
                    const item = viewItem;
                    setViewItem(null);
                    openEditModal(item);
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{
                    fontSize: '0.82rem',
                    background: 'rgba(244, 63, 94, 0.1)',
                    color: 'var(--status-critical)',
                    border: '1px solid var(--status-critical-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    handleDelete(viewItem);
                    setViewItem(null);
                  }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
