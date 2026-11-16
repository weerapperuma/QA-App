import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Check, CheckCircle2, Search, X, ClipboardCheck, ShieldCheck, Bug, Lightbulb, ChevronRight, Clock, Calendar, AlertTriangle, Edit2, GripVertical } from 'lucide-react';
import { getDevTestProgress } from '../utils/devTesting';
import { getFeatureTimelineStatus } from '../utils/timeline';

const STAGE_LABEL = {
  backlog: 'In Pool',
  in_dev: 'In Development',
  ready_for_qa: 'Ready for Retest',
  in_qa: 'QA Verification',
  verified: 'Closed'
};
const PASSED = ['verified', 'implemented', 'qa_passed', 'qa passed', 'closed'];
const isPassed = (st) => PASSED.includes((st || '').toLowerCase().trim());

// Same working order as the Dev Testing page (devOrder, then creation order)
const byDevOrder = (a, b) => {
  const oa = typeof a.devOrder === 'number' ? a.devOrder : null;
  const ob = typeof b.devOrder === 'number' ? b.devOrder : null;
  if (oa !== null && ob !== null && oa !== ob) return oa - ob;
  if (oa !== null && ob === null) return -1;
  if (oa === null && ob !== null) return 1;
  return (a.createdAt || '').localeCompare(b.createdAt || '') || (a.name || '').localeCompare(b.name || '');
};

const qaInfo = (f) => {
  const items = [...(f.bugs || []), ...(f.suggestions || [])];
  const passed = items.filter((i) => isPassed(i.status)).length;
  return {
    done: f.status === 'verified',
    passed,
    total: items.length,
    openBugs: (f.bugs || []).filter((b) => !isPassed(b.status)).length,
    openSuggs: (f.suggestions || []).filter((s) => !isPassed(s.status)).length
  };
};

// Testing › Features: one row per feature with two status columns —
// Dev Testing (done when every developer stage passed) and QA Testing (done when QA closes the feature).
export default function TestingOverview({ moduleName: activeModule = '' }) {
  const { projectFeatures = [], team = [], openFeature, setActiveTab, updateFeature, reorderDevTesting } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | dev_pending | qa_pending | done | expiring
  const [showPool, setShowPool] = useState(true);
  const [editingTimeline, setEditingTimeline] = useState(null); // { id, name, estimatedHours, startDate, dueDate }
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [dragId, setDragId] = useState(null);
  const dragIdRef = useRef(null);
  const [dropTarget, setDropTarget] = useState(null); // { id, position: 'before' | 'after' }

  const inModule = (f, m) => (f.moduleName || 'General').trim().toLowerCase() === (m || '').toLowerCase();

  const ordered = projectFeatures.filter((f) => inModule(f, activeModule)).sort(byDevOrder);
  const positionOf = new Map(ordered.map((f, i) => [f.id, i + 1]));
  const moduleRows = ordered
    .filter((f) => showPool || f.status !== 'backlog')
    .map((f) => ({
      feature: f,
      dev: getDevTestProgress(f),
      qa: qaInfo(f),
      timeline: getFeatureTimelineStatus(f)
    }));

  const q = search.trim().toLowerCase();
  const rows = moduleRows
    .filter(({ feature: f }) => !q || [f.name, f.code].some((v) => (v || '').toLowerCase().includes(q)))
    .filter(({ dev, qa, timeline }) => {
      if (filter === 'dev_pending') return !dev.complete;
      if (filter === 'qa_pending') return !qa.done;
      if (filter === 'done') return dev.complete && qa.done;
      if (filter === 'expiring') return timeline.status === 'overdue' || timeline.status === 'due_soon';
      return true;
    });

  const devDone = moduleRows.filter((r) => r.dev.complete).length;
  const qaDone = moduleRows.filter((r) => r.qa.done).length;
  const bothDone = moduleRows.filter((r) => r.dev.complete && r.qa.done).length;
  const total = moduleRows.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const totalHours = moduleRows.reduce((sum, r) => sum + (r.timeline.estimatedHours || 0), 0);
  const closedHours = moduleRows.reduce((sum, r) => sum + (r.qa.done ? (r.timeline.estimatedHours || 0) : 0), 0);
  const hoursPct = totalHours > 0 ? Math.round((closedHours / totalHours) * 100) : 0;
  const overdueCount = moduleRows.filter((r) => r.timeline.status === 'overdue').length;
  const dueSoonCount = moduleRows.filter((r) => r.timeline.status === 'due_soon').length;

  const openTimelineEditor = (f) => {
    setEditingTimeline({
      id: f.id,
      name: f.name,
      estimatedHours: f.estimatedHours ? String(f.estimatedHours) : '',
      startDate: f.startDate || '',
      dueDate: f.dueDate || ''
    });
  };

  const handleSaveTimeline = async (e) => {
    e.preventDefault();
    if (!editingTimeline || savingTimeline) return;
    setSavingTimeline(true);
    const parsedHours = parseFloat(editingTimeline.estimatedHours);
    await updateFeature(editingTimeline.id, {
      estimatedHours: Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : null,
      startDate: editingTimeline.startDate || '',
      dueDate: editingTimeline.dueDate || ''
    });
    setSavingTimeline(false);
    setEditingTimeline(null);
  };

  // Drag & drop reordering (persists to devOrder via reorderDevTesting)
  const handleRowDragOver = (e, targetId) => {
    e.preventDefault();
    const activeDrag = dragIdRef.current || dragId;
    if (!activeDrag) return;
    e.dataTransfer.dropEffect = 'move';
    if (targetId === activeDrag) {
      if (dropTarget) setDropTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (dropTarget?.id !== targetId || dropTarget?.position !== position) {
      setDropTarget({ id: targetId, position });
    }
  };

  const handleRowDrop = (e, fallbackTargetId) => {
    e.preventDefault();
    const moving = dragIdRef.current || dragId || e.dataTransfer.getData('text/plain');
    const target = dropTarget || (fallbackTargetId ? { id: fallbackTargetId, position: 'after' } : null);
    dragIdRef.current = null;
    setDragId(null);
    setDropTarget(null);
    if (!moving || !target || target.id === moving) return;
    const ids = ordered.map((f) => f.id).filter((id) => id !== moving);
    const at = ids.indexOf(target.id);
    if (at === -1) return;
    ids.splice(target.position === 'before' ? at : at + 1, 0, moving);
    reorderDevTesting(ids);
  };

  const moveBy = (featureId, delta) => {
    const ids = ordered.map((f) => f.id);
    const i = ids.indexOf(featureId);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderDevTesting(ids);
  };

  return (
    <div className="dt-page">
      {activeModule && (
        <div className="pf-card dt-card">
          <div className="dt-summary">
            <div className="to-summary">
              <div className="to-sum-item">
                <span className="to-sum-label">
                  <ClipboardCheck size={12} /> Dev Testing
                </span>
                <strong>
                  {devDone}/{total}
                </strong>
                <div className="feat-card-bar">
                  <div className={`feat-card-bar-fill ${devDone === total && total ? 'tone-done' : ''}`} style={{ width: `${pct(devDone)}%` }} />
                </div>
              </div>
              <div className="to-sum-item">
                <span className="to-sum-label">
                  <ShieldCheck size={12} /> QA Testing
                </span>
                <strong>
                  {qaDone}/{total}
                </strong>
                <div className="feat-card-bar">
                  <div className={`feat-card-bar-fill ${qaDone === total && total ? 'tone-done' : ''}`} style={{ width: `${pct(qaDone)}%` }} />
                </div>
              </div>
              <div className="to-sum-item">
                <span className="to-sum-label">
                  <Check size={12} /> Fully tested
                </span>
                <strong>
                  {bothDone}/{total}
                </strong>
                <div className="feat-card-bar">
                  <div className={`feat-card-bar-fill tone-done`} style={{ width: `${pct(bothDone)}%` }} />
                </div>
              </div>
              <div className="to-sum-item">
                <span className="to-sum-label">
                  <Clock size={12} /> Timeline Hours
                </span>
                <strong>
                  {closedHours}/{totalHours}h
                  {(overdueCount > 0 || dueSoonCount > 0) && (
                    <span style={{ fontSize: '0.68rem', marginLeft: '6px', color: overdueCount > 0 ? 'var(--status-critical)' : '#eab308', fontWeight: 700 }}>
                      {overdueCount > 0 ? `${overdueCount} expired` : `${dueSoonCount} due soon`}
                    </span>
                  )}
                </strong>
                <div className="feat-card-bar">
                  <div
                    className={`feat-card-bar-fill ${overdueCount > 0 ? '' : hoursPct === 100 && totalHours > 0 ? 'tone-done' : ''}`}
                    style={{
                      width: `${hoursPct}%`,
                      background: overdueCount > 0 ? 'var(--status-critical)' : undefined
                    }}
                  />
                </div>
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
              <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All features</option>
                <option value="expiring">Expiring / Overdue</option>
                <option value="dev_pending">Dev testing pending</option>
                <option value="qa_pending">QA testing pending</option>
                <option value="done">Fully tested</option>
              </select>
              <label className="pp-toggle">
                <input type="checkbox" checked={showPool} onChange={(e) => setShowPool(e.target.checked)} />
                <span>Include pool</span>
              </label>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="fi-empty">{moduleRows.length === 0 ? 'No features in this module yet.' : 'No features match these filters.'}</div>
          ) : (
            <div className="dt-table-wrap">
              <table className="dt-table to-table">
                <thead>
                  <tr>
                    <th className="dt-num-col" title="Development order (change it on the Dev Testing tab)">
                      #
                    </th>
                    <th className="dt-feature-col">Feature</th>
                    <th className="to-col">
                      <Clock size={12} /> Timeline
                    </th>
                    <th className="to-col">
                      <ClipboardCheck size={12} /> Dev Testing
                    </th>
                    <th className="to-col">
                      <ShieldCheck size={12} /> QA Testing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ feature: f, dev, qa, timeline }) => {
                    const devUser = team.find((u) => u.id === f.assignedDev);
                    const qaUser = team.find((u) => u.id === f.assignedQa);
                    const tlColor =
                      timeline.status === 'overdue'
                        ? 'var(--status-critical)'
                        : timeline.status === 'due_soon'
                        ? '#eab308'
                        : timeline.status === 'closed'
                        ? 'var(--accent-qa)'
                        : 'var(--accent-dev)';
                    const tlBg =
                      timeline.status === 'overdue'
                        ? 'rgba(239, 68, 68, 0.12)'
                        : timeline.status === 'due_soon'
                        ? 'rgba(234, 179, 8, 0.12)'
                        : timeline.status === 'closed'
                        ? 'var(--accent-qa-subtle)'
                        : 'var(--bg-surface)';

                    const pos = positionOf.get(f.id);
                    const dropCls = dropTarget?.id === f.id ? `drop-${dropTarget.position}` : '';

                    return (
                      <tr
                        key={f.id}
                        className={`${dev.complete && qa.done ? 'is-complete' : ''} ${dragId === f.id ? 'is-dragging' : ''} ${dropCls}`}
                        draggable
                        onDragStart={(e) => {
                          dragIdRef.current = f.id;
                          setDragId(f.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', f.id);
                        }}
                        onDragEnd={() => {
                          dragIdRef.current = null;
                          setDragId(null);
                          setDropTarget(null);
                        }}
                        onDragEnter={(e) => e.preventDefault()}
                        onDragOver={(e) => handleRowDragOver(e, f.id)}
                        onDrop={(e) => handleRowDrop(e, f.id)}
                      >
                        <td className="dt-num-col">
                          <div className="dt-order">
                            <span className="dt-grip" title="Drag to reorder features">
                              <GripVertical size={13} />
                            </span>
                            <span className="dt-num">{pos}</span>
                            <span className="dt-order-btns">
                              <button type="button" onClick={() => moveBy(f.id, -1)} disabled={pos === 1} title="Move up" aria-label="Move up">
                                ▲
                              </button>
                              <button type="button" onClick={() => moveBy(f.id, 1)} disabled={pos === ordered.length} title="Move down" aria-label="Move down">
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
                              <span className={`pp-status st-${f.status}`}>{STAGE_LABEL[f.status] || f.status}</span>
                            </span>
                          </button>
                        </td>

                        {/* Timeline (Hours & Due Date) */}
                        <td className="to-col">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {timeline.estimatedHours > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    color: 'var(--text-primary)'
                                  }}
                                >
                                  {timeline.estimatedHours}h
                                </span>
                              )}
                              {timeline.dueDate && (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    background: tlBg,
                                    color: tlColor,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  {timeline.status === 'overdue' && <AlertTriangle size={10} />}
                                  {timeline.label}
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => openTimelineEditor(f)}
                                title={timeline.hasTimeline ? 'Edit timeline (hours & dates)' : 'Add timeline (hours & dates)'}
                                style={{ width: '20px', height: '20px', padding: 0, opacity: 0.75 }}
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                            {timeline.shortDateRange ? (
                              <span className="to-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Calendar size={10} /> {timeline.shortDateRange}
                              </span>
                            ) : !timeline.hasTimeline ? (
                              <button
                                type="button"
                                onClick={() => openTimelineEditor(f)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  fontSize: '0.72rem',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                              >
                                + Set hours & date
                              </button>
                            ) : null}
                          </div>
                        </td>

                        {/* Dev Testing */}
                        <td className="to-col">
                          {dev.complete ? (
                            <span className="to-done" title="Dev Testing Completed">
                              <CheckCircle2 size={15} /> Completed
                            </span>
                          ) : (
                            <span className="to-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Pending
                            </span>
                          )}
                          {devUser && <span className="to-person">{devUser.name.split(' ')[0]}</span>}
                        </td>

                        {/* QA Testing (auto) */}
                        <td className="to-col">
                          {qa.done ? (
                            <span className="to-done" title="QA Testing Completed">
                              <CheckCircle2 size={15} /> Completed
                            </span>
                          ) : (
                            <div className="to-qa">
                              <span className={`to-qa-stage st-${f.status}`}>{STAGE_LABEL[f.status] || f.status}</span>
                              {qa.total > 0 && (
                                <span className="to-sub">
                                  {qa.openBugs > 0 && (
                                    <>
                                      <Bug size={10} /> {qa.openBugs} open{' '}
                                    </>
                                  )}
                                  {qa.openSuggs > 0 && (
                                    <>
                                      <Lightbulb size={10} /> {qa.openSuggs} open{' '}
                                    </>
                                  )}
                                  · {qa.passed}/{qa.total} passed
                                </span>
                              )}
                            </div>
                          )}
                          {qaUser && <span className="to-person">{qaUser.name.split(' ')[0]}</span>}
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
      {editingTimeline && (
        <div className="modal-overlay" onClick={() => setEditingTimeline(null)}>
          <div className="modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontWeight: 800, fontSize: '1rem', display: 'block' }}>Feature Timeline</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{editingTimeline.name}</span>
              </div>
              <button type="button" className="btn-icon" onClick={() => setEditingTimeline(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveTimeline}>
              <div className="modal-body single-col" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 5"
                    value={editingTimeline.estimatedHours}
                    onChange={(e) => setEditingTimeline((prev) => ({ ...prev, estimatedHours: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="responsive-form-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingTimeline.startDate}
                      onChange={(e) => setEditingTimeline((prev) => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Target / Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={editingTimeline.dueDate}
                      onChange={(e) => setEditingTimeline((prev) => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTimeline(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingTimeline}>
                  {savingTimeline ? 'Saving…' : 'Save Timeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
