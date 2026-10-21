import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Building2, Plus } from 'lucide-react';

export default function CreateProjectModal() {
  const {
    isCreateProjectModalOpen,
    setIsCreateProjectModalOpen,
    createProject
  } = useApp();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Enterprise ERP');

  if (!isCreateProjectModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProject({
      name,
      code: code || name.substring(0, 4).toUpperCase(),
      description,
      category
    });

    setName('');
    setCode('');
    setDescription('');
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCreateProjectModalOpen(false)}>
      <div
        className="modal-container"
        style={{ maxWidth: '540px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="var(--accent-dev)" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Declare New Project
            </span>
          </div>
          <button className="btn-icon" onClick={() => setIsCreateProjectModalOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body single-col">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. ERP Cloud Suite, Healthcare CRM, Warehouse OS"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!code) {
                    setCode(e.target.value.substring(0, 4).toUpperCase());
                  }
                }}
                required
              />
            </div>

            <div className="responsive-form-grid-2">
              <div className="form-group">
                <label className="form-label">Project Code / Prefix</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ERP, CRM, SHOP"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Enterprise ERP">Enterprise ERP</option>
                  <option value="FinTech & Payments">FinTech & Payments</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Healthcare & CRM">Healthcare & CRM</option>
                  <option value="SaaS Platform">SaaS Platform</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description / Scope</label>
              <textarea
                className="form-textarea"
                placeholder="Briefly describe what this software project delivers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
              onClick={() => setIsCreateProjectModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={15} />
              <span>Declare Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
