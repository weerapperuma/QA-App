import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClipboardCheck, Bug, FolderPlus, Plus } from 'lucide-react';
import DevTestingPage from './DevTestingPage';
import DefectsListView from './DefectsListView';
import TestingOverview from './TestingOverview';
import { TESTING_TAB_IDS, LAST_TESTING_KEY, DEFAULT_TESTING_TAB } from '../utils/testingTabs';

// One "Testing" page with two sections. Each section keeps its own tab id
// ('devtesting' | 'board') so existing links (notifications, buttons) still work.
const TESTING_SECTIONS = [
  { id: 'devtesting', label: 'Dev Testing', icon: ClipboardCheck },
  { id: 'board', label: 'Defects & Suggestions', icon: Bug }
];
const MODULE_KEY = 'devbridge_testing_module';

export default function TestingPage({ section, hideSectionNav = false }) {
  const {
    setActiveTab,
    currentUser,
    projectFeatures = [],
    allModuleNames = [],
    featureBoardModuleFilter,
    setIsCreateModuleModalOpen,
    openCreateFeatureModal
  } = useApp();
  const myRoles = Array.isArray(currentUser?.roles)
    ? currentUser.roles
    : currentUser?.role
    ? [currentUser.role]
    : [];
  const isQaOnly = myRoles.includes('QA') && !myRoles.includes('DEV') && !myRoles.includes('ADMIN');
  const visibleSections = isQaOnly ? TESTING_SECTIONS.filter((s) => s.id !== 'devtesting') : TESTING_SECTIONS;
  const rawCurrent = section === 'testoverview'
    ? 'testoverview'
    : (TESTING_TAB_IDS.includes(section) ? section : DEFAULT_TESTING_TAB);
  const current = isQaOnly && rawCurrent === 'devtesting' ? 'board' : rawCurrent;
  const showModuleBar = current !== 'board'; // Defects & Suggestions has its own filters

  // Remember the last section so the "Testing" nav button reopens it
  useEffect(() => {
    try {
      localStorage.setItem(LAST_TESTING_KEY, current);
    } catch {
      // ignore
    }
  }, [current]);

  // One module selection shared by the Features and Dev Testing sections
  const modules = useMemo(
    () =>
      Array.from(new Set([...allModuleNames, ...projectFeatures.map((f) => (f.moduleName || 'General').trim())])).filter(Boolean),
    [allModuleNames, projectFeatures]
  );
  const [moduleName, setModuleName] = useState(() => {
    try {
      return localStorage.getItem(MODULE_KEY) || featureBoardModuleFilter || '';
    } catch {
      return featureBoardModuleFilter || '';
    }
  });
  const activeModule = modules.find((m) => m.toLowerCase() === String(moduleName || '').toLowerCase()) || modules[0] || '';
  const pickModule = (m) => {
    setModuleName(m);
    try {
      localStorage.setItem(MODULE_KEY, m);
    } catch {
      // ignore
    }
  };
  const featureCount = (m) => projectFeatures.filter((f) => (f.moduleName || 'General').trim().toLowerCase() === m.toLowerCase()).length;


  return (
    <div className="testing-page">
      {/* Full-width bar: sections + add buttons */}
      {!hideSectionNav && (
        <div className="testing-bar">
          <nav className="testing-nav" aria-label="Testing sections">
            {visibleSections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`testing-nav-btn ${current === s.id ? 'active' : ''} sec-${s.id}`}
                  onClick={() => setActiveTab(s.id)}
                  aria-current={current === s.id ? 'page' : undefined}
                >
                  <Icon size={15} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="testing-actions">
            <button type="button" className="fb-btn" onClick={() => setIsCreateModuleModalOpen(true)} title="Add or manage modules">
              <FolderPlus size={14} />
              <span>Module</span>
            </button>
            <button
              type="button"
              className="fb-btn fb-btn-primary"
              onClick={() => openCreateFeatureModal(activeModule ? { defaultModuleName: activeModule } : undefined)}
              title={activeModule ? `Add a feature to ${activeModule}` : 'Add a feature'}
            >
              <Plus size={14} />
              <span>Feature</span>
            </button>
          </div>
        </div>
      )}

      {/* Simple module bar */}
      {showModuleBar && (
        <div className="testing-modules" role="tablist" aria-label="Modules">
          {modules.length === 0 ? (
            <span className="pf-note">No modules yet — add one with the Module button.</span>
          ) : (
            modules.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={m === activeModule}
                className={`testing-module ${m === activeModule ? 'active' : ''}`}
                onClick={() => pickModule(m)}
              >
                <span>{m}</span>
                <span className="testing-module-count">{featureCount(m)}</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="testing-body">
        {current === 'testoverview' && <TestingOverview moduleName={activeModule} />}
        {current === 'devtesting' && <DevTestingPage moduleName={activeModule} />}
        {current === 'board' && <DefectsListView />}
      </div>
    </div>
  );
}
