// Role model
// ----------
// Users hold one or more roles: 'ADMIN' | 'DEVELOPER' | 'QA'.
// ADMIN is a *private* role: it is only ever shown to admins. Everyone else sees a
// user's work roles (DEVELOPER / QA) only, so nobody can tell who the admins are.
//
// For backwards compatibility every normalized user also keeps a lower-case `role`
// field holding its primary *work* role ('developer' | 'qa' | 'member'). It never
// contains 'admin', so existing code that reads `role` can't leak admin status.

export const ROLES = {
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  QA: 'QA'
};

export const ROLE_ORDER = [ROLES.ADMIN, ROLES.DEVELOPER, ROLES.QA];

export const ROLE_LABELS = {
  ADMIN: 'Admin',
  DEVELOPER: 'Developer',
  QA: 'QA'
};

export const ROLE_SHORT = {
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEV',
  QA: 'QA'
};

const LEGACY_ROLE_MAP = {
  admin: ROLES.ADMIN,
  superadmin: ROLES.ADMIN,
  developer: ROLES.DEVELOPER,
  dev: ROLES.DEVELOPER,
  qa: ROLES.QA,
  tester: ROLES.QA
};

const toRole = (r) => {
  if (!r || typeof r !== 'string') return null;
  const upper = r.trim().toUpperCase();
  if (ROLE_ORDER.includes(upper)) return upper;
  return LEGACY_ROLE_MAP[r.trim().toLowerCase()] || null;
};

// Split free-text role values like "Admin + Developer", "ADMIN, QA", "admin/dev", "Admin & QA"
const splitRoleText = (value) =>
  String(value)
    .split(/\s*(?:\+|,|\/|&|\||;|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

const toRoleList = (value) => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => (typeof item === 'string' ? splitRoleText(item) : [])).map(toRole).filter(Boolean);
};

// All roles of a user. Reads `roles` (array or text) and the legacy `role` field, e.g.
//   roles: ['ADMIN', 'DEVELOPER']   |   role: 'Admin + Developer'   |   role: 'qa'
// `roles` wins when it holds valid roles (it's what the app saves); otherwise `role` is used.
export const getRoles = (user) => {
  if (!user) return [];
  const fromRoles = toRoleList(user.roles);
  const set = new Set(fromRoles.length > 0 ? fromRoles : toRoleList(user.role));
  return ROLE_ORDER.filter((r) => set.has(r));
};

export const hasRole = (user, role) => getRoles(user).includes(role);
export const isAdmin = (user) => hasRole(user, ROLES.ADMIN);

// Roles that are safe to show to anyone (never includes ADMIN)
export const getWorkRoles = (user) => getRoles(user).filter((r) => r !== ROLES.ADMIN);

// Roles to display, depending on who is looking
export const getVisibleRoles = (user, viewer) => (isAdmin(viewer) ? getRoles(user) : getWorkRoles(user));

export const publicRoleLabel = (user) => {
  const work = getWorkRoles(user);
  return work.length > 0 ? work.map((r) => ROLE_LABELS[r]).join(' · ') : 'Member';
};

// Workspace view for the logged-in user: 'all' | 'developer' | 'qa'
export const getViewRole = (user) => {
  const work = getWorkRoles(user);
  if (isAdmin(user) || work.length !== 1) return 'all';
  return work[0] === ROLES.DEVELOPER ? 'developer' : 'qa';
};

export const defaultTitleForRoles = (roles = []) => {
  if (roles.includes(ROLES.DEVELOPER) && roles.includes(ROLES.QA)) return 'Developer & QA';
  if (roles.includes(ROLES.DEVELOPER)) return 'Software Developer';
  if (roles.includes(ROLES.QA)) return 'QA Engineer';
  return 'Team Member';
};

export const defaultColorForRoles = (roles = []) => {
  if (roles.includes(ROLES.DEVELOPER)) return '#0284c7';
  if (roles.includes(ROLES.QA)) return '#10b981';
  return '#64748b';
};

// Titles that would reveal admin status to other users
const REVEALING_TITLES = ['super administrator', 'super admin', 'administrator', 'admin'];

export const normalizeUser = (user) => {
  if (!user) return user;
  const roles = getRoles(user);
  const finalRoles = roles.length > 0 ? roles : [ROLES.DEVELOPER];
  const work = finalRoles.filter((r) => r !== ROLES.ADMIN);
  const legacyRole = work.includes(ROLES.DEVELOPER) ? 'developer' : work.includes(ROLES.QA) ? 'qa' : 'member';
  const title =
    !user.title || REVEALING_TITLES.includes(String(user.title).trim().toLowerCase())
      ? defaultTitleForRoles(finalRoles)
      : user.title;
  return { ...user, roles: finalRoles, role: legacyRole, title };
};

export const makeInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
