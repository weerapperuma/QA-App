import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserCog, KeyRound, ShieldCheck, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { ROLES, ROLE_LABELS, getRoles } from '../utils/roles';
import UserManagementPanel from './UserManagementPanel';
import ProjectsAdminPanel from './ProjectsAdminPanel';
import { WorkingProjectPicker, ProjectProgressSection } from './ProjectProgress';

const AVATAR_COLORS = ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#64748b'];

export default function ProfilePage() {
  const {
    currentUser,
    updateUser,
    addToast,
    isCurrentUserAdmin,
    isUserManagementModalOpen: scrollToUsers,
    setIsUserManagementModalOpen: setScrollToUsers,
    setActiveTab,
    needsProjectSelection
  } = useApp();

  const goToUsers = () => {
    document.getElementById('users-roles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Opened via "Users & Roles" in the account menu: jump to that section
  useEffect(() => {
    if (!scrollToUsers) return;
    const t = setTimeout(() => {
      goToUsers();
      setScrollToUsers(false);
    }, 50);
    return () => clearTimeout(t);
  }, [scrollToUsers, setScrollToUsers]);

  const [form, setForm] = useState(() => ({
    name: currentUser?.name || '',
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    title: currentUser?.title || '',
    color: currentUser?.color || AVATAR_COLORS[0]
  }));
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  if (!currentUser) return null;

  const roles = getRoles(currentUser);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const dirty =
    form.name !== (currentUser.name || '') ||
    form.username !== (currentUser.username || '') ||
    form.email !== (currentUser.email || '') ||
    form.title !== (currentUser.title || '') ||
    form.color !== (currentUser.color || '');

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setSavingProfile(true);
    const res = await updateUser(currentUser.id, form);
    setSavingProfile(false);
    if (!res.success) {
      setProfileError(res.error);
      return;
    }
    addToast('Profile updated.', 'success', 'Saved');
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.next !== pw.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    setSavingPw(true);
    const res = await updateUser(currentUser.id, { password: pw.next }, { currentPassword: pw.current });
    setSavingPw(false);
    if (!res.success) {
      setPwError(res.error);
      return;
    }
    setPw({ current: '', next: '', confirm: '' });
    addToast('Password changed.', 'success', 'Saved');
  };

  const initials = (form.name || 'U')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="profile-page">
      {!needsProjectSelection && (
        <button type="button" className="fb-btn" onClick={() => setActiveTab('features')} style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={14} />
          <span>Back to workspace</span>
        </button>
      )}

      {/* 1. Choose working project (required after every sign-in) */}
      <WorkingProjectPicker />

      {/* 2. Progress of the current project (module → feature drill-down, my work) */}
      <ProjectProgressSection />

      {/* Identity summary */}
      <div className="pf-card pf-hero">
        <div className="user-avatar-small" style={{ background: form.color, width: '56px', height: '56px', fontSize: '1.2rem' }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="pf-hero-name">{currentUser.name}</div>
          <div className="pf-hero-sub">
            @{currentUser.username} · {currentUser.title}
          </div>
          <div className="role-badges" style={{ marginTop: '0.4rem' }}>
            {roles.map((r) => (
              <span key={r} className={`role-badge role-${r.toLowerCase()}`}>
                {r === ROLES.ADMIN && <EyeOff size={9} />}
                {ROLE_LABELS[r]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pf-columns">
        {/* Account details */}
        <form className="pf-card" onSubmit={saveProfile}>
          <div className="pf-card-title">
            <UserCog size={15} /> Account details
          </div>
          <label className="pf-field">
            <span>Full name</span>
            <input className="form-input" value={form.name} onChange={set('name')} />
          </label>
          <label className="pf-field">
            <span>Username</span>
            <input className="form-input" value={form.username} onChange={set('username')} autoComplete="username" />
            <small>Used to sign in. Letters, numbers, dot, dash or underscore.</small>
          </label>
          <label className="pf-field">
            <span>Email</span>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} />
          </label>
          <label className="pf-field">
            <span>Job title</span>
            <input className="form-input" value={form.title} onChange={set('title')} placeholder="e.g. Senior Developer" />
            <small>Visible to your team.</small>
          </label>
          <div className="pf-field">
            <span>Avatar color</span>
            <div className="pf-colors">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pf-color ${form.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  title={c}
                >
                  {form.color === c && <Check size={12} color="#fff" />}
                </button>
              ))}
            </div>
          </div>
          {profileError && <div className="pf-error">{profileError}</div>}
          <div className="pf-actions">
            <button type="submit" className="fb-btn fb-btn-primary" disabled={!dirty || savingProfile}>
              {savingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Password */}
          <form className="pf-card" onSubmit={savePassword}>
            <div className="pf-card-title">
              <KeyRound size={15} /> Change password
            </div>
            <label className="pf-field">
              <span>Current password</span>
              <input
                className="form-input"
                type="password"
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
              />
            </label>
            <label className="pf-field">
              <span>New password</span>
              <input
                className="form-input"
                type="password"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                autoComplete="new-password"
              />
            </label>
            <label className="pf-field">
              <span>Confirm new password</span>
              <input
                className="form-input"
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </label>
            {pwError && <div className="pf-error">{pwError}</div>}
            <div className="pf-actions">
              <button type="submit" className="fb-btn fb-btn-primary" disabled={!pw.current || !pw.next || savingPw}>
                {savingPw ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Roles */}
          <div className="pf-card">
            <div className="pf-card-title">
              <ShieldCheck size={15} /> Roles
            </div>
            <div className="role-badges">
              {roles.map((r) => (
                <span key={r} className={`role-badge role-${r.toLowerCase()}`}>
                  {r === ROLES.ADMIN && <EyeOff size={9} />}
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
            {isCurrentUserAdmin ? (
              <>
                <p className="pf-note">
                  Your <strong>Admin</strong> role is private. Teammates who aren't admins only see you as{' '}
                  {roles.filter((r) => r !== ROLES.ADMIN).map((r) => ROLE_LABELS[r]).join(' / ') || 'a team member'}.
                </p>
                <button type="button" className="fb-btn" onClick={goToUsers} style={{ alignSelf: 'flex-start' }}>
                  <ShieldCheck size={14} />
                  <span>Manage users & roles</span>
                </button>
              </>
            ) : (
              <p className="pf-note">Roles are managed by your workspace admin.</p>
            )}
          </div>
        </div>
      </div>

      {/* Admin only: manage every account */}
      {isCurrentUserAdmin && <ProjectsAdminPanel />}
      {isCurrentUserAdmin && <UserManagementPanel />}
    </div>
  );
}
