import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Hourglass,
  BellRing,
  CheckCircle2,
  Play,
  Trash2,
  Plus,
  X,
  Rocket,
  ChevronRight,
  Edit2,
  FolderTree,
  Layers,
  Link2,
  ExternalLink,
  User,
  Clock
} from 'lucide-react';
import { FUTURE_TYPES, FUTURE_STATUSES, getReminderState, formatDate, formatDateTime } from '../utils/futureItems';

const PLACEHOLDERS = {
  dependency: 'e.g. Connect asset depreciation to the Finance API',
  suggestion: 'e.g. Add bulk import for fixed assets',
  reminder: 'e.g. Re-check depreciation report after API release'
};

/* ---------- Form (add / edit / move) ----------
   featureOptions: pass project features to show the Module → Feature picker (Improvements page). */
export function FutureItemForm({
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  featureOptions,
  defaultType = 'dependency',
  defaultModule = '',
  defaultFeatureId = '',
  initial = {}
}) {
  const modules = featureOptions
    ? Array.from(new Set(featureOptions.map((f) => (f.moduleName || 'General').trim()))).sort((a, b) => a.localeCompare(b))
    : [];
  const startFeature = featureOptions?.find((f) => f.id === defaultFeatureId);
  const [moduleName, setModuleName] = useState(
    (startFeature?.moduleName || '').trim() || (modules.includes(defaultModule) ? defaultModule : modules[0] || '')
  );
  const moduleFeatures = featureOptions
    ? featureOptions.filter((f) => (f.moduleName || 'General').trim() === moduleName)
    : [];
  const [featureId, setFeatureId] = useState(startFeature?.id || moduleFeatures[0]?.id || '');

  const [type, setType] = useState(initial.type || defaultType);
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [blockedBy, setBlockedBy] = useState(initial.blockedBy || '');
  const [remindOn, setRemindOn] = useState(initial.remindOn || '');
  const [details, setDetails] = useState(initial.details || '');
  const [submitting, setSubmitting] = useState(false);

  const changeModule = (m) => {
    setModuleName(m);
    const first = featureOptions.find((f) => (f.moduleName || 'General').trim() === m);
    setFeatureId(first?.id || '');
  };

  const needsFeature = !!featureOptions;
  const valid = title.trim() && (!needsFeature || featureId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    await onSubmit({
      type,
      title: title.trim(),
      description: description.trim(),
      blockedBy: blockedBy.trim(),
      remindOn,
      details: details.trim(),
      featureId
    });
    setSubmitting(false);
  };

  return (
    <form className="fi-form" onSubmit={handleSubmit}>
      <div className="fi-type-picker">
        {Object.entries(FUTURE_TYPES).map(([key, t]) => {
          const Icon = t.icon;
          return (
            <button
              key={key}
              type="button"
              className={`fi-type-option type-${key} ${type === key ? 'active' : ''}`}
              onClick={() => setType(key)}
            >
              <Icon size={13} />
              <span>{t.short}</span>
            </button>
          );
        })}
      </div>

      {needsFeature && (
        <div className="fi-form-grid">
          <label className="pf-field">
            <span>
              <FolderTree size={11} /> Module
            </span>
            <select className="form-select" value={moduleName} onChange={(e) => changeModule(e.target.value)}>
              {modules.length === 0 && <option value="">No modules yet</option>}
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="pf-field">
            <span>
              <Layers size={11} /> Feature
            </span>
            <select className="form-select" value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
              {moduleFeatures.length === 0 && <option value="">No features in this module</option>}
              {moduleFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code || f.id})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <label className="pf-field">
        <span>Title *</span>
        <input
          type="text"
          className="form-input"
          placeholder={PLACEHOLDERS[type]}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          autoFocus
        />
      </label>

      <label className="pf-field">
        <span>Short description</span>
        <input
          type="text"
          className="form-input"
          placeholder="One line: what and why"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </label>

      <div className="fi-form-grid">
        {type === 'dependency' && (
          <label className="pf-field">
            <span>
              <Link2 size={11} /> Waiting on
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Fixed Assets API endpoint"
              value={blockedBy}
              onChange={(e) => setBlockedBy(e.target.value)}
            />
          </label>
        )}
        <label className="pf-field">
          <span>
            <BellRing size={11} /> Remind on
          </span>
          <input type="date" className="form-input" value={remindOn} onChange={(e) => setRemindOn(e.target.value)} />
        </label>
      </div>

      <label className="pf-field">
        <span>Notes</span>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Details, links, acceptance notes (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </label>

      <div className="fi-form-actions">
        {onCancel && (
          <button type="button" className="fb-btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button type="submit" className="fb-btn fb-btn-primary" disabled={!valid || submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ---------- Status actions (shared by rows, cards and the detail window) ---------- */
export function FutureItemActions({ item, featureId, compact = false, onAfter }) {
  const { updateFutureItem, startFutureItem, deleteFutureItem } = useApp();
  const fid = featureId || item.featureId;
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="fi-actions">
      {item.status === 'waiting' && (
        <button
          type="button"
          className="fi-action primary"
          onClick={stop(() => updateFutureItem(fid, item.id, { status: 'ready' }))}
          title={item.blockedBy ? `${item.blockedBy} is available now` : 'Ready to implement'}
        >
          <Rocket size={12} />
          <span>Mark Ready</span>
        </button>
      )}
      {item.status === 'ready' && (
        <button
          type="button"
          className="fi-action primary"
          onClick={stop(() => {
            if (window.confirm(`Reopen "${item.featureName || 'this feature'}" in development to implement "${item.title}"?`)) {
              startFutureItem(fid, item.id);
              onAfter?.();
            }
          })}
          title="Reopens the feature in development; it goes through QA again"
        >
          <Play size={12} />
          <span>Implement</span>
        </button>
      )}
      {item.status !== 'done' && (
        <button
          type="button"
          className="fi-action"
          onClick={stop(() => updateFutureItem(fid, item.id, { status: 'done' }))}
          title="Mark done"
        >
          <CheckCircle2 size={13} />
          {!compact && <span>Done</span>}
        </button>
      )}
      <button
        type="button"
        className="fi-action danger"
        onClick={stop(() => {
          if (window.confirm(`Remove "${item.title}"?`)) {
            deleteFutureItem(fid, item.id);
            onAfter?.();
          }
        })}
        title="Remove"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/* ---------- Chips (source, waiting on, reminder) ---------- */
export function FutureItemChips({ item }) {
  const reminder = getReminderState(item);
  return (
    <>
      {item.blockedBy && (
        <span className="fi-chip">
          <Link2 size={10} /> Waiting on: {item.blockedBy}
        </span>
      )}
      {reminder && (
        <span className={`fi-chip reminder-${reminder}`}>
          <BellRing size={10} />
          {reminder === 'overdue' ? 'Overdue · ' : reminder === 'today' ? 'Today · ' : ''}
          {formatDate(item.remindOn)}
        </span>
      )}
      {item.sourceId && (
        <span className="fi-chip" title={`Moved here from a ${item.sourceKind === 'bug' ? 'defect' : 'suggestion'}`}>
          From {item.sourceKind === 'bug' ? 'defect' : 'suggestion'} {item.sourceId}
          {item.sourceSeverity ? ` · ${item.sourceSeverity}` : ''}
        </span>
      )}
    </>
  );
}

/* ---------- One item row (inside the feature window) ---------- */
function FutureItemRow({ item, featureId, onOpen }) {
  const t = FUTURE_TYPES[item.type] || FUTURE_TYPES.suggestion;
  const Icon = t.icon;
  return (
    <div className={`fi-row status-${item.status}`} onClick={() => onOpen?.(item)} role="button" tabIndex={0}>
      <span className={`fi-icon type-${item.type}`} title={t.label}>
        <Icon size={14} />
      </span>
      <div className="fi-main">
        <div className="fi-title">{item.title}</div>
        {item.description && <div className="fi-desc-line">{item.description}</div>}
        <div className="fi-meta">
          <FutureItemChips item={item} />
        </div>
      </div>
      <span className={`fi-status status-${item.status}`}>{FUTURE_STATUSES[item.status]?.label || item.status}</span>
      <FutureItemActions item={item} featureId={featureId} compact />
    </div>
  );
}

/* ---------- Detail window (read everything, edit, act) ---------- */
export function FutureItemDetailModal({ item, onClose }) {
  const { updateFutureItem, openFeature, team = [] } = useApp();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!item) return null;
  const t = FUTURE_TYPES[item.type] || FUTURE_TYPES.suggestion;
  const Icon = t.icon;
  const author = team.find((u) => u.id === item.createdBy);

  const timeline = [
    ['Created', item.createdAt],
    ['Ready', item.readyAt],
    ['Started', item.startedAt],
    ['Done', item.doneAt]
  ].filter(([, v]) => v);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 140 }}>
      <div className="modal-container fi-detail" onClick={(e) => e.stopPropagation()}>
        <div className="fi-detail-head">
          <div className="fi-detail-crumbs">
            <span className={`fi-type-badge type-${item.type}`}>
              <Icon size={12} /> {t.label}
            </span>
            <span className={`fi-status status-${item.status}`}>{FUTURE_STATUSES[item.status]?.label || item.status}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {!editing && (
              <button type="button" className="fd-icon" onClick={() => setEditing(true)} title="Edit">
                <Edit2 size={14} />
              </button>
            )}
            <button type="button" className="fd-icon" onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="fi-detail-body">
          {editing ? (
            <FutureItemForm
              initial={item}
              submitLabel="Save Changes"
              onCancel={() => setEditing(false)}
              onSubmit={async (data) => {
                const { featureId: _ignored, ...changes } = data;
                await updateFutureItem(item.featureId, item.id, changes);
                setEditing(false);
              }}
            />
          ) : (
            <>
              <h2 className="fi-detail-title">{item.title}</h2>
              {item.description ? (
                <p className="fi-detail-desc">{item.description}</p>
              ) : (
                <p className="fi-detail-desc muted">No short description.</p>
              )}

              <button
                type="button"
                className="fi-detail-feature"
                onClick={() => {
                  onClose();
                  openFeature(item.featureId);
                }}
                title="Open feature"
              >
                <FolderTree size={13} />
                <span>{item.moduleName}</span>
                <ChevronRight size={12} />
                <Layers size={13} />
                <strong>{item.featureName}</strong>
                <span className="fi-detail-code">{item.featureCode}</span>
                <ExternalLink size={11} />
              </button>

              <div className="fi-meta" style={{ marginTop: 0 }}>
                <FutureItemChips item={item} />
              </div>

              <div className="fi-detail-section">
                <span className="fi-detail-label">Notes</span>
                {item.details ? <p className="fi-detail-notes">{item.details}</p> : <p className="fi-detail-desc muted">No notes.</p>}
              </div>

              <div className="fi-detail-grid">
                <div>
                  <span className="fi-detail-label">
                    <User size={10} /> Added by
                  </span>
                  <p>{author?.name || item.createdByName || '—'}</p>
                </div>
                {item.remindOn && (
                  <div>
                    <span className="fi-detail-label">
                      <BellRing size={10} /> Remind on
                    </span>
                    <p>{formatDate(item.remindOn)}</p>
                  </div>
                )}
                {timeline.map(([label, at]) => (
                  <div key={label}>
                    <span className="fi-detail-label">
                      <Clock size={10} /> {label}
                    </span>
                    <p>{formatDateTime(at)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div className="fi-detail-foot">
            <FutureItemActions item={item} onAfter={onClose} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Section inside the Feature detail window ---------- */
export function FeatureFutureItemsSection({ feature }) {
  const { addFutureItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState(null);
  const items = (feature.futureItems || []).map((i) => ({
    ...i,
    featureId: feature.id,
    featureName: feature.name,
    featureCode: feature.code,
    moduleName: feature.moduleName || 'General'
  }));
  const openCount = items.filter((i) => i.status !== 'done').length;
  const openItem = items.find((i) => i.id === openId) || null;

  return (
    <div className="fi-section">
      <div className="fi-section-head">
        <span className="fi-section-title">
          <Hourglass size={15} />
          Future Improvements
          {openCount > 0 && <span className="fi-count">{openCount}</span>}
        </span>
        {!showForm && (
          <button type="button" className="fb-btn" onClick={() => setShowForm(true)}>
            <Plus size={13} />
            <span>Add</span>
          </button>
        )}
      </div>
      <p className="fi-hint">Pending dependencies, later suggestions and reminders. These don't block closing the feature.</p>

      {showForm && (
        <FutureItemForm
          submitLabel="Save Item"
          onCancel={() => setShowForm(false)}
          onSubmit={async (data) => {
            await addFutureItem(feature.id, data);
            setShowForm(false);
          }}
        />
      )}

      {items.length > 0 && (
        <div className="fi-list">
          {items.map((item) => (
            <FutureItemRow key={item.id} item={item} featureId={feature.id} onOpen={(it) => setOpenId(it.id)} />
          ))}
        </div>
      )}

      {openItem && <FutureItemDetailModal item={openItem} onClose={() => setOpenId(null)} />}
    </div>
  );
}

/* ---------- Compact summary for the Release Gate ---------- */
export function FutureImprovementsSummary() {
  const { projectFutureItems = [], setActiveTab } = useApp();
  const count = (st) => projectFutureItems.filter((i) => i.status === st).length;
  const due = projectFutureItems.filter((i) => ['overdue', 'today'].includes(getReminderState(i))).length;

  return (
    <div className="release-gate-card fi-summary">
      <div>
        <h3 className="fi-panel-title">
          <Hourglass size={17} />
          Future Improvements
        </h3>
        <p className="fi-hint" style={{ margin: 0 }}>
          Deferred work from closed features. Doesn't block this release.
        </p>
      </div>
      <div className="fi-panel-summary">
        <span className="fi-stat">
          <strong>{count('waiting')}</strong> pending
        </span>
        <span className="fi-stat ready">
          <strong>{count('ready')}</strong> ready
        </span>
        <span className="fi-stat">
          <strong>{count('in_progress')}</strong> in progress
        </span>
        {due > 0 && (
          <span className="fi-stat due">
            <BellRing size={12} />
            <strong>{due}</strong> due
          </span>
        )}
        <button type="button" className="fb-btn fb-btn-primary" onClick={() => setActiveTab('improvements')}>
          <span>Open Improvements</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Modal: move a defect / suggestion into Future Improvements ---------- */
export function MoveToFutureModal() {
  const { moveToFutureTarget: target, setMoveToFutureTarget, moveDefectToFuture } = useApp();
  if (!target) return null;
  const { featureId, featureName, kind, source } = target;
  const isBug = kind === 'bug';

  const detailParts = isBug
    ? [
        source.actualResult && `Actual: ${source.actualResult}`,
        source.expectedResult && `Expected: ${source.expectedResult}`,
        source.reproSteps && `Steps: ${source.reproSteps}`
      ]
    : [source.notes];
  const initial = {
    type: isBug ? 'dependency' : 'suggestion',
    title: source.title || '',
    details: detailParts.filter(Boolean).join('\n')
  };
  const close = () => setMoveToFutureTarget(null);

  return (
    <div className="modal-overlay" onClick={close} style={{ zIndex: 150 }}>
      <div className="modal-container" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="fi-panel-title" style={{ fontSize: '1rem' }}>
              <Hourglass size={16} />
              Move to Future Improvements
            </div>
            <div className="fi-hint" style={{ margin: 0 }}>
              {isBug ? 'Defect' : 'Suggestion'} [{source.id}] on "{featureName}". It leaves the{' '}
              {isBug ? 'defect' : 'suggestion'} list, so it no longer blocks closing the feature.
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={close} title="Close">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '1rem 1.25rem', overflowY: 'auto' }}>
          <FutureItemForm
            key={`${featureId}-${source.id}`}
            initial={initial}
            submitLabel="Move to Future"
            onCancel={close}
            onSubmit={(data) => moveDefectToFuture(featureId, kind, source.id, data)}
          />
        </div>
      </div>
    </div>
  );
}
