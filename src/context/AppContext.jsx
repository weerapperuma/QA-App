import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  INITIAL_PROJECTS,
  INITIAL_FEATURES,
  INITIAL_TEAM,
  INITIAL_ENVIRONMENTS,
  INITIAL_TICKETS,
  INITIAL_TEST_SUITES,
  INITIAL_RELEASES
} from '../data/mockData';
import {
  getFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  initFirebase,
  testFirebaseConnection,
  isFirebaseConfigured
} from '../services/firebase';
import {
  subscribeUsers,
  saveUserToFirestore,
  deleteUserFromFirestore,
  subscribeProjects,
  saveProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeFeatures,
  saveFeatureToFirestore,
  saveFeaturesOrderToFirestore,
  deleteFeatureFromFirestore,
  subscribeModules,
  saveModuleToFirestore,
  deleteModuleFromFirestore,
  subscribeTickets,
  saveTicketToFirestore,
  deleteTicketFromFirestore,
  subscribeReleases,
  saveReleaseToFirestore,
  subscribeTestSuites,
  saveTestSuiteToFirestore,
  subscribeNotifications,
  saveNotificationToFirestore,
  markNotificationReadInFirestore,
  deleteNotificationFromFirestore,
  clearAllNotificationsInFirestore,
  seedAllDataToFirestore,
  findUserInFirestore
} from '../services/firebaseService';
import { parseDateSafe } from '../utils/dateUtils';
import {
  ROLES,
  normalizeUser,
  hasRole,
  isAdmin,
  getRoles,
  getViewRole,
  defaultTitleForRoles,
  defaultColorForRoles,
  makeInitials
} from '../utils/roles';
import { DEV_STAGE_IDS, DEV_TEST_STAGES } from '../utils/devTesting';

const AppContext = createContext();

const STORAGE_KEYS = {
  AUTH_USER: 'devbridge_auth_user_v3',
  ROLE: 'devbridge_role',
  PROJECTS: 'devbridge_projects_v3',
  ACTIVE_PROJECT: 'devbridge_active_proj_v3',
  FEATURES: 'devbridge_features_v3',
  MODULES: 'devbridge_modules_v3',
  NOTIFICATIONS: 'devbridge_notifications_v3',
  TEAM: 'devbridge_team_v3',
  TICKETS: 'devbridge_tickets_v3',
  SUITES: 'devbridge_suites_v3',
  ENVS: 'devbridge_envs_v3',
  RELEASES: 'devbridge_releases_v3',
  THEME: 'devbridge_theme',
  FEATURE_MODULE_FILTER: 'devbridge_feature_module_filter',
  LAST_PROJECT: 'devbridge_last_project'
};

// Helper to deduplicate features, bugs, and suggestions
// When a reopened feature is verified again, its in-progress future items are complete
const completeInProgressFutureItems = (feat, newStatus) => {
  if (newStatus !== 'verified' || !(feat.futureItems || []).some((i) => i.status === 'in_progress')) {
    return {};
  }
  const now = new Date().toISOString();
  return {
    futureItems: feat.futureItems.map((i) =>
      i.status === 'in_progress' ? { ...i, status: 'done', doneAt: now, updatedAt: now } : i
    )
  };
};

const sanitizeFeatures = (featList) => {
  if (!Array.isArray(featList)) return [];
  const featMap = new Map();

  featList.forEach((feat, idx) => {
    if (!feat || !feat.id) return;
    const featId = feat.id;

    // Deduplicate bugs by b.id
    const bugMap = new Map();
    (feat.bugs || []).forEach((b) => {
      if (b && b.id) {
        bugMap.set(b.id, b);
      }
    });

    // Deduplicate suggestions by s.id
    const suggMap = new Map();
    (feat.suggestions || []).forEach((s) => {
      if (s && s.id) {
        suggMap.set(s.id, s);
      }
    });

    featMap.set(featId, {
      ...feat,
      id: featId,
      order: typeof feat.order === 'number' ? feat.order : (idx + 1) * 1000,
      bugs: Array.from(bugMap.values()),
      suggestions: Array.from(suggMap.values())
    });
  });

  return Array.from(featMap.values());
};

export function AppProvider({ children }) {
  // Firebase Configuration & Live Status
  const [firebaseConfig, setFirebaseConfig] = useState(() => getFirebaseConfig());
  const [firebaseStatus, setFirebaseStatus] = useState('not_configured');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  });

  // Current Logged-in User
  const [currentUserRaw, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!currentUserRaw;

  // Current Role: 'all' | 'developer' | 'qa'
  const [role, setRole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ROLE) || 'all';
  });

  // Active navigation tab: 'features' | 'board' | 'tickets' | 'testruns' | 'release' | 'environments' | 'analytics'
  const [activeTab, setActiveTab] = useState('features');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState({
    severity: 'all',
    status: 'all',
    environment: 'all',
    component: 'all',
    assignedDev: 'all',
    assignedQa: 'all'
  });

  // Persistent Defects & Suggestions Filter State for the current session
  const [defectsFilters, setDefectsFilters] = useState({
    search: '',
    typeFilter: 'all',
    moduleFilter: 'all',
    featureFilter: 'all',
    statusFilter: 'all',
    severityFilter: 'all'
  });

  const updateDefectsFilter = (keyOrObj, value) => {
    if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      setDefectsFilters((prev) => ({ ...prev, ...keyOrObj }));
    } else {
      setDefectsFilters((prev) => ({ ...prev, [keyOrObj]: value }));
    }
  };

  const resetDefectsFilters = () => {
    setDefectsFilters({
      search: '',
      typeFilter: 'all',
      moduleFilter: 'all',
      featureFilter: 'all',
      statusFilter: 'all',
      severityFilter: 'all'
    });
  };

  // Synchronize KPI setFilters with defectsFilters
  const setFilters = (updater) => {
    setFiltersState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setDefectsFilters((dPrev) => {
        const synced = { ...dPrev };
        if (next.status !== undefined) synced.statusFilter = next.status;
        if (next.severity !== undefined) synced.severityFilter = next.severity;
        return synced;
      });
      return next;
    });
  };

  // Feature Board view mode for current session
  const [featureBoardViewMode, setFeatureBoardViewMode] = useState('kanban');

  // Projects State
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROJECT) || INITIAL_PROJECTS[0]?.id || 'proj-default';
  });

  // Feature Board module filter, remembered per project.
  // null = nothing chosen yet → the board falls back to the first module (not "all").
  const readModuleFilter = (projId) => {
    try {
      return localStorage.getItem(`${STORAGE_KEYS.FEATURE_MODULE_FILTER}_${projId}`) || null;
    } catch {
      return null;
    }
  };
  const [featureBoardModuleFilter, setFeatureBoardModuleFilterState] = useState(() =>
    readModuleFilter(activeProjectId)
  );
  const setFeatureBoardModuleFilter = (value) => {
    setFeatureBoardModuleFilterState(value);
    try {
      const key = `${STORAGE_KEYS.FEATURE_MODULE_FILTER}_${activeProjectId}`;
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  };

  // Reset filters when switching to a DIFFERENT project
  const prevActiveProjectIdRef = useRef(activeProjectId);
  useEffect(() => {
    if (prevActiveProjectIdRef.current && prevActiveProjectIdRef.current !== activeProjectId) {
      resetDefectsFilters();
      setFeatureBoardModuleFilterState(readModuleFilter(activeProjectId));
    }
    prevActiveProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  // Features State (Each feature has its own lifecycle + linked bugs & suggestions)
  const [features, setFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FEATURES);
      const parsed = saved ? JSON.parse(saved) : INITIAL_FEATURES;
      return sanitizeFeatures(parsed);
    } catch {
      return sanitizeFeatures(INITIAL_FEATURES);
    }
  });

  // Modules State (Containers for features e.g. SETUP, Purchasing and inventory)
  const [modules, setModules] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODULES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);

  // Main Team & Users State (Persisted in LocalStorage)
  const [teamRaw, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAM);
      return saved ? JSON.parse(saved) : INITIAL_TEAM;
    } catch {
      return INITIAL_TEAM;
    }
  });
  // Normalized team: every user has `roles` (ADMIN/DEVELOPER/QA) + a safe legacy `role`
  const team = useMemo(() => {
    const byId = new Map();
    (teamRaw || []).forEach((u) => {
      if (!u || !u.id) return;
      const prev = byId.get(u.id);
      if (!prev || (u.updatedAt || '') >= (prev.updatedAt || '')) byId.set(u.id, { ...prev, ...u, _docId: prev?._docId || u._docId });
    });
    return Array.from(byId.values()).map(normalizeUser);
  }, [teamRaw]);

  // Logged-in user, always refreshed from the team roster (so role/profile edits apply live)
  const currentUser = useMemo(() => {
    if (!currentUserRaw) return null;
    const fresh = team.find((u) => u.id === currentUserRaw.id);
    return normalizeUser(fresh || currentUserRaw);
  }, [currentUserRaw, team]);
  const isCurrentUserAdmin = isAdmin(currentUser);

  // Projects a user may work on: admins see all, others only projects they're assigned to
  const getAccessibleProjects = (user) => {
    if (!user) return [];
    if (isAdmin(user)) return projects || [];
    return (projects || []).filter((p) => (p.memberIds || []).includes(user.id));
  };
  const myProjects = useMemo(() => getAccessibleProjects(currentUser), [projects, currentUser]);

  // Each user's last working project is remembered (this browser + their user record),
  // so sign-in and refresh go straight back to it.
  const lastProjectKey = (userId) => `${STORAGE_KEYS.LAST_PROJECT}_${userId}`;
  const getRememberedProjectId = (user) => {
    if (!user) return null;
    try {
      return localStorage.getItem(lastProjectKey(user.id)) || user.lastProjectId || null;
    } catch {
      return user.lastProjectId || null;
    }
  };
  // Pick the project to open for a user: remembered one, or their only project
  const resolveWorkingProjectId = (user) => {
    const accessible = getAccessibleProjects(user);
    const remembered = getRememberedProjectId(user);
    if (remembered && accessible.some((p) => p.id === remembered)) return remembered;
    if (accessible.length === 1) return accessible[0].id;
    return null;
  };

  const isProjectsLoaded = (projects || []).length > 0;
  const needsProjectSelection = !!currentUser && !myProjects.some((p) => p.id === activeProjectId);

  // Restore the user's working project automatically (after refresh, data sync, or another
  // user having used this browser). Only ask when nothing valid can be restored.
  useEffect(() => {
    if (!currentUser || !isProjectsLoaded || !needsProjectSelection) return;
    const restoreId = resolveWorkingProjectId(currentUser);
    if (restoreId && restoreId !== activeProjectId) setActiveProjectId(restoreId);
  }, [currentUser?.id, currentUser?.lastProjectId, projects, needsProjectSelection]);

  const selectWorkingProject = (projectId) => {
    if (!myProjects.some((p) => p.id === projectId)) return;
    setActiveProjectId(projectId);
    if (currentUser) {
      try {
        localStorage.setItem(lastProjectKey(currentUser.id), projectId);
      } catch {
        // ignore storage errors
      }
      if (currentUser.lastProjectId !== projectId) {
        patchUserRecordRef.current?.(currentUser.id, () => ({ lastProjectId: projectId }));
      }
    }
  };

  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);

  const [tickets, setTickets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TICKETS);
      return saved ? JSON.parse(saved) : INITIAL_TICKETS;
    } catch {
      return INITIAL_TICKETS;
    }
  });

  const [testSuites, setTestSuites] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUITES);
      return saved ? JSON.parse(saved) : INITIAL_TEST_SUITES;
    } catch {
      return INITIAL_TEST_SUITES;
    }
  });

  const [environments, setEnvironments] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENVS);
      return saved ? JSON.parse(saved) : INITIAL_ENVIRONMENTS;
    } catch {
      return INITIAL_ENVIRONMENTS;
    }
  });

  const [releases, setReleases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RELEASES);
      return saved ? JSON.parse(saved) : INITIAL_RELEASES;
    } catch {
      return INITIAL_RELEASES;
    }
  });

  // Modals & Active Selections
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCreateFeatureModalOpen, setIsCreateFeatureModalOpen] = useState(false);
  const [createFeatureModalProps, setCreateFeatureModalProps] = useState(null);
  const [editingFeature, setEditingFeature] = useState(null);
  const [isEditFeatureModalOpen, setIsEditFeatureModalOpen] = useState(false);

  const openEditFeatureModal = (feat) => {
    setEditingFeature(feat);
    setIsEditFeatureModalOpen(true);
  };

  const closeEditFeatureModal = () => {
    setIsEditFeatureModalOpen(false);
    setEditingFeature(null);
  };
  const [prefillBugData, setPrefillBugData] = useState(null);
  const [activeTestSuiteId, setActiveTestSuiteId] = useState('TS-1');

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Team Notifications (persistent workflow alerts)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROJECT, activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEATURES, JSON.stringify(features));
  }, [features]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODULES, JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUITES, JSON.stringify(testSuites));
  }, [testSuites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENVS, JSON.stringify(environments));
  }, [environments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RELEASES, JSON.stringify(releases));
  }, [releases]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(teamRaw));
  }, [teamRaw]);

  // Firebase Initialization & Real-Time Firestore Sync
  useEffect(() => {
    const res = initFirebase(firebaseConfig);
    if (res.configured && res.status === 'connected') {
      setFirebaseStatus('connected');

      // 1. Team Users
      const unsubUsers = subscribeUsers((firestoreUsers) => {
        if (firestoreUsers && firestoreUsers.length > 0) {
          setTeam(firestoreUsers);
        }
      }, INITIAL_TEAM);

      // 2. Projects
      const unsubProjects = subscribeProjects((firestoreProjects) => {
        if (firestoreProjects && firestoreProjects.length > 0) {
          setProjects(firestoreProjects);
          setActiveProjectId((currentId) => {
            const exists = firestoreProjects.some((p) => p.id === currentId);
            return exists ? currentId : firestoreProjects[0].id;
          });
        }
      }, INITIAL_PROJECTS);

      // 3. Features
      const unsubFeatures = subscribeFeatures((firestoreFeatures) => {
        if (firestoreFeatures) {
          setFeatures(sanitizeFeatures(firestoreFeatures));
        }
      }, INITIAL_FEATURES);

      // 3b. Modules (Categories for features)
      const unsubModules = subscribeModules((firestoreMods) => {
        if (firestoreMods) {
          setModules(firestoreMods);
        }
      }, []);

      // 4. Defects / Tickets
      const unsubTickets = subscribeTickets((firestoreTickets) => {
        if (firestoreTickets) {
          setTickets(firestoreTickets);
        }
      }, INITIAL_TICKETS);

      // 5. Releases
      const unsubReleases = subscribeReleases((firestoreReleases) => {
        if (firestoreReleases && firestoreReleases.length > 0) {
          setReleases(firestoreReleases);
        }
      }, INITIAL_RELEASES);

      // 6. Test Suites
      const unsubSuites = subscribeTestSuites((firestoreSuites) => {
        if (firestoreSuites && firestoreSuites.length > 0) {
          setTestSuites(firestoreSuites);
        }
      }, INITIAL_TEST_SUITES);

      // 7. Team Notifications
      const unsubNotifications = subscribeNotifications((firestoreNotifs) => {
        if (firestoreNotifs) {
          setNotifications(firestoreNotifs);
        }
      }, []);

      return () => {
        unsubUsers();
        unsubProjects();
        unsubFeatures();
        unsubModules();
        unsubTickets();
        unsubReleases();
        unsubSuites();
        unsubNotifications();
      };
    } else {
      setFirebaseStatus(res.status || 'not_configured');
    }
  }, [firebaseConfig]);

  // Firebase Config Helpers
  const updateFirebaseConfig = async (newConfig) => {
    const test = await testFirebaseConnection(newConfig);
    if (!test.success) {
      return test;
    }
    const res = saveFirebaseConfig(newConfig);
    setFirebaseConfig(getFirebaseConfig());
    setFirebaseStatus(res.status || 'connected');
    return { success: true, warning: test.warning };
  };

  const disconnectFirebase = () => {
    clearFirebaseConfig();
    setFirebaseConfig(getFirebaseConfig());
    setFirebaseStatus('not_configured');
  };

  const syncAllLocalDataToFirebase = async () => {
    addToast('Pushing all app data to Firestore...', 'info', 'Cloud Sync');
    const res = await seedAllDataToFirestore({
      users: team,
      projects,
      features,
      tickets,
      releases,
      testSuites
    });
    if (res.success) {
      addToast('All users, projects, features, tickets, releases & test suites pushed to Firestore!', 'success', 'Synced');
    } else {
      addToast(res.error || 'Failed to push data to Firestore', 'critical');
    }
    return res;
  };

  // Toast dispatcher
  const addToast = (message, type = 'info', title = '', durationMs = 4500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type, title, timestamp: new Date() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Team Notifications dispatcher & management
  const addNotification = async ({
    type,
    title,
    message,
    targetRole = 'all',
    targetFeatureId = null,
    targetFeatureName = null,
    targetDefectId = null,
    severity = 'info',
    targetUserIds,
    itemKind = null,
    meta = {}
  }) => {
    const authorName = currentUser?.name || (role === 'qa' ? 'QA Engineer' : 'Developer');
    // Who this is personally for. Default: the feature's assigned dev / QA based on targetRole.
    let recipients = targetUserIds;
    if (!recipients && targetFeatureId) {
      const tf = (features || []).find((f) => f.id === targetFeatureId);
      if (tf) {
        recipients =
          targetRole === 'developer'
            ? [tf.assignedDev]
            : targetRole === 'qa'
            ? [tf.assignedQa]
            : [tf.assignedDev, tf.assignedQa];
      }
    }
    recipients = Array.from(new Set((recipients || []).filter(Boolean)));
    const newNotif = {
      id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: activeProjectId,
      type,
      title,
      message,
      targetRole,
      targetFeatureId,
      targetFeatureName,
      targetDefectId,
      targetUserIds: recipients,
      itemKind,
      severity,
      read: false,
      authorName,
      authorId: currentUser?.id || 'system',
      authorRole: currentUser?.role || role || 'team',
      createdAt: new Date().toISOString(),
      ...meta
    };

    setNotifications((prev) => [newNotif, ...(prev || [])].slice(0, 100));

    if (firebaseStatus === 'connected') {
      await saveNotificationToFirestore(newNotif);
    }

    return newNotif;
  };

  const markNotificationAsRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    if (firebaseStatus === 'connected') {
      await markNotificationReadInFirestore(notifId, true);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (firebaseStatus === 'connected') {
      const unread = (notifications || []).filter((n) => !n.read);
      for (const n of unread) {
        await markNotificationReadInFirestore(n.id, true);
      }
    }
  };

  const deleteNotification = async (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    if (firebaseStatus === 'connected') {
      await deleteNotificationFromFirestore(notifId);
    }
  };

  const clearAllNotifications = async () => {
    const ids = (notifications || []).map((n) => n.id);
    setNotifications([]);
    if (firebaseStatus === 'connected' && ids.length > 0) {
      await clearAllNotificationsInFirestore(ids);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth Sync & Methods
  useEffect(() => {
    if (currentUserRaw) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(currentUserRaw));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  }, [currentUserRaw]);

  // Super Admin: Add new user with username, password, role
  const addUser = async ({ username, password, roles, role, name = '', title = '' }) => {
    if (!isCurrentUserAdmin) {
      return { success: false, error: 'Only admins can create users.' };
    }
    const userRoles = getRoles({ roles: roles || (role ? [role] : [ROLES.DEVELOPER]) });
    if (userRoles.length === 0) {
      return { success: false, error: 'Select at least one role.' };
    }
    const trimmedUser = (username || '').trim().toLowerCase();
    if (!trimmedUser) {
      addToast('Username is required.', 'warning');
      return { success: false, error: 'Username is required.' };
    }

    if (team.some((u) => (u.username || '').toLowerCase() === trimmedUser)) {
      addToast(`Username "${trimmedUser}" already exists!`, 'warning');
      return { success: false, error: `Username "${trimmedUser}" is already taken.` };
    }

    const newUser = {
      id: `user-${Date.now().toString(36)}`,
      username: trimmedUser,
      password: password || '123',
      name: name?.trim() || username.trim(),
      email: `${trimmedUser}@devbridge.io`,
      roles: userRoles,
      title: title?.trim() || defaultTitleForRoles(userRoles),
      initials: makeInitials(name || username),
      color: defaultColorForRoles(userRoles)
    };

    setTeam((prev) => [...prev, newUser]);
    if (firebaseStatus === 'connected') {
      await saveUserToFirestore(newUser);
    }
    addToast(`User "${newUser.name}" (@${newUser.username}) created as ${userRoles.join(' + ')}.`, 'success', 'User Created');
    return { success: true, user: newUser };
  };

  // Update a user profile.
  // - Anyone can edit their own name, username, email, title, color and password
  //   (password change requires the current password).
  // - Only admins can edit other users, change roles, or reset passwords without the old one.
  const updateUser = async (userId, changes = {}, { currentPassword } = {}) => {
    const target = team.find((u) => u.id === userId);
    if (!target || !currentUser) return { success: false, error: 'User not found.' };
    const isSelf = target.id === currentUser.id;
    const actingAdmin = isAdmin(currentUser);
    if (!isSelf && !actingAdmin) return { success: false, error: 'You can only edit your own profile.' };

    const patch = {};

    if (changes.name !== undefined) {
      const name = changes.name.trim();
      if (!name) return { success: false, error: 'Name cannot be empty.' };
      patch.name = name;
      patch.initials = makeInitials(name);
    }

    if (changes.username !== undefined) {
      const username = changes.username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
        return { success: false, error: 'Username must be 3–30 characters: letters, numbers, dot, dash or underscore.' };
      }
      if (team.some((u) => u.id !== userId && (u.username || '').toLowerCase() === username)) {
        return { success: false, error: `Username "${username}" is already taken.` };
      }
      patch.username = username;
    }

    if (changes.email !== undefined) {
      const email = changes.email.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'Enter a valid email address.' };
      }
      patch.email = email;
    }

    if (changes.title !== undefined) patch.title = changes.title.trim();
    if (changes.color !== undefined) patch.color = changes.color;

    if (changes.password !== undefined && changes.password !== '') {
      if (changes.password.length < 3) return { success: false, error: 'Password must be at least 3 characters.' };
      const resettingOther = actingAdmin && !isSelf;
      if (!resettingOther && target.password && target.password !== currentPassword) {
        return { success: false, error: 'Current password is incorrect.' };
      }
      patch.password = changes.password;
    }

    if (changes.roles !== undefined) {
      if (!actingAdmin) return { success: false, error: 'Only admins can change roles.' };
      const newRoles = getRoles({ roles: changes.roles });
      if (newRoles.length === 0) return { success: false, error: 'Select at least one role.' };
      const losingAdmin = isAdmin(target) && !newRoles.includes(ROLES.ADMIN);
      if (losingAdmin && team.filter((u) => isAdmin(u)).length <= 1) {
        return { success: false, error: 'At least one admin must remain.' };
      }
      patch.roles = newRoles;
    }

    if (Object.keys(patch).length === 0) return { success: true, user: target };

    // Store canonical fields only (drop the legacy lower-case role)
    const { role: _legacyRole, ...rest } = target;
    const updatedUser = { ...rest, ...patch, roles: patch.roles || target.roles, updatedAt: new Date().toISOString() };

    setTeam((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (isSelf) setCurrentUser(updatedUser);
    if (firebaseStatus === 'connected') {
      await saveUserToFirestore(updatedUser);
    }
    return { success: true, user: normalizeUser(updatedUser) };
  };

  // Super Admin: Delete user
  const deleteUser = async (userId) => {
    if (!isCurrentUserAdmin) return false;
    if (userId === currentUser?.id) {
      addToast('You cannot delete your own account.', 'warning');
      return false;
    }
    if (userId === 'user-admin') {
      addToast('Cannot delete the root Super Admin account.', 'warning');
      return false;
    }
    setTeam((prev) => prev.filter((u) => u.id !== userId));
    if (firebaseStatus === 'connected') {
      await deleteUserFromFirestore(team.find((u) => u.id === userId) || userId);
    }
    addToast('User removed from team roster.', 'info', 'User Deleted');
    return true;
  };


  // ===== User activity tracking (logins, active time) & account status =====
  // Session: { id, start, lastSeenAt, endedAt?, activeMs }
  const ACTIVITY_TICK_MS = 60 * 1000;          // heartbeat interval
  const IDLE_AFTER_MS = 5 * 60 * 1000;         // no input for 5 min = idle (time not counted)
  const SESSION_GAP_MS = 30 * 60 * 1000;       // away 30+ min = the old session ended, a new visit starts
  const MAX_SESSIONS = 20;
  const ACTIVITY_KEYS = ['lastLoginAt', 'lastActiveAt', 'loginCount', 'totalActiveMs', 'sessions'];

  const teamRawRef = useRef(teamRaw);
  teamRawRef.current = teamRaw;
  const firebaseStatusRef = useRef(firebaseStatus);
  firebaseStatusRef.current = firebaseStatus;

  // Patch one user record without touching other fields; optionally persist to Firestore
  const patchUserRecord = (userId, mutate, fallbackUser = null, onlyKeys = null) => {
    const target = (teamRawRef.current || []).find((u) => u.id === userId) || fallbackUser;
    if (!target) return null;
    const changes = mutate(target);
    if (!changes) return target;
    const updated = { ...target, ...changes };
    setTeam((prev) => {
      if (!prev.some((u) => u.id === userId)) return [...prev, updated];
      const rest = prev.filter((u) => u.id !== userId);
      const idx = prev.findIndex((u) => u.id === userId);
      rest.splice(idx, 0, updated);
      return rest;
    });
    if (firebaseStatusRef.current === 'connected') {
      saveUserToFirestore(updated, onlyKeys);
    }
    return updated;
  };

  const newSession = (iso) => ({ id: `ses-${Date.now().toString(36)}`, start: iso, lastSeenAt: iso, activeMs: 0 });

  const closeOpenSession = (sessions, iso) =>
    sessions.map((s, i) => (i === 0 && !s.endedAt ? { ...s, endedAt: s.lastSeenAt || iso } : s));

  const recordLogin = (user) => {
    const iso = new Date().toISOString();
    patchUserRecord(
      user.id,
      (u) => {
        const prevSessions = closeOpenSession(Array.isArray(u.sessions) ? u.sessions : [], iso);
        return {
          lastLoginAt: iso,
          lastActiveAt: iso,
          loginCount: (u.loginCount || 0) + 1,
          sessions: [newSession(iso), ...prevSessions].slice(0, MAX_SESSIONS)
        };
      },
      user,
      ACTIVITY_KEYS
    );
  };

  // Called when the app opens / tab becomes visible while already signed in.
  // If the last session went quiet 30+ min ago it is closed at its last-seen time and a new
  // visit starts now (counted as the latest login), so times never span days.
  const touchSession = (userId) => {
    const nowMs = Date.now();
    const iso = new Date(nowMs).toISOString();
    patchUserRecordRef.current(
      userId,
      (u) => {
        const sessions = Array.isArray(u.sessions) ? [...u.sessions] : [];
        const cur = sessions[0];
        const lastSeen = Date.parse(cur?.lastSeenAt || cur?.start || '') || 0;
        const stillOpen = cur && !cur.endedAt && nowMs - lastSeen < SESSION_GAP_MS;
        if (stillOpen) return { lastActiveAt: iso };
        const closed = closeOpenSession(sessions, iso);
        return {
          lastLoginAt: iso,
          lastActiveAt: iso,
          loginCount: (u.loginCount || 0) + 1,
          sessions: [newSession(iso), ...closed].slice(0, MAX_SESSIONS)
        };
      },
      null,
      ACTIVITY_KEYS
    );
  };

  const recordLogout = (userId) => {
    const iso = new Date().toISOString();
    patchUserRecord(
      userId,
      (u) => ({
        lastActiveAt: iso,
        sessions: (Array.isArray(u.sessions) ? u.sessions : []).map((s, i) =>
          i === 0 && !s.endedAt ? { ...s, lastSeenAt: iso, endedAt: iso } : s
        )
      }),
      null,
      ACTIVITY_KEYS
    );
  };

  // Heartbeat: while the tab is visible and the user interacted recently, add active time
  const lastInteractionRef = useRef(Date.now());
  const patchUserRecordRef = useRef(patchUserRecord);
  patchUserRecordRef.current = patchUserRecord;
  const activeUserId = currentUserRaw?.id;
  useEffect(() => {
    if (!activeUserId) return undefined;
    const mark = () => {
      lastInteractionRef.current = Date.now();
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    mark();

    // Only one tab per browser counts time (others would double it)
    const lockKey = `devbridge_activity_tick_${activeUserId}`;
    const claimTick = (now) => {
      try {
        const last = Number(localStorage.getItem(lockKey) || 0);
        if (now - last < ACTIVITY_TICK_MS * 0.8) return false;
        localStorage.setItem(lockKey, String(now));
      } catch {
        // storage unavailable: count in this tab
      }
      return true;
    };

    // App opened / tab shown again while signed in → resume or start a visit
    touchSession(activeUserId);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        mark();
        touchSession(activeUserId);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const timer = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState !== 'visible' || now - lastInteractionRef.current > IDLE_AFTER_MS) return;
      if (!claimTick(now)) return;
      const iso = new Date(now).toISOString();
      patchUserRecordRef.current(
        activeUserId,
        (u) => {
          const sessions = Array.isArray(u.sessions) ? [...u.sessions] : [];
          const cur = sessions[0];
          const lastSeen = Date.parse(cur?.lastSeenAt || cur?.start || '') || 0;
          const loginPatch = {};
          if (cur && !cur.endedAt && now - lastSeen < SESSION_GAP_MS) {
            sessions[0] = { ...cur, lastSeenAt: iso, activeMs: (cur.activeMs || 0) + ACTIVITY_TICK_MS };
          } else {
            // previous session went quiet (or was closed): close it and start a new visit
            if (cur && !cur.endedAt) sessions[0] = { ...cur, endedAt: cur.lastSeenAt || iso };
            sessions.unshift({ ...newSession(iso), activeMs: ACTIVITY_TICK_MS });
            loginPatch.lastLoginAt = iso;
            loginPatch.loginCount = (u.loginCount || 0) + 1;
          }
          return {
            ...loginPatch,
            lastActiveAt: iso,
            totalActiveMs: (u.totalActiveMs || 0) + ACTIVITY_TICK_MS,
            sessions: sessions.slice(0, MAX_SESSIONS)
          };
        },
        null,
        ACTIVITY_KEYS
      );
    }, ACTIVITY_TICK_MS);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, mark));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [activeUserId]);

  // Admin: activate / deactivate an account (deactivated users can't sign in or be assigned)
  const setUserActive = async (userId, active) => {
    if (!isCurrentUserAdmin) return { success: false, error: 'Only admins can change account status.' };
    const target = team.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };
    if (userId === currentUser?.id) return { success: false, error: 'You cannot deactivate your own account.' };
    if (!active && isAdmin(target) && team.filter((u) => isAdmin(u) && u.active !== false).length <= 1) {
      return { success: false, error: 'At least one active admin must remain.' };
    }
    const iso = new Date().toISOString();
    patchUserRecord(userId, () =>
      active
        ? { active: true, reactivatedAt: iso, deactivatedAt: null, deactivatedBy: null }
        : { active: false, deactivatedAt: iso, deactivatedBy: currentUser?.id || '' }
    );
    addToast(
      `${target.name} ${active ? 'reactivated' : 'deactivated'}.`,
      active ? 'success' : 'info',
      active ? 'Account Active' : 'Account Deactivated'
    );
    return { success: true };
  };

  // If this account gets deactivated (e.g. by an admin on another device), sign out
  useEffect(() => {
    if (currentUser && currentUser.active === false) {
      setCurrentUser(null);
      addToast('Your account has been deactivated. Contact your workspace admin.', 'warning', 'Signed Out');
    }
  }, [currentUser?.active]);

  // Direct login with username & password (NO ROLE SELECTION NEEDED!)
  const loginWithCredentials = async (username, password) => {
    const trimmed = (username || '').trim().toLowerCase();
    let user = team.find(
      (m) =>
        (m.username && m.username.toLowerCase() === trimmed) ||
        (m.email && m.email.toLowerCase() === trimmed)
    );

    // Raw stored record (not normalized) — used when writing login activity back
    let rawUser = user ? (teamRaw || []).find((u) => u.id === user.id) : null;

    // If not yet loaded in local state, query Firestore directly
    if (!user && firebaseStatus === 'connected') {
      const remoteUser = await findUserInFirestore(trimmed);
      if (remoteUser) {
        rawUser = remoteUser;
        user = normalizeUser(remoteUser);
        setTeam((prev) => {
          if (!prev.some((u) => u.id === remoteUser.id)) {
            return [...prev, remoteUser];
          }
          return prev;
        });
      }
    }

    if (!user) {
      return { success: false, error: `User "@${username}" not found. Ask Super Admin to create it.` };
    }

    if (user.password && user.password !== password) {
      return { success: false, error: 'Incorrect password. (Default is 123)' };
    }

    if (user.active === false) {
      return { success: false, error: 'This account is deactivated. Contact your workspace admin.' };
    }

    setCurrentUser(user);
    setRole(getViewRole(user));
    const workingProjectId = resolveWorkingProjectId(user);
    if (workingProjectId) {
      setActiveProjectId(workingProjectId);
      setActiveTab('features');
    } else {
      setActiveTab('profile');
    }
    recordLogin(rawUser || user);
    addToast(`Welcome, ${user.name}!`, 'success', 'Login Successful');
    return { success: true, user };
  };

  const login = (emailOrId, selectedRole = 'developer', customName = '', customTitle = '') => {
    const matched = team.find(
      (m) =>
        m.id === emailOrId ||
        (m.username && m.username.toLowerCase() === emailOrId.toLowerCase()) ||
        (m.email && m.email.toLowerCase() === emailOrId.toLowerCase()) ||
        m.name.toLowerCase() === emailOrId.toLowerCase()
    );

    const user = matched
      ? { ...matched, role: selectedRole || matched.role }
      : {
          id: `user-${Date.now().toString(36)}`,
          username: (emailOrId.includes('@') ? emailOrId.split('@')[0] : emailOrId || 'user').toLowerCase(),
          password: '123',
          name: customName || (emailOrId.includes('@') ? emailOrId.split('@')[0] : emailOrId || 'Engineer'),
          email: emailOrId.includes('@') ? emailOrId : `${(customName || emailOrId || 'engineer').toLowerCase().replace(/\s+/g, '.')}@devbridge.io`,
          role: selectedRole,
          title: customTitle || (selectedRole === 'developer' ? 'Software Developer' : 'Quality Assurance Engineer'),
          initials: (customName || emailOrId || 'US').substring(0, 2).toUpperCase(),
          color: selectedRole === 'developer' ? '#0284c7' : '#10b981'
        };

    setCurrentUser(user);
    setRole(user.role);
    addToast(`Welcome back, ${user.name}! Signed in as ${user.role.toUpperCase()}.`, 'success', 'Signed In');
  };

  const logout = () => {
    if (currentUserRaw?.id) recordLogout(currentUserRaw.id);
    setCurrentUser(null);
    addToast('You have been signed out.', 'info', 'Logged Out');
  };

  // Active Project & Features getter
  const activeProject =
    (projects && projects.find((p) => p.id === activeProjectId)) ||
    (projects && projects[0]) ||
    INITIAL_PROJECTS[0];

  // ONLY actual features belong in projectFeatures (NOT modules!)
  const uniqueProjectFeaturesMap = new Map();
  (features || []).forEach((f) => {
    if (
      f &&
      f.id &&
      f.projectId === (activeProject?.id || 'proj-erp') &&
      !f.isMainModule &&
      f.status !== 'module'
    ) {
      if (!uniqueProjectFeaturesMap.has(f.id)) {
        uniqueProjectFeaturesMap.set(f.id, f);
      }
    }
  });

  const projectFeatures = Array.from(uniqueProjectFeaturesMap.values()).sort((a, b) => {
    if (typeof a.order === 'number' && typeof b.order === 'number') {
      return a.order - b.order;
    }
    if (typeof a.order === 'number') return -1;
    if (typeof b.order === 'number') return 1;
    return 0;
  });

  // All future improvement items across the active project's features
  const projectFutureItems = projectFeatures.flatMap((f) =>
    (f.futureItems || []).map((item) => ({
      ...item,
      featureId: f.id,
      featureCode: f.code,
      featureName: f.name,
      featureStatus: f.status,
      moduleName: f.moduleName || 'General'
    }))
  );

  // Modules belonging to this active project
  const projectModules = (modules || []).filter(
    (m) => m.projectId === (activeProject?.id || 'proj-erp')
  );

  // Distinct module names across project modules and features
  const allModuleNames = Array.from(
    new Set([
      ...projectModules.map((m) => m.name),
      ...(features || [])
        .filter((f) => f.isMainModule && f.projectId === (activeProject?.id || 'proj-erp'))
        .map((f) => f.name),
      ...projectFeatures
        .map((f) => f.moduleName)
        .filter((m) => m && m !== 'General')
    ])
  );

  // Auto-migrate any previously created isMainModule features into modules state
  useEffect(() => {
    const legacyMainModules = (features || []).filter((f) => f.isMainModule);
    if (legacyMainModules.length > 0) {
      let changed = false;
      let nextMods = [...modules];
      legacyMainModules.forEach((lmod) => {
        const modName = (lmod.name || lmod.moduleName || '').trim();
        if (modName && !nextMods.some((m) => m.name.toLowerCase() === modName.toLowerCase())) {
          const newMod = {
            id: lmod.id.startsWith('mod-')
              ? lmod.id
              : `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
            projectId: lmod.projectId || activeProjectId,
            name: modName,
            description: lmod.description || '',
            createdAt: lmod.createdAt || new Date().toISOString()
          };
          nextMods.push(newMod);
          changed = true;
          if (firebaseStatus === 'connected') {
            saveModuleToFirestore(newMod);
          }
        }
      });
      if (changed) {
        setModules(nextMods);
      }
    }
  }, [features]);

  const selectedFeature = (features || []).find((f) => f.id === selectedFeatureId) || null;
  const selectedTicket = (tickets || []).find((t) => t.id === selectedTicketId) || null;

  // All bugs & suggestions linked to features in the active project (guaranteed unique by composite key)
  const defectMap = new Map();
  projectFeatures.forEach((feat) => {
    const featModule = (feat.moduleName || 'General').trim();
    const seenBugIdsInFeat = new Set();
    (feat.bugs || []).forEach((bug) => {
      if (!bug || !bug.id || seenBugIdsInFeat.has(bug.id)) return;
      seenBugIdsInFeat.add(bug.id);
      const compositeKey = `${feat.id}::bug::${bug.id}`;
      defectMap.set(compositeKey, {
        ...bug,
        type: 'bug',
        featureId: feat.id,
        featureName: feat.name,
        featureCode: feat.code || feat.id,
        moduleName: featModule,
        assignedDev: bug.assignedDev || feat.assignedDev,
        assignedQa: bug.reportedBy || feat.assignedQa,
        environment: feat.environment || 'staging'
      });
    });

    const seenSuggIdsInFeat = new Set();
    (feat.suggestions || []).forEach((sugg) => {
      if (!sugg || !sugg.id || seenSuggIdsInFeat.has(sugg.id)) return;
      seenSuggIdsInFeat.add(sugg.id);
      const compositeKey = `${feat.id}::sugg::${sugg.id}`;
      defectMap.set(compositeKey, {
        ...sugg,
        type: 'suggestion',
        severity: sugg.priority || 'Medium',
        featureId: feat.id,
        featureName: feat.name,
        featureCode: feat.code || feat.id,
        moduleName: featModule,
        assignedDev: feat.assignedDev,
        assignedQa: sugg.submittedBy || feat.assignedQa,
        environment: feat.environment || 'staging'
      });
    });
  });
  const allFeatureDefects = Array.from(defectMap.values()).sort((a, b) => {
    const timeA = parseDateSafe(a.createdAt)?.getTime() || 0;
    const timeB = parseDateSafe(b.createdAt)?.getTime() || 0;
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
  });

  // Project Actions
  const createProject = async (projectData) => {
    if (!isCurrentUserAdmin) {
      addToast('Only admins can create projects.', 'warning');
      return { success: false };
    }
    const code = projectData.code ? projectData.code.toUpperCase() : projectData.name.substring(0, 4).toUpperCase();
    const newProj = {
      id: 'proj-' + Date.now().toString(36),
      name: projectData.name,
      code,
      description: projectData.description || '',
      category: projectData.category || 'General Software',
      memberIds: Array.from(new Set([...(projectData.memberIds || []), currentUser?.id].filter(Boolean))),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProjects((prev) => [...prev, newProj]);
    setIsCreateProjectModalOpen(false);
    if (firebaseStatus === 'connected') {
      await saveProjectToFirestore(newProj);
    }
    addToast(`Project "${newProj.name}" created. Assign team members to give them access.`, 'success', 'Project Created');
    return { success: true, project: newProj };
  };

  // Admin: edit project details or members (memberIds)
  const updateProject = async (projectId, changes = {}) => {
    if (!isCurrentUserAdmin) return { success: false, error: 'Only admins can manage projects.' };
    const proj = (projects || []).find((p) => p.id === projectId);
    if (!proj) return { success: false, error: 'Project not found.' };
    const patchData = {};
    if (changes.name !== undefined) {
      if (!changes.name.trim()) return { success: false, error: 'Project name is required.' };
      patchData.name = changes.name.trim();
    }
    if (changes.code !== undefined) {
      const code = changes.code.trim().toUpperCase();
      if (!code) return { success: false, error: 'Project code is required.' };
      if ((projects || []).some((p) => p.id !== projectId && (p.code || '').toUpperCase() === code)) {
        return { success: false, error: `Code "${code}" is already used by another project.` };
      }
      patchData.code = code;
    }
    if (changes.description !== undefined) patchData.description = changes.description.trim();
    if (changes.memberIds !== undefined) patchData.memberIds = Array.from(new Set(changes.memberIds));
    const updated = { ...proj, ...patchData, updatedAt: new Date().toISOString() };
    setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
    if (firebaseStatus === 'connected') {
      await saveProjectToFirestore(updated);
    }
    return { success: true, project: updated };
  };

  // Admin: delete a project (its features/modules are kept in storage but no longer reachable)
  const deleteProject = async (projectId) => {
    if (!isCurrentUserAdmin) return { success: false, error: 'Only admins can delete projects.' };
    if ((projects || []).length <= 1) return { success: false, error: 'At least one project must remain.' };
    const proj = (projects || []).find((p) => p.id === projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (firebaseStatus === 'connected') {
      await deleteProjectFromFirestore(projectId);
    }
    addToast(`Project "${proj?.name || projectId}" deleted.`, 'info', 'Project Deleted');
    return { success: true };
  };

  // Module Actions (Modules are groupings for features, NOT board tickets!)
  const createModule = async ({ name, description = '' }) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      addToast('Module name is required.', 'warning');
      return { success: false, error: 'Module name is required' };
    }

    const exists = (modules || []).some(
      (m) => m.projectId === activeProjectId && m.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) {
      addToast(`Module "${trimmedName}" already exists!`, 'info');
      setIsCreateModuleModalOpen(false);
      return { success: true, name: trimmedName };
    }

    const newMod = {
      id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      projectId: activeProjectId,
      name: trimmedName,
      description: description.trim(),
      createdAt: new Date().toISOString()
    };

    setModules((prev) => [...prev, newMod]);
    setIsCreateModuleModalOpen(false);

    if (firebaseStatus === 'connected') {
      await saveModuleToFirestore(newMod);
    }

    addToast(`Module "${trimmedName}" created!`, 'success', 'Module Declared');
    return { success: true, module: newMod };
  };

  const updateModule = async (moduleId, { name, description }) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      addToast('Module name is required.', 'warning');
      return { success: false, error: 'Module name is required' };
    }

    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return { success: false, error: 'Module not found' };

    const oldName = mod.name;
    const updatedMod = {
      ...mod,
      name: trimmedName,
      description: description !== undefined ? description.trim() : (mod.description || ''),
      updatedAt: new Date().toISOString()
    };

    setModules((prev) => prev.map((m) => (m.id === moduleId ? updatedMod : m)));

    if (firebaseStatus === 'connected') {
      await saveModuleToFirestore(updatedMod);
    }

    // If module name changed, update any features that belonged to this module name
    if (oldName.toLowerCase() !== trimmedName.toLowerCase()) {
      const affected = features.filter(
        (f) => (f.moduleName || '').trim().toLowerCase() === oldName.trim().toLowerCase()
      );
      if (affected.length > 0) {
        setFeatures((prev) =>
          prev.map((f) =>
            (f.moduleName || '').trim().toLowerCase() === oldName.trim().toLowerCase()
              ? { ...f, moduleName: trimmedName, updatedAt: new Date().toISOString() }
              : f
          )
        );
        if (firebaseStatus === 'connected') {
          for (const af of affected) {
            saveFeatureToFirestore({ ...af, moduleName: trimmedName });
          }
        }
      }
    }

    addToast(`Module updated to "${trimmedName}"!`, 'success', 'Module Updated');
    return { success: true, module: updatedMod };
  };

  const deleteModule = async (moduleId) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const modName = mod.name;

    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    if (firebaseStatus === 'connected') {
      await deleteModuleFromFirestore(moduleId);
    }

    // Move any features under this module to 'General'
    const affected = features.filter(
      (f) => (f.moduleName || '').trim().toLowerCase() === modName.trim().toLowerCase()
    );
    if (affected.length > 0) {
      setFeatures((prev) =>
        prev.map((f) =>
          (f.moduleName || '').trim().toLowerCase() === modName.trim().toLowerCase()
            ? { ...f, moduleName: 'General', updatedAt: new Date().toISOString() }
            : f
        )
      );
      if (firebaseStatus === 'connected') {
        for (const af of affected) {
          saveFeatureToFirestore({ ...af, moduleName: 'General' });
        }
      }
    }

    addToast(
      `Module "${modName}" deleted. ${affected.length > 0 ? `(${affected.length} features moved to General)` : ''}`,
      'info'
    );
  };

  // Feature Actions (Features belong to a Module and appear on the Kanban board)
  // Optional focus inside the feature window: { featureId, tab, itemIds, ts }
  const [featureFocus, setFeatureFocus] = useState(null);

  const openFeature = (featureOrId) => {
    const id = typeof featureOrId === 'object' ? featureOrId.id : featureOrId;
    setFeatureFocus(null);
    setSelectedFeatureId(id);
  };

  const closeFeature = () => {
    setSelectedFeatureId(null);
    setFeatureFocus(null);
  };


  // ===== Closing a feature is a deliberate, checked step =====
  // Only QA can close a feature ({ confirmed: true }).
  // QA assesses whether remaining open defects or suggestions represent acceptable risk to release.
  const DONE_ITEM = ['verified', 'implemented', 'qa_passed', 'qa passed', 'closed'];
  const getFeatureCloseCheck = (feat) => {
    const bugs = feat?.bugs || [];
    const suggs = feat?.suggestions || [];
    const openBugs = bugs.filter((b) => !DONE_ITEM.includes((b.status || '').toLowerCase().trim()));
    const openSuggs = suggs.filter((s) => !DONE_ITEM.includes((s.status || '').toLowerCase().trim()));
    const allPassed = openBugs.length === 0 && openSuggs.length === 0;
    return {
      bugsTotal: bugs.length,
      bugsPassed: bugs.length - openBugs.length,
      suggsTotal: suggs.length,
      suggsPassed: suggs.length - openSuggs.length,
      openBugs,
      openSuggs,
      criticalOpen: openBugs.filter((b) => b.severity === 'Critical').length,
      futurePending: (feat?.futureItems || []).filter((i) => i.status !== 'done').length,
      allPassed,
      // QA decides whether open items are acceptable risk, so QA is allowed to close
      canClose: true,
      hasOpenItems: !allPassed
    };
  };

  // QA decisions (pass / fail items, verify & close a feature) are reserved for the QA role,
  // so nobody signs off their own development work.
  const canQaDecide = hasRole(currentUser, ROLES.QA);
  const denyQaOnly = (what = 'This') => {
    addToast(`${what} can only be done by QA.`, 'warning', 'QA Only');
  };

  // Open the feature window on its "Close feature" confirmation step
  const requestCloseFeature = (featureId) => {
    setFeatureFocus({ featureId, closeConfirm: true, ts: Date.now() });
    setSelectedFeatureId(featureId);
  };

  // Open a feature and jump straight to specific defects / suggestions / future items.
  // Switches to the feature's project when the user has access to it.
  const openFeatureItems = (featureId, itemIds = []) => {
    const feat = (features || []).find((f) => f.id === featureId);
    if (!feat) {
      addToast('This feature no longer exists.', 'warning');
      return false;
    }
    if (feat.projectId && feat.projectId !== activeProjectId) {
      if (!myProjects.some((p) => p.id === feat.projectId)) {
        addToast("You don't have access to that project.", 'warning');
        return false;
      }
      selectWorkingProject(feat.projectId);
    }

    const ids = (itemIds || []).filter(Boolean);
    const inList = (list) => ids.filter((id) => (list || []).some((x) => x.id === id));
    const bugIds = inList(feat.bugs);
    const suggIds = inList(feat.suggestions);
    const movedToFuture = ids.filter((id) => (feat.futureItems || []).some((fi) => fi.sourceId === id || fi.id === id));
    const failedIds = [...(feat.bugs || []), ...(feat.suggestions || [])]
      .filter((x) => ids.includes(x.id) && ['qa_failed', 'qa failed', 'failed', 'reopened'].includes((x.status || '').toLowerCase()))
      .map((x) => x.id);

    let tab = null;
    if (ids.length > 0) {
      if (failedIds.length > 0 && failedIds.length === bugIds.length + suggIds.length) tab = 'review';
      else if (bugIds.length > 0) tab = 'bugs';
      else if (suggIds.length > 0) tab = 'suggestions';
      else if (movedToFuture.length > 0) tab = 'future';
      else addToast('That item was removed from the feature.', 'info');
    }

    setFeatureFocus(tab ? { featureId, tab, itemIds: [...bugIds, ...suggIds], ts: Date.now() } : null);
    setSelectedFeatureId(featureId);
    return true;
  };

  // Navigate to whatever a notification is about
  const openNotificationTarget = (notif) => {
    if (!notif) return;
    if (notif.id && !notif.read) markNotificationAsRead(notif.id);
    if (notif.targetFeatureId) {
      openFeatureItems(notif.targetFeatureId, notif.targetDefectId ? [notif.targetDefectId] : []);
    }
  };

  const openCreateFeatureModal = (props = null) => {
    setCreateFeatureModalProps(props);
    setIsCreateFeatureModalOpen(true);
  };

  const createFeature = async (featData, options = {}) => {
    const defaultDev = (team.find((m) => hasRole(m, ROLES.DEVELOPER)) || team[0])?.id || 'user-admin';
    const defaultQa = (team.find((m) => hasRole(m, ROLES.QA)) || team[0])?.id || 'user-admin';
    const moduleName = (featData.moduleName || 'General').trim();

    // Auto-create module in modules if typed and not yet registered
    if (moduleName && moduleName.toLowerCase() !== 'general') {
      const modExists = (modules || []).some(
        (m) => m.projectId === activeProjectId && m.name.toLowerCase() === moduleName.toLowerCase()
      );
      if (!modExists) {
        const autoMod = {
          id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          projectId: activeProjectId,
          name: moduleName,
          description: '',
          createdAt: new Date().toISOString()
        };
        setModules((prev) => [...prev, autoMod]);
        if (firebaseStatus === 'connected') {
          saveModuleToFirestore(autoMod);
        }
      }
    }

    const nextCount = projectFeatures.length + 101;
    const rawClean = featData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'FEAT';
    let cleanCode = rawClean;
    let candidateCode = `${activeProject.code}-${cleanCode}`;
    let codeCounter = 2;
    while ((features || []).some((f) => f.code === candidateCode)) {
      cleanCode = `${rawClean.substring(0, 3)}${codeCounter}`;
      candidateCode = `${activeProject.code}-${cleanCode}`;
      codeCounter++;
    }
    // New features land in the Feature Pool (backlog) until pulled into development
    const targetStatus = featData.status || 'backlog';
    const colFeatures = projectFeatures.filter((f) => f.status === targetStatus);
    const maxOrder = colFeatures.reduce((max, f) => Math.max(max, f.order || 0), 0);
    const newFeature = {
      id: `FEAT-${nextCount}-${Date.now().toString(36).substring(2, 5)}`,
      projectId: activeProjectId,
      code: candidateCode,
      name: featData.name.trim(),
      description: featData.description || '',
      status: targetStatus,
      order: maxOrder + 1000,
      isMainModule: false,
      moduleName: moduleName || 'General',
      assignedDev: featData.assignedDev || defaultDev,
      assignedQa: featData.assignedQa || defaultQa,
      prLink: featData.prLink || '',
      commitSha: '',
      stagingBuild: '',
      environment: 'staging',
      targetRelease: featData.targetRelease || 'v1.0.0',
      devNotes: featData.devNotes || '',
      qaNotes: '',
      bugs: [],
      suggestions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) => [newFeature, ...prev]);
    if (!options.keepOpen) {
      setIsCreateFeatureModalOpen(false);
      setCreateFeatureModalProps(null);
    }

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(newFeature);
    }

    const isPooled = newFeature.status === 'backlog';
    addToast(
      isPooled
        ? `Feature "${newFeature.name}" added to the ${newFeature.moduleName} feature pool.`
        : `Feature "${newFeature.name}" created under ${newFeature.moduleName}!`,
      'success',
      'Feature Created'
    );
    addNotification({
      type: 'feature_created',
      title: `New Feature: "${newFeature.name}"`,
      message: `${currentUser?.name || 'Developer'} created feature "${newFeature.name}" in module "${newFeature.moduleName}". ${isPooled ? 'Added to the feature pool (not started yet).' : 'Ready for QA test scoping.'}`,
      targetRole: 'qa',
      targetFeatureId: newFeature.id,
      targetFeatureName: newFeature.name,
      severity: 'info'
    });
    if (!isPooled && !options.keepOpen) {
      openFeature(newFeature.id);
    }
    return newFeature;
  };

  const updateFeatureModule = async (featureId, moduleName) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const resolvedModuleName = (moduleName || 'General').trim();
    const updatedFeature = {
      ...feat,
      moduleName: resolvedModuleName,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Feature "${feat.name}" moved to module "${resolvedModuleName}"`, 'info');
  };

  const updateFeature = async (featureId, updatedData) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const moduleName = updatedData.moduleName ? updatedData.moduleName.trim() : feat.moduleName;

    // Auto-create module in modules if typed and not yet registered
    if (moduleName && moduleName.toLowerCase() !== 'general') {
      const modExists = (modules || []).some(
        (m) => m.projectId === activeProjectId && m.name.toLowerCase() === moduleName.toLowerCase()
      );
      if (!modExists) {
        const autoMod = {
          id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          projectId: activeProjectId,
          name: moduleName,
          description: '',
          createdAt: new Date().toISOString()
        };
        setModules((prev) => [...prev, autoMod]);
        if (firebaseStatus === 'connected') {
          saveModuleToFirestore(autoMod);
        }
      }
    }

    const wantsClose = updatedData.status === 'verified' && feat.status !== 'verified';
    const updatedFeature = {
      ...feat,
      ...updatedData,
      ...(wantsClose ? { status: feat.status } : {}),
      moduleName: moduleName || 'General',
      updatedAt: new Date().toISOString()
    };
    if (wantsClose) setTimeout(() => requestCloseFeature(featureId), 0);

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Feature "${updatedFeature.name}" updated successfully!`, 'success', 'Feature Updated');
    return updatedFeature;
  };

  const deleteFeature = async (featureId) => {
    const feat = features.find((f) => f.id === featureId);
    const featName = feat ? feat.name : 'Feature';

    setFeatures((prev) => prev.filter((f) => f.id !== featureId));
    if (selectedFeatureId === featureId) {
      setSelectedFeatureId(null);
    }
    if (editingFeature && editingFeature.id === featureId) {
      setIsEditFeatureModalOpen(false);
      setEditingFeature(null);
    }
    if (firebaseStatus === 'connected') {
      await deleteFeatureFromFirestore(featureId);
    }
    addToast(`Feature "${featName}" was deleted.`, 'info', 'Feature Deleted');
  };

  // Feature Status Transitions (In Dev -> Ready for Retest -> QA Verification -> Verified)
  // Personal notice to the feature's dev & QA when it enters development or QA verification
  const notifyFeatureStage = (feat, newStatus) => {
    if (newStatus === 'in_dev') {
      addNotification({
        type: 'feature_in_dev',
        title: `In Development: "${feat.name}"`,
        message: `${currentUser?.name || 'A team member'} moved "${feat.name}" to In Development.`,
        targetRole: 'all',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'info'
      });
    } else if (newStatus === 'in_qa') {
      addNotification({
        type: 'feature_in_qa',
        title: `QA Verification Started: "${feat.name}"`,
        message: `${currentUser?.name || 'QA'} started QA verification of "${feat.name}".`,
        targetRole: 'all',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'info'
      });
    }
  };

  const updateFeatureStatus = async (featureId, newStatus, metadata = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    if (newStatus === 'verified' && feat.status !== 'verified') {
      if (!canQaDecide) {
        denyQaOnly('Verifying & closing a feature');
        return;
      }
      if (!metadata.confirmed) {
        requestCloseFeature(featureId);
        return;
      }
    }

    if (newStatus === 'ready_for_qa') {
      addToast(
        `🚀 Feature "${feat.name}" deployed to Staging and marked Ready for QA!`,
        'success',
        'QA Retest Ready'
      );
      addNotification({
        type: 'feature_ready_for_qa',
        title: `Feature Ready for QA: "${feat.name}"`,
        message: `Feature "${feat.name}" deployed to Staging by ${currentUser?.name || 'Developer'} and marked Ready for QA testing!`,
        targetRole: 'qa',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'info'
      });
    } else if (newStatus === 'verified') {
      const bugs = feat.bugs || [];
      const suggs = feat.suggestions || [];
      const openBugs = bugs.filter((b) => !DONE_ITEM.includes((b.status || '').toLowerCase().trim()));
      const openSuggs = suggs.filter((s) => !DONE_ITEM.includes((s.status || '').toLowerCase().trim()));
      const totalOpen = openBugs.length + openSuggs.length;

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });

      if (totalOpen > 0) {
        addToast(
          `Feature "${feat.name}" was VERIFIED & CLOSED by QA (${totalOpen} open item(s) accepted as non-blocking risk).`,
          'verified',
          'Feature Closed by QA'
        );
        addNotification({
          type: 'feature_verified',
          title: `Feature QA Closed: "${feat.name}" 🎉`,
          message: `Feature "${feat.name}" was signed off & closed by QA (${currentUser?.name || 'QA'}) with ${totalOpen} open item(s) assessed as acceptable risk.${metadata?.qaNotes ? ` Note: "${metadata.qaNotes}".` : ''} Ready for release.`,
          targetRole: 'developer',
          targetFeatureId: feat.id,
          targetFeatureName: feat.name,
          severity: 'success'
        });
      } else {
        addToast(
          `🎉 Feature "${feat.name}" was VERIFIED & CLOSED by QA!`,
          'verified',
          'Feature Completed'
        );
        addNotification({
          type: 'feature_verified',
          title: `Feature QA Passed & Closed: "${feat.name}" 🎉`,
          message: `Feature "${feat.name}" passed all QA verification checks and was signed off & closed by ${currentUser?.name || 'QA'}! Ready for release.`,
          targetRole: 'developer',
          targetFeatureId: feat.id,
          targetFeatureName: feat.name,
          severity: 'success'
        });
      }
    } else if (newStatus === 'in_dev' && feat.status === 'backlog') {
      addToast(`🛠️ Feature "${feat.name}" pulled into development.`, 'info', 'Development Started');
      addNotification({
        type: 'feature_started',
        title: `Development Started: "${feat.name}"`,
        message: `${currentUser?.name || 'A team member'} pulled "${feat.name}" from the feature pool into development.`,
        targetRole: 'developer',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'info'
      });
    } else if (newStatus === 'backlog') {
      addToast(`Feature "${feat.name}" moved back to the feature pool.`, 'info', 'Moved to Pool');
    } else if (newStatus === 'blocked') {
      addNotification({
        type: 'feature_blocked',
        title: `Feature Blocked: "${feat.name}" ⚠️`,
        message: `Feature "${feat.name}" was marked Blocked. ${metadata.blockReason ? `Reason: "${metadata.blockReason}"` : 'Needs developer or lead unblock.'}`,
        targetRole: 'all',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'critical'
      });
      addToast(`Feature "${feat.name}" marked Blocked!`, 'critical', 'Feature Blocked');
    } else {
      addToast(`Feature status updated to "${newStatus.replace(/_/g, ' ').toUpperCase()}"`, 'info');
      if (feat.status !== newStatus) notifyFeatureStage(feat, newStatus);
    }

    const updatedFeature = {
      ...feat,
      status: newStatus,
      ...completeInProgressFutureItems(feat, newStatus),
      ...(metadata.prLink ? { prLink: metadata.prLink } : {}),
      ...(metadata.stagingBuild ? { stagingBuild: metadata.stagingBuild } : {}),
      ...(metadata.devNotes ? { devNotes: metadata.devNotes } : {}),
      ...(metadata.qaNotes ? { qaNotes: metadata.qaNotes } : {}),
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }
  };

  // Move / Reorder Feature via Drag and Drop
  const moveFeatureCard = async (featureId, targetStatus, targetFeatureId = null, position = 'after') => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    if (targetStatus === 'verified' && feat.status !== 'verified') {
      if (!canQaDecide) {
        denyQaOnly('Verifying & closing a feature');
        return;
      }
      requestCloseFeature(featureId);
      return;
    }

    const oldStatus = feat.status;
    const isStatusChanged = oldStatus !== targetStatus;

    // Dropping on itself in the same phase is a no-op
    if (targetFeatureId === featureId && !isStatusChanged) {
      return;
    }

    if (isStatusChanged) {
      if (targetStatus === 'ready_for_qa') {
        addToast(
          `🚀 Feature "${feat.name}" deployed to Staging and marked Ready for QA!`,
          'success',
          'QA Retest Ready'
        );
        addNotification({
          type: 'feature_ready_for_qa',
          title: `Feature Ready for QA: "${feat.name}"`,
          message: `Feature "${feat.name}" moved to Ready for QA by ${currentUser?.name || 'Developer'}. Ready for test verification!`,
          targetRole: 'qa',
          targetFeatureId: feat.id,
          targetFeatureName: feat.name,
          severity: 'info'
        });
      } else if (targetStatus === 'verified') {
        const openBugs = (feat.bugs || []).filter((b) => b.status !== 'verified');
        if (openBugs.length > 0) {
          addToast(
            `Warning: Feature has ${openBugs.length} open bug(s). Please resolve bugs before final verification!`,
            'warning',
            'Verification Warning'
          );
        }
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
        addToast(
          `🎉 Feature "${feat.name}" was VERIFIED & CLOSED by QA!`,
          'verified',
          'Feature Completed'
        );
        addNotification({
          type: 'feature_verified',
          title: `Feature QA Passed & Closed: "${feat.name}" 🎉`,
          message: `Feature "${feat.name}" was verified and closed by ${currentUser?.name || 'QA'}. Ready for release!`,
          targetRole: 'developer',
          targetFeatureId: feat.id,
          targetFeatureName: feat.name,
          severity: 'success'
        });
      } else {
        const readable = targetStatus.replace(/_/g, ' ').toUpperCase();
        addToast(`Moved "${feat.name}" to ${readable}`, 'info', 'Status Updated');
        notifyFeatureStage(feat, targetStatus);
      }
    }

    const updatedItem = {
      ...feat,
      status: targetStatus,
      ...completeInProgressFutureItems(feat, targetStatus),
      updatedAt: new Date().toISOString()
    };

    // Compute the new order from the current features *before* updating state, so the exact
    // same values are saved (computing inside setFeatures() could run after the save and
    // send the old order to Firestore, which then moved the card to the bottom).
    const currentProjFeatures = (features || [])
      .filter((f) => f.projectId === feat.projectId && !f.isMainModule)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Target column without the dragged card, then insert it where it was dropped
    const targetColFeatures = currentProjFeatures.filter((f) => f.id !== featureId && f.status === targetStatus);
    let newColOrder = [...targetColFeatures, updatedItem];
    if (targetFeatureId && targetFeatureId !== featureId) {
      const targetIdx = targetColFeatures.findIndex((f) => f.id === targetFeatureId);
      if (targetIdx !== -1) {
        newColOrder = [...targetColFeatures];
        newColOrder.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, updatedItem);
      }
    }

    // Normalize order values across the project, column by column
    const otherColsFeatures = currentProjFeatures.filter((f) => f.id !== featureId && f.status !== targetStatus);
    const allThisProj = [...otherColsFeatures, ...newColOrder];
    const COL_KEYS = ['backlog', 'in_dev', 'ready_for_qa', 'in_qa', 'verified'];
    const finalThisProj = [];
    let baseOrder = 1000;
    for (const colKey of COL_KEYS) {
      const colFeats =
        colKey === targetStatus
          ? newColOrder
          : allThisProj.filter((f) => f.status === colKey).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      colFeats.forEach((f) => {
        finalThisProj.push({ ...f, order: baseOrder });
        baseOrder += 1000;
      });
    }
    allThisProj
      .filter((f) => !COL_KEYS.includes(f.status))
      .forEach((f) => {
        finalThisProj.push({ ...f, order: baseOrder });
        baseOrder += 1000;
      });

    // Only features whose order or status actually changed need saving
    const before = new Map(currentProjFeatures.map((f) => [f.id, f]));
    const changed = finalThisProj.filter((f) => {
      const prev = before.get(f.id);
      return !prev || prev.order !== f.order || prev.status !== f.status || f.id === featureId;
    });

    const finalById = new Map(finalThisProj.map((f) => [f.id, f]));
    // Keep every other feature as-is; replace this project's features with the re-ordered ones
    setFeatures((prev) => [...prev.filter((f) => !finalById.has(f.id)), ...finalThisProj]);

    if (firebaseStatus === 'connected' && changed.length > 0) {
      await saveFeaturesOrderToFirestore(changed);
    }
  };

  // Reorder Feature by 1 step up or down within its current phase
  const reorderFeatureInPhase = async (featureId, direction) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const statusFeatures = (features || [])
      .filter((f) => f.projectId === feat.projectId && !f.isMainModule && f.status === feat.status)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const currentIndex = statusFeatures.findIndex((f) => f.id === featureId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= statusFeatures.length) {
      return;
    }

    const swapTargetFeat = statusFeatures[targetIndex];
    await moveFeatureCard(
      featureId,
      feat.status,
      swapTargetFeat.id,
      direction === 'up' ? 'before' : 'after'
    );
  };

  // Pull one or more pooled (backlog) features into development in a single batch
  // ===== Developer testing checkpoints (sequential) =====
  // feature.devChecks = { [stageId]: { done, by, byName, at } }
  // Save the developer's working order of features (Dev Testing page): orderedIds top → bottom
  const reorderDevTesting = async (orderedIds = []) => {
    const rank = new Map(orderedIds.map((id, i) => [id, (i + 1) * 1000]));
    const changed = (features || [])
      .filter((f) => rank.has(f.id) && f.devOrder !== rank.get(f.id))
      .map((f) => ({ ...f, devOrder: rank.get(f.id) }));
    if (changed.length === 0) return;
    const byId = new Map(changed.map((f) => [f.id, f]));
    setFeatures((prev) => prev.map((f) => (byId.has(f.id) ? { ...f, devOrder: byId.get(f.id).devOrder } : f)));
    if (firebaseStatus === 'connected' && changed.length > 0) {
      await saveFeaturesOrderToFirestore(changed);
    }
  };

  const setDevCheck = async (featureId, stageId, done) => {
    if (!hasRole(currentUser, ROLES.DEVELOPER)) {
      addToast('Developer testing stages can only be updated by developers.', 'warning', 'Developers Only');
      return false;
    }
    const feat = features.find((f) => f.id === featureId);
    const idx = DEV_STAGE_IDS.indexOf(stageId);
    if (!feat || idx === -1) return false;
    const checks = { ...(feat.devChecks || {}) };

    if (done) {
      const prevMissing = DEV_STAGE_IDS.slice(0, idx).find((id) => !checks[id]?.done);
      if (prevMissing) {
        const stage = DEV_TEST_STAGES.find((x) => x.id === prevMissing);
        addToast(`Pass "${stage?.label}" first.`, 'warning', 'Stage Order');
        return false;
      }
      checks[stageId] = { done: true, by: currentUser?.id || '', byName: currentUser?.name || '', at: new Date().toISOString() };
    } else {
      // Un-passing a stage also clears every later stage
      DEV_STAGE_IDS.slice(idx).forEach((id) => delete checks[id]);
    }

    const updated = { ...feat, devChecks: checks, updatedAt: new Date().toISOString() };
    setFeatures((prev) => prev.map((f) => (f.id === featureId ? updated : f)));
    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updated);
    }

    if (done) {
      const stage = DEV_TEST_STAGES[idx];
      const allDone = DEV_STAGE_IDS.every((id) => checks[id]?.done);
      addToast(
        allDone ? `"${feat.name}" passed all developer testing stages.` : `"${feat.name}": ${stage.label} passed.`,
        allDone ? 'verified' : 'success',
        allDone ? 'Dev Testing Complete' : 'Stage Passed'
      );
    }
    return true;
  };

  const startFeaturesDevelopment = async (featureIds = []) => {
    const idSet = new Set(featureIds);
    const targets = (features || []).filter((f) => idSet.has(f.id) && f.status === 'backlog');
    if (targets.length === 0) return;
    if (targets.length === 1) {
      await updateFeatureStatus(targets[0].id, 'in_dev');
      return;
    }

    const now = new Date().toISOString();
    const inDevMax = (features || [])
      .filter((f) => f.projectId === targets[0].projectId && f.status === 'in_dev')
      .reduce((max, f) => Math.max(max, f.order || 0), 0);
    const updatedById = new Map(
      targets.map((f, idx) => [
        f.id,
        { ...f, status: 'in_dev', order: inDevMax + (idx + 1) * 1000, updatedAt: now }
      ])
    );

    setFeatures((prev) => prev.map((f) => updatedById.get(f.id) || f));

    addToast(`🛠️ ${targets.length} features pulled into development.`, 'info', 'Development Started');
    addNotification({
      type: 'feature_started',
      title: `Development Started: ${targets.length} features`,
      message: `${currentUser?.name || 'A team member'} pulled ${targets.length} features from the feature pool into development: ${targets
        .slice(0, 5)
        .map((f) => `"${f.name}"`)
        .join(', ')}${targets.length > 5 ? ', …' : ''}`,
      targetRole: 'developer',
      severity: 'info'
    });

    if (firebaseStatus === 'connected') {
      await Promise.all(Array.from(updatedById.values()).map((f) => saveFeatureToFirestore(f)));
    }
  };

  // Add Bug directly to Feature (filed by QA during testing)
  const addBugToFeature = async (featureId, bugData) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    // Prevent duplicate rapid submissions (double-click debounce)
    const isDuplicate = (feat.bugs || []).some(
      (b) =>
        b.title.trim().toLowerCase() === (bugData.title || '').trim().toLowerCase() &&
        Math.abs(Date.now() - (parseDateSafe(b.createdAt)?.getTime() || 0)) < 5000
    );
    if (isDuplicate) {
      addToast('This defect was just logged a moment ago.', 'warning');
      return;
    }

    const existingIds = (feat.bugs || []).map((b) => {
      const match = (b.id || '').match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextBugNum = (existingIds.length > 0 ? Math.max(...existingIds, 0) : 0) + 1;
    let bugId = `BUG-${feat.code || 'FEAT'}-${nextBugNum}`;
    let bump = nextBugNum;
    while ((feat.bugs || []).some((b) => b.id === bugId)) {
      bump++;
      bugId = `BUG-${feat.code || 'FEAT'}-${bump}`;
    }

    const defaultDev = feat.assignedDev || (team.find((m) => hasRole(m, ROLES.DEVELOPER)) || team[0])?.id || 'user-admin';
    const defaultQa = (currentUser && currentUser.id) || (team.find((m) => hasRole(m, ROLES.QA)) || team[0])?.id || 'user-admin';
    const newBug = {
      id: bugId,
      title: bugData.title,
      severity: bugData.severity || 'Medium',
      status: 'open',
      reportedBy: defaultQa,
      assignedDev: defaultDev,
      reproSteps: bugData.reproSteps || '',
      expectedResult: bugData.expectedResult || '',
      actualResult: bugData.actualResult || '',
      createdAt: new Date().toISOString()
    };

    const seenBugs = new Set();
    const updatedBugs = [newBug, ...(feat.bugs || [])].filter((b) => {
      if (!b || !b.id || seenBugs.has(b.id)) return false;
      seenBugs.add(b.id);
      return true;
    });

    const updatedFeature = {
      ...feat,
      bugs: updatedBugs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(
      `Bug [${newBug.id}] logged on feature "${feat.name}". Developer alerted!`,
      'warning',
      'Defect Logged on Feature'
    );
    const totalBugsNow = updatedBugs.length;
    addNotification({
      type: 'bug_logged',
      title: `Defect [${newBug.id}] on "${feat.name}"`,
      message: `QA ${currentUser?.name || 'Tester'} logged [${newBug.id}] "${newBug.title}" (${newBug.severity}). Feature has ${totalBugsNow} defect(s).`,
      targetRole: 'developer',
      targetFeatureId: feat.id,
      targetFeatureName: feat.name,
      targetDefectId: newBug.id,
      itemKind: 'bug',
      targetUserIds: [newBug.assignedDev || feat.assignedDev],
      severity: newBug.severity === 'Critical' ? 'critical' : 'warning'
    });
  };

  // Update Feature Bug Status (Open -> In Dev -> Ready for Retest (Dev Fixed) -> Verified (QA Passed))
  const updateFeatureBugStatus = async (featureId, bugId, newStatus, extraData = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;
    if (['verified', 'qa_failed'].includes(newStatus) && !canQaDecide) {
      denyQaOnly('Passing or failing a defect');
      return;
    }
    const failReason = (extraData?.qaFailReason || extraData?.failReason || '').trim();
    if (newStatus === 'qa_failed' && !failReason) {
      addToast('A reason is required to fail QA verification.', 'critical', 'Reason Required');
      return;
    }
    const bugRec = (feat.bugs || []).find((b) => b.id === bugId) || {};
    const bugDev = [bugRec.assignedDev || feat.assignedDev];
    const bugQa = [feat.assignedQa, bugRec.reportedBy];

    if (newStatus === 'verified') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      addToast(`Defect [${bugId}] verified & passed by QA! 🎉`, 'verified');
      addNotification({
        type: 'qa_passed',
        title: `QA Passed: Defect [${bugId}] 🎉`,
        message: `Defect [${bugId}] on feature "${feat.name}" passed QA retest verification and is now closed.`,
        targetRole: 'developer',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        targetDefectId: bugId,
        itemKind: 'bug',
        targetUserIds: bugDev,
        severity: 'success'
      });
    } else if (newStatus === 'ready_for_qa') {
      addToast(`Defect [${bugId}] marked Dev Fixed. Ready for QA retest!`, 'success');
      addNotification({
        type: 'dev_fixed',
        title: `Dev Fixed: [${bugId}] on "${feat.name}"`,
        message: `Defect [${bugId}] was resolved by ${currentUser?.name || 'Developer'}.${extraData?.devNote ? ` Note: "${extraData.devNote}"` : ''} Ready for QA retest!`,
        targetRole: 'qa',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        targetDefectId: bugId,
        itemKind: 'bug',
        targetUserIds: bugQa,
        severity: 'success'
      });
    } else if (newStatus === 'qa_failed') {
      addToast(`Defect [${bugId}] marked QA Failed! Returned for rework.`, 'warning', 'QA Retest Failed');
      addNotification({
        type: 'qa_failed',
        title: `QA Retest Failed: [${bugId}] 🔴`,
        message: `Defect [${bugId}] on feature "${feat.name}" failed QA verification${failReason ? `: "${failReason}"` : ''} and was returned for rework.`,
        targetRole: 'developer',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        targetDefectId: bugId,
        itemKind: 'bug',
        targetUserIds: bugDev,
        severity: 'critical'
      });
    } else if (newStatus === 'in_dev') {
      addToast(`Defect [${bugId}] moved to In Development.`, 'info');
    } else if (newStatus === 'open') {
      addToast(`Defect [${bugId}] moved to Need Dev.`, 'info');
    }

    const seenIds = new Set();
    const updatedBugs = (feat.bugs || [])
      .filter((b) => {
        if (!b || !b.id || seenIds.has(b.id)) return false;
        seenIds.add(b.id);
        return true;
      })
      .map((b) =>
        b.id === bugId ? { ...b, status: newStatus, ...extraData, updatedAt: new Date().toISOString() } : b
      );

    const updatedFeature = {
      ...feat,
      bugs: updatedBugs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }
  };

  // Edit / Update Bug Details
  const updateFeatureBug = async (featureId, bugId, bugData) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const updatedBugs = (feat.bugs || []).map((b) =>
      b.id === bugId ? { ...b, ...bugData, updatedAt: new Date().toISOString() } : b
    );
    const updatedFeature = {
      ...feat,
      bugs: updatedBugs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Defect updated successfully.`, 'success');
  };

  // Delete Bug from Feature
  const deleteBugFromFeature = async (featureId, bugId) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const updatedBugs = (feat.bugs || []).filter((b) => b.id !== bugId);
    const updatedFeature = {
      ...feat,
      bugs: updatedBugs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Defect [${bugId}] deleted successfully.`, 'info', 'Defect Removed');
  };

  // Add QA Suggestion / Improvement to Feature
  const addSuggestionToFeature = async (featureId, suggData) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    // Prevent duplicate rapid submissions (double-click debounce)
    const isDuplicate = (feat.suggestions || []).some(
      (s) =>
        s.title.trim().toLowerCase() === (suggData.title || '').trim().toLowerCase() &&
        Math.abs(Date.now() - (parseDateSafe(s.createdAt)?.getTime() || 0)) < 5000
    );
    if (isDuplicate) {
      addToast('This suggestion was just logged a moment ago.', 'warning');
      return;
    }

    const existingIds = (feat.suggestions || []).map((s) => {
      const match = (s.id || '').match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const nextSuggNum = (existingIds.length > 0 ? Math.max(...existingIds, 0) : 0) + 1;
    let suggId = `SUGG-${feat.code || 'FEAT'}-${nextSuggNum}`;
    let bump = nextSuggNum;
    while ((feat.suggestions || []).some((s) => s.id === suggId)) {
      bump++;
      suggId = `SUGG-${feat.code || 'FEAT'}-${bump}`;
    }

    const author = (currentUser && currentUser.id) || (team.find((m) => hasRole(m, ROLES.QA)) || team[0])?.id || 'user-admin';
    const newSugg = {
      id: suggId,
      title: suggData.title,
      priority: suggData.priority || 'Medium',
      status: 'open',
      submittedBy: author,
      notes: suggData.notes || '',
      createdAt: new Date().toISOString()
    };

    const seenSuggs = new Set();
    const updatedSuggestions = [newSugg, ...(feat.suggestions || [])].filter((s) => {
      if (!s || !s.id || seenSuggs.has(s.id)) return false;
      seenSuggs.add(s.id);
      return true;
    });

    const updatedFeature = {
      ...feat,
      suggestions: updatedSuggestions,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(
      `Suggestion added to "${feat.name}". Thank you for QA feedback!`,
      'info',
      'QA Improvement Noted'
    );
    addNotification({
      type: 'suggestion_logged',
      title: `QA Suggestion [${newSugg.id}] on "${feat.name}"`,
      message: `QA ${currentUser?.name || 'Tester'} submitted suggestion: "${newSugg.title}" (${newSugg.priority}).`,
      targetRole: 'developer',
      targetFeatureId: feat.id,
      targetFeatureName: feat.name,
      targetDefectId: newSugg.id,
      itemKind: 'suggestion',
      severity: 'info'
    });
  };

  const updateSuggestionStatus = async (featureId, suggId, newStatus, extraData = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;
    if (['verified', 'implemented', 'qa_failed'].includes(newStatus) && !canQaDecide) {
      denyQaOnly('Passing or failing a suggestion');
      return;
    }
    const failReason = (extraData?.qaFailReason || extraData?.failReason || '').trim();
    if (newStatus === 'qa_failed' && !failReason) {
      addToast('A reason is required to fail QA verification.', 'critical', 'Reason Required');
      return;
    }
    const suggRec = (feat.suggestions || []).find((x) => x.id === suggId) || {};
    const suggQa = [feat.assignedQa, suggRec.submittedBy];

    if (newStatus === 'verified' || newStatus === 'implemented') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      addToast(`Suggestion [${suggId}] verified and closed! 🎉`, 'verified');
      addNotification({
        type: 'qa_passed',
        title: `Suggestion Verified: [${suggId}] 🎉`,
        message: `Suggestion [${suggId}] on feature "${feat.name}" was verified & closed by QA.`,
        targetRole: 'developer',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        targetDefectId: suggId,
        itemKind: 'suggestion',
        severity: 'success'
      });
    } else if (newStatus === 'ready_for_qa') {
      addToast(`Suggestion [${suggId}] marked Dev Implemented. Ready for QA retest!`, 'success');
      addNotification({
        type: 'dev_fixed',
        title: `Dev Implemented: Suggestion [${suggId}]`,
        message: `Suggestion [${suggId}] on "${feat.name}" was implemented by ${currentUser?.name || 'Developer'}. Ready for QA review!`,
        targetRole: 'qa',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        targetDefectId: suggId,
        itemKind: 'suggestion',
        targetUserIds: suggQa,
        severity: 'success'
      });
    } else if (newStatus === 'qa_failed') {
      addToast(`Suggestion [${suggId}] marked QA Failed! Returned for rework.`, 'warning', 'QA Retest Failed');
      addNotification({
        type: 'qa_failed',
        title: `Suggestion Review Failed: [${suggId}]`,
        message: `Suggestion [${suggId}] on feature "${feat.name}" needs further adjustments${failReason ? `: "${failReason}"` : ''}.`,
        targetRole: 'developer',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        targetDefectId: suggId,
        itemKind: 'suggestion',
        severity: 'warning'
      });
    } else if (newStatus === 'in_dev') {
      addToast(`Suggestion [${suggId}] moved to In Development.`, 'info');
    } else if (newStatus === 'open') {
      addToast(`Suggestion [${suggId}] moved to Need Dev.`, 'info');
    }

    const seenIds = new Set();
    const updatedSuggs = (feat.suggestions || [])
      .filter((s) => {
        if (!s || !s.id || seenIds.has(s.id)) return false;
        seenIds.add(s.id);
        return true;
      })
      .map((s) =>
        s.id === suggId ? { ...s, status: newStatus, ...extraData, updatedAt: new Date().toISOString() } : s
      );

    const updatedFeature = {
      ...feat,
      suggestions: updatedSuggs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }
  };

  // Edit / Update Suggestion Details
  const updateFeatureSuggestion = async (featureId, suggId, suggData) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const updatedSuggs = (feat.suggestions || []).map((s) =>
      s.id === suggId ? { ...s, ...suggData, updatedAt: new Date().toISOString() } : s
    );
    const updatedFeature = {
      ...feat,
      suggestions: updatedSuggs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Suggestion updated successfully.`, 'success');
  };

  // Delete Suggestion from Feature
  // ===== Future Improvements (deferred work tracked on a feature) =====
  // Item: { id, type: 'dependency'|'suggestion'|'reminder', title, details, blockedBy,
  //         remindOn: 'YYYY-MM-DD'|'', status: 'waiting'|'ready'|'in_progress'|'done', ... }
  const patchFeatureFutureItems = async (featureId, mutate, extra = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return null;
    const updatedFeature = {
      ...feat,
      ...extra,
      futureItems: mutate(feat.futureItems || []),
      updatedAt: new Date().toISOString()
    };
    setFeatures((prev) => prev.map((f) => (f.id === featureId ? updatedFeature : f)));
    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }
    return updatedFeature;
  };

  const addFutureItem = async (featureId, itemData, options = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat || !itemData?.title?.trim()) return;
    const now = new Date().toISOString();
    const newItem = {
      id: `FI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      type: itemData.type || 'dependency',
      title: itemData.title.trim(),
      description: (itemData.description || '').trim(),
      details: (itemData.details || '').trim(),
      blockedBy: (itemData.blockedBy || '').trim(),
      remindOn: itemData.remindOn || '',
      status: 'waiting',
      createdBy: currentUser?.id || '',
      createdByName: currentUser?.name || '',
      createdAt: now,
      updatedAt: now
    };

    const closing = options.closeFeature && feat.status !== 'verified';
    if (closing && !canQaDecide) {
      denyQaOnly('Closing a feature');
      return;
    }
    await patchFeatureFutureItems(featureId, (items) => [newItem, ...items], closing ? { status: 'verified' } : {});

    if (closing) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      addToast(
        `"${feat.name}" closed — "${newItem.title}" saved to Future Improvements.`,
        'verified',
        'Closed with Pending Item'
      );
      addNotification({
        type: 'feature_verified',
        title: `Feature Closed with Pending Item: "${feat.name}"`,
        message: `${currentUser?.name || 'QA'} closed "${feat.name}" (all current QA passed). Pending: "${newItem.title}"${
          newItem.blockedBy ? ` — waiting on ${newItem.blockedBy}` : ''
        }.`,
        targetRole: 'all',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'success'
      });
    } else {
      addToast(`Saved "${newItem.title}" to Future Improvements.`, 'success', 'Future Item Added');
    }
  };

  const updateFutureItem = async (featureId, itemId, patch) => {
    const feat = features.find((f) => f.id === featureId);
    const item = (feat?.futureItems || []).find((i) => i.id === itemId);
    if (!feat || !item) return;
    const now = new Date().toISOString();
    await patchFeatureFutureItems(featureId, (items) =>
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              ...patch,
              ...(patch.status === 'ready' ? { readyAt: now } : {}),
              ...(patch.status === 'done' ? { doneAt: now } : {}),
              updatedAt: now
            }
          : i
      )
    );

    if (patch.status === 'ready' && item.status !== 'ready') {
      addToast(`"${item.title}" is ready to implement.`, 'success', 'Ready to Implement');
      addNotification({
        type: 'future_item_ready',
        title: `Ready to Implement: "${item.title}"`,
        message: `${item.blockedBy ? `${item.blockedBy} is now available. ` : ''}"${item.title}" on feature "${feat.name}" can be implemented.`,
        targetRole: 'developer',
        targetFeatureId: feat.id,
        targetFeatureName: feat.name,
        severity: 'info'
      });
    } else if (patch.status === 'done' && item.status !== 'done') {
      addToast(`"${item.title}" marked done.`, 'verified', 'Future Item Done');
    }
  };

  // Reopen the feature into development to implement a deferred item
  const startFutureItem = async (featureId, itemId) => {
    const feat = features.find((f) => f.id === featureId);
    const item = (feat?.futureItems || []).find((i) => i.id === itemId);
    if (!feat || !item) return;
    const now = new Date().toISOString();
    await patchFeatureFutureItems(
      featureId,
      (items) => items.map((i) => (i.id === itemId ? { ...i, status: 'in_progress', startedAt: now, updatedAt: now } : i)),
      {
        status: 'in_dev',
        devNotes: `Implementing deferred item: ${item.title}${feat.devNotes ? `\n${feat.devNotes}` : ''}`
      }
    );
    addToast(`"${feat.name}" reopened in development for "${item.title}".`, 'info', 'Implementation Started');
    addNotification({
      type: 'feature_started',
      title: `Feature Reopened: "${feat.name}"`,
      message: `${currentUser?.name || 'A team member'} reopened "${feat.name}" to implement "${item.title}". It will need QA again.`,
      targetRole: 'all',
      targetFeatureId: feat.id,
      targetFeatureName: feat.name,
      severity: 'info'
    });
  };

  // Move a defect or suggestion off the feature and into Future Improvements
  const [moveToFutureTarget, setMoveToFutureTarget] = useState(null);
  const openMoveToFuture = (featureId, kind, sourceId) => {
    const feat = features.find((f) => f.id === featureId);
    const list = kind === 'bug' ? feat?.bugs : feat?.suggestions;
    const source = (list || []).find((x) => x.id === sourceId);
    if (!feat || !source) return;
    setMoveToFutureTarget({ featureId, featureName: feat.name, kind, source });
  };

  const moveDefectToFuture = async (featureId, kind, sourceId, itemData) => {
    const feat = features.find((f) => f.id === featureId);
    const listKey = kind === 'bug' ? 'bugs' : 'suggestions';
    const source = (feat?.[listKey] || []).find((x) => x.id === sourceId);
    if (!feat || !source || !itemData?.title?.trim()) return;
    const now = new Date().toISOString();
    const newItem = {
      id: `FI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      type: itemData.type || (kind === 'bug' ? 'dependency' : 'suggestion'),
      title: itemData.title.trim(),
      description: (itemData.description || '').trim(),
      details: (itemData.details || '').trim(),
      blockedBy: (itemData.blockedBy || '').trim(),
      remindOn: itemData.remindOn || '',
      status: 'waiting',
      sourceKind: kind,
      sourceId: source.id,
      sourceSeverity: kind === 'bug' ? source.severity || '' : source.priority || '',
      createdBy: currentUser?.id || '',
      createdByName: currentUser?.name || '',
      createdAt: now,
      updatedAt: now
    };
    await patchFeatureFutureItems(featureId, (items) => [newItem, ...items], {
      [listKey]: (feat[listKey] || []).filter((x) => x.id !== sourceId)
    });
    setMoveToFutureTarget(null);
    addToast(
      `${kind === 'bug' ? 'Defect' : 'Suggestion'} [${source.id}] moved to Future Improvements.`,
      'success',
      'Moved to Future'
    );
    addNotification({
      type: 'future_item_added',
      title: `Deferred: "${newItem.title}"`,
      message: `${currentUser?.name || 'A team member'} moved ${kind === 'bug' ? 'defect' : 'suggestion'} [${source.id}] on "${feat.name}" to Future Improvements${
        newItem.blockedBy ? ` (waiting on ${newItem.blockedBy})` : ''
      }.`,
      targetRole: 'all',
      targetFeatureId: feat.id,
      targetFeatureName: feat.name,
      severity: 'info'
    });
  };

  const deleteFutureItem = async (featureId, itemId) => {
    await patchFeatureFutureItems(featureId, (items) => items.filter((i) => i.id !== itemId));
    addToast('Future item removed.', 'info');
  };

  const deleteSuggestionFromFeature = async (featureId, suggId) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const updatedSuggs = (feat.suggestions || []).filter((s) => s.id !== suggId);
    const updatedFeature = {
      ...feat,
      suggestions: updatedSuggs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Suggestion [${suggId}] deleted successfully.`, 'info', 'Suggestion Removed');
  };

  // Convert defect classification between 'bug' and 'suggestion'
  const convertDefectType = async (featureId, itemId, fromType, toType, updatedData = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    let updatedBugs = [...(feat.bugs || [])];
    let updatedSuggs = [...(feat.suggestions || [])];

    if (fromType === 'bug' && toType === 'suggestion') {
      const existingBug = updatedBugs.find((b) => b.id === itemId) || {};
      updatedBugs = updatedBugs.filter((b) => b.id !== itemId);
      let targetId = itemId.startsWith('BUG-') ? itemId.replace('BUG-', 'SUGG-') : itemId;
      let counter = 2;
      while (updatedSuggs.some((s) => s.id === targetId)) {
        targetId = `${targetId}-${counter}`;
        counter++;
      }
      const newSuggestion = {
        id: targetId,
        title: updatedData.title || existingBug.title || 'Untitled Suggestion',
        priority: updatedData.priority || updatedData.severity || existingBug.severity || 'Medium',
        notes: updatedData.notes || updatedData.reproSteps || existingBug.reproSteps || '',
        devNote: updatedData.devNote !== undefined ? updatedData.devNote : (existingBug.devNote || ''),
        qaFailReason: updatedData.qaFailReason !== undefined ? updatedData.qaFailReason : (existingBug.qaFailReason || ''),
        status: updatedData.status || existingBug.status || 'open',
        reportedBy: existingBug.reportedBy || (currentUser && currentUser.id) || 'user-admin',
        createdAt: existingBug.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const seenSuggs = new Set();
      updatedSuggs = [newSuggestion, ...updatedSuggs].filter((s) => {
        if (!s || !s.id || seenSuggs.has(s.id)) return false;
        seenSuggs.add(s.id);
        return true;
      });
    } else if (fromType === 'suggestion' && toType === 'bug') {
      const existingSugg = updatedSuggs.find((s) => s.id === itemId) || {};
      updatedSuggs = updatedSuggs.filter((s) => s.id !== itemId);
      let targetId = itemId.startsWith('SUGG-') ? itemId.replace('SUGG-', 'BUG-') : itemId;
      let counter = 2;
      while (updatedBugs.some((b) => b.id === targetId)) {
        targetId = `${targetId}-${counter}`;
        counter++;
      }
      const newBug = {
        id: targetId,
        title: updatedData.title || existingSugg.title || 'Untitled Defect',
        severity: updatedData.severity || updatedData.priority || existingSugg.priority || 'Medium',
        reproSteps: updatedData.reproSteps || updatedData.notes || existingSugg.notes || '',
        devNote: updatedData.devNote !== undefined ? updatedData.devNote : (existingSugg.devNote || ''),
        qaFailReason: updatedData.qaFailReason !== undefined ? updatedData.qaFailReason : (existingSugg.qaFailReason || ''),
        status: updatedData.status || existingSugg.status || 'open',
        reportedBy: existingSugg.reportedBy || (currentUser && currentUser.id) || 'user-admin',
        assignedDev: feat.assignedDev || (team.find((m) => hasRole(m, ROLES.DEVELOPER)) || team[0])?.id || 'user-admin',
        createdAt: existingSugg.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const seenBugs = new Set();
      updatedBugs = [newBug, ...updatedBugs].filter((b) => {
        if (!b || !b.id || seenBugs.has(b.id)) return false;
        seenBugs.add(b.id);
        return true;
      });
    }

    const updatedFeature = {
      ...feat,
      bugs: updatedBugs,
      suggestions: updatedSuggs,
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? updatedFeature : f))
    );

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedFeature);
    }

    addToast(`Reclassified item as ${toType === 'bug' ? 'Defect / Bug' : 'QA Suggestion'}.`, 'success');
  };

  // Ticket Operations
  const openTicket = (ticketOrId) => {
    const id = typeof ticketOrId === 'object' ? ticketOrId.id : ticketOrId;
    setSelectedTicketId(id);
  };

  const closeTicket = () => {
    setSelectedTicketId(null);
  };

  const updateTicket = async (ticketId, fields) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const updatedTicket = { ...ticket, ...fields, updatedAt: new Date().toISOString() };
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? updatedTicket : t))
    );

    if (firebaseStatus === 'connected') {
      await saveTicketToFirestore(updatedTicket);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus, metadata = {}) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    let newComments = [...(ticket.comments || [])];
    const timestamp = new Date().toISOString();

    if (newStatus === 'ready_for_qa') {
      newComments.push({
        id: 'c_' + Date.now(),
        authorId: ticket.assignedDev || (currentUser && currentUser.id) || 'user-admin',
        text: `🚀 Handoff to QA: Fix deployed to ${ticket.environment.toUpperCase()} build ${metadata.stagingBuild || ticket.stagingBuild || '#413'}. Ready for retest! ${metadata.devHandoffNotes ? `\nNote: ${metadata.devHandoffNotes}` : ''}`,
        timestamp
      });
      addToast(
        `[${ticket.id}] deployed to ${ticket.environment.toUpperCase()} and marked Ready for QA!`,
        'success',
        'QA Team Notified'
      );
    } else if (newStatus === 'verified') {
      const qaName = team.find((m) => m.id === ticket.assignedQa)?.name || 'QA Engineer';
      newComments.push({
        id: 'c_' + Date.now(),
        authorId: ticket.assignedQa || (currentUser && currentUser.id) || 'user-admin',
        text: `✅ QA Verification Passed: Verified in environment ${ticket.environment.toUpperCase()}. ${metadata.qaVerificationNotes || 'All test criteria and edge cases passed.'}`,
        timestamp
      });
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      addToast(
        `[${ticket.id}] was verified and closed by ${qaName}! 🎉`,
        'verified',
        'Verification Passed'
      );
    } else if (newStatus === 'reopened') {
      newComments.push({
        id: 'c_' + Date.now(),
        authorId: ticket.assignedQa || (currentUser && currentUser.id) || 'user-admin',
        text: `⚠️ QA Retest Failed: ${metadata.qaVerificationNotes || 'Failed verification steps. Returning to Development.'}`,
        timestamp
      });
      addToast(
        `[${ticket.id}] failed QA retest and was returned to Developer.`,
        'warning',
        'Verification Failed'
      );
    } else {
      addToast(`Status updated to "${newStatus.replace('_', ' ').toUpperCase()}"`, 'info');
    }

    const updatedTicket = {
      ...ticket,
      status: newStatus,
      comments: newComments,
      updatedAt: timestamp,
      ...(metadata.prLink ? { prLink: metadata.prLink } : {}),
      ...(metadata.commitSha ? { commitSha: metadata.commitSha } : {}),
      ...(metadata.stagingBuild ? { stagingBuild: metadata.stagingBuild } : {}),
      ...(metadata.devHandoffNotes ? { devHandoffNotes: metadata.devHandoffNotes } : {}),
      ...(metadata.qaVerificationNotes ? { qaVerificationNotes: metadata.qaVerificationNotes } : {})
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? updatedTicket : t))
    );

    if (firebaseStatus === 'connected') {
      await saveTicketToFirestore(updatedTicket);
    }
  };

  const toggleReproStep = async (ticketId, stepId) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const updatedTicket = {
      ...ticket,
      reproSteps: ticket.reproSteps.map((step) =>
        step.id === stepId ? { ...step, checked: !step.checked } : step
      ),
      updatedAt: new Date().toISOString()
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? updatedTicket : t))
    );

    if (firebaseStatus === 'connected') {
      await saveTicketToFirestore(updatedTicket);
    }
  };

  const addComment = async (ticketId, text, authorId) => {
    if (!text.trim()) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const newComment = {
      id: 'c_' + Date.now(),
      authorId: authorId || (currentUser && currentUser.id) || (role === 'developer' ? 'user-dev' : 'user-admin'),
      text,
      timestamp: new Date().toISOString()
    };

    const updatedTicket = {
      ...ticket,
      comments: [...(ticket.comments || []), newComment],
      updatedAt: new Date().toISOString()
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? updatedTicket : t))
    );

    if (firebaseStatus === 'connected') {
      await saveTicketToFirestore(updatedTicket);
    }

    addToast('Comment added', 'info');
  };

  const createTicket = async (ticketData) => {
    const nextNumber = tickets.length + 101;
    const defaultDev = (team.find((m) => hasRole(m, ROLES.DEVELOPER)) || team[0])?.id || 'user-admin';
    const defaultQa = (team.find((m) => hasRole(m, ROLES.QA)) || team[0])?.id || 'user-admin';
    const newTicket = {
      id: `QA-${nextNumber}`,
      title: ticketData.title || 'Untitled Defect',
      description: ticketData.description || '',
      severity: ticketData.severity || 'Medium',
      priority: ticketData.priority || 'P2',
      status: ticketData.status || 'in_dev',
      component: ticketData.component || 'General',
      environment: ticketData.environment || 'staging',
      reportedBy: ticketData.reportedBy || (currentUser && currentUser.id) || defaultQa,
      assignedDev: ticketData.assignedDev || defaultDev,
      assignedQa: ticketData.assignedQa || defaultQa,
      prLink: ticketData.prLink || '',
      commitSha: ticketData.commitSha || '',
      stagingBuild: ticketData.stagingBuild || '',
      devHandoffNotes: '',
      qaVerificationNotes: '',
      reproSteps: ticketData.reproSteps && ticketData.reproSteps.length > 0
        ? ticketData.reproSteps
        : [{ id: 's1', text: 'Step 1: Reproduce on target environment', checked: false }],
      expectedResult: ticketData.expectedResult || '',
      actualResult: ticketData.actualResult || '',
      networkLog: ticketData.networkLog || '',
      curlSnippet: ticketData.curlSnippet || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [
        {
          id: 'c_init',
          authorId: ticketData.reportedBy || (currentUser && currentUser.id) || defaultQa,
          text: `Defect logged with severity ${ticketData.severity || 'Medium'} in ${ticketData.environment || 'staging'}.`,
          timestamp: new Date().toISOString()
        }
      ]
    };

    setTickets((prev) => [newTicket, ...prev]);
    setIsCreateModalOpen(false);
    setPrefillBugData(null);

    if (firebaseStatus === 'connected') {
      await saveTicketToFirestore(newTicket);
    }

    addToast(`Ticket [${newTicket.id}] created successfully!`, 'success', 'Defect Logged');
    openTicket(newTicket.id);
  };

  const deleteTicket = async (ticketId) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (selectedTicketId === ticketId) {
      setSelectedTicketId(null);
    }
    if (firebaseStatus === 'connected') {
      await deleteTicketFromFirestore(ticketId);
    }
    addToast(`Ticket [${ticketId}] deleted.`, 'info');
  };

  const executeTestStep = async (suiteId, caseId, stepNum, newStatus) => {
    let updatedSuiteObj = null;

    setTestSuites((prev) =>
      prev.map((suite) => {
        if (suite.id !== suiteId) return suite;
        const updatedCases = suite.cases.map((c) => {
          if (c.id !== caseId) return c;
          const updatedSteps = c.steps.map((s) => {
            if (s.num !== stepNum) return s;
            return { ...s, status: newStatus };
          });
          const hasFailed = updatedSteps.some((s) => s.status === 'failed');
          const hasBlocked = updatedSteps.some((s) => s.status === 'blocked');
          const allPassed = updatedSteps.every((s) => s.status === 'passed');
          let caseStatus = 'in_progress';
          if (hasFailed) caseStatus = 'failed';
          else if (hasBlocked) caseStatus = 'blocked';
          else if (allPassed) caseStatus = 'passed';

          return { ...c, steps: updatedSteps, status: caseStatus };
        });

        updatedSuiteObj = { ...suite, cases: updatedCases, lastRunDate: 'Just now', updatedAt: new Date().toISOString() };
        return updatedSuiteObj;
      })
    );

    if (updatedSuiteObj && firebaseStatus === 'connected') {
      await saveTestSuiteToFirestore(updatedSuiteObj);
    }
  };

  const startBugFromTestStep = (suite, testCase, step) => {
    setPrefillBugData({
      title: `[${suite.targetVersion}] ${testCase.title} - Step ${step.num} Failure`,
      description: `Failed during execution of Test Suite "${suite.title}" on step ${step.num}.\n\nAction: ${step.action}\nExpected: ${step.expected}`,
      component: suite.component,
      environment: suite.environment,
      severity: 'Critical',
      priority: 'P0',
      expectedResult: step.expected,
      actualResult: `Step failed during execution.`,
      reproSteps: testCase.steps.map((s) => ({
        id: 's_' + s.num,
        text: `Step ${s.num}: ${s.action}`,
        checked: s.num <= step.num
      }))
    });
    setIsCreateModalOpen(true);
  };

  const signOffRelease = async (releaseId, signerRole, note) => {
    const signer = currentUser || (signerRole === 'developer'
      ? team.find((m) => hasRole(m, ROLES.DEVELOPER))
      : team.find((m) => hasRole(m, ROLES.QA)));

    let updatedRelObj = null;

    setReleases((prev) =>
      prev.map((rel) => {
        if (rel.id !== releaseId) return rel;
        const newGateChecks = { ...rel.gateChecks };
        const now = new Date().toISOString();

        if (signerRole === 'developer') {
          newGateChecks.devLeadSignoff = {
            signed: true,
            by: signer?.id || 'user-admin',
            date: now,
            note: note || 'Developer lead approved.'
          };
        } else {
          newGateChecks.qaLeadSignoff = {
            signed: true,
            by: signer?.id || 'user-admin',
            date: now,
            note: note || 'QA lead verification approved.'
          };
        }

        const bothSigned = newGateChecks.devLeadSignoff.signed && newGateChecks.qaLeadSignoff.signed;
        let newStatus = rel.status;
        if (bothSigned && newGateChecks.zeroBlockers) {
          newStatus = 'ready_to_ship';
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 }
          });
          addToast(`🚀 Release ${rel.version} is fully signed off and APPROVED for production!`, 'verified', 'Release Gate Cleared');
        } else {
          addToast(`${signerRole === 'developer' ? 'Dev Lead' : 'QA Lead'} signed off on ${rel.version}.`, 'success');
        }

        updatedRelObj = { ...rel, gateChecks: newGateChecks, status: newStatus, updatedAt: new Date().toISOString() };
        return updatedRelObj;
      })
    );

    if (updatedRelObj && firebaseStatus === 'connected') {
      await saveReleaseToFirestore(updatedRelObj);
    }
  };

  const pingEnvironment = (envId) => {
    addToast(`Pinging ${envId}...`, 'info');
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 40) + 18;
      setEnvironments((prev) =>
        prev.map((e) => (e.id === envId ? { ...e, latencyMs: simulatedLatency, status: 'healthy' } : e))
      );
      addToast(`Health check passed: ${simulatedLatency}ms response`, 'success', envId.toUpperCase());
    }, 600);
  };

  const simulateDeployToStaging = (branch = 'main', commit = '3a88f1c') => {
    const newBuild = `#${Math.floor(Math.random() * 10) + 414}`;
    setEnvironments((prev) =>
      prev.map((e) =>
        e.id === 'staging'
          ? {
              ...e,
              commit,
              branch,
              buildNumber: newBuild,
              lastDeploy: 'Just now',
              status: 'healthy'
            }
          : e
      )
    );
    addToast(
      `🚀 Build ${newBuild} deployed to Staging Alpha! QA team alerted to retest pending tickets.`,
      'success',
      'Deployment Succeeded'
    );
  };

  const resetDemoData = () => {
    setProjects(INITIAL_PROJECTS);
    setActiveProjectId(INITIAL_PROJECTS[0]?.id || 'proj-default');
    setFeatures(INITIAL_FEATURES);
    setTickets(INITIAL_TICKETS);
    setTestSuites(INITIAL_TEST_SUITES);
    setEnvironments(INITIAL_ENVIRONMENTS);
    setReleases(INITIAL_RELEASES);
    setTeam(INITIAL_TEAM);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROJECT);
    localStorage.removeItem(STORAGE_KEYS.FEATURES);
    localStorage.removeItem(STORAGE_KEYS.TICKETS);
    localStorage.removeItem(STORAGE_KEYS.SUITES);
    localStorage.removeItem(STORAGE_KEYS.ENVS);
    localStorage.removeItem(STORAGE_KEYS.RELEASES);
    localStorage.removeItem(STORAGE_KEYS.TEAM);
    addToast('Demo environment restored to initial sample state.', 'info', 'Reset Completed');
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ticket.title.toLowerCase().includes(q);
      const matchId = ticket.id.toLowerCase().includes(q);
      const matchDesc = ticket.description.toLowerCase().includes(q);
      const matchComp = ticket.component.toLowerCase().includes(q);
      if (!matchTitle && !matchId && !matchDesc && !matchComp) return false;
    }
    if (filters.severity !== 'all' && ticket.severity !== filters.severity) return false;
    if (filters.status !== 'all' && ticket.status !== filters.status) return false;
    if (filters.environment !== 'all' && ticket.environment !== filters.environment) return false;
    if (filters.component !== 'all' && ticket.component !== filters.component) return false;
    if (filters.assignedDev !== 'all' && ticket.assignedDev !== filters.assignedDev) return false;
    if (filters.assignedQa !== 'all' && ticket.assignedQa !== filters.assignedQa) return false;
    return true;
  });

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        role,
        setRole,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        team,
        updateUser,
        isCurrentUserAdmin,
        myProjects,
        needsProjectSelection,
        selectWorkingProject,
        updateProject,
        deleteProject,
        setUserActive,
        projects,
        activeProjectId,
        setActiveProjectId,
        activeProject,
        createProject,
        features,
        projectFeatures,
        selectedFeature,
        selectedFeatureId,
        openFeature,
        closeFeature,
        createFeature,
        updateFeature,
        deleteFeature,
        editingFeature,
        setEditingFeature,
        isEditFeatureModalOpen,
        setIsEditFeatureModalOpen,
        openEditFeatureModal,
        closeEditFeatureModal,
        updateFeatureStatus,
        moveFeatureCard,
        reorderFeatureInPhase,
        startFeaturesDevelopment,
        setDevCheck,
        reorderDevTesting,
        featureFocus,
        getFeatureCloseCheck,
        canQaDecide,
        requestCloseFeature,
        openFeatureItems,
        openNotificationTarget,
        projectFutureItems,
        addFutureItem,
        updateFutureItem,
        startFutureItem,
        deleteFutureItem,
        moveToFutureTarget,
        setMoveToFutureTarget,
        openMoveToFuture,
        moveDefectToFuture,
        addBugToFeature,
        updateFeatureBugStatus,
        updateFeatureBug,
        deleteBugFromFeature,
        addSuggestionToFeature,
        updateSuggestionStatus,
        updateFeatureSuggestion,
        deleteSuggestionFromFeature,
        convertDefectType,
        updateFeatureModule,
        modules,
        projectModules,
        allModuleNames,
        isCreateModuleModalOpen,
        setIsCreateModuleModalOpen,
        createModule,
        updateModule,
        deleteModule,
        openCreateFeatureModal,
        createFeatureModalProps,
        setCreateFeatureModalProps,
        isCreateProjectModalOpen,
        setIsCreateProjectModalOpen,
        isCreateFeatureModalOpen,
        setIsCreateFeatureModalOpen,
        allFeatureDefects,
        defectsFilters,
        setDefectsFilters,
        updateDefectsFilter,
        resetDefectsFilters,
        featureBoardModuleFilter,
        setFeatureBoardModuleFilter,
        featureBoardViewMode,
        setFeatureBoardViewMode,
        tickets,
        filteredTickets,
        testSuites,
        environments,
        releases,
        selectedTicket,
        selectedTicketId,
        openTicket,
        closeTicket,
        updateTicket,
        updateTicketStatus,
        toggleReproStep,
        addComment,
        createTicket,
        deleteTicket,
        isCreateModalOpen,
        setIsCreateModalOpen,
        prefillBugData,
        setPrefillBugData,
        activeTestSuiteId,
        setActiveTestSuiteId,
        executeTestStep,
        startBugFromTestStep,
        signOffRelease,
        pingEnvironment,
        simulateDeployToStaging,
        resetDemoData,
        toasts,
        addToast,
        removeToast,
        notifications,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        currentUser,
        isAuthenticated,
        login,
        logout,
        addUser,
        deleteUser,
        loginWithCredentials,
        isUserManagementModalOpen,
        setIsUserManagementModalOpen,
        firebaseConfig,
        firebaseStatus,
        isFirebaseModalOpen,
        setIsFirebaseModalOpen,
        updateFirebaseConfig,
        disconnectFirebase,
        syncAllLocalDataToFirebase
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
