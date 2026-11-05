import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Search, X, ClipboardCheck, ShieldCheck, Bug, Lightbulb, ChevronRight } from 'lucide-react';
import { getDevTestProgress } from '../utils/devTesting';

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
  const { projectFeatures = [], team = [], openFeature, setActiveTab } = useApp();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | dev_pending | qa_pending | done
  const [showPool, setShowPool] = useState(true);

  const inModule = (f, m) => (f.moduleName || 'General').trim().toLowerCase() === (m || '').toLowerCase();

  const ordered = projectFeatures.filter((f) => inModule(f, activeModule)).sort(byDevOrder);
  const positionOf = new Map(ordered.map((f, i) => [f.id, i + 1]));
  const moduleRows = ordered
    .filter((f) => showPool || f.status !== 'backlog')
    .map((f) => ({ feature: f, dev: getDevTestProgress(f), qa: qaInfo(f) }));

  const q = search.trim().toLowerCase();
  const rows = moduleRows
    .filter(({ feature: f }) => !q || [f.name, f.code].some((v) => (v || '').toLowerCase().includes(q)))
    .filter(({ dev, qa }) => {
      if (filter === 'dev_pending') return !dev.complete;
      if (filter === 'qa_pending') return !qa.done;
      if (filter === 'done') return dev.complete && qa.done;
      return true;
    });

  const devDone = moduleRows.filter((r) => r.dev.complete).length;
  const qaDone = moduleRows.filter((r) => r.qa.done).length;
  const bothDone = moduleRows.filter((r) => r.dev.complete && r.qa.done).length;
  const total = moduleRows.length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

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
                  <div className="feat-card-bar-fill tone-done" style={{ width: `${pct(bothDone)}%` }} />
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
                      <ClipboardCheck size={12} /> Dev Testing
                    </th>
                    <th className="to-col">
                      <ShieldCheck size={12} /> QA Testing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ feature: f, dev, qa }) => {
                    const devUser = team.find((u) => u.id === f.assignedDev);
                    const qaUser = team.find((u) => u.id === f.assignedQa);
                    return (
                      <tr key={f.id} className={dev.complete && qa.done ? 'is-complete' : ''}>
                        <td className="dt-num-col">
                          <span className="dt-num">{positionOf.get(f.id)}</span>
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

                        {/* Dev Testing */}
                        <td className="to-col">
                          {dev.complete ? (
                            <span className="to-done" title="All developer stages passed">
                              <Check size={13} /> Done
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="to-progress"
                              onClick={() => setActiveTab('devtesting')}
                              title={dev.next ? `Next stage: ${dev.next.label}. Open Dev Testing` : 'Open Dev Testing'}
                            >
                              <span className="to-progress-top">
                                <span>
                                  {dev.passed}/{dev.total} stages
                                </span>
                                <ChevronRight size={11} />
                              </span>
                              <span className="feat-card-bar">
                                <span className="feat-card-bar-fill" style={{ width: `${dev.pct}%`, display: 'block' }} />
                              </span>
                              {dev.next && <span className="to-sub">Next: {dev.next.short}</span>}
                            </button>
                          )}
                          {devUser && <span className="to-person">{devUser.name.split(' ')[0]}</span>}
                        </td>

                        {/* QA Testing (auto) */}
                        <td className="to-col">
                          {qa.done ? (
                            <span className="to-done" title="Closed by QA">
                              <Check size={13} /> Done
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
    </div>
  );
}
