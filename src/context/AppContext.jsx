import React, { createContext, useContext, useState, useEffect } from 'react';
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
  seedAllDataToFirestore,
  findUserInFirestore
} from '../services/firebaseService';

const AppContext = createContext();

const STORAGE_KEYS = {
  AUTH_USER: 'devbridge_auth_user_v3',
  ROLE: 'devbridge_role',
  PROJECTS: 'devbridge_projects_v3',
  ACTIVE_PROJECT: 'devbridge_active_proj_v3',
  FEATURES: 'devbridge_features_v3',
  MODULES: 'devbridge_modules_v3',
  TEAM: 'devbridge_team_v3',
  TICKETS: 'devbridge_tickets_v3',
  SUITES: 'devbridge_suites_v3',
  ENVS: 'devbridge_envs_v3',
  RELEASES: 'devbridge_releases_v3',
  THEME: 'devbridge_theme'
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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = !!currentUser;

  // Current Role: 'all' | 'developer' | 'qa'
  const [role, setRole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ROLE) || 'all';
  });

  // Active navigation tab: 'features' | 'board' | 'tickets' | 'testruns' | 'release' | 'environments' | 'analytics'
  const [activeTab, setActiveTab] = useState('features');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    severity: 'all',
    status: 'all',
    environment: 'all',
    component: 'all',
    assignedDev: 'all',
    assignedQa: 'all'
  });

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

  // Features State (Each feature has its own lifecycle + linked bugs & suggestions)
  const [features, setFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FEATURES);
      const parsed = saved ? JSON.parse(saved) : INITIAL_FEATURES;
      return (parsed || []).map((f, idx) => ({
        ...f,
        order: typeof f.order === 'number' ? f.order : (idx + 1) * 1000
      }));
    } catch {
      return INITIAL_FEATURES;
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
  const [team, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAM);
      return saved ? JSON.parse(saved) : INITIAL_TEAM;
    } catch {
      return INITIAL_TEAM;
    }
  });

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

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
  }, [role]);

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
    localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(team));
  }, [team]);

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
          setFeatures(firestoreFeatures);
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

      return () => {
        unsubUsers();
        unsubProjects();
        unsubFeatures();
        unsubModules();
        unsubTickets();
        unsubReleases();
        unsubSuites();
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
  const addToast = (message, type = 'info', title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type, title, timestamp: new Date() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auth Sync & Methods
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  }, [currentUser]);

  // Super Admin: Add new user with username, password, role
  const addUser = async ({ username, password, role = 'developer', name = '', title = '' }) => {
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
      role: role || 'developer',
      title: title?.trim() || (role === 'developer' ? 'Software Developer' : role === 'qa' ? 'QA Engineer' : 'Super Administrator'),
      initials: (name || username).substring(0, 2).toUpperCase(),
      color: role === 'developer' ? '#0284c7' : role === 'qa' ? '#10b981' : '#8b5cf6'
    };

    setTeam((prev) => [...prev, newUser]);
    if (firebaseStatus === 'connected') {
      await saveUserToFirestore(newUser);
    }
    addToast(`User "${newUser.name}" (@${newUser.username}) created as ${newUser.role.toUpperCase()}!`, 'success', 'User Created');
    return { success: true, user: newUser };
  };

  // Super Admin: Delete user
  const deleteUser = async (userId) => {
    if (userId === 'user-admin') {
      addToast('Cannot delete the root Super Admin account.', 'warning');
      return false;
    }
    setTeam((prev) => prev.filter((u) => u.id !== userId));
    if (firebaseStatus === 'connected') {
      await deleteUserFromFirestore(userId);
    }
    addToast('User removed from team roster.', 'info', 'User Deleted');
    return true;
  };

  // Direct login with username & password (NO ROLE SELECTION NEEDED!)
  const loginWithCredentials = async (username, password) => {
    const trimmed = (username || '').trim().toLowerCase();
    let user = team.find(
      (m) =>
        (m.username && m.username.toLowerCase() === trimmed) ||
        (m.email && m.email.toLowerCase() === trimmed)
    );

    // If not yet loaded in local state, query Firestore directly
    if (!user && firebaseStatus === 'connected') {
      const remoteUser = await findUserInFirestore(trimmed);
      if (remoteUser) {
        user = remoteUser;
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

    setCurrentUser(user);
    setRole(user.role === 'admin' ? 'all' : user.role);
    addToast(`Welcome, ${user.name}! Logged in as ${user.role.toUpperCase()}.`, 'success', 'Login Successful');
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

  const loginAs = (member) => {
    setCurrentUser(member);
    setRole(member.role === 'admin' ? 'all' : member.role);
    addToast(`Signed in as ${member.name} (${member.title})`, 'success', 'Login Successful');
  };

  const logout = () => {
    setCurrentUser(null);
    addToast('You have been signed out.', 'info', 'Logged Out');
  };

  // Active Project & Features getter
  const activeProject =
    (projects && projects.find((p) => p.id === activeProjectId)) ||
    (projects && projects[0]) ||
    INITIAL_PROJECTS[0];

  // ONLY actual features belong in projectFeatures (NOT modules!)
  const projectFeatures = (features || [])
    .filter(
      (f) => f.projectId === (activeProject?.id || 'proj-erp') && !f.isMainModule && f.status !== 'module'
    )
    .sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number') {
        return a.order - b.order;
      }
      if (typeof a.order === 'number') return -1;
      if (typeof b.order === 'number') return 1;
      return 0;
    });

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
  // All bugs & suggestions linked to features in the active project
  const allFeatureDefects = [];
  projectFeatures.forEach((feat) => {
    (feat.bugs || []).forEach((bug) => {
      allFeatureDefects.push({
        ...bug,
        type: 'bug',
        featureId: feat.id,
        featureName: feat.name,
        featureCode: feat.code || feat.id,
        assignedDev: bug.assignedDev || feat.assignedDev,
        assignedQa: bug.reportedBy || feat.assignedQa,
        environment: feat.environment || 'staging'
      });
    });
    (feat.suggestions || []).forEach((sugg) => {
      allFeatureDefects.push({
        ...sugg,
        type: 'suggestion',
        severity: sugg.priority || 'Medium',
        featureId: feat.id,
        featureName: feat.name,
        featureCode: feat.code || feat.id,
        assignedDev: feat.assignedDev,
        assignedQa: sugg.submittedBy || feat.assignedQa,
        environment: feat.environment || 'staging'
      });
    });
  });

  // Project Actions
  const createProject = async (projectData) => {
    const code = projectData.code ? projectData.code.toUpperCase() : projectData.name.substring(0, 4).toUpperCase();
    const newProj = {
      id: 'proj-' + Date.now().toString(36),
      name: projectData.name,
      code,
      description: projectData.description || '',
      category: projectData.category || 'General Software',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProjects((prev) => [...prev, newProj]);
    setActiveProjectId(newProj.id);
    setIsCreateProjectModalOpen(false);
    if (firebaseStatus === 'connected') {
      await saveProjectToFirestore(newProj);
    }
    addToast(`Project "${newProj.name}" created!`, 'success', 'Project Declared');
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
  const openFeature = (featureOrId) => {
    const id = typeof featureOrId === 'object' ? featureOrId.id : featureOrId;
    setSelectedFeatureId(id);
  };

  const closeFeature = () => {
    setSelectedFeatureId(null);
  };

  const openCreateFeatureModal = (props = null) => {
    setCreateFeatureModalProps(props);
    setIsCreateFeatureModalOpen(true);
  };

  const createFeature = async (featData) => {
    const defaultDev = (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin';
    const defaultQa = (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin';
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
    const cleanCode = featData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'FEAT';
    const targetStatus = featData.status || 'in_dev';
    const colFeatures = projectFeatures.filter((f) => f.status === targetStatus);
    const maxOrder = colFeatures.reduce((max, f) => Math.max(max, f.order || 0), 0);
    const newFeature = {
      id: `FEAT-${nextCount}-${Date.now().toString(36).substring(2, 5)}`,
      projectId: activeProjectId,
      code: `${activeProject.code}-${cleanCode}`,
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
      devNotes: featData.devNotes || 'Started development of feature logic.',
      qaNotes: '',
      bugs: [],
      suggestions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setFeatures((prev) => [newFeature, ...prev]);
    setIsCreateFeatureModalOpen(false);
    setCreateFeatureModalProps(null);

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(newFeature);
    }

    addToast(`Feature "${newFeature.name}" created under ${newFeature.moduleName}!`, 'success', 'Feature Created');
    openFeature(newFeature.id);
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

    const updatedFeature = {
      ...feat,
      ...updatedData,
      moduleName: moduleName || 'General',
      updatedAt: new Date().toISOString()
    };

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
  const updateFeatureStatus = async (featureId, newStatus, metadata = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    if (newStatus === 'ready_for_qa') {
      addToast(
        `🚀 Feature "${feat.name}" deployed to Staging and marked Ready for QA!`,
        'success',
        'QA Retest Ready'
      );
    } else if (newStatus === 'verified') {
      // Check if any open blocker bugs exist
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
    } else {
      addToast(`Feature status updated to "${newStatus.replace(/_/g, ' ').toUpperCase()}"`, 'info');
    }

    const updatedFeature = {
      ...feat,
      status: newStatus,
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
      } else {
        const readable = targetStatus.replace(/_/g, ' ').toUpperCase();
        addToast(`Moved "${feat.name}" to ${readable}`, 'info', 'Status Updated');
      }
    }

    const updatedItem = {
      ...feat,
      status: targetStatus,
      updatedAt: new Date().toISOString()
    };

    let updatedProjectFeatures = [];

    setFeatures((prev) => {
      // 1. Separate current project's features from others
      const otherProjectFeatures = prev.filter(
        (f) => f.projectId !== feat.projectId || f.isMainModule
      );
      const currentProjFeatures = prev
        .filter((f) => f.projectId === feat.projectId && !f.isMainModule)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      // 2. Target column features without the dragged item
      const targetColFeatures = currentProjFeatures.filter(
        (f) => f.id !== featureId && f.status === targetStatus
      );

      // 3. Determine new order for the target column
      let newColOrder = [];
      if (!targetFeatureId || targetFeatureId === featureId) {
        newColOrder = [...targetColFeatures, updatedItem];
      } else {
        const targetIdx = targetColFeatures.findIndex((f) => f.id === targetFeatureId);
        if (targetIdx === -1) {
          newColOrder = [...targetColFeatures, updatedItem];
        } else {
          const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
          newColOrder = [...targetColFeatures];
          newColOrder.splice(insertIdx, 0, updatedItem);
        }
      }

      // 4. Other columns in this project
      const otherColsFeatures = currentProjFeatures.filter(
        (f) => f.id !== featureId && f.status !== targetStatus
      );

      // 5. Combine and normalize order values across the project
      const allThisProj = [...otherColsFeatures, ...newColOrder];
      const COL_KEYS = ['in_dev', 'ready_for_qa', 'in_qa', 'verified'];
      let finalThisProj = [];
      let baseOrder = 1000;

      for (const colKey of COL_KEYS) {
        const colFeats =
          colKey === targetStatus
            ? newColOrder
            : allThisProj
                .filter((f) => f.status === colKey)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        colFeats.forEach((f) => {
          finalThisProj.push({
            ...f,
            order: baseOrder
          });
          baseOrder += 1000;
        });
      }

      const remainingUnmapped = allThisProj.filter((f) => !COL_KEYS.includes(f.status));
      remainingUnmapped.forEach((f) => {
        finalThisProj.push({ ...f, order: baseOrder });
        baseOrder += 1000;
      });

      updatedProjectFeatures = finalThisProj;
      return [...otherProjectFeatures, ...finalThisProj];
    });

    if (firebaseStatus === 'connected') {
      await saveFeatureToFirestore(updatedItem);
      if (updatedProjectFeatures.length > 0) {
        saveFeaturesOrderToFirestore(updatedProjectFeatures);
      }
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

  // Add Bug directly to Feature (filed by QA during testing)
  const addBugToFeature = async (featureId, bugData) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    const bugCount = (feat.bugs || []).length + 1;
    const defaultDev = feat.assignedDev || (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin';
    const defaultQa = (currentUser && currentUser.id) || (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin';
    const newBug = {
      id: `BUG-${feat.code || 'FEAT'}-${bugCount}`,
      title: bugData.title,
      severity: bugData.severity || 'Medium',
      status: 'open',
      reportedBy: defaultQa,
      assignedDev: defaultDev,
      reproSteps: bugData.reproSteps || '',
      expectedResult: bugData.expectedResult || '',
      actualResult: bugData.actualResult || '',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updatedFeature = {
      ...feat,
      bugs: [newBug, ...(feat.bugs || [])],
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
  };

  // Update Feature Bug Status (Open -> In Dev -> Ready for Retest (Dev Fixed) -> Verified (QA Passed))
  const updateFeatureBugStatus = async (featureId, bugId, newStatus, extraData = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    if (newStatus === 'verified') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      addToast(`Defect [${bugId}] verified & passed by QA! 🎉`, 'verified');
    } else if (newStatus === 'ready_for_qa') {
      addToast(`Defect [${bugId}] marked Dev Fixed. Ready for QA retest!`, 'success');
    } else if (newStatus === 'qa_failed') {
      addToast(`Defect [${bugId}] marked QA Failed! Returned for rework.`, 'warning', 'QA Retest Failed');
    } else if (newStatus === 'in_dev') {
      addToast(`Defect [${bugId}] moved to In Development.`, 'info');
    } else if (newStatus === 'open') {
      addToast(`Defect [${bugId}] moved to Need Dev.`, 'info');
    }

    const updatedBugs = (feat.bugs || []).map((b) =>
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

    const suggCount = (feat.suggestions || []).length + 1;
    const author = (currentUser && currentUser.id) || (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin';
    const newSugg = {
      id: `SUGG-${feat.code || 'FEAT'}-${suggCount}`,
      title: suggData.title,
      priority: suggData.priority || 'Medium',
      status: 'open',
      submittedBy: author,
      notes: suggData.notes || '',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    const updatedFeature = {
      ...feat,
      suggestions: [newSugg, ...(feat.suggestions || [])],
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
  };

  const updateSuggestionStatus = async (featureId, suggId, newStatus, extraData = {}) => {
    const feat = features.find((f) => f.id === featureId);
    if (!feat) return;

    if (newStatus === 'verified' || newStatus === 'implemented') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      addToast(`Suggestion [${suggId}] verified and closed! 🎉`, 'verified');
    } else if (newStatus === 'ready_for_qa') {
      addToast(`Suggestion [${suggId}] marked Dev Implemented. Ready for QA retest!`, 'success');
    } else if (newStatus === 'qa_failed') {
      addToast(`Suggestion [${suggId}] marked QA Failed! Returned for rework.`, 'warning', 'QA Retest Failed');
    } else if (newStatus === 'in_dev') {
      addToast(`Suggestion [${suggId}] moved to In Development.`, 'info');
    } else if (newStatus === 'open') {
      addToast(`Suggestion [${suggId}] moved to Need Dev.`, 'info');
    }

    const updatedSuggs = (feat.suggestions || []).map((s) =>
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
      const newSuggestion = {
        id: itemId.startsWith('BUG-') ? itemId.replace('BUG-', 'SUGG-') : itemId,
        title: updatedData.title || existingBug.title || 'Untitled Suggestion',
        priority: updatedData.priority || updatedData.severity || existingBug.severity || 'Medium',
        notes: updatedData.notes || updatedData.reproSteps || existingBug.reproSteps || '',
        devNote: updatedData.devNote !== undefined ? updatedData.devNote : (existingBug.devNote || ''),
        status: updatedData.status || existingBug.status || 'open',
        reportedBy: existingBug.reportedBy || (currentUser && currentUser.id) || 'user-admin',
        createdAt: existingBug.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedSuggs = [newSuggestion, ...updatedSuggs];
    } else if (fromType === 'suggestion' && toType === 'bug') {
      const existingSugg = updatedSuggs.find((s) => s.id === itemId) || {};
      updatedSuggs = updatedSuggs.filter((s) => s.id !== itemId);
      const newBug = {
        id: itemId.startsWith('SUGG-') ? itemId.replace('SUGG-', 'BUG-') : itemId,
        title: updatedData.title || existingSugg.title || 'Untitled Defect',
        severity: updatedData.severity || updatedData.priority || existingSugg.priority || 'Medium',
        reproSteps: updatedData.reproSteps || updatedData.notes || existingSugg.notes || '',
        devNote: updatedData.devNote !== undefined ? updatedData.devNote : (existingSugg.devNote || ''),
        status: updatedData.status || existingSugg.status || 'open',
        reportedBy: existingSugg.reportedBy || (currentUser && currentUser.id) || 'user-admin',
        assignedDev: feat.assignedDev || (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin',
        createdAt: existingSugg.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedBugs = [newBug, ...updatedBugs];
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
    const defaultDev = (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin';
    const defaultQa = (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin';
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
      ? team.find((m) => m.role === 'developer')
      : team.find((m) => m.role === 'qa'));

    let updatedRelObj = null;

    setReleases((prev) =>
      prev.map((rel) => {
        if (rel.id !== releaseId) return rel;
        const newGateChecks = { ...rel.gateChecks };
        const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

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
        currentUser,
        isAuthenticated,
        login,
        loginAs,
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
