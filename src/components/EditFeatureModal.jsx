import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Layers,
  FolderTree,
  Trash2,
  Check,
  Edit2
} from 'lucide-react';

export default function EditFeatureModal() {
  const {
    isEditFeatureModalOpen,
    closeEditFeatureModal,
    editingFeature,
    updateFeature,
    deleteFeature,
    allModuleNames,
    team
  } = useApp();

  const [name, setName] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [isCreatingNewModule, setIsCreatingNewModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('in_dev');
  const [assignedDev, setAssignedDev] = useState('');
  const [assignedQa, setAssignedQa] = useState('');
  const [targetRelease, setTargetRelease] = useState('v1.0.0');
  const [devNotes, setDevNotes] = useState('');
  const [prLink, setPrLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const devs = team.filter((m) => m.role === 'developer');
  const qas = team.filter((m) => m.role === 'qa');
  const availableDevs = devs.length > 0 ? devs : team;
  const availableQas = qas.length > 0 ? qas : team;

  const availableModules = allModuleNames && allModuleNames.length > 0
    ? allModuleNames
    : ['SETUP', 'Purchasing and inventory', 'General'];

  useEffect(() => {
    if (editingFeature) {
      setName(editingFeature.name || '');
      setSelectedModule(editingFeature.moduleName || 'General');
      setIsCreatingNewModule(false);
      setNewModuleName('');
      setDescription(editingFeature.description || '');
      setStatus(editingFeature.status || 'in_dev');
      setAssignedDev(editingFeature.assignedDev || availableDevs[0]?.id || 'user-admin');
      setAssignedQa(editingFeature.assignedQa || availableQas[0]?.id || 'user-admin');
      setTargetRelease(editingFeature.targetRelease || 'v1.0.0');
      setDevNotes(editingFeature.devNotes || '');
      setPrLink(editingFeature.prLink || '');
    }
  }, [editingFeature, isEditFeatureModalOpen]);

  if (!isEditFeatureModalOpen || !editingFeature) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalModule = selectedModule;
    if (isCreatingNewModule && newModuleName.trim()) {
      finalModule = newModuleName.trim();
    }
    if (!finalModule) finalModule = 'General';

    setSubmitting(true);
    await updateFeature(editingFeature.id, {
      name: name.trim(),
      moduleName: finalModule,
      description: description.trim(),
      status,
      assignedDev,
      assignedQa,
      targetRelease,
      devNotes: devNotes.trim(),
      prLink: prLink.trim()
    });
    setSubmitting(false);
    closeEditFeatureModal();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete feature "${editingFeature.name}"? This will remove all associated bugs and suggestions.`)) {
      deleteFeature(editingFeature.id);
      closeEditFeatureModal();
    }
  };

  return (
    <div className="modal-overlay" onClick={closeEditFeatureModal}>
      <div
        className="modal-container"
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-dev)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit2 size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Edit Feature
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--accent-dev)',
                    border: '1px solid var(--accent-dev-border)'
                  }}
                >
                  {editingFeature.code || editingFeature.id}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Update feature details, module linkage, and workflow status
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={closeEditFeatureModal} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <div
            className="modal-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem',
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
              padding: '1.25rem'
            }}
          >
            {/* Module Selection */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  className="form-label"
                  style={{
                    marginBottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700
                  }}
                >
                  <FolderTree size={15} color="var(--accent-dev)" />
                  Belongs to Module <span style={{ color: 'var(--status-critical)' }}>*</span>
                </label>

                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.75rem',
                    color: 'var(--accent-dev)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                  onClick={() => setIsCreatingNewModule(!isCreatingNewModule)}
                >
                  {isCreatingNewModule ? 'Choose existing module' : '+ Move to new module'}
                </button>
              </div>

              {!isCreatingNewModule ? (
                <select
                  className="form-select"
                  value={selectedModule}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsCreatingNewModule(true);
                      setNewModuleName('');
                    } else {
                      setSelectedModule(e.target.value);
                    }
                  }}
                >
                  {availableModules.map((m) => (
                    <option key={m} value={m}>
                      📁 {m}
                    </option>
                  ))}
                  <option value="__new__">+ Declare New Module...</option>
                </select>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="New Module Name (e.g. SETUP, Purchasing and inventory)"
                    value={newModuleName}
                    onChange={(e) => setNewModuleName(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    onClick={() => setIsCreatingNewModule(false)}
                  >
                    Use Existing
                  </button>
                </div>
              )}
            </div>

            {/* Feature Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Feature Name <span style={{ color: 'var(--status-critical)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Items, Customers, Purchase Orders..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Scope & Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Scope & Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="What requirements, screens, and business logic does this feature include?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Status & Target Release */}
            <div className="responsive-form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Workflow Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="in_dev">1. In Development</option>
                  <option value="ready_for_qa">2. Ready for Retest (Staging)</option>
                  <option value="in_qa">3. QA Verification</option>
                  <option value="verified">4. Verified & Closed</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Release</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. v1.0.0, v2.1-beta"
                  value={targetRelease}
                  onChange={(e) => setTargetRelease(e.target.value)}
                />
              </div>
            </div>

            {/* Dev & QA Assignment */}
            <div className="responsive-form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assigned Developer</label>
                <select
                  className="form-select"
                  value={assignedDev}
                  onChange={(e) => setAssignedDev(e.target.value)}
                >
                  {availableDevs.map((d) => (
                    <option key={d.id} value={d.id}>
                      👨‍💻 {d.name} ({d.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assigned QA Lead</label>
                <select
                  className="form-select"
                  value={assignedQa}
                  onChange={(e) => setAssignedQa(e.target.value)}
                >
                  {availableQas.map((q) => (
                    <option key={q.id} value={q.id}>
                      🕵️‍♀️ {q.name} ({q.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PR Link & Implementation Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PR Link / Branch</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://github.com/org/repo/pull/123 or feature/items"
                value={prLink}
                onChange={(e) => setPrLink(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Developer Notes</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Technical notes, staging deploy info, or setup steps..."
                value={devNotes}
                onChange={(e) => setDevNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div
            className="modal-footer"
            style={{
              flexShrink: 0,
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
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
            >
              <Trash2 size={14} />
              <span>Delete Feature</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeEditFeatureModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !name.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Check size={14} />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
