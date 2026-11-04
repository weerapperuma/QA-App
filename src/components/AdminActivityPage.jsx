import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Activity,
  ArrowLeft,
  Users,
  Wifi,
  LogIn,
  UserX,
  UserCheck,
  Trash2,
  Search,
  ShieldCheck,
  EyeOff,
  Clock
} from 'lucide-react';
import { ROLES, ROLE_SHORT, getRoles, hasRole } from '../utils/roles';

const ONLINE_WINDOW_MS = 3 * 60 * 1000;
const DONE = ['verified', 'implemented', 'qa_passed', 'qa passed', 'closed'];
const FIXED = [...DONE, 'ready_for_qa', 'dev_fixed', 'dev fixed', 'retest'];
const norm = (s) => (s || '').toLowerCase().trim();

const ms = (iso) => (iso ? new Date(iso).getTime() : 0);

const timeAgo = (iso) => {
  if (!iso) return 'Never';
  const diff = Date.now() - ms(iso);
  if (diff < 60 * 1000) return 'Just now';
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const formatDuration = (total) => {
  const mins = Math.round((total || 0) / 60000);
  if (mins < 1) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export default function AdminActivityPage() {
  const { team = [], features = [], currentUser, isCurrentUserAdmin, setUserActive, deleteUser, setActiveTab, addToast, projects = [] } =
    useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | online | active | deactivated
  const [sortBy, setSortBy] = useState('lastActive');

  // Per-user work progress across all projects
  const progressByUser = useMemo(() => {
    const map = {};
    const get = (id) => {
      if (!map[id]) {
        map[id] = { featDev: 0, featDevDone: 0, featQa: 0, featQaDone: 0, bugsAssigned: 0, bugsFixed: 0, bugsReported: 0, suggestions: 0 };
      }
      return map[id];
    };
    (features || []).forEach((f) => {
      if (!f || f.isMainModule || f.status === 'module') return;
      if (f.assignedDev) {
        const p = get(f.assignedDev);
        p.featDev++;
        if (f.status === 'verified') p.featDevDone++;
      }
      if (f.assignedQa) {
        const p = get(f.assignedQa);
        p.featQa++;
        if (f.status === 'verified') p.featQaDone++;
      }
      (f.bugs || []).forEach((b) => {
        const dev = b.assignedDev || f.assignedDev;
        if (dev) {
          const p = get(dev);
          p.bugsAssigned++;
          if (FIXED.includes(norm(b.status))) p.bugsFixed++;
        }
        if (b.reportedBy) get(b.reportedBy).bugsReported++;
      });
      (f.suggestions || []).forEach((s) => {
        if (s.submittedBy) get(s.submittedBy).suggestions++;
      });
    });
    return map;
  }, [features]);

  // Whole-site progress
  const site = useMemo(() => {
    const feats = (features || []).filter((f) => f && !f.isMainModule && f.status !== 'module');
    const verified = feats.filter((f) => f.status === 'verified').length;
    const inFlight = feats.filter((f) => ['in_dev', 'ready_for_qa', 'in_qa'].includes(f.status)).length;
    const pool = feats.filter((f) => f.status === 'backlog').length;
    const allBugs = feats.flatMap((f) => f.bugs || []);
    const openBugs = allBugs.filter((b) => !DONE.includes(norm(b.status))).length;
    const perProject = (projects || []).map((p) => {
      const pf = feats.filter((f) => f.projectId === p.id);
      const pv = pf.filter((f) => f.status === 'verified').length;
      return { id: p.id, name: p.name, total: pf.length, verified: pv, pct: pf.length ? Math.round((pv / pf.length) * 100) : 0 };
    });
    return { total: feats.length, verified, inFlight, pool, openBugs, perProject };
  }, [features, projects]);

  if (!isCurrentUserAdmin) {
    return (
      <div className="profile-page">
        <div className="pf-card">This page is only available to admins.</div>
      </div>
    );
  }

  const now = Date.now();
  const isOnline = (u) => u.active !== false && now - ms(u.lastActiveAt) < ONLINE_WINDOW_MS;
  const todayStart = startOfToday();

  const stats = {
    total: team.length,
    online: team.filter(isOnline).length,
    today: team.filter((u) => ms(u.lastLoginAt) >= todayStart || ms(u.lastActiveAt) >= todayStart).length,
    deactivated: team.filter((u) => u.active === false).length
  };

  const q = search.trim().toLowerCase();
  const rows = team
    .filter((u) => !q || [u.name, u.username, u.email, u.title].some((v) => (v || '').toLowerCase().includes(q)))
    .filter((u) => {
      if (statusFilter === 'online') return isOnline(u);
      if (statusFilter === 'active') return u.active !== false;
      if (statusFilter === 'deactivated') return u.active === false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'activeTime') return (b.totalActiveMs || 0) - (a.totalActiveMs || 0);
      if (sortBy === 'lastLogin') return ms(b.lastLoginAt) - ms(a.lastLoginAt);
      return ms(b.lastActiveAt) - ms(a.lastActiveAt);
    });

  // Recent sign-ins across everyone
  const recentSessions = team
    .flatMap((u) => (u.sessions || []).map((s) => ({ ...s, user: u })))
    .sort((a, b) => ms(b.start) - ms(a.start))
    .slice(0, 12);

  const handleToggleActive = async (u) => {
    const deactivating = u.active !== false;
    if (deactivating && !window.confirm(`Deactivate ${u.name}? They won't be able to sign in or be assigned work. Their history is kept.`)) {
      return;
    }
    const res = await setUserActive(u.id, !deactivating);
    if (!res.success) addToast(res.error, 'warning');
  };

  const handleDelete = (u) => {
    if (
      window.confirm(
        `Permanently delete ${u.name} (@${u.username})?\n\nTip: Deactivate keeps their history and assignments. Delete cannot be undone.`
      )
    ) {
      deleteUser(u.id);
    }
  };

  return (
    <div className="profile-page admin-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="fb-btn" onClick={() => setActiveTab('features')}>
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>
        <span className="pf-note" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <EyeOff size={12} /> Admins only
        </span>
      </div>

      {/* Summary */}
      <div className="ad-stats">
        <div className="ad-stat">
          <Users size={16} />
          <div>
            <strong>{stats.total}</strong>
            <span>Users</span>
          </div>
        </div>
        <div className="ad-stat online">
          <Wifi size={16} />
          <div>
            <strong>{stats.online}</strong>
            <span>Online now</span>
          </div>
        </div>
        <div className="ad-stat">
          <LogIn size={16} />
          <div>
            <strong>{stats.today}</strong>
            <span>Active today</span>
          </div>
        </div>
        <div className="ad-stat off">
          <UserX size={16} />
          <div>
            <strong>{stats.deactivated}</strong>
            <span>Deactivated</span>
          </div>
        </div>
      </div>

      {/* Site progress */}
      <div className="pf-card">
        <div className="pf-card-title">
          <Activity size={15} /> Site progress
        </div>
        <div className="ad-site">
          <div className="ad-site-numbers">
            <span>
              <strong>{site.verified}</strong>/{site.total} features verified
            </span>
            <span>
              <strong>{site.inFlight}</strong> in progress
            </span>
            <span>
              <strong>{site.pool}</strong> in pool
            </span>
            <span className={site.openBugs > 0 ? 'warn' : ''}>
              <strong>{site.openBugs}</strong> open defects
            </span>
          </div>
          <div className="ad-projects">
            {site.perProject.map((p) => (
              <div key={p.id} className="ad-project">
                <div className="ad-project-head">
                  <span>{p.name}</span>
                  <span>
                    {p.verified}/{p.total} · {p.pct}%
                  </span>
                </div>
                <div className="feat-card-bar">
                  <div className={`feat-card-bar-fill ${p.pct === 100 && p.total > 0 ? 'tone-done' : ''}`} style={{ width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team table */}
      <div className="pf-card">
        <div className="ad-table-head">
          <div className="pf-card-title">
            <Users size={15} /> Team activity
          </div>
          <div className="fi-filters">
            <div className="fi-search">
              <Search size={12} />
              <input className="form-input" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All users</option>
              <option value="online">Online now</option>
              <option value="active">Active accounts</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="lastActive">Sort: last active</option>
              <option value="lastLogin">Sort: last login</option>
              <option value="activeTime">Sort: active time</option>
              <option value="name">Sort: name</option>
            </select>
          </div>
        </div>

        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Last active</th>
                <th>Active time</th>
                <th>Progress</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const roles = getRoles(u);
                const p = progressByUser[u.id] || {};
                const deactivated = u.active === false;
                const online = isOnline(u);
                const isMe = u.id === currentUser?.id;
                const isDev = hasRole(u, ROLES.DEVELOPER);
                const isQa = hasRole(u, ROLES.QA);
                return (
                  <tr key={u.id} className={deactivated ? 'is-deactivated' : ''}>
                    <td>
                      <div className="ad-user">
                        <span className="user-avatar-small" style={{ background: u.color, width: '28px', height: '28px', fontSize: '0.7rem' }}>
                          {u.initials}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div className="um-name">
                            {u.name}
                            {isMe && <span className="um-you">You</span>}
                          </div>
                          <div className="um-sub">@{u.username}</div>
                          <span className="role-badges">
                            {roles.map((r) => (
                              <span key={r} className={`role-badge role-${r.toLowerCase()}`}>
                                {ROLE_SHORT[r]}
                              </span>
                            ))}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {deactivated ? (
                        <span className="ad-status off" title={`Deactivated ${formatDateTime(u.deactivatedAt)}`}>
                          Deactivated
                        </span>
                      ) : online ? (
                        <span className="ad-status online">
                          <span className="ad-dot" />
                          Online
                        </span>
                      ) : (
                        <span className="ad-status">Offline</span>
                      )}
                    </td>
                    <td title={formatDateTime(u.lastLoginAt)}>
                      <div>{timeAgo(u.lastLoginAt)}</div>
                      <div className="um-sub">{u.loginCount || 0} logins</div>
                    </td>
                    <td title={formatDateTime(u.lastActiveAt)}>{timeAgo(u.lastActiveAt)}</td>
                    <td>
                      <span className="ad-duration">
                        <Clock size={11} />
                        {formatDuration(u.totalActiveMs)}
                      </span>
                    </td>
                    <td>
                      <div className="ad-progress">
                        {isDev && (
                          <span title="Features (as developer): verified / assigned">
                            Dev features <strong>{p.featDevDone || 0}/{p.featDev || 0}</strong>
                          </span>
                        )}
                        {isDev && (
                          <span title="Defects fixed / assigned">
                            Defects fixed <strong>{p.bugsFixed || 0}/{p.bugsAssigned || 0}</strong>
                          </span>
                        )}
                        {isQa && (
                          <span title="Features (as QA): verified / assigned">
                            QA features <strong>{p.featQaDone || 0}/{p.featQa || 0}</strong>
                          </span>
                        )}
                        {(isQa || p.bugsReported > 0) && (
                          <span>
                            Defects logged <strong>{p.bugsReported || 0}</strong>
                          </span>
                        )}
                        {p.suggestions > 0 && (
                          <span>
                            Suggestions <strong>{p.suggestions}</strong>
                          </span>
                        )}
                        {!isDev && !isQa && !p.bugsReported && <span className="um-sub">No assigned work</span>}
                      </div>
                    </td>
                    <td>
                      {!isMe && (
                        <div className="ad-actions">
                          <button
                            type="button"
                            className={`fi-action ${deactivated ? 'primary' : ''}`}
                            onClick={() => handleToggleActive(u)}
                            title={deactivated ? 'Reactivate account' : 'Deactivate account (keeps history)'}
                          >
                            {deactivated ? <UserCheck size={13} /> : <UserX size={13} />}
                            <span>{deactivated ? 'Activate' : 'Deactivate'}</span>
                          </button>
                          {u.id !== 'user-admin' && (
                            <button type="button" className="fi-action danger" onClick={() => handleDelete(u)} title="Delete permanently">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="fi-empty">No users match.</div>}
        </div>
      </div>

      {/* Recent sign-ins */}
      <div className="pf-card">
        <div className="pf-card-title">
          <LogIn size={15} /> Recent sign-ins
        </div>
        {recentSessions.length === 0 ? (
          <div className="fi-empty">No sign-ins recorded yet. Activity is tracked from the next login.</div>
        ) : (
          <div className="ad-sessions">
            {recentSessions.map((s) => {
              const open = !s.endedAt && now - ms(s.lastSeenAt) < ONLINE_WINDOW_MS;
              return (
                <div key={`${s.user.id}-${s.id}`} className="ad-session">
                  <span className="user-avatar-small" style={{ background: s.user.color, width: '22px', height: '22px', fontSize: '0.6rem' }}>
                    {s.user.initials}
                  </span>
                  <span className="ad-session-name">{s.user.name}</span>
                  <span className="um-sub">{formatDateTime(s.start)}</span>
                  <span className="ad-session-dur">
                    {open ? (
                      <span className="ad-status online">
                        <span className="ad-dot" />
                        Active now
                      </span>
                    ) : (
                      <>
                        {formatDuration(s.activeMs)} active{s.endedAt ? ` · ended ${formatDateTime(s.endedAt)}` : ''}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="pf-note" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <ShieldCheck size={12} />
        Active time counts only while the app is open, visible and in use (idle after 5 minutes without input).
      </p>
    </div>
  );
}
