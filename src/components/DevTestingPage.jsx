import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Lock, Search, X, Info, ChevronDown, Undo2, GripVertical } from 'lucide-react';
import { DEV_TEST_STAGES, getDevTestProgress } from '../utils/devTesting';
import { ROLES, hasRole } from '../utils/roles';

const FEATURE_STATUS = {
  backlog: 'In Pool',
  in_dev: 'In Development',
  ready_for_qa: 'Ready for Retest',
  in_qa: 'QA Verification',
  verified: 'Closed'
};

const shortDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

function StageCell({ feature, stage, index, progress, canEdit, onPass, onUndo }) {
  const check = feature.devChecks?.[stage.id];
  const done = !!check?.done && index < progress.passed;
  const isNext = index === progress.passed;
  const isLastDone = done && index === progress.passed - 1;

  if (done) {
    return (
      <td className="dt-cell">
        <div className="dt-cell-inner done" title={`${stage.label} passed${check.byName ? ` by ${check.byName}` : ''} · ${shortDate(check.at)}`}>
          <span className="dt-ok">
            <Check size={13} />
          </span>
          {canEdit && isLastDone && (
            <button type="button" className="dt-undo" onClick={() => onUndo(stage)} title="Undo this stage">
              <Undo2 size={11} />
            </button>
          )}
        </div>
      </td>
    );
  }

  if (isNext) {
    return (
      <td className="dt-cell">
        {canEdit ? (
          <button type="button" className="dt-pass" onClick={() => onPass(stage)} title={`Mark "${stage.label}" as passed\n${stage.hint}`}>
            OK
          </button>
        ) : (
          <span className="dt-pending" title={`Waiting: ${stage.label}`}>
            •
          </span>
        )}
      </td>
    );
  }

  return (
    <td className="dt-cell">
      <span className="dt-locked" title={`Pass "${DEV_TEST_STAGES[progress.passed]?.label}" first`}>
        <Lock size={11} />
      </span>
    </td>
  );
}

export default function DevTestingPage({ moduleName: activeModule = '' }) {
  const {
    projectFeatures = [],
    team = [],
    currentUser,
    setDevCheck,
    reorderDevTesting,
    openFeature,
    openCreateFeatureModal
  } = useApp();

  const canEdit = hasRole(currentUser, ROLES.DEVELOPER);
  const me = currentUser?.id;

  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showPool, setShowPool] = useState(true);
  // drag & drop reordering
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { id, position: 'before' | 'after' }
  const [progressFilter, setProgressFilter] = useState('all'); // all | not_started | in_progress | complete
  const [showGuide, setShowGuide] = useState(false);

  const inModule = (f) => (f.moduleName || 'General').trim().toLowerCase() === activeModule.toLowerCase();

  // Working order: the order the team decided (drag & drop), otherwise creation order.
  // Passing a stage never moves a row.
  const byDevOrder = (a, b) => {
    const oa = typeof a.devOrder === 'number' ? a.devOrder : null;
    const ob = typeof b.devOrder === 'number' ? b.devOrder : null;
    if (oa !== null && ob !== null && oa !== ob) return oa - ob;
    if (oa !== null && ob === null) return -1;
    if (oa === null && ob !== null) return 1;
    return (a.createdAt || '').localeCompare(b.createdAt || '') || (a.name || '').localeCompare(b.name || '');
  };
  const orderedModuleFeatures = projectFeatures.filter(inModule).sort(byDevOrder);
  const positionOf = new Map(orderedModuleFeatures.map((f, i) => [f.id, i + 1]));
  const moduleFeatures = orderedModuleFeatures.filter((f) => showPool || f.status !== 'backlog');
  const q = search.trim().toLowerCase();
  const rows = moduleFeatures
    .filter((f) => !onlyMine || f.assignedDev === me)
    .filter((f) => !q || [f.name, f.code].some((v) => (v || '').toLowerCase().includes(q)))
    .map((f) => ({ feature: f, progress: getDevTestProgress(f) }))
    .filter(({ progress }) => {
      if (progressFilter === 'not_started') return progress.passed === 0;
      if (progressFilter === 'in_progress') return progress.passed > 0 && !progress.complete;
      if (progressFilter === 'complete') return progress.complete;
      return true;
    });

  const moduleProgress = (() => {
    const list = moduleFeatures.map(getDevTestProgress);
    const total = list.length * DEV_TEST_STAGES.length;
    const passed = list.reduce((sum, p) => sum + p.passed, 0);
    return {
      pct: total ? Math.round((passed / total) * 100) : 0,
      complete: list.filter((p) => p.complete).length,
      features: list.length
    };
  })();

  // Per-stage completion across the module (for the header)
  const stageCounts = DEV_TEST_STAGES.map((_, i) => moduleFeatures.filter((f) => getDevTestProgress(f).passed > i).length);

  const pass = (feature, stage) => setDevCheck(feature.id, stage.id, true);

  // ----- drag & drop: reorder within the whole module (works with filters on too) -----
  const handleRowDragOver = (e, targetId) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetId === dragId) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (dropTarget?.id !== targetId || dropTarget?.position !== position) setDropTarget({ id: targetId, position });
  };
  const handleRowDrop = (e) => {
    e.preventDefault();
    const target = dropTarget;
    const moving = dragId;
    setDragId(null);
    setDropTarget(null);
    if (!moving || !target || target.id === moving) return;
    const ids = orderedModuleFeatures.map((f) => f.id).filter((id) => id !== moving);
    const at = ids.indexOf(target.id);
    if (at === -1) return;
    ids.splice(target.position === 'before' ? at : at + 1, 0, moving);
    reorderDevTesting(ids);
  };
  const moveBy = (featureId, delta) => {
    const ids = orderedModuleFeatures.map((f) => f.id);
    const i = ids.indexOf(featureId);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderDevTesting(ids);
  };
  const undo = (feature, stage) => {
    if (window.confirm(`Undo "${stage.label}" for "${feature.name}"?`)) setDevCheck(feature.id, stage.id, false);
  };

  return (
    <div className="dt-page">
      {showGuide && (
        <div className="dt-guide">
          {DEV_TEST_STAGES.map((s, i) => (
            <div key={s.id} className="dt-guide-item">
              <span className="dt-guide-num">{i + 1}</span>
              <div>
                <strong>{s.label}</strong>
                <p>{s.hint}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeModule && (
        <div className="pf-card dt-card">
          {/* Module summary + filters */}
          <div className="dt-summary">
            <div className="dt-summary-main">
              <span className="dt-summary-name">{activeModule}</span>
              <span className="pf-note">
                {moduleProgress.complete}/{moduleProgress.features} features fully dev-tested · {moduleProgress.pct}%
              </span>
              <div className="feat-card-bar" style={{ maxWidth: 320 }}>
                <div className={`feat-card-bar-fill ${moduleProgress.pct === 100 ? 'tone-done' : ''}`} style={{ width: `${moduleProgress.pct}%` }} />
              </div>
            </div>
            <div className="dt-filters">
              <div className="fi-search">
                <Search size={12} />
                <input className="form-input" placeholder="Search features…" value={search} onChange={(e) => setSearch(e.target.value)} />
                {search && (
                  <button type="button" onClick={() => setSearch('')} title="Clear">
                    <X size={12} />
                  </button>
                )}
              </div>
              <select className="form-select" value={progressFilter} onChange={(e) => setProgressFilter(e.target.value)}>
                <option value="all">All progress</option>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="complete">Complete</option>
              </select>
              {canEdit && (
                <label className="pp-toggle">
                  <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                  <span>My features</span>
                </label>
              )}
              <label className="pp-toggle">
                <input type="checkbox" checked={showPool} onChange={(e) => setShowPool(e.target.checked)} />
                <span>Include pool</span>
              </label>
              <button
                type="button"
                className={`fb-btn dt-guide-btn ${showGuide ? 'on' : ''}`}
                onClick={() => setShowGuide((v) => !v)}
                title="What each stage means"
              >
                <Info size={13} />
                <span>Stages</span>
                <ChevronDown size={12} style={{ transform: showGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="fi-empty">
              {moduleFeatures.length === 0 ? (
                <>
                  No features in this module yet.{' '}
                  <button
                    type="button"
                    className="dt-link"
                    onClick={() => openCreateFeatureModal({ defaultModuleName: activeModule })}
                  >
                    Add the first feature
                  </button>
                </>
              ) : (
                'No features match these filters.'
              )}
            </div>
          ) : (
            <div className="dt-table-wrap">
              <table className="dt-table">
                <thead>
                  <tr>
                    <th className="dt-num-col" title="Development order — drag rows to change">#</th>
                    <th className="dt-feature-col">Feature</th>
                    {DEV_TEST_STAGES.map((s, i) => (
                      <th key={s.id} className="dt-stage-col" title={s.hint}>
                        <span className="dt-stage-num">{i + 1}</span>
                        <span className="dt-stage-name">{s.short}</span>
                        <span className="dt-stage-count">
                          {stageCounts[i]}/{moduleFeatures.length}
                        </span>
                      </th>
                    ))}
                    <th className="dt-progress-col">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ feature: f, progress }) => {
                    const dev = team.find((u) => u.id === f.assignedDev);
                    const pos = positionOf.get(f.id);
                    const dropCls = dropTarget?.id === f.id ? `drop-${dropTarget.position}` : '';
                    return (
                      <tr
                        key={f.id}
                        className={`${progress.complete ? 'is-complete' : ''} ${dragId === f.id ? 'is-dragging' : ''} ${dropCls}`}
                        draggable
                        onDragStart={(e) => {
                          setDragId(f.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', f.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropTarget(null);
                        }}
                        onDragOver={(e) => handleRowDragOver(e, f.id)}
                        onDrop={handleRowDrop}
                      >
                        <td className="dt-num-col">
                          <div className="dt-order">
                            <span className="dt-grip" title="Drag to change the development order">
                              <GripVertical size={13} />
                            </span>
                            <span className="dt-num">{pos}</span>
                            <span className="dt-order-btns">
                              <button type="button" onClick={() => moveBy(f.id, -1)} disabled={pos === 1} title="Move up" aria-label="Move up">
                                ▲
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBy(f.id, 1)}
                                disabled={pos === orderedModuleFeatures.length}
                                title="Move down"
                                aria-label="Move down"
                              >
                                ▼
                              </button>
                            </span>
                          </div>
                        </td>
                        <td className="dt-feature-col">
                          <button type="button" className="dt-feature" onClick={() => openFeature(f.id)} title="Open feature">
                            <span className="dt-feature-name">{f.name}</span>
                            <span className="dt-feature-meta">
                              <span className="fd-code">{f.code}</span>
                              <span className={`pp-status st-${f.status}`}>{FEATURE_STATUS[f.status] || f.status}</span>
                              {dev && (
                                <span className="dt-dev" title={`Dev: ${dev.name}`}>
                                  <span className="user-avatar-small" style={{ background: dev.color }}>
                                    {dev.initials}
                                  </span>
                                  {dev.name.split(' ')[0]}
                                </span>
                              )}
                            </span>
                          </button>
                        </td>
                        {DEV_TEST_STAGES.map((s, i) => (
                          <StageCell
                            key={s.id}
                            feature={f}
                            stage={s}
                            index={i}
                            progress={progress}
                            canEdit={canEdit}
                            onPass={(st) => pass(f, st)}
                            onUndo={(st) => undo(f, st)}
                          />
                        ))}
                        <td className="dt-progress-col">
                          <div className="dt-progress">
                            <div className="feat-card-bar">
                              <div className={`feat-card-bar-fill ${progress.complete ? 'tone-done' : ''}`} style={{ width: `${progress.pct}%` }} />
                            </div>
                            <span className="dt-progress-text">
                              {progress.complete ? 'Done' : `${progress.passed}/${progress.total}`}
                            </span>
                          </div>
                          {!progress.complete && progress.next && (
                            <span className="dt-next" title={progress.next.hint}>
                              Next: {progress.next.short}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
