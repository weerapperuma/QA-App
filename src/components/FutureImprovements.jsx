import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Hourglass,
  Lightbulb,
  BellRing,
  CheckCircle2,
  Play,
  Trash2,
  Plus,
  Search,
  X,
  Rocket,
  ChevronRight
} from 'lucide-react';

const FUTURE_TYPES = {
  dependency: { label: 'Pending Dependency', short: 'Dependency', icon: Hourglass },
  suggestion: { label: 'Suggestion', short: 'Suggestion', icon: Lightbulb },
  reminder: { label: 'Reminder', short: 'Reminder', icon: BellRing }
};

const FUTURE_STATUSES = {
  waiting: { label: 'Pending' },
  ready: { label: 'Ready to Implement' },
  in_progress: { label: 'In Progress' },
  done: { label: 'Done' }
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 'overdue' | 'today' | 'upcoming' | null
const getReminderState = (item) => {
  if (!item.remindOn || item.status === 'done') return null;
  const today = todayStr();
  if (item.remindOn < today) return 'overdue';
  if (item.remindOn === today) return 'today';
  return 'upcoming';
};

const formatDate = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/* ---------- Form ---------- */
export function FutureItemForm({
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  featureOptions,
  defaultType = 'dependency',
  initial = {}
}) {
  const [type, setType] = useState(initial.type || defaultType);
  const [title, setTitle] = useState(initial.title || '');
  const [blockedBy, setBlockedBy] = useState(initial.blockedBy || '');
  const [remindOn, setRemindOn] = useState(initial.remindOn || '');
  const [details, setDetails] = useState(initial.details || '');
  const [featureId, setFeatureId] = useState(featureOptions?.[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting || (featureOptions && !featureId)) return;
    setSubmitting(true);
    await onSubmit({ type, title, blockedBy, remindOn, details, featureId });
    setSubmitting(false);
  };

  const placeholders = {
    dependency: 'e.g. Connect asset depreciation to the Finance API',
    suggestion: 'e.g. Add bulk import for fixed assets',
    reminder: 'e.g. Re-check depreciation report after API release'
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

      {featureOptions && (
        <select className="form-select" value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
          {featureOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.moduleName ? `${f.moduleName} › ` : ''}
              {f.name} ({f.code || f.id})
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        className="form-input"
        placeholder={placeholders[type]}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />

      <div className="fi-form-row">
        {type === 'dependency' && (
          <input
            type="text"
            className="form-input"
            placeholder="Waiting on (e.g. Fixed Assets API endpoint)"
            value={blockedBy}
            onChange={(e) => setBlockedBy(e.target.value)}
          />
        )}
        <label className="fi-date">
          <BellRing size={12} />
          <input
            type="date"
            className="form-input"
            value={remindOn}
            onChange={(e) => setRemindOn(e.target.value)}
            title="Remind on (optional)"
          />
        </label>
      </div>

      <textarea
        className="form-textarea"
        rows={2}
        placeholder="Notes (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />

      <div className="fi-form-actions">
        {onCancel && (
          <button type="button" className="fb-btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="fb-btn fb-btn-primary"
          disabled={!title.trim() || submitting || (featureOptions && !featureId)}
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ---------- One item row ---------- */
function FutureItemRow({ item, featureId, showFeature, onOpenFeature }) {
  const { updateFutureItem, startFutureItem, deleteFutureItem } = useApp();
  const t = FUTURE_TYPES[item.type] || FUTURE_TYPES.suggestion;
  const Icon = t.icon;
  const reminder = getReminderState(item);
  const fid = featureId || item.featureId;

  return (
    <div className={`fi-row status-${item.status}`}>
      <span className={`fi-icon type-${item.type}`} title={t.label}>
        <Icon size={14} />
      </span>

      <div className="fi-main">
        <div className="fi-title">{item.title}</div>
        <div className="fi-meta">
          {showFeature && (
            <button type="button" className="fi-feature-link" onClick={() => onOpenFeature && onOpenFeature(fid)}>
              {item.moduleName} › {item.featureName}
              <ChevronRight size={11} />
            </button>
          )}
          {item.sourceId && (
            <span className="fi-chip" title={`Moved here from a ${item.sourceKind === 'bug' ? 'defect' : 'suggestion'}`}>
              From {item.sourceKind === 'bug' ? 'defect' : 'suggestion'} {item.sourceId}
              {item.sourceSeverity ? ` · ${item.sourceSeverity}` : ''}
            </span>
          )}
          {item.blockedBy && <span className="fi-chip">Waiting on: {item.blockedBy}</span>}
          {reminder && (
            <span className={`fi-chip reminder-${reminder}`}>
              <BellRing size={10} />
              {reminder === 'overdue' ? 'Overdue · ' : reminder === 'today' ? 'Today · ' : ''}
              {formatDate(item.remindOn)}
            </span>
          )}
          {item.details && <span className="fi-details">{item.details}</span>}
        </div>
      </div>

      <span className={`fi-status status-${item.status}`}>{FUTURE_STATUSES[item.status]?.label || item.status}</span>

      <div className="fi-actions">
        {item.status === 'waiting' && (
          <button
            type="button"
            className="fi-action primary"
            onClick={() => updateFutureItem(fid, item.id, { status: 'ready' })}
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
            onClick={() => {
              if (window.confirm(`Reopen "${item.featureName || 'this feature'}" in development to implement "${item.title}"?`)) {
                startFutureItem(fid, item.id);
              }
            }}
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
            onClick={() => updateFutureItem(fid, item.id, { status: 'done' })}
            title="Mark done"
          >
            <CheckCircle2 size={13} />
          </button>
        )}
        <button
          type="button"
          className="fi-action danger"
          onClick={() => {
            if (window.confirm(`Remove "${item.title}"?`)) deleteFutureItem(fid, item.id);
          }}
          title="Remove"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Section inside the Feature detail modal ---------- */
export function FeatureFutureItemsSection({ feature }) {
  const { addFutureItem } = useApp();
  const [showForm, setShowForm] = useState(false);
  const items = feature.futureItems || [];
  const openCount = items.filter((i) => i.status !== 'done').length;

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
            <FutureItemRow key={item.id} item={{ ...item, featureName: feature.name }} featureId={feature.id} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Panel in the Release Gate ---------- */
const STATUS_TABS = [
  { id: 'open', label: 'Open' },
  { id: 'waiting', label: 'Pending' },
  { id: 'ready', label: 'Ready' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' }
];

export function FutureImprovementsPanel() {
  const { projectFutureItems = [], projectFeatures = [], addFutureItem, openFeature } = useApp();
  const [statusTab, setStatusTab] = useState('open');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const countFor = (tab) =>
    projectFutureItems.filter((i) => (tab === 'open' ? i.status !== 'done' : i.status === tab)).length;

  const dueReminders = projectFutureItems.filter((i) => {
    const r = getReminderState(i);
    return r === 'overdue' || r === 'today';
  }).length;

  const q = search.trim().toLowerCase();
  const STATUS_ORDER = { ready: 0, waiting: 1, in_progress: 2, done: 3 };
  const visible = projectFutureItems
    .filter((i) => (statusTab === 'open' ? i.status !== 'done' : i.status === statusTab))
    .filter((i) => typeFilter === 'all' || i.type === typeFilter)
    .filter(
      (i) =>
        !q ||
        [i.title, i.details, i.blockedBy, i.featureName, i.featureCode, i.moduleName].some((v) =>
          (v || '').toLowerCase().includes(q)
        )
    )
    .sort((a, b) => {
      // due reminders first, then by status, then newest
      const ra = ['overdue', 'today'].includes(getReminderState(a)) ? 0 : 1;
      const rb = ['overdue', 'today'].includes(getReminderState(b)) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const sa = STATUS_ORDER[a.status] ?? 9;
      const sb = STATUS_ORDER[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  return (
    <div className="release-gate-card fi-panel">
      <div className="fi-panel-head">
        <div>
          <h3 className="fi-panel-title">
            <Hourglass size={17} />
            Future Improvements
          </h3>
          <p className="fi-hint" style={{ margin: 0 }}>
            Work deferred from closed features — implement when the dependency is ready. Doesn't block this release.
          </p>
        </div>
        <div className="fi-panel-summary">
          <span className="fi-stat">
            <strong>{countFor('waiting')}</strong> pending
          </span>
          <span className="fi-stat ready">
            <strong>{countFor('ready')}</strong> ready
          </span>
          {dueReminders > 0 && (
            <span className="fi-stat due">
              <BellRing size={12} />
              <strong>{dueReminders}</strong> due
            </span>
          )}
          {!showForm && (
            <button type="button" className="fb-btn fb-btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={14} />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <FutureItemForm
          submitLabel="Save Item"
          featureOptions={projectFeatures}
          onCancel={() => setShowForm(false)}
          onSubmit={async ({ featureId, ...data }) => {
            await addFutureItem(featureId, data);
            setShowForm(false);
          }}
        />
      )}

      <div className="fi-toolbar">
        <div className="fi-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`fb-tab ${statusTab === tab.id ? 'active' : ''}`}
              onClick={() => setStatusTab(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="fb-tab-count">{countFor(tab.id)}</span>
            </button>
          ))}
        </div>
        <div className="fi-filters">
          <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {Object.entries(FUTURE_TYPES).map(([key, t]) => (
              <option key={key} value={key}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="fi-search">
            <Search size={12} />
            <input
              type="text"
              className="form-input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} title="Clear">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="fi-empty">
          {projectFutureItems.length === 0
            ? 'No future items yet. When a feature is waiting on something (like an API), close it with a pending item from the feature window.'
            : 'Nothing matches these filters.'}
        </div>
      ) : (
        <div className="fi-list">
          {visible.map((item) => (
            <FutureItemRow
              key={`${item.featureId}-${item.id}`}
              item={item}
              showFeature
              onOpenFeature={(fid) => openFeature && openFeature(fid)}
            />
          ))}
        </div>
      )}
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
      <div className="modal-container" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
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
        <div style={{ padding: '1rem 1.25rem' }}>
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
