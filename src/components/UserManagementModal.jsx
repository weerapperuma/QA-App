import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  UserPlus,
  ShieldCheck,
  Code2,
  CheckCircle2,
  Trash2,
  User,
  Lock,
  Tag,
  Sparkles,
  Key
} from 'lucide-react';

export default function UserManagementModal() {
  const {
    team,
    addUser,
    deleteUser,
    isUserManagementModalOpen,
    setIsUserManagementModalOpen
  } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('123');
  const [role, setRole] = useState('developer'); // 'developer' | 'qa' | 'admin'
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  if (!isUserManagementModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const res = addUser({
      username,
      password,
      role,
      name,
      title
    });

    if (res.success) {
      setUsername('');
      setPassword('123');
      setName('');
      setTitle('');
    } else {
      setError(res.error || 'Failed to add user');
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsUserManagementModalOpen(false)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Super Admin • User Management
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                Create user accounts with assigned roles. Users sign in with their username & password without choosing a role.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsUserManagementModalOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Add User Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
              <UserPlus size={16} color="var(--accent-dev)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>Add New Team Member</span>
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--status-critical-bg)',
                  border: '1px solid var(--status-critical-border)',
                  color: 'var(--status-critical)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Username *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. alex_dev"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="password123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem 0.55rem 2rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Assigned Role * (System automatically configures their permissions upon sign-in)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setRole('developer')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: role === 'developer' ? 'var(--accent-dev)' : 'var(--border-medium)',
                    background: role === 'developer' ? 'var(--accent-dev-subtle)' : 'var(--bg-card)',
                    color: role === 'developer' ? 'var(--accent-dev)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Code2 size={15} />
                  <span>Developer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('qa')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: role === 'qa' ? 'var(--accent-qa)' : 'var(--border-medium)',
                    background: role === 'qa' ? 'var(--accent-qa-subtle)' : 'var(--bg-card)',
                    color: role === 'qa' ? 'var(--accent-qa)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>QA Engineer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: role === 'admin' ? '#8b5cf6' : 'var(--border-medium)',
                    background: role === 'admin' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-card)',
                    color: role === 'admin' ? '#8b5cf6' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Super Admin</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Dev"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.65rem',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <UserPlus size={15} />
              <span>Create User & Grant Role</span>
            </button>
          </form>

          {/* Current Team Roster */}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Registered Accounts ({team.length})</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Default demo password is <strong>123</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {team.map((member) => {
                const isRoot = member.id === 'user-admin';
                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        className="user-avatar-small"
                        style={{ background: member.color, width: '32px', height: '32px', fontSize: '0.75rem' }}
                      >
                        {member.initials}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{member.name}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            @{member.username || member.name.toLowerCase().replace(/\s+/g, '')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          {member.title} • {member.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background:
                            member.role === 'developer'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : member.role === 'qa'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(139, 92, 246, 0.15)',
                          color:
                            member.role === 'developer'
                              ? 'var(--accent-dev)'
                              : member.role === 'qa'
                              ? 'var(--accent-qa)'
                              : '#8b5cf6',
                          border: `1px solid ${
                            member.role === 'developer'
                              ? 'var(--accent-dev-border)'
                              : member.role === 'qa'
                              ? 'var(--accent-qa-border)'
                              : 'rgba(139, 92, 246, 0.3)'
                          }`
                        }}
                      >
                        {member.role?.toUpperCase()}
                      </span>

                      {!isRoot && (
                        <button
                          type="button"
                          onClick={() => deleteUser(member.id)}
                          className="btn-icon"
                          style={{ width: '28px', height: '28px', color: 'var(--text-muted)' }}
                          title="Delete user"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
