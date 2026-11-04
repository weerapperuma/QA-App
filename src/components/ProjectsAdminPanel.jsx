import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Plus, Edit2, Trash2, Users, EyeOff, Check } from 'lucide-react';
import { ROLE_SHORT, getRoles } from '../utils/roles';

function ProjectEditor({ project, onDone }) {
  const { team, updateProject, addToast } = useApp();
  const [form, setForm] = useState({
    name: project.name || '',
    code: project.code || '',
    description: project.description || '',
    memberIds: Array.from(new Set(project.memberIds || []))
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleMember = (id) =>
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(id) ? f.memberIds.filter((m) => m !== id) : [...f.memberIds, id]
    }));

  const activeTeam = team.filter((u) => u.active !== false || form.memberIds.includes(u.id));
  const allSelected = activeTeam.length > 0 && activeTeam.every((u) => form.memberIds.includes(u.id));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await updateProject(project.id, form);
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    addToast(`Project "${res.project.name}" updated.`, 'success', 'Saved');
    onDone();
  };

  return (
    <form className="um-edit" onSubmit={save}>
      <div className="um-grid">
        <label className="pf-field">
          <span>Project name</span>
          <input className="form-input" value={form.name} onChange={set('name')} />
        </label>
        <label className="pf-field">
          <span>Code</span>
          <input className="form-input" value={form.code} onChange={set('code')} maxLength={8} />
        </label>
      </div>
      <label className="pf-field">
        <span>Description</span>
        <input className="form-input" value={form.description} onChange={set('description')} />
      </label>

      <div className="pf-field">
        <span style={{ justifyContent: 'space-between', width: '100%' }}>
          <span>
            <Users size={11} /> Members ({form.memberIds.length})
          </span>
          <button
            type="button"
            className="fi-action"
            onClick={() => setForm((f) => ({ ...f, memberIds: allSelected ? [] : activeTeam.map((u) => u.id) }))}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </span>
        <div className="pj-members">
          {activeTeam.map((u) => {
            const on = form.memberIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                className={`pj-member ${on ? 'on' : ''} ${u.active === false ? 'inactive' : ''}`}
                onClick={() => toggleMember(u.id)}
                aria-pressed={on}
              >
                <span className="user-avatar-small" style={{ background: u.color, width: '20px', height: '20px', fontSize: '0.6rem' }}>
                  {u.initials}
                </span>
                <span className="pj-member-name">{u.name}</span>
                <span className="role-badges">
                  {getRoles(u).map((r) => (
                    <span key={r} className={`role-badge role-${r.toLowerCase()}`}>
                      {ROLE_SHORT[r]}
                    </span>
                  ))}
                </span>
                {on && <Check size={12} className="pj-check" />}
              </button>
            );
          })}
        </div>
        <small>Admins can always open every project. Members can add modules & features in their projects.</small>
      </div>

      {error && <div className="pf-error">{error}</div>}
      <div className="pf-actions">
        <button type="button" className="fb-btn" onClick={onDone} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="fb-btn fb-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Project'}
        </button>
      </div>
    </form>
  );
}

// Admin-only "Projects" section (in My Profile)
export default function ProjectsAdminPanel() {
  const { projects = [], features = [], team, isCurrentUserAdmin, setIsCreateProjectModalOpen, deleteProject, addToast } = useApp();
  const [editingId, setEditingId] = useState(null);

  if (!isCurrentUserAdmin) return null;

  const remove = async (p) => {
    const count = features.filter((f) => f.projectId === p.id && !f.isMainModule).length;
    if (
      !window.confirm(
        `Delete project "${p.name}"?${count ? `\n\nIts ${count} feature(s) will no longer be reachable.` : ''}\nThis cannot be undone.`
      )
    ) {
      return;
    }
    const res = await deleteProject(p.id);
    if (!res.success) addToast(res.error, 'warning');
  };

  return (
    <section className="pf-card" id="projects-admin">
      <div className="um-head">
        <div>
          <div className="pf-card-title">
            <Building2 size={15} /> Projects
          </div>
          <p className="pf-note" style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <EyeOff size={11} /> Admins only. Assign members to give them access to a project.
          </p>
        </div>
        <button type="button" className="fb-btn fb-btn-primary" onClick={() => setIsCreateProjectModalOpen(true)}>
          <Plus size={14} />
          <span>Add Project</span>
        </button>
      </div>

      <div className="um-list">
        {projects.map((p) => {
          const members = Array.from(new Set(p.memberIds || []))
            .map((id) => team.find((u) => u.id === id))
            .filter(Boolean);
          const featCount = features.filter((f) => f.projectId === p.id && !f.isMainModule && f.status !== 'module').length;
          return (
            <div key={p.id} className="um-row-wrap">
              <div className="pj-row">
                <span className="pp-project-code">{p.code}</span>
                <div className="um-info">
                  <div className="um-name">{p.name}</div>
                  <div className="um-sub">
                    {featCount} features{p.description ? ` · ${p.description}` : ''}
                  </div>
                </div>
                <div className="pj-avatars" title={members.map((m) => m.name).join(', ') || 'No members'}>
                  {members.length === 0 ? (
                    <span className="pj-none">No members</span>
                  ) : (
                    <>
                      {members.slice(0, 5).map((m) => (
                        <span key={m.id} className="user-avatar-small" style={{ background: m.color }}>
                          {m.initials}
                        </span>
                      ))}
                      {members.length > 5 && <span className="pj-more">+{members.length - 5}</span>}
                    </>
                  )}
                </div>
                <div className="um-actions">
                  <button
                    type="button"
                    className={`fi-action ${editingId === p.id ? 'primary' : ''}`}
                    onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                  >
                    <Edit2 size={12} />
                    <span>Edit & Members</span>
                  </button>
                  {projects.length > 1 && (
                    <button type="button" className="fi-action danger" onClick={() => remove(p)} title="Delete project">
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
              {editingId === p.id && <ProjectEditor project={p} onDone={() => setEditingId(null)} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
