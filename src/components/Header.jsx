import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  Code2,
  CheckCircle2,
  Plus,
  Sun,
  Moon,
  Building2,
  Bug,
  ShieldCheck,
  ChevronDown,
  Check,
  LogOut,
  User
} from 'lucide-react';

export default function Header() {
  const {
    role,
    setRole,
    theme,
    toggleTheme,
    projects,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    setIsCreateProjectModalOpen,
    setIsCreateFeatureModalOpen,
    activeTab,
    setActiveTab,
    projectFeatures,
    allFeatureDefects = [],
    resetDemoData,
    currentUser,
    logout,
    loginAs,
    team,
    setIsUserManagementModalOpen
  } = useApp();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsProjectDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsProjectDropdownOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    if (isProjectDropdownOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProjectDropdownOpen, isUserMenuOpen]);

  return (
    <header className="top-header">
      {/* Left: Brand & Project Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="brand-logo-icon" style={{ width: '32px', height: '32px' }}>
            <Layers size={18} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
            DevBridge
          </span>
        </div>

        <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)' }}></div>

        {/* Project Selector Custom Dark Dropdown */}
        <div className="project-selector-wrap" ref={dropdownRef}>
          <button
            type="button"
            className={`project-selector-btn ${isProjectDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            title="Click to switch project"
          >
            <Building2 size={15} color="var(--accent-dev)" />
            <span>{activeProject?.name || 'Select Project'}</span>
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-card)',
                padding: '1px 6px',
                borderRadius: '4px',
                color: 'var(--accent-dev)',
                border: '1px solid var(--accent-dev-border)'
              }}
            >
              {activeProject?.code || 'PROJ'}
            </span>
            <ChevronDown
              size={14}
              style={{
                transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                color: 'var(--text-muted)'
              }}
            />
          </button>

          {/* Floating Dark Dropdown Menu */}
          {isProjectDropdownOpen && (
            <div className="project-dropdown-menu">
              <div
                style={{
                  padding: '0.4rem 0.6rem 0.35rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em'
                }}
              >
                Switch Project
              </div>

              {projects.map((p) => {
                const isSelected = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProjectId(p.id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`project-menu-item ${isSelected ? 'active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isSelected ? 'var(--accent-dev)' : 'var(--bg-surface)',
                          color: isSelected ? '#090d16' : 'var(--text-secondary)'
                        }}
                      >
                        {p.code}
                      </span>
                      <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.85rem' }}>
                        {p.name}
                      </span>
                    </div>
                    {isSelected && <Check size={14} color="var(--accent-dev)" />}
                  </button>
                );
              })}

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.35rem 0' }} />

              <button
                type="button"
                onClick={() => {
                  setIsProjectDropdownOpen(false);
                  setIsCreateProjectModalOpen(true);
                }}
                className="project-menu-item"
                style={{ color: 'var(--accent-dev)', fontWeight: 600 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Plus size={14} />
                  <span style={{ fontSize: '0.84rem' }}>Declare New Project...</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Clean 3-View Switcher */}
      <div className="nav-tabs" style={{ background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
        <button
          className={`persona-btn ${activeTab === 'features' ? 'active-all' : ''}`}
          onClick={() => setActiveTab('features')}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
        >
          <Layers size={14} color="var(--accent-dev)" />
          <span>Features</span>
          <span className="nav-tab-badge" style={{ marginLeft: '4px' }}>
            {projectFeatures.length}
          </span>
        </button>

        <button
          className={`persona-btn ${activeTab === 'board' ? 'active-all' : ''}`}
          onClick={() => setActiveTab('board')}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
        >
          <Bug size={14} color="var(--status-critical)" />
          <span>Defects & Suggestions</span>
          <span className="nav-tab-badge" style={{ marginLeft: '4px' }}>
            {allFeatureDefects.length}
          </span>
        </button>

        <button
          className={`persona-btn ${activeTab === 'release' ? 'active-all' : ''}`}
          onClick={() => setActiveTab('release')}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
        >
          <ShieldCheck size={14} color="var(--accent-qa)" />
          <span>Release Gate</span>
        </button>
      </div>

      {/* Right: New Feature, Persona Toggle, Theme, and User Profile with Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Simple Role Toggle */}
        <div className="persona-switcher" style={{ padding: '2px' }}>
          <button
            className={`persona-btn ${role === 'developer' ? 'active-dev' : ''}`}
            onClick={() => setRole(role === 'developer' ? 'all' : 'developer')}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
            title="Toggle Developer view filter"
          >
            <Code2 size={13} />
            <span>Dev</span>
          </button>

          <button
            className={`persona-btn ${role === 'qa' ? 'active-qa' : ''}`}
            onClick={() => setRole(role === 'qa' ? 'all' : 'qa')}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
            title="Toggle QA view filter"
          >
            <CheckCircle2 size={13} />
            <span>QA</span>
          </button>
        </div>

        {/* Super Admin: User Management Quick Button */}
        {currentUser?.role === 'admin' && (
          <button
            className="btn"
            onClick={() => setIsUserManagementModalOpen(true)}
            style={{
              fontSize: '0.82rem',
              padding: '0.45rem 0.85rem',
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Super Admin: Manage team accounts & role assignments"
          >
            <ShieldCheck size={15} color="#c084fc" />
            <span>Manage Users</span>
          </button>
        )}

        {/* Primary Action Button */}
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateFeatureModalOpen(true)}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
        >
          <Plus size={14} />
          <span>New Feature</span>
        </button>

        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{ width: '32px', height: '32px' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)', margin: '0 2px' }} />

        {/* User Profile Pill & Logout Menu */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              background: isUserMenuOpen ? 'var(--bg-card)' : 'var(--bg-surface)',
              border: '1px solid',
              borderColor: isUserMenuOpen ? 'var(--accent-dev)' : 'var(--border-medium)',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'all 0.15s ease'
            }}
            title="Account & Persona"
          >
            <div
              className="user-avatar-small"
              style={{
                background: currentUser?.color || (currentUser?.role === 'admin' ? '#8b5cf6' : 'var(--accent-dev)'),
                width: '24px',
                height: '24px',
                fontSize: '0.68rem'
              }}
            >
              {currentUser?.initials || 'U'}
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              {currentUser?.name ? currentUser.name.split(' ')[0] : 'Engineer'}
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 'var(--radius-full)',
                background:
                  currentUser?.role === 'developer'
                    ? 'rgba(56, 189, 248, 0.15)'
                    : currentUser?.role === 'admin'
                    ? 'rgba(139, 92, 246, 0.2)'
                    : 'rgba(16, 185, 129, 0.15)',
                color:
                  currentUser?.role === 'developer'
                    ? 'var(--accent-dev)'
                    : currentUser?.role === 'admin'
                    ? '#c084fc'
                    : 'var(--accent-qa)',
                border: `1px solid ${
                  currentUser?.role === 'developer'
                    ? 'var(--accent-dev-border)'
                    : currentUser?.role === 'admin'
                    ? 'rgba(139, 92, 246, 0.45)'
                    : 'var(--accent-qa-border)'
                }`
              }}
            >
              {currentUser?.role === 'developer' ? 'DEV' : currentUser?.role === 'admin' ? 'ADMIN' : 'QA'}
            </span>
            <ChevronDown
              size={13}
              style={{
                transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                color: 'var(--text-muted)'
              }}
            />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '260px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                padding: '0.5rem',
                zIndex: 100,
                backdropFilter: 'blur(20px)',
                animation: 'dropMenuAnim 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <div style={{ padding: '0.45rem 0.65rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {currentUser?.name || 'Engineer'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {currentUser?.username ? `@${currentUser.username}` : (currentUser?.email || 'user@devbridge.io')}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: currentUser?.role === 'admin' ? '#c084fc' : 'var(--accent-dev)',
                    fontWeight: 600,
                    marginTop: '2px'
                  }}
                >
                  {currentUser?.title || (currentUser?.role === 'admin' ? 'Super Administrator' : 'Team Member')}
                </div>
              </div>

              {/* Super Admin Manage Users Option */}
              {currentUser?.role === 'admin' && (
                <div style={{ padding: '0.2rem 0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsUserManagementModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      background: 'rgba(139, 92, 246, 0.1)',
                      color: '#c084fc',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.12s'
                    }}
                    className="project-menu-item"
                  >
                    <ShieldCheck size={15} color="#c084fc" />
                    <span>User Management & Roles</span>
                  </button>
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.35rem 0' }} />
                </div>
              )}

              {/* Switch Persona */}
              <div style={{ padding: '0.2rem 0' }}>
                <div style={{ padding: '0.25rem 0.65rem', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Switch Team Persona
                </div>
                {(team || []).slice(0, 5).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      loginAs(member);
                      setIsUserMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.42rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: member.id === currentUser?.id ? 'var(--accent-dev-subtle)' : 'transparent',
                      color: member.id === currentUser?.id ? 'var(--accent-dev)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      textAlign: 'left',
                      transition: 'background 0.12s'
                    }}
                    className="project-menu-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div
                        className="user-avatar-small"
                        style={{
                          background: member.color || (member.role === 'admin' ? '#8b5cf6' : 'var(--accent-dev)'),
                          width: '18px',
                          height: '18px',
                          fontSize: '0.58rem'
                        }}
                      >
                        {member.initials}
                      </div>
                      <span style={{ fontWeight: member.id === currentUser?.id ? 700 : 500 }}>
                        {member.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color:
                          member.role === 'developer'
                            ? 'var(--accent-dev)'
                            : member.role === 'admin'
                            ? '#c084fc'
                            : 'var(--accent-qa)'
                      }}
                    >
                      {member.role === 'developer' ? 'Dev' : member.role === 'admin' ? 'Admin' : 'QA'}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.35rem 0' }} />

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--status-critical)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s'
                }}
                className="project-menu-item"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
