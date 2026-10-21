import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  FolderTree,
  FolderPlus,
  Edit2,
  Trash2,
  Check,
  Plus,
  AlertTriangle,
  Sparkles,
  Layers
} from 'lucide-react';

export default function CreateModuleModal() {
  const {
    isCreateModuleModalOpen,
    setIsCreateModuleModalOpen,
    projectModules,
    allModuleNames,
    projectFeatures,
    createModule,
    updateModule,
    deleteModule,
    openCreateFeatureModal,
    activeProject
  } = useApp();

  // Add new module state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit module state
  const [editingModId, setEditingModId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete confirmation state
  const [deletingModId, setDeletingModId] = useState(null);

  if (!isCreateModuleModalOpen) return null;

  const handleClose = () => {
    setIsCreateModuleModalOpen(false);
    setEditingModId(null);
    setDeletingModId(null);
    setNewName('');
    setNewDescription('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    await createModule({
      name: newName.trim(),
      description: newDescription.trim()
    });
    setIsSubmitting(false);
    setNewName('');
    setNewDescription('');
  };

  const startEdit = (mod) => {
    setEditingModId(mod.id);
    setEditName(mod.name);
    setEditDescription(mod.description || '');
    setDeletingModId(null);
  };

  const cancelEdit = () => {
    setEditingModId(null);
    setEditName('');
    setEditDescription('');
  };

  const saveEdit = async (moduleId) => {
    if (!editName.trim()) return;
    await updateModule(moduleId, {
      name: editName.trim(),
      description: editDescription.trim()
    });
    setEditingModId(null);
  };

  const confirmDelete = async (moduleId) => {
    await deleteModule(moduleId);
    setDeletingModId(null);
  };

  // Helper to count features in a module
  const getFeatureCount = (modName) => {
    return (projectFeatures || []).filter(
      (f) => (f.moduleName || '').trim().toLowerCase() === (modName || '').trim().toLowerCase()
    ).length;
  };

  // Distinct list of modules: use projectModules or fallback to names
  const modulesList = projectModules && projectModules.length > 0
    ? projectModules
    : (allModuleNames || []).map((name) => ({
        id: `mod-${name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}`,
        name: name,
        description: ''
      }));

  const sampleSuggestions = [
    'SETUP',
    'Purchasing and inventory',
    'Sales & Invoicing',
    'Customer Management',
    'Finance & Accounting',
    'Warehouse & Logistics'
  ];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '640px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-dev)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FolderTree size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Manage Modules
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {activeProject?.name || 'Project'} • {modulesList.length} {modulesList.length === 1 ? 'module' : 'modules'} declared
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          className="modal-body"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            padding: '1.25rem',
            overflowY: 'auto'
          }}
        >
          {/* Section: Add New Module */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <FolderPlus size={15} color="var(--accent-dev)" />
              <span>Declare New Module</span>
            </div>

            {/* Quick Suggestions Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {sampleSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewName(s)}
                  style={{
                    background: newName === s ? 'var(--accent-dev)' : 'var(--bg-canvas)',
                    color: newName === s ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.6rem',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  + {s}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Module Name (e.g. SETUP, Purchasing and inventory)..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ flex: '1 1 220px' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newName.trim() || isSubmitting}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={14} />
                  <span>{isSubmitting ? 'Adding...' : 'Add Module'}</span>
                </button>
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="Description / scope (optional)..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
              />
            </form>
          </div>

          {/* Section: Currently Added Modules List */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.65rem'
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                Currently Added Modules ({modulesList.length})
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Features only appear on the board, grouped by these modules
              </span>
            </div>

            {modulesList.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  background: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)'
                }}
              >
                <FolderTree size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No modules added yet
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem' }}>
                  Type a name above (e.g. SETUP, Purchasing and inventory) to declare your first module.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {modulesList.map((mod) => {
                  const isEditing = editingModId === mod.id;
                  const isDeleting = deletingModId === mod.id;
                  const featCount = getFeatureCount(mod.name);

                  if (isEditing) {
                    return (
                      <div
                        key={mod.id}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--accent-dev)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-dev)' }}>
                          Editing Module: {mod.name}
                        </div>
                        <input
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Module Name"
                          autoFocus
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Module Description"
                          style={{ fontSize: '0.78rem' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            onClick={cancelEdit}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                            onClick={() => saveEdit(mod.id)}
                            disabled={!editName.trim()}
                          >
                            <Check size={13} />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isDeleting) {
                    return (
                      <div
                        key={mod.id}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={16} color="var(--status-critical)" />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            Delete <strong>{mod.name}</strong>?{' '}
                            {featCount > 0 ? (
                              <span style={{ color: 'var(--status-critical)' }}>
                                ({featCount} features will be moved to General)
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                            onClick={() => setDeletingModId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.3rem 0.65rem',
                              background: 'var(--status-critical)',
                              color: '#fff',
                              border: 'none'
                            }}
                            onClick={() => confirmDelete(mod.id)}
                          >
                            Confirm Delete
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={mod.id}
                      className="module-item-row"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Left: Name, Description & Feature count */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            📁 {mod.name}
                          </span>
                          <span
                            className="tag-pill"
                            style={{
                              fontSize: '0.68rem',
                              background: featCount > 0 ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-canvas)',
                              color: featCount > 0 ? 'var(--accent-dev)' : 'var(--text-muted)',
                              border: '1px solid var(--border-color)',
                              padding: '1px 6px'
                            }}
                          >
                            {featCount} {featCount === 1 ? 'feature' : 'features'}
                          </span>
                        </div>
                        {mod.description && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '380px'
                            }}
                          >
                            {mod.description}
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.3rem 0.6rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onClick={() => {
                            handleClose();
                            openCreateFeatureModal({ defaultModuleName: mod.name });
                          }}
                          title={`Add feature under ${mod.name}`}
                        >
                          <Plus size={12} />
                          <span>Add Feature</span>
                        </button>

                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)'
                          }}
                          onClick={() => startEdit(mod)}
                          title="Edit Module"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            color: 'var(--status-critical)'
                          }}
                          onClick={() => setDeletingModId(mod.id)}
                          title="Delete Module"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            style={{ fontSize: '0.8rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
