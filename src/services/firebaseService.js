import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { firestoreDb } from './firebase';

/**
 * Sanitizes object to remove undefined values before sending to Firestore.
 */
function cleanForFirestore(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = cleanForFirestore(val);
      }
    }
    return clean;
  }
  return obj;
}

// ----------------------------------------------------
// USERS COLLECTION
// ----------------------------------------------------

/**
 * Subscribes to real-time updates for team users in Firestore.
 * Automatically seeds the root Super Admin if collection is empty.
 */
export function subscribeUsers(onUsersUpdate, fallbackUsers = []) {
  if (!firestoreDb) return () => {};

  const usersCol = collection(firestoreDb, 'users');

  const unsubscribe = onSnapshot(
    usersCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackUsers.length > 0) {
        try {
          for (const user of fallbackUsers) {
            await setDoc(doc(firestoreDb, 'users', user.id), cleanForFirestore({
              ...user,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed users error:', err);
        }
        return;
      }

      const users = [];
      let hasAdmin = false;
      snapshot.forEach((docSnap) => {
        const u = { id: docSnap.id, ...docSnap.data() };
        if (u.id === 'user-admin' || u.role === 'admin') hasAdmin = true;
        users.push(u);
      });

      // Ensure root super admin always exists in Firestore
      if (!hasAdmin && fallbackUsers.length > 0) {
        const rootAdmin = fallbackUsers.find((u) => u.id === 'user-admin') || fallbackUsers[0];
        if (rootAdmin) {
          try {
            await setDoc(doc(firestoreDb, 'users', rootAdmin.id), cleanForFirestore({
              ...rootAdmin,
              updatedAt: new Date().toISOString()
            }));
          } catch (e) {
            console.warn('Failed ensuring root admin:', e);
          }
        }
      }

      onUsersUpdate(users);
    },
    (err) => {
      console.warn('Firestore users subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveUserToFirestore(user) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const userRef = doc(firestoreDb, 'users', user.id);
    await setDoc(userRef, cleanForFirestore({
      ...user,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveUserToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteUserFromFirestore(userId) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    await deleteDoc(doc(firestoreDb, 'users', userId));
    return { success: true };
  } catch (err) {
    console.error('deleteUserFromFirestore error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Searches Firestore for a user by username or email.
 */
export async function findUserInFirestore(usernameOrEmail) {
  if (!firestoreDb) return null;
  try {
    const usersCol = collection(firestoreDb, 'users');
    const snapshot = await getDocs(usersCol);
    let found = null;
    const lower = (usernameOrEmail || '').trim().toLowerCase();
    snapshot.forEach((docSnap) => {
      const u = { id: docSnap.id, ...docSnap.data() };
      if (
        (u.username && u.username.toLowerCase() === lower) ||
        (u.email && u.email.toLowerCase() === lower)
      ) {
        found = u;
      }
    });
    return found;
  } catch (err) {
    console.warn('findUserInFirestore error:', err);
    return null;
  }
}

// ----------------------------------------------------
// PROJECTS COLLECTION
// ----------------------------------------------------

export function subscribeProjects(onProjectsUpdate, fallbackProjects = []) {
  if (!firestoreDb) return () => {};

  const projectsCol = collection(firestoreDb, 'projects');

  const unsubscribe = onSnapshot(
    projectsCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackProjects.length > 0) {
        try {
          for (const project of fallbackProjects) {
            await setDoc(doc(firestoreDb, 'projects', project.id), cleanForFirestore({
              ...project,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed projects error:', err);
        }
        return;
      }

      const projects = [];
      snapshot.forEach((docSnap) => {
        projects.push({ id: docSnap.id, ...docSnap.data() });
      });

      onProjectsUpdate(projects);
    },
    (err) => {
      console.warn('Firestore projects subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveProjectToFirestore(project) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const projRef = doc(firestoreDb, 'projects', project.id);
    await setDoc(projRef, cleanForFirestore({
      ...project,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveProjectToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// FEATURES COLLECTION
// ----------------------------------------------------

export function subscribeFeatures(onFeaturesUpdate, fallbackFeatures = []) {
  if (!firestoreDb) return () => {};

  const featuresCol = collection(firestoreDb, 'features');

  const unsubscribe = onSnapshot(
    featuresCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackFeatures.length > 0) {
        try {
          for (const feature of fallbackFeatures) {
            await setDoc(doc(firestoreDb, 'features', feature.id), cleanForFirestore({
              ...feature,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed features error:', err);
        }
        return;
      }

      const features = [];
      snapshot.forEach((docSnap) => {
        features.push({ id: docSnap.id, ...docSnap.data() });
      });

      onFeaturesUpdate(features);
    },
    (err) => {
      console.warn('Firestore features subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveFeatureToFirestore(feature) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const featRef = doc(firestoreDb, 'features', feature.id);
    await setDoc(featRef, cleanForFirestore({
      ...feature,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveFeatureToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteFeatureFromFirestore(featureId) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    await deleteDoc(doc(firestoreDb, 'features', featureId));
    return { success: true };
  } catch (err) {
    console.error('deleteFeatureFromFirestore error:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// MODULES COLLECTION (Containers for Features, e.g. SETUP, Purchasing and inventory)
// ----------------------------------------------------

export function subscribeModules(onModulesUpdate, fallbackModules = []) {
  if (!firestoreDb) return () => {};

  const modulesCol = collection(firestoreDb, 'modules');

  const unsubscribe = onSnapshot(
    modulesCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackModules.length > 0) {
        try {
          for (const mod of fallbackModules) {
            await setDoc(doc(firestoreDb, 'modules', mod.id), cleanForFirestore({
              ...mod,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed modules error:', err);
        }
        return;
      }

      const modules = [];
      snapshot.forEach((docSnap) => {
        modules.push({ id: docSnap.id, ...docSnap.data() });
      });

      onModulesUpdate(modules);
    },
    (err) => {
      console.warn('Firestore modules subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveModuleToFirestore(mod) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const modRef = doc(firestoreDb, 'modules', mod.id);
    await setDoc(modRef, cleanForFirestore({
      ...mod,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveModuleToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteModuleFromFirestore(moduleId) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    await deleteDoc(doc(firestoreDb, 'modules', moduleId));
    return { success: true };
  } catch (err) {
    console.error('deleteModuleFromFirestore error:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// TICKETS (DEFECTS) COLLECTION
// ----------------------------------------------------

export function subscribeTickets(onTicketsUpdate, fallbackTickets = []) {
  if (!firestoreDb) return () => {};

  const ticketsCol = collection(firestoreDb, 'tickets');

  const unsubscribe = onSnapshot(
    ticketsCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackTickets.length > 0) {
        try {
          for (const ticket of fallbackTickets) {
            await setDoc(doc(firestoreDb, 'tickets', ticket.id), cleanForFirestore({
              ...ticket,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed tickets error:', err);
        }
        return;
      }

      const tickets = [];
      snapshot.forEach((docSnap) => {
        tickets.push({ id: docSnap.id, ...docSnap.data() });
      });

      onTicketsUpdate(tickets);
    },
    (err) => {
      console.warn('Firestore tickets subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveTicketToFirestore(ticket) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const ticketRef = doc(firestoreDb, 'tickets', ticket.id);
    await setDoc(ticketRef, cleanForFirestore({
      ...ticket,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveTicketToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteTicketFromFirestore(ticketId) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    await deleteDoc(doc(firestoreDb, 'tickets', ticketId));
    return { success: true };
  } catch (err) {
    console.error('deleteTicketFromFirestore error:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// RELEASES COLLECTION
// ----------------------------------------------------

export function subscribeReleases(onReleasesUpdate, fallbackReleases = []) {
  if (!firestoreDb) return () => {};

  const releasesCol = collection(firestoreDb, 'releases');

  const unsubscribe = onSnapshot(
    releasesCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackReleases.length > 0) {
        try {
          for (const release of fallbackReleases) {
            await setDoc(doc(firestoreDb, 'releases', release.id), cleanForFirestore({
              ...release,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed releases error:', err);
        }
        return;
      }

      const releases = [];
      snapshot.forEach((docSnap) => {
        releases.push({ id: docSnap.id, ...docSnap.data() });
      });

      onReleasesUpdate(releases);
    },
    (err) => {
      console.warn('Firestore releases subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveReleaseToFirestore(release) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const relRef = doc(firestoreDb, 'releases', release.id);
    await setDoc(relRef, cleanForFirestore({
      ...release,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveReleaseToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// TEST SUITES COLLECTION
// ----------------------------------------------------

export function subscribeTestSuites(onSuitesUpdate, fallbackSuites = []) {
  if (!firestoreDb) return () => {};

  const suitesCol = collection(firestoreDb, 'testSuites');

  const unsubscribe = onSnapshot(
    suitesCol,
    async (snapshot) => {
      if (snapshot.empty && fallbackSuites.length > 0) {
        try {
          for (const suite of fallbackSuites) {
            await setDoc(doc(firestoreDb, 'testSuites', suite.id), cleanForFirestore({
              ...suite,
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (err) {
          console.warn('Auto-seed testSuites error:', err);
        }
        return;
      }

      const suites = [];
      snapshot.forEach((docSnap) => {
        suites.push({ id: docSnap.id, ...docSnap.data() });
      });

      onSuitesUpdate(suites);
    },
    (err) => {
      console.warn('Firestore testSuites subscription error:', err);
    }
  );

  return unsubscribe;
}

export async function saveTestSuiteToFirestore(suite) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    const suiteRef = doc(firestoreDb, 'testSuites', suite.id);
    await setDoc(suiteRef, cleanForFirestore({
      ...suite,
      updatedAt: new Date().toISOString()
    }), { merge: true });
    return { success: true };
  } catch (err) {
    console.error('saveTestSuiteToFirestore error:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------
// BULK DATA SYNC
// ----------------------------------------------------

export async function seedAllDataToFirestore({ users = [], features = [], tickets = [], projects = [], releases = [], testSuites = [], modules = [] }) {
  if (!firestoreDb) return { success: false, error: 'Firebase is not connected' };

  try {
    for (const u of users) {
      await setDoc(doc(firestoreDb, 'users', u.id), cleanForFirestore(u), { merge: true });
    }
    for (const p of projects) {
      await setDoc(doc(firestoreDb, 'projects', p.id), cleanForFirestore(p), { merge: true });
    }
    for (const m of modules) {
      await setDoc(doc(firestoreDb, 'modules', m.id), cleanForFirestore(m), { merge: true });
    }
    for (const f of features) {
      await setDoc(doc(firestoreDb, 'features', f.id), cleanForFirestore(f), { merge: true });
    }
    for (const t of tickets) {
      await setDoc(doc(firestoreDb, 'tickets', t.id), cleanForFirestore(t), { merge: true });
    }
    for (const r of releases) {
      await setDoc(doc(firestoreDb, 'releases', r.id), cleanForFirestore(r), { merge: true });
    }
    for (const s of testSuites) {
      await setDoc(doc(firestoreDb, 'testSuites', s.id), cleanForFirestore(s), { merge: true });
    }
    return { success: true };
  } catch (err) {
    console.error('seedAllDataToFirestore error:', err);
    return { success: false, error: err.message };
  }
}
