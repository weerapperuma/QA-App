import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Layers,
  FolderTree,
  FolderPlus,
  Sparkles,
  Plus
} from 'lucide-react';

export default function CreateFeatureModal() {
  const {
    isCreateFeatureModalOpen,
    setIsCreateFeatureModalOpen,
    createFeatureModalProps,
    setCreateFeatureModalProps,
    createFeature,
    activeProject,
    allModuleNames,
    projectModules,
    team
  } = useApp();

  const [selectedModule, setSelectedModule] = useState('');
  const [isCreatingNewModule, setIsCreatingNewModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDev, setAssignedDev] = useState(() => (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin');
  const [assignedQa, setAssignedQa] = useState(() => (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin');
  const [targetRelease, setTargetRelease] = useState('v1.0.0');
  const [devNotes, setDevNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const devs = team.filter((m) => m.role === 'developer');
  const qas = team.filter((m) => m.role === 'qa');
  const availableDevs = devs.length > 0 ? devs : team;
  const availableQas = qas.length > 0 ? qas : team;

  // List of available module names
  const availableModules = allModuleNames && allModuleNames.length > 0
    ? allModuleNames
    : ['SETUP', 'Purchasing and inventory'];

  // Sync props when opened (e.g. from "+ Add Feature to SETUP")
  useEffect(() => {
    if (createFeatureModalProps?.defaultModuleName) {
      setSelectedModule(createFeatureModalProps.defaultModuleName);
      setIsCreatingNewModule(false);
    } else if (availableModules.length > 0) {
      if (!selectedModule || !availableModules.includes(selectedModule)) {
        setSelectedModule(availableModules[0]);
      }
    }
  }, [createFeatureModalProps, isCreateFeatureModalOpen, availableModules]);

  useEffect(() => {
    if (!assignedDev && team.length > 0) {
      setAssignedDev((team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin');
    }
    if (!assignedQa && team.length > 0) {
      setAssignedQa((team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin');
    }
  }, [team]);

  if (!isCreateFeatureModalOpen) return null;

  const handleClose = () => {
    setIsCreateFeatureModalOpen(false);
    if (setCreateFeatureModalProps) setCreateFeatureModalProps(null);
    setName('');
    setDescription('');
    setIsCreatingNewModule(false);
    setNewModuleName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalModule = selectedModule;
    if (isCreatingNewModule) {
      finalModule = (newModuleName || 'General').trim();
    }
    if (!finalModule) finalModule = 'General';

    setSubmitting(true);
    await createFeature({
      name: name.trim(),
      description: description.trim(),
      moduleName: finalModule,
      assignedDev: assignedDev || availableDevs[0]?.id || 'user-admin',
      assignedQa: assignedQa || availableQas[0]?.id || 'user-admin',
      targetRelease,
      devNotes: devNotes || `Initial feature scoping for ${name.trim()}.`
    });
    setSubmitting(false);

    setName('');
    setDescription('');
    setDevNotes('');
    setIsCreatingNewModule(false);
    setNewModuleName('');
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '580px' }}
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
              <Layers size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Create New Feature
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                in {activeProject?.name || 'Project'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose} type="button">
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
              gap: '1.15rem',
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
                  {isCreatingNewModule ? 'Choose existing module' : '+ Declare new module'}
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

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                This feature will be organized inside the module and move through the Kanban workflow on your board.
              </div>
            </div>

            {/* Feature Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Feature Name <span style={{ color: 'var(--status-critical)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Items, Customers, Purchase Orders, Invoice Generation..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={!isCreatingNewModule}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Feature Scope & Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="What requirements, screens, and business logic does this feature include?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
                      🛡️ {q.name} ({q.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Release & Dev Notes */}
            <div className="responsive-form-grid-2">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Release</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. v1.0.0, v2.1.0"
                  value={targetRelease}
                  onChange={(e) => setTargetRelease(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Initial Dev Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Notes for QA / Dev team..."
                  value={devNotes}
                  onChange={(e) => setDevNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="modal-footer"
            style={{
              flexShrink: 0,
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.65rem'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || submitting}
            >
              {submitting ? 'Creating...' : 'Create Feature'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
