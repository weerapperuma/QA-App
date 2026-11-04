import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import NotificationCenter from './NotificationCenter';
import {
  Layers,
  Sun,
  Moon,
  Building2,
  Bug,
  ShieldCheck,
  ChevronDown,
  Check,
  LogOut,
  Plus,
  UserCog,
  Activity
} from 'lucide-react';
import { getRoles, ROLE_SHORT } from '../utils/roles';

export default function Header() {
  const {
    theme,
    toggleTheme,
    activeProjectId,
    activeProject,
    setIsCreateProjectModalOpen,
    activeTab,
    setActiveTab,
    projectFeatures,
    allFeatureDefects = [],
    currentUser,
    logout,
    setIsUserManagementModalOpen,
    isCurrentUserAdmin,
    myProjects = [],
    needsProjectSelection,
    selectWorkingProject
  } = useApp();
  const workspaceLocked = needsProjectSelection;
  const myRoles = getRoles(currentUser);

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
      <div className="header-left">
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
            <Building2 size={15} color="var(--accent-dev)" style={{ flexShrink: 0 }} />
            <span className="project-name-text">{workspaceLocked ? 'Choose project' : activeProject?.name || 'Select Project'}</span>
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-card)',
                padding: '1px 6px',
                borderRadius: '4px',
                color: 'var(--accent-dev)',
                border: '1px solid var(--accent-dev-border)',
                flexShrink: 0
              }}
            >
              {workspaceLocked ? '—' : activeProject?.code || 'PROJ'}
            </span>
            <ChevronDown
              size={14}
              style={{
                transform: isProjectDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                color: 'var(--text-muted)',
                flexShrink: 0
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

              {myProjects.length === 0 && (
                <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  No projects assigned to you yet.
                </div>
              )}
              {myProjects.map((p) => {
                const isSelected = !workspaceLocked && p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      selectWorkingProject(p.id);
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

              {isCurrentUserAdmin && (
              <>
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
                  <span style={{ fontSize: '0.84rem' }}>New Project…</span>
                </div>
              </button>
              </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Clean 3-View Switcher */}
      <div className="nav-tabs header-center" style={{ background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
        <button
          className={`persona-btn ${!workspaceLocked && activeTab === 'features' ? 'active-all' : ''}`}
          onClick={() => setActiveTab('features')}
          disabled={workspaceLocked}
          title={workspaceLocked ? 'Choose a working project first (My Profile)' : undefined}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
        >
          <Layers size={14} color="var(--accent-dev)" />
          <span>Features</span>
          <span className="nav-tab-badge" style={{ marginLeft: '4px' }}>
            {projectFeatures.length}
          </span>
        </button>

        <button
          className={`persona-btn ${!workspaceLocked && activeTab === 'board' ? 'active-all' : ''}`}
          onClick={() => setActiveTab('board')}
          disabled={workspaceLocked}
          title={workspaceLocked ? 'Choose a working project first (My Profile)' : undefined}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
        >
          <Bug size={14} color="var(--status-critical)" />
          <span>Defects & Suggestions</span>
        </button>

        <button
          className={`persona-btn ${!workspaceLocked && activeTab === 'release' ? 'active-all' : ''}`}
          onClick={() => setActiveTab('release')}
          disabled={workspaceLocked}
          title={workspaceLocked ? 'Choose a working project first (My Profile)' : undefined}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.9rem' }}
        >
          <ShieldCheck size={14} color="var(--accent-qa)" />
          <span>Release Gate</span>
        </button>
      </div>

      {/* Right: Theme Toggle, Notifications & Current User Profile */}
      <div className="header-right">
        {/* Team Notifications Center */}
        <NotificationCenter />

        {/* Theme Toggle (Dark/Light mode) */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{ width: '32px', height: '32px' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div style={{ width: '1px', height: '22px', background: 'var(--border-subtle)' }} />

        {/* Current User Name Include Button */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            type="button"
            className={`user-profile-btn ${isUserMenuOpen ? 'open' : ''}`}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title="Account"
          >
            <div
              className="user-avatar-small"
              style={{
                background: currentUser?.color || 'var(--accent-dev)',
                width: '24px',
                height: '24px',
                fontSize: '0.68rem',
                flexShrink: 0
              }}
            >
              {currentUser?.initials || 'U'}
            </div>
            <span className="user-profile-name">{currentUser?.name || 'Engineer'}</span>
            <span className="user-profile-role role-badges">
              {myRoles.map((r) => (
                <span key={r} className={`role-badge role-${r.toLowerCase()}`}>
                  {ROLE_SHORT[r]}
                </span>
              ))}
            </span>
            <ChevronDown
              size={13}
              style={{
                transform: isUserMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                color: 'var(--text-muted)',
                flexShrink: 0
              }}
            />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div className="user-menu">
              <div className="user-menu-head">
                <div className="user-avatar-small" style={{ background: currentUser?.color || 'var(--accent-dev)', width: '34px', height: '34px', fontSize: '0.8rem' }}>
                  {currentUser?.initials || 'U'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="user-menu-name">{currentUser?.name || 'Engineer'}</div>
                  <div className="user-menu-sub">
                    {currentUser?.username ? `@${currentUser.username}` : currentUser?.email || ''}
                    {currentUser?.title ? ` · ${currentUser.title}` : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="user-menu-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setActiveTab('profile');
                }}
              >
                <UserCog size={15} />
                <span>My Profile</span>
              </button>

              {/* Admin-only options */}
              {isCurrentUserAdmin && (
                <button
                  type="button"
                  className="user-menu-item admin"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setActiveTab('profile');
                    setIsUserManagementModalOpen(true); // tells My Profile to scroll to Users & Roles
                  }}
                >
                  <ShieldCheck size={15} />
                  <span>Users & Roles</span>
                </button>
              )}
              {isCurrentUserAdmin && (
                <button
                  type="button"
                  className="user-menu-item admin"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setActiveTab('admin');
                  }}
                >
                  <Activity size={15} />
                  <span>Team Activity</span>
                </button>
              )}

              <div className="user-menu-divider" />

              <button
                type="button"
                className="user-menu-item danger"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
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
