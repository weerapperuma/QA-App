import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Layers, Plus } from 'lucide-react';

export default function CreateFeatureModal() {
  const {
    isCreateFeatureModalOpen,
    setIsCreateFeatureModalOpen,
    createFeature,
    activeProject,
    team
  } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assignedDev, setAssignedDev] = useState(() => (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin');
  const [assignedQa, setAssignedQa] = useState(() => (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin');
  const [targetRelease, setTargetRelease] = useState('v1.0.0');
  const [devNotes, setDevNotes] = useState('');

  const devs = team.filter((m) => m.role === 'developer');
  const qas = team.filter((m) => m.role === 'qa');
  const availableDevs = devs.length > 0 ? devs : team;
  const availableQas = qas.length > 0 ? qas : team;

  React.useEffect(() => {
    if (!assignedDev && team.length > 0) {
      setAssignedDev((team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin');
    }
    if (!assignedQa && team.length > 0) {
      setAssignedQa((team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin');
    }
  }, [team]);

  if (!isCreateFeatureModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    createFeature({
      name,
      description,
      assignedDev: assignedDev || availableDevs[0]?.id || 'user-admin',
      assignedQa: assignedQa || availableQas[0]?.id || 'user-admin',
      targetRelease,
      devNotes: devNotes || `Initial feature scoping for ${name}.`
    });

    setName('');
    setDescription('');
    setDevNotes('');
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCreateFeatureModalOpen(false)}>
      <div
        className="modal-container"
        style={{ maxWidth: '620px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--accent-qa)" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Add New Feature to {activeProject?.name || 'Project'}
            </span>
          </div>
          <button className="btn-icon" onClick={() => setIsCreateFeatureModalOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body single-col">
            <div className="form-group">
              <label className="form-label">Feature Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Customer Management, Invoice Generator, Inventory Tracker"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Lead Developer</label>
                <select
                  className="form-select"
                  value={assignedDev}
                  onChange={(e) => setAssignedDev(e.target.value)}
                >
                  {availableDevs.map((d) => (
                    <option key={d.id} value={d.id}>
                      👨‍💻 {d.name} ({d.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lead QA Engineer</label>
                <select
                  className="form-select"
                  value={assignedQa}
                  onChange={(e) => setAssignedQa(e.target.value)}
                >
                  {availableQas.map((q) => (
                    <option key={q.id} value={q.id}>
                      🧪 {q.name} ({q.title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Release</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. v2.4.0, Sprint 25"
                value={targetRelease}
                onChange={(e) => setTargetRelease(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Feature Description & Scope</label>
              <textarea
                className="form-textarea"
                placeholder="Describe what functionality this feature adds to the application..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Developer Implementation Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Initial technical notes, API endpoints, or database tables planned..."
                value={devNotes}
                onChange={(e) => setDevNotes(e.target.value)}
                style={{ minHeight: '60px' }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateFeatureModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={15} />
              <span>Create Feature</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
