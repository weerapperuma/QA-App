import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { FeatureFutureItemsSection, FutureItemForm } from './FutureImprovements';
import {
  X,
  Bug,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Plus,
  GitPullRequest,
  ExternalLink,
  Server,
  ArrowRight,
  Sparkles,
  FolderTree,
  Trash2,
  Hourglass,
  Edit2,
  AlertTriangle,
  ChevronDown,
  Play,
  RotateCcw
} from 'lucide-react';

/* ---------- helpers ---------- */
const DONE = ['verified', 'implemented', 'qa_passed', 'qa passed', 'closed'];
const norm = (s) => (s || 'open').toLowerCase().trim();
const isPassed = (s) => DONE.includes(norm(s));
const isFailed = (s) => ['qa_failed', 'qa failed', 'failed', 'reopened'].includes(norm(s));

const ITEM_STATUS = {
  open: { label: 'Open', cls: 'open' },
  in_dev: { label: 'In Dev', cls: 'dev' },
  ready_for_qa: { label: 'Ready for Retest', cls: 'retest' },
  verified: { label: 'QA Passed', cls: 'passed' },
  implemented: { label: 'QA Passed', cls: 'passed' },
  qa_failed: { label: 'QA Failed', cls: 'failed' }
};
const itemStatus = (s) => ITEM_STATUS[norm(s)] || (isPassed(s) ? ITEM_STATUS.verified : isFailed(s) ? ITEM_STATUS.qa_failed : ITEM_STATUS.open);

const FEATURE_STATUS = {
  backlog: 'Feature Pool',
  in_dev: 'In Development',
  ready_for_qa: 'Ready for Retest',
  in_qa: 'QA Verification',
  verified: 'Verified & Closed'
};

const countItems = (items) => {
  const passed = items.filter((i) => isPassed(i.status)).length;
  const failed = items.filter((i) => isFailed(i.status)).length;
  return { total: items.length, passed, failed, open: items.length - passed };
};

/* ---------- summary tile ---------- */
function StatTile({ icon: Icon, label, stats, tone, onClick }) {
  const pct = stats.total ? Math.round((stats.passed / stats.total) * 100) : 0;
  return (
    <button type="button" className={`fd-stat tone-${tone}`} onClick={onClick}>
      <div className="fd-stat-top">
        <span className="fd-stat-label">
          <Icon size={13} /> {label}
        </span>
        <span className="fd-stat-total">{stats.total}</span>
      </div>
      <div className="feat-card-bar">
        <div className={`feat-card-bar-fill ${stats.total && stats.passed === stats.total ? 'tone-done' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="fd-stat-meta">
        <span className="ok">
          <CheckCircle2 size={11} /> {stats.passed} passed
        </span>
        {stats.failed > 0 && (
          <span className="bad">
            <XCircle size={11} /> {stats.failed} failed
          </span>
        )}
        <span>{stats.open} open</span>
      </div>
    </button>
  );
}

/* ---------- one defect / suggestion row ---------- */
function ItemRow({ item, kind, featureId, focused = false, scrollTo = false }) {
  const {
    updateFeatureBugStatus,
    updateSuggestionStatus,
    deleteBugFromFeature,
    deleteSuggestionFromFeature,
    openMoveToFuture,
    canQaDecide
  } = useApp();
  const [expanded, setExpanded] = useState(focused);
  const [isFailing, setIsFailing] = useState(false);
  const [failReason, setFailReason] = useState('');
  const rowRef = useRef(null);
  useEffect(() => {
    if (!scrollTo) return undefined;
    const t = setTimeout(() => rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    return () => clearTimeout(t);
  }, [scrollTo]);
  const isBug = kind === 'bug';
  const setStatus = (s) => (isBug ? updateFeatureBugStatus(featureId, item.id, s) : updateSuggestionStatus(featureId, item.id, s));
  const st = norm(item.status);
  const status = itemStatus(item.status);
  const level = isBug ? item.severity : item.priority;

  const handleConfirmFail = () => {
    if (!failReason.trim()) return;
    const extra = { qaFailReason: failReason.trim() };
    if (isBug) {
      updateFeatureBugStatus(featureId, item.id, 'qa_failed', extra);
    } else {
      updateSuggestionStatus(featureId, item.id, 'qa_failed', extra);
    }
    setIsFailing(false);
    setFailReason('');
  };

  const details = isBug
    ? [
        ['Steps', item.reproSteps],
        ['Expected', item.expectedResult],
        ['Actual', item.actualResult],
        ['Dev note', item.devNote],
        ['QA Fail Reason', item.qaFailReason]
      ]
    : [
        ['Notes', item.notes],
        ['Dev note', item.devNote],
        ['QA Fail Reason', item.qaFailReason]
      ];
  const hasDetails = details.some(([, v]) => v);

  return (
    <div ref={rowRef} className={`fd-item status-${status.cls} ${focused ? 'focused' : ''}`}>
      <div className="fd-item-row">
        <span className={`fd-level level-${(level || 'medium').toLowerCase()}`} title={level}>
          {isBug ? <Bug size={12} /> : <Lightbulb size={12} />}
        </span>

        <button type="button" className="fd-item-main" onClick={() => hasDetails && setExpanded(!expanded)}>
          <span className="fd-item-title">{item.title}</span>
          <span className="fd-item-sub">
            {item.id}
            {level ? ` · ${level}` : ''}
            {hasDetails && <ChevronDown size={11} className={expanded ? 'open' : ''} />}
          </span>
        </button>

        <span className={`fd-pill ${status.cls}`}>{status.label}</span>

        <div className="fd-item-actions">
          {(st === 'open' || isFailed(st)) && (
            <button type="button" className="fd-act" onClick={() => setStatus('in_dev')} title="Developer starts working on it">
              <Play size={11} /> Start Fix
            </button>
          )}
          {(st === 'open' || st === 'in_dev' || isFailed(st)) && (
            <button type="button" className="fd-act primary" onClick={() => setStatus('ready_for_qa')} title="Fixed — send to QA retest">
              Fixed <ArrowRight size={11} />
            </button>
          )}
          {st === 'ready_for_qa' && canQaDecide && (
            <>
              <button type="button" className="fd-act pass" onClick={() => setStatus('verified')}>
                <CheckCircle2 size={11} /> Pass
              </button>
              <button
                type="button"
                className="fd-act fail"
                onClick={() => {
                  setIsFailing((prev) => !prev);
                  setFailReason(item.qaFailReason || '');
                }}
              >
                <XCircle size={11} /> Fail
              </button>
            </>
          )}
          {st === 'ready_for_qa' && !canQaDecide && <span className="fd-wait">Waiting for QA</span>}
          {isPassed(st) && canQaDecide && (
            <button
              type="button"
              className="fd-act"
              onClick={() => {
                setIsFailing((prev) => !prev);
                setFailReason(item.qaFailReason || '');
              }}
              title="Re-open as QA failed"
            >
              <RotateCcw size={11} />
            </button>
          )}
          <button type="button" className="fd-icon warn" onClick={() => openMoveToFuture(featureId, kind, item.id)} title="Move to Future Improvements">
            <Hourglass size={12} />
          </button>
          <button
            type="button"
            className="fd-icon danger"
            onClick={() => {
              if (window.confirm(`Delete ${isBug ? 'defect' : 'suggestion'} [${item.id}] "${item.title}"?`)) {
                if (isBug) deleteBugFromFeature(featureId, item.id);
                else deleteSuggestionFromFeature(featureId, item.id);
              }
            }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isFailing && (
        <div style={{ marginTop: '0.5rem', padding: '0.65rem 0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--status-critical-border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-critical)' }}>
              🔴 QA Retest Failure Reason * (Required)
            </span>
            <button
              type="button"
              onClick={() => { setIsFailing(false); setFailReason(''); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <X size={12} />
            </button>
          </div>
          <textarea
            className="form-textarea"
            placeholder="Explain why verification failed and what needs rework..."
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            style={{ width: '100%', minHeight: '60px', fontSize: '0.78rem', marginBottom: '0.45rem', borderColor: 'var(--status-critical-border)' }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem' }}
              onClick={() => { setIsFailing(false); setFailReason(''); }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              disabled={!failReason.trim()}
              style={{
                fontSize: '0.74rem',
                padding: '0.25rem 0.6rem',
                background: failReason.trim() ? 'var(--status-critical)' : 'var(--border-medium)',
                color: '#ffffff',
                border: '1px solid var(--status-critical-border)',
                cursor: failReason.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 700
              }}
              onClick={handleConfirmFail}
            >
              Confirm QA Fail
            </button>
          </div>
        </div>
      )}

      {expanded && hasDetails && (
        <div className="fd-item-details">
          {details
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <p>{v}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ---------- add defect / suggestion form ---------- */
function AddItemForm({ kind, feature, onDone }) {
  const { addBugToFeature, addSuggestionToFeature } = useApp();
  const isBug = kind === 'bug';
  const [form, setForm] = useState({ title: '', level: isBug ? 'High' : 'Medium', repro: '', expected: '', actual: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving || !form.title.trim()) return;
    setSaving(true);
    try {
      if (isBug) {
        await addBugToFeature(feature.id, {
          title: form.title.trim(),
          severity: form.level,
          reproSteps: form.repro.trim(),
          expectedResult: form.expected.trim(),
          actualResult: form.actual.trim()
        });
      } else {
        await addSuggestionToFeature(feature.id, { title: form.title.trim(), priority: form.level, notes: form.notes.trim() });
      }
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="fd-form" onSubmit={submit}>
      <div className="fd-form-row with-select">
        <input
          className="form-input"
          placeholder={isBug ? 'What is wrong? e.g. Phone field accepts letters' : 'Suggestion, e.g. Add search to customer table'}
          value={form.title}
          onChange={set('title')}
          autoFocus
          required
        />
        <select className="form-select" value={form.level} onChange={set('level')}>
          {(isBug ? ['Critical', 'High', 'Medium', 'Low'] : ['High', 'Medium', 'Low']).map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {isBug ? (
        <>
          <input className="form-input" placeholder="Steps to reproduce (optional)" value={form.repro} onChange={set('repro')} />
          <div className="fd-form-row">
            <input className="form-input" placeholder="Expected (optional)" value={form.expected} onChange={set('expected')} />
            <input className="form-input" placeholder="Actual (optional)" value={form.actual} onChange={set('actual')} />
          </div>
        </>
      ) : (
        <input className="form-input" placeholder="Why is it helpful? (optional)" value={form.notes} onChange={set('notes')} />
      )}
      <div className="pf-actions">
        <button type="button" className="fb-btn" onClick={onDone} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="fb-btn fb-btn-primary" disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : isBug ? 'Log Defect' : 'Add Suggestion'}
        </button>
      </div>
    </form>
  );
}

/* ---------- list with filter + add ---------- */
function ItemList({ kind, items, feature, focusIds = [] }) {
  const hasFocus = items.some((i) => focusIds.includes(i.id));
  const [filter, setFilter] = useState(hasFocus ? 'all' : 'open');
  const [adding, setAdding] = useState(false);
  const isBug = kind === 'bug';
  const filtered = items.filter((i) => (filter === 'all' ? true : filter === 'passed' ? isPassed(i.status) : !isPassed(i.status)));
  const c = countItems(items);

  return (
    <div className="fd-list">
      <div className="fd-list-head">
        <div className="fi-tabs">
          {[
            ['open', 'Open', c.open],
            ['passed', 'QA Passed', c.passed],
            ['all', 'All', c.total]
          ].map(([id, label, n]) => (
            <button key={id} type="button" className={`fb-tab ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
              <span>{label}</span>
              <span className="fb-tab-count">{n}</span>
            </button>
          ))}
        </div>
        {!adding && (
          <button type="button" className="fb-btn" onClick={() => setAdding(true)}>
            <Plus size={13} />
            <span>{isBug ? 'Log Defect' : 'Add Suggestion'}</span>
          </button>
        )}
      </div>
      {adding && <AddItemForm kind={kind} feature={feature} onDone={() => setAdding(false)} />}
      {filtered.length === 0 ? (
        <div className="fi-empty">
          {items.length === 0
            ? isBug
              ? 'No defects logged on this feature.'
              : 'No suggestions yet.'
            : filter === 'open'
            ? 'Nothing open — all QA passed.'
            : 'Nothing here.'}
        </div>
      ) : (
        filtered.map((item) => {
          const focused = focusIds.includes(item.id);
          return (
            <ItemRow
              key={item.id}
              item={item}
              kind={kind}
              featureId={feature.id}
              focused={focused}
              scrollTo={focused && item.id === focusIds.find((id) => items.some((i) => i.id === id))}
            />
          );
        })
      )}
    </div>
  );
}


/* ---------- "Close feature" confirmation step ---------- */
function CheckLine({ ok, label, detail, warn = false }) {
  return (
    <div className={`fd-check ${ok ? 'ok' : warn ? 'warn' : 'bad'}`}>
      {ok ? <CheckCircle2 size={14} /> : warn ? <AlertTriangle size={14} /> : <XCircle size={14} />}
      <span className="fd-check-label">{label}</span>
      {detail && <span className="fd-check-detail">{detail}</span>}
    </div>
  );
}

function CloseFeatureConfirm({ feature, check, onCancel, onReview, onPending }) {
  const { updateFeatureStatus } = useApp();
  const [confirmed, setConfirmed] = useState(false);
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const hasOpenItems = (check.openBugs.length > 0 || check.openSuggs.length > 0);
  const ready = hasOpenItems ? (confirmed && riskAcknowledged) : confirmed;

  const close = async () => {
    if (!ready || saving) return;
    setSaving(true);
    await updateFeatureStatus(feature.id, 'verified', {
      confirmed: true,
      hasOpenItems,
      ...(note.trim() ? { qaNotes: note.trim() } : {})
    });
    setSaving(false);
  };

  return (
    <div className="fd-confirm">
      <div className="fd-confirm-title">
        <CheckCircle2 size={15} /> Close "{feature.name}"?
      </div>

      <div className="fd-checks">
        <CheckLine
          ok={check.openBugs.length === 0}
          warn={check.openBugs.length > 0}
          label={check.openBugs.length === 0 ? "All defects passed QA" : `${check.openBugs.length} defect(s) open (QA risk decision)`}
          detail={`${check.bugsPassed}/${check.bugsTotal}${check.criticalOpen ? ` · ${check.criticalOpen} critical open` : ''}`}
        />
        <CheckLine
          ok={check.openSuggs.length === 0}
          warn={check.openSuggs.length > 0}
          label={check.openSuggs.length === 0 ? "All suggestions passed QA" : `${check.openSuggs.length} suggestion(s) open (QA risk decision)`}
          detail={`${check.suggsPassed}/${check.suggsTotal}`}
        />
        <CheckLine
          ok={check.futurePending === 0}
          warn
          label={check.futurePending ? 'Future items stay pending (does not block)' : 'No pending future items'}
          detail={check.futurePending ? String(check.futurePending) : ''}
        />
      </div>

      {hasOpenItems && (
        <div
          className="fd-confirm-warning"
          style={{
            padding: '0.75rem 0.85rem',
            background: 'rgba(234, 179, 8, 0.08)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#eab308' }}>
              ⚠️ {check.openBugs.length + check.openSuggs.length} Open Item(s) Remaining
            </span>
            <button type="button" className="fb-btn" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }} onClick={onReview}>
              Review open items
            </button>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            As QA, you have full authority to assess whether remaining bugs ({check.openBugs.length}) or suggestions ({check.openSuggs.length}) represent an acceptable risk or are non-blocking to close this feature.
          </p>
        </div>
      )}

      <textarea
        className="form-textarea"
        rows={2}
        placeholder={hasOpenItems ? "QA sign-off & risk notes (e.g. why remaining items are acceptable risk / non-blocking)..." : "QA sign-off note (optional)"}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ marginBottom: '0.5rem' }}
      />

      {hasOpenItems && (
        <label className="fd-confirm-tick" style={{ marginBottom: '0.4rem' }}>
          <input type="checkbox" checked={riskAcknowledged} onChange={(e) => setRiskAcknowledged(e.target.checked)} />
          <span>I assessed the {check.openBugs.length + check.openSuggs.length} open item(s) and confirmed the risk is acceptable to close this feature.</span>
        </label>
      )}

      <label className="fd-confirm-tick">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        <span>I verified this feature on staging and sign off on closing it.</span>
      </label>

      <div className="pf-actions">
        <button type="button" className="fb-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="fb-btn" onClick={onPending} disabled={saving} title="Close now, track an unfinished dependency in Future">
          <Hourglass size={13} /> Close with Pending Item
        </button>
        <button type="button" className="fb-btn fd-btn-pass" onClick={close} disabled={!ready || saving}>
          <CheckCircle2 size={14} /> {saving ? 'Closing…' : 'Close Feature'}
        </button>
      </div>
    </div>
  );
}

/* ---------- modal ---------- */
// Re-mounts per feature so tabs/forms reset when a different feature is opened
export default function FeatureDetailModal() {
  const { selectedFeature, featureFocus } = useApp();
  if (!selectedFeature) return null;
  const focus = featureFocus && featureFocus.featureId === selectedFeature.id ? featureFocus : null;
  return <FeatureDetailContent key={`${selectedFeature.id}-${focus?.ts || 0}`} focus={focus} />;
}

function FeatureDetailContent({ focus }) {
  const {
    selectedFeature,
    closeFeature,
    openEditFeatureModal,
    updateFeatureStatus,
    projectFeatures,
    allModuleNames,
    updateFeatureModule,
    deleteFeature,
    team,
    updateDefectsFilter,
    setActiveTab,
    addFutureItem,
    getFeatureCloseCheck,
    canQaDecide
  } = useApp();

  const [tab, setTab] = useState(focus?.tab || null);
  const focusIds = focus?.itemIds || [];
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoff, setHandoff] = useState({ build: '', pr: '', notes: '' });
  const [showCloseWithPending, setShowCloseWithPending] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(!!focus?.closeConfirm);
  const isQaUser = canQaDecide;
  const [descOpen, setDescOpen] = useState(false);

  const featureId = selectedFeature?.id;

  // Close on Escape
  useEffect(() => {
    if (!featureId) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeFeature();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [featureId, closeFeature]);

  if (!selectedFeature) return null;
  const f = selectedFeature;

  const dev = team.find((m) => m.id === f.assignedDev);
  const qa = team.find((m) => m.id === f.assignedQa);
  const bugs = f.bugs || [];
  const suggestions = f.suggestions || [];
  const future = f.futureItems || [];
  const bugStats = countItems(bugs);
  const suggStats = countItems(suggestions);
  const futureOpen = future.filter((i) => i.status !== 'done').length;
  const futureDone = future.length - futureOpen;

  const failedBugs = bugs.filter((b) => isFailed(b.status));
  const failedSuggs = suggestions.filter((s) => isFailed(s.status));
  const reviewCount = failedBugs.length + failedSuggs.length;

  const closeCheck = getFeatureCloseCheck(f);
  const startClose = () => {
    setShowCloseWithPending(false);
    setShowCloseConfirm(true);
  };

  const allItems = bugs.length + suggestions.length;
  const allPassed = bugStats.passed + suggStats.passed;

  const activeTab = tab || (reviewCount > 0 ? 'review' : 'bugs');

  const availableModules =
    allModuleNames && allModuleNames.length > 0
      ? allModuleNames
      : Array.from(new Set(projectFeatures.map((x) => x.moduleName).filter(Boolean)));

  const viewInDefects = (typeFilter) => {
    updateDefectsFilter?.({ featureFilter: f.id, moduleFilter: (f.moduleName || 'General').trim(), typeFilter });
    closeFeature();
    setActiveTab?.('board');
  };

  const submitHandoff = (e) => {
    e.preventDefault();
    updateFeatureStatus(f.id, 'ready_for_qa', {
      stagingBuild: handoff.build || f.stagingBuild,
      prLink: handoff.pr || f.prLink,
      devNotes: handoff.notes || f.devNotes
    });
    setShowHandoff(false);
  };

  /* next step for the feature's current stage */
  const renderNextStep = () => {
    switch (f.status) {
      case 'backlog':
        return (
          <button type="button" className="fb-btn fb-btn-primary" onClick={() => updateFeatureStatus(f.id, 'in_dev')}>
            <Sparkles size={14} /> Start Development
          </button>
        );
      case 'in_dev':
        return showHandoff ? null : (
          <button type="button" className="fb-btn fb-btn-primary" onClick={() => setShowHandoff(true)}>
            <Server size={14} /> Deploy to Staging & Notify QA
          </button>
        );
      case 'ready_for_qa':
        return (
          <button type="button" className="fb-btn fb-btn-primary" onClick={() => updateFeatureStatus(f.id, 'in_qa')}>
            <ArrowRight size={14} /> Start QA Testing
          </button>
        );
      case 'in_qa':
        return (
          <>
            {isQaUser && !showCloseConfirm && !showCloseWithPending && (
              <button type="button" className="fb-btn fd-btn-pass" onClick={startClose} title="Review the QA checklist and close">
                <CheckCircle2 size={14} /> Verify & Close…
              </button>
            )}
            {!isQaUser && <span className="fd-wait">Waiting for QA sign-off</span>}
            {isQaUser && (closeCheck.openBugs.length > 0 || closeCheck.openSuggs.length > 0) && (
              <span className="fd-next-hint" style={{ color: '#eab308' }}>
                {closeCheck.openBugs.length + closeCheck.openSuggs.length} open item(s) — QA risk decision
              </span>
            )}
          </>
        );
      case 'verified':
        return (
          <span className="fd-closed">
            <CheckCircle2 size={14} /> Verified & Closed
          </span>
        );
      default:
        return null;
    }
  };

  const TABS = [
    { id: 'review', label: 'Needs Review', count: reviewCount, alert: reviewCount > 0 },
    { id: 'bugs', label: 'Defects', count: bugStats.total },
    { id: 'suggestions', label: 'Suggestions', count: suggStats.total },
    { id: 'future', label: 'Future', count: futureOpen },
    { id: 'details', label: 'Details' }
  ];

  return (
    <div className="modal-overlay" onClick={closeFeature}>
      <div className="modal-container fd-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fd-header">
          <div className="fd-header-top">
            <div className="fd-crumbs">
              <span className="fd-code">{f.code || f.id}</span>
              {f.moduleName && (
                <span className="fd-module">
                  <FolderTree size={11} /> {f.moduleName}
                </span>
              )}
              <span className={`pp-status st-${f.status}`}>{FEATURE_STATUS[f.status] || f.status}</span>
            </div>
            <div className="fd-header-actions">
              <button type="button" className="fd-icon" onClick={() => openEditFeatureModal(f)} title="Edit feature">
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                className="fd-icon danger"
                onClick={() => {
                  if (window.confirm(`Delete feature "${f.name}"? All its defects and suggestions are removed too.`)) {
                    deleteFeature(f.id);
                    closeFeature();
                  }
                }}
                title="Delete feature"
              >
                <Trash2 size={14} />
              </button>
              <button type="button" className="fd-icon" onClick={closeFeature} title="Close (Esc)">
                <X size={16} />
              </button>
            </div>
          </div>

          <h2 className="fd-title">{f.name}</h2>
          {f.description && (
            <p className={`fd-desc ${descOpen ? 'open' : ''}`} onClick={() => setDescOpen(!descOpen)} title={descOpen ? '' : 'Show more'}>
              {f.description}
            </p>
          )}
          <div className="fd-people">
            <span>
              Dev
              {dev ? (
                <>
                  <span className="user-avatar-small" style={{ background: dev.color }}>
                    {dev.initials}
                  </span>
                  {dev.name}
                </>
              ) : (
                ' · Unassigned'
              )}
            </span>
            <span>
              QA
              {qa ? (
                <>
                  <span className="user-avatar-small" style={{ background: qa.color }}>
                    {qa.initials}
                  </span>
                  {qa.name}
                </>
              ) : (
                ' · Unassigned'
              )}
            </span>
            {allItems > 0 && (
              <span className="fd-overall">
                QA passed <strong>{allPassed}</strong> of <strong>{allItems}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="fd-body">
          {/* Summary */}
          <div className="fd-stats">
            <StatTile icon={Bug} label="Defects" stats={bugStats} tone={bugStats.failed ? 'bad' : bugStats.open ? 'warn' : 'ok'} onClick={() => setTab('bugs')} />
            <StatTile icon={Lightbulb} label="Suggestions" stats={suggStats} tone="sugg" onClick={() => setTab('suggestions')} />
            <button type="button" className="fd-stat tone-future" onClick={() => setTab('future')}>
              <div className="fd-stat-top">
                <span className="fd-stat-label">
                  <Hourglass size={13} /> Future
                </span>
                <span className="fd-stat-total">{future.length}</span>
              </div>
              <div className="feat-card-bar">
                <div className="feat-card-bar-fill tone-done" style={{ width: `${future.length ? Math.round((futureDone / future.length) * 100) : 0}%` }} />
              </div>
              <div className="fd-stat-meta">
                <span>{futureOpen} pending</span>
                <span className="ok">{futureDone} done</span>
              </div>
            </button>
          </div>

          {/* Next step */}
          <div className="fd-next">
            <span className="fd-next-label">Next step</span>
            <div className="fd-next-actions">{renderNextStep()}</div>
            <select
              className="form-select fd-status-select"
              value={f.status}
              onChange={(e) => (e.target.value === 'verified' ? startClose() : updateFeatureStatus(f.id, e.target.value))}
              title="Change stage"
            >
              {Object.entries(FEATURE_STATUS).map(([k, v]) => (
                <option key={k} value={k} disabled={k === 'verified' && f.status !== 'verified' && !isQaUser}>
                  {v}
                  {k === 'verified' && f.status !== 'verified' && !isQaUser ? ' (QA only)' : ''}
                </option>
              ))}
            </select>
          </div>

          {showCloseConfirm && isQaUser && f.status !== 'verified' && (
            <CloseFeatureConfirm
              feature={f}
              check={closeCheck}
              onCancel={() => setShowCloseConfirm(false)}
              onReview={() => {
                setShowCloseConfirm(false);
                setTab(closeCheck.openBugs.length ? 'bugs' : 'suggestions');
              }}
              onPending={() => {
                setShowCloseConfirm(false);
                setShowCloseWithPending(true);
              }}
            />
          )}

          {showHandoff && f.status === 'in_dev' && (
            <form className="fd-form" onSubmit={submitHandoff}>
              <div className="fd-form-row">
                <input className="form-input" placeholder="PR link (optional)" value={handoff.pr} onChange={(e) => setHandoff((h) => ({ ...h, pr: e.target.value }))} />
                <input
                  className="form-input"
                  placeholder={`Staging build${f.stagingBuild ? ` (current ${f.stagingBuild})` : ', e.g. #413'}`}
                  value={handoff.build}
                  onChange={(e) => setHandoff((h) => ({ ...h, build: e.target.value }))}
                />
              </div>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="What should QA test?"
                value={handoff.notes}
                onChange={(e) => setHandoff((h) => ({ ...h, notes: e.target.value }))}
              />
              <div className="pf-actions">
                <button type="button" className="fb-btn" onClick={() => setShowHandoff(false)}>
                  Cancel
                </button>
                <button type="submit" className="fb-btn fb-btn-primary">
                  Mark Ready for Retest
                </button>
              </div>
            </form>
          )}

          {showCloseWithPending && isQaUser && f.status !== 'verified' && (
            <div className="fd-form">
              <div className="pf-note">
                The feature closes now and the unfinished part (e.g. a pending API or deferred task) goes to Future Improvements.
              </div>
              <FutureItemForm
                submitLabel="Close Feature & Save"
                onCancel={() => setShowCloseWithPending(false)}
                onSubmit={async (data) => {
                  await addFutureItem(f.id, data, { closeFeature: true });
                  setShowCloseWithPending(false);
                }}
              />
            </div>
          )}

          {/* Tabs */}
          <div className="fd-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`fd-tab ${activeTab === t.id ? 'active' : ''} ${t.alert ? 'alert' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.count !== undefined && <span className="fd-tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          <div className="fd-tab-body">
            {activeTab === 'review' && (
              <div className="fd-list">
                <p className="pf-note">Items that failed QA retest appear here automatically until they are fixed again.</p>
                {reviewCount === 0 ? (
                  <div className="fi-empty">Nothing to review — no QA failures.</div>
                ) : (
                  <>
                    {failedBugs.map((b) => (
                      <ItemRow
                        key={`b-${b.id}`}
                        item={b}
                        kind="bug"
                        featureId={f.id}
                        focused={focusIds.includes(b.id)}
                        scrollTo={focusIds[0] === b.id}
                      />
                    ))}
                    {failedSuggs.map((s) => (
                      <ItemRow
                        key={`s-${s.id}`}
                        item={s}
                        kind="suggestion"
                        featureId={f.id}
                        focused={focusIds.includes(s.id)}
                        scrollTo={focusIds[0] === s.id}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {activeTab === 'bugs' && <ItemList kind="bug" items={bugs} feature={f} focusIds={focusIds} />}
            {activeTab === 'suggestions' && <ItemList kind="suggestion" items={suggestions} feature={f} focusIds={focusIds} />}
            {activeTab === 'future' && <FeatureFutureItemsSection feature={f} />}

            {activeTab === 'details' && (
              <div className="fd-details">
                <label className="pf-field">
                  <span>
                    <FolderTree size={11} /> Module
                  </span>
                  <select className="form-select" value={f.moduleName || 'General'} onChange={(e) => updateFeatureModule(f.id, e.target.value)}>
                    {availableModules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="fd-detail-grid">
                  <div>
                    <span>Staging build</span>
                    <p>{f.stagingBuild || '—'}</p>
                  </div>
                  <div>
                    <span>Target release</span>
                    <p>{f.targetRelease || '—'}</p>
                  </div>
                  <div>
                    <span>Pull request</span>
                    <p>
                      {f.prLink ? (
                        <a href={f.prLink} target="_blank" rel="noreferrer">
                          <GitPullRequest size={12} /> Open PR <ExternalLink size={10} />
                        </a>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                </div>
                {f.devNotes && (
                  <div className="fd-detail-grid">
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span>Developer notes</span>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{f.devNotes}</p>
                    </div>
                  </div>
                )}
                <div className="pf-actions" style={{ justifyContent: 'flex-start' }}>
                  <button type="button" className="fb-btn" onClick={() => viewInDefects('bug')}>
                    <ExternalLink size={13} /> Defects in table
                  </button>
                  <button type="button" className="fb-btn" onClick={() => viewInDefects('suggestion')}>
                    <ExternalLink size={13} /> Suggestions in table
                  </button>
                  <button type="button" className="fb-btn" onClick={() => openEditFeatureModal(f)}>
                    <Edit2 size={13} /> Edit feature
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
