import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  Bug,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Wrench
} from 'lucide-react';
import { formatRelativeTime } from '../utils/dateUtils';

export default function NotificationCenter() {
  const {
    notifications = [],
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    openFeature,
    setActiveTab,
    activeProjectId,
    currentUser
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'defects' | 'features'
  const popoverRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Project-scoped notifications, EXCLUDING actions done by the current user themselves
  const projectNotifs = notifications.filter((n) => {
    if (n.projectId && n.projectId !== activeProjectId) return false;

    // Do not show user's own actions in their notification center
    if (currentUser?.id && n.authorId && n.authorId === currentUser.id) {
      return false;
    }
    if (
      currentUser?.name &&
      n.authorName &&
      n.authorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    ) {
      return false;
    }

    return true;
  });

  const unreadCount = projectNotifs.filter((n) => !n.read).length;

  // Filtered list based on active tab
  const filteredNotifs = projectNotifs.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'defects') {
      return (
        n.type === 'bug_logged' ||
        n.type === 'suggestion_logged' ||
        n.type === 'dev_fixed' ||
        n.type === 'qa_passed' ||
        n.type === 'qa_failed'
      );
    }
    if (activeFilter === 'features') {
      return (
        n.type === 'feature_created' ||
        n.type === 'feature_ready_for_qa' ||
        n.type === 'feature_verified' ||
        n.type === 'feature_blocked'
      );
    }
    return true;
  });

  const handleNotificationClick = (notif) => {
    markNotificationAsRead(notif.id);
    if (notif.targetDefectId) {
      setActiveTab('board');
      if (notif.targetFeatureId) {
        openFeature(notif.targetFeatureId);
      }
    } else if (notif.targetFeatureId) {
      setActiveTab('features');
      openFeature(notif.targetFeatureId);
    }
    setIsOpen(false);
  };

  const getIconForType = (type, severity) => {
    switch (type) {
      case 'feature_created':
        return <Layers size={14} color="var(--accent-dev)" />;
      case 'feature_ready_for_qa':
        return <ShieldCheck size={14} color="#8b5cf6" />;
      case 'feature_verified':
        return <CheckCircle2 size={14} color="var(--accent-qa)" />;
      case 'feature_blocked':
        return <AlertTriangle size={14} color="var(--status-critical)" />;
      case 'bug_logged':
        return <Bug size={14} color={severity === 'critical' ? 'var(--status-critical)' : '#f97316'} />;
      case 'suggestion_logged':
        return <Lightbulb size={14} color="#eab308" />;
      case 'dev_fixed':
        return <Wrench size={14} color="#8b5cf6" />;
      case 'qa_passed':
        return <CheckCircle2 size={14} color="var(--accent-qa)" />;
      case 'qa_failed':
        return <AlertTriangle size={14} color="var(--status-critical)" />;
      default:
        return <Sparkles size={14} color="var(--accent-dev)" />;
    }
  };

  const getAccentBorder = (severity, type) => {
    if (severity === 'critical' || type === 'qa_failed' || type === 'feature_blocked') {
      return 'var(--status-critical)';
    }
    if (type === 'dev_fixed' || type === 'feature_ready_for_qa') {
      return '#8b5cf6';
    }
    if (severity === 'success' || type === 'qa_passed' || type === 'feature_verified') {
      return 'var(--accent-qa)';
    }
    if (type === 'suggestion_logged') {
      return '#eab308';
    }
    return 'var(--accent-dev)';
  };

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        className={`btn-icon ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '32px',
          height: '32px',
          position: 'relative',
          background: isOpen ? 'var(--bg-card-hover)' : 'transparent',
          color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
        }}
        title={`Notifications (${unreadCount} unread)`}
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '16px',
              height: '16px',
              borderRadius: '999px',
              background: 'var(--status-critical)',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
              boxShadow: '0 0 0 2px var(--bg-card)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="notification-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: '92vw',
            maxHeight: '520px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.45), 0 4px 12px -2px rgba(0, 0, 0, 0.25)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 0.95rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: 'var(--status-critical)'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsAsRead}
                  className="btn-icon"
                  style={{ width: '26px', height: '26px', fontSize: '0.74rem' }}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} color="var(--accent-dev)" />
                </button>
              )}
              {projectNotifs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Clear all notifications?')) {
                      clearAllNotifications();
                    }
                  }}
                  className="btn-icon"
                  style={{ width: '26px', height: '26px' }}
                  title="Clear all"
                >
                  <Trash2 size={13} color="var(--text-muted)" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              padding: '0.35rem 0.65rem',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              gap: '0.3rem',
              overflowX: 'auto'
            }}
          >
            {[
              { id: 'all', label: `All (${projectNotifs.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'defects', label: 'Defects' },
              { id: 'features', label: 'Features' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                style={{
                  fontSize: '0.72rem',
                  fontWeight: activeFilter === tab.id ? 700 : 500,
                  padding: '0.25rem 0.55rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: activeFilter === tab.id ? 'var(--bg-card-hover)' : 'transparent',
                  color: activeFilter === tab.id ? 'var(--accent-dev)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div
            style={{
              flex: '1 1 auto',
              overflowY: 'auto',
              maxHeight: '380px'
            }}
          >
            {filteredNotifs.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Bell size={18} style={{ opacity: 0.5 }} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
                </span>
                <span style={{ fontSize: '0.74rem' }}>
                  {activeFilter === 'unread'
                    ? 'No unread notifications to review.'
                    : 'Team events and QA verification updates will appear here.'}
                </span>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const accentColor = getAccentBorder(notif.severity, notif.type);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft: `3px solid ${accentColor}`,
                      background: notif.read ? 'transparent' : 'rgba(56, 189, 248, 0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '0.65rem',
                      alignItems: 'flex-start',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(56, 189, 248, 0.04)';
                    }}
                  >
                    {/* Icon Bubble */}
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px'
                      }}
                    >
                      {getIconForType(notif.type, notif.severity)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: notif.read ? 600 : 700,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {notif.title}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          margin: '0 0 4px 0',
                          lineHeight: 1.35
                        }}
                      >
                        {notif.message}
                      </p>

                      {/* Meta context pill (Feature / Defect) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {notif.targetFeatureName && (
                          <span
                            style={{
                              fontSize: '0.66rem',
                              padding: '1px 5px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Layers size={10} />
                            <span>{notif.targetFeatureName}</span>
                          </span>
                        )}

                        {notif.authorName && (
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                            by {notif.authorName}
                          </span>
                        )}

                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--accent-dev)',
                            fontWeight: 600,
                            marginLeft: 'auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span>View</span>
                          <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>

                    {/* Actions: Delete button */}
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => deleteNotification(notif.id)}
                        className="btn-icon"
                        style={{
                          width: '20px',
                          height: '20px',
                          color: 'var(--text-muted)',
                          opacity: 0.6
                        }}
                        title="Remove notification"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

