import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserPlus, ShieldCheck, Trash2, Edit2, EyeOff, KeyRound, UserX, UserCheck, Search, X } from 'lucide-react';
import RolePicker from './RolePicker';
import { ROLES, ROLE_SHORT, getRoles } from '../utils/roles';

const EMPTY_FORM = { username: '', password: '123', name: '', title: '', roles: [ROLES.DEVELOPER] };

function EditUserForm({ member, onDone }) {
  const { updateUser, addToast } = useApp();
  const [form, setForm] = useState({
    name: member.name || '',
    username: member.username || '',
    title: member.title || '',
    roles: getRoles(member),
    password: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const changes = { name: form.name, username: form.username, title: form.title, roles: form.roles };
    if (form.password) changes.password = form.password;
    const res = await updateUser(member.id, changes);
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    addToast(`Updated @${res.user.username}.`, 'success', 'User Updated');
    onDone();
  };

  return (
    <form className="um-edit" onSubmit={handleSave}>
      <div className="um-grid">
        <label className="pf-field">
          <span>Full name</span>
          <input className="form-input" value={form.name} onChange={set('name')} />
        </label>
        <label className="pf-field">
          <span>Username</span>
          <input className="form-input" value={form.username} onChange={set('username')} />
        </label>
        <label className="pf-field">
          <span>Job title</span>
          <input className="form-input" value={form.title} onChange={set('title')} />
        </label>
        <label className="pf-field">
          <span>
            <KeyRound size={11} /> Reset password
          </span>
          <input
            className="form-input"
            type="text"
            placeholder="Leave empty to keep current"
            value={form.password}
            onChange={set('password')}
            autoComplete="off"
          />
        </label>
      </div>
      <div className="pf-field">
        <span>Roles</span>
        <RolePicker value={form.roles} onChange={(roles) => setForm((f) => ({ ...f, roles }))} />
      </div>
      {error && <div className="pf-error">{error}</div>}
      <div className="pf-actions">
        <button type="button" className="fb-btn" onClick={onDone} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="fb-btn fb-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

function CreateUserForm({ onDone }) {
  const { addUser } = useApp();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await addUser(form);
    if (res.success) {
      setForm(EMPTY_FORM);
      onDone();
    } else {
      setError(res.error || 'Failed to add user');
    }
  };

  return (
    <form className="um-create" onSubmit={handleSubmit}>
      <div className="um-grid">
        <label className="pf-field">
          <span>Username *</span>
          <input className="form-input" placeholder="e.g. john.doe" value={form.username} onChange={set('username')} required autoFocus />
        </label>
        <label className="pf-field">
          <span>Password *</span>
          <input className="form-input" value={form.password} onChange={set('password')} required autoComplete="off" />
        </label>
        <label className="pf-field">
          <span>Full name</span>
          <input className="form-input" placeholder="e.g. John Doe" value={form.name} onChange={set('name')} />
        </label>
        <label className="pf-field">
          <span>Job title</span>
          <input className="form-input" placeholder="Auto from roles if empty" value={form.title} onChange={set('title')} />
        </label>
      </div>
      <div className="pf-field">
        <span>Roles</span>
        <RolePicker value={form.roles} onChange={(roles) => setForm((f) => ({ ...f, roles }))} />
      </div>
      {error && <div className="pf-error">{error}</div>}
      <div className="pf-actions">
        <button type="button" className="fb-btn" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="fb-btn fb-btn-primary" disabled={!form.username.trim() || form.roles.length === 0}>
          <UserPlus size={14} />
          <span>Create User</span>
        </button>
      </div>
    </form>
  );
}

// Admin-only "Users & Roles" section (shown at the bottom of My Profile)
export default function UserManagementPanel() {
  const { team, currentUser, deleteUser, setUserActive, isCurrentUserAdmin, addToast } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!isCurrentUserAdmin) return null;

  const q = search.trim().toLowerCase();
  const rows = team
    .filter((u) => !q || [u.name, u.username, u.email, u.title].some((v) => (v || '').toLowerCase().includes(q)))
    .filter((u) => (statusFilter === 'all' ? true : statusFilter === 'active' ? u.active !== false : u.active === false));

  // Different accounts sharing one username can't both sign in — flag them
  const usernameCounts = team.reduce((acc, u) => {
    const key = (u.username || '').toLowerCase();
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const counts = {
    all: team.length,
    active: team.filter((u) => u.active !== false).length,
    deactivated: team.filter((u) => u.active === false).length
  };

  const toggleActive = async (member) => {
    const deactivating = member.active !== false;
    if (
      deactivating &&
      !window.confirm(`Deactivate ${member.name}?\n\nThey can't sign in or be assigned work. Their history and assignments are kept.`)
    ) {
      return;
    }
    const res = await setUserActive(member.id, !deactivating);
    if (!res.success) addToast(res.error, 'warning');
  };

  const remove = (member) => {
    if (
      window.confirm(
        `Permanently delete ${member.name} (@${member.username})?\n\nThis cannot be undone. Use Deactivate instead to keep their history.`
      )
    ) {
      deleteUser(member.id);
      if (editingId === member.id) setEditingId(null);
    }
  };

  return (
    <section className="pf-card" id="users-roles">
      <div className="um-head">
        <div>
          <div className="pf-card-title">
            <ShieldCheck size={15} /> Users & Roles
          </div>
          <p className="pf-note" style={{ marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <EyeOff size={11} /> Only admins see this section and who holds the Admin role.
          </p>
        </div>
        {!showCreate && (
          <button type="button" className="fb-btn fb-btn-primary" onClick={() => setShowCreate(true)}>
            <UserPlus size={14} />
            <span>Add User</span>
          </button>
        )}
      </div>

      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <div className="um-toolbar">
        <div className="fi-tabs">
          {[
            ['all', 'All'],
            ['active', 'Active'],
            ['deactivated', 'Deactivated']
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`fb-tab ${statusFilter === id ? 'active' : ''}`}
              onClick={() => setStatusFilter(id)}
            >
              <span>{label}</span>
              <span className="fb-tab-count">{counts[id]}</span>
            </button>
          ))}
        </div>
        <div className="fi-search">
          <Search size={12} />
          <input className="form-input" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button type="button" onClick={() => setSearch('')} title="Clear">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="um-list">
        {rows.length === 0 && <div className="fi-empty">No users match.</div>}
        {rows.map((member) => {
          const roles = getRoles(member);
          const isMe = member.id === currentUser?.id;
          const isRoot = member.id === 'user-admin';
          const deactivated = member.active === false;
          return (
            <div key={member.id} className={`um-row-wrap ${deactivated ? 'is-deactivated' : ''}`}>
              <div className="um-row">
                <div className="user-avatar-small um-avatar" style={{ background: member.color }}>
                  {member.initials}
                </div>

                <div className="um-info">
                  <div className="um-name">
                    {member.name}
                    {isMe && <span className="um-you">You</span>}
                  </div>
                  <div className="um-sub">
                    @{member.username}
                    {member.title ? ` · ${member.title}` : ''}
                  </div>
                  {usernameCounts[(member.username || '').toLowerCase()] > 1 && (
                    <div className="um-warn">Username used by another account (id: {member.id}). Rename or delete one.</div>
                  )}
                </div>

                <div className="um-roles">
                  <span className="role-badges">
                    {roles.map((r) => (
                      <span key={r} className={`role-badge role-${r.toLowerCase()}`} title={r === ROLES.ADMIN ? 'Only visible to admins' : undefined}>
                        {r === ROLES.ADMIN && <EyeOff size={9} />}
                        {ROLE_SHORT[r]}
                      </span>
                    ))}
                  </span>
                </div>

                <div className="um-status">
                  {deactivated ? <span className="ad-status off">Deactivated</span> : <span className="ad-status">Active</span>}
                </div>

                <div className="um-actions">
                  <button
                    type="button"
                    className={`fi-action ${editingId === member.id ? 'primary' : ''}`}
                    onClick={() => setEditingId(editingId === member.id ? null : member.id)}
                    title="Edit user"
                  >
                    <Edit2 size={12} />
                    <span>Edit</span>
                  </button>
                  {!isMe && (
                    <button
                      type="button"
                      className={`fi-action ${deactivated ? 'primary' : 'warn'}`}
                      onClick={() => toggleActive(member)}
                      title={deactivated ? 'Reactivate account' : 'Deactivate account (keeps history)'}
                    >
                      {deactivated ? <UserCheck size={12} /> : <UserX size={12} />}
                      <span>{deactivated ? 'Activate' : 'Deactivate'}</span>
                    </button>
                  )}
                  {!isMe && !isRoot && (
                    <button type="button" className="fi-action danger" onClick={() => remove(member)} title="Delete permanently">
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
              {editingId === member.id && <EditUserForm member={member} onDone={() => setEditingId(null)} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
