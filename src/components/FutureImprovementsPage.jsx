import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Hourglass, Plus, Search, X, BellRing, FolderTree, Layers, RotateCcw } from 'lucide-react';
import { FutureItemForm, FutureItemActions, FutureItemChips, FutureItemDetailModal } from './FutureImprovements';
import { FUTURE_TYPES, FUTURE_STATUSES, getReminderState } from '../utils/futureItems';

const STATUS_TABS = [
  { id: 'open', label: 'Open' },
  { id: 'waiting', label: 'Pending' },
  { id: 'ready', label: 'Ready' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' }
];
const STATUS_ORDER = { ready: 0, waiting: 1, in_progress: 2, done: 3 };

const timeAgo = (iso) => {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString();
};

function ImprovementCard({ item, onOpen }) {
  const t = FUTURE_TYPES[item.type] || FUTURE_TYPES.suggestion;
  const Icon = t.icon;
  const reminder = getReminderState(item);
  return (
    <article
      className={`imp-card type-${item.type} status-${item.status} ${reminder === 'overdue' ? 'is-overdue' : ''}`}
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item)}
    >
      <div className="imp-card-top">
        <span className={`fi-type-badge type-${item.type}`}>
          <Icon size={12} /> {t.short}
        </span>
        <span className={`fi-status status-${item.status}`}>{FUTURE_STATUSES[item.status]?.label || item.status}</span>
      </div>

      <h3 className="imp-card-title">{item.title}</h3>
      <p className={`imp-card-desc ${item.description ? '' : 'muted'}`}>{item.description || 'No short description'}</p>

      <div className="imp-card-where" title={`${item.moduleName} › ${item.featureName}`}>
        <FolderTree size={11} />
        <span>{item.moduleName}</span>
        <span className="sep">›</span>
        <Layers size={11} />
        <span className="feat">{item.featureName}</span>
      </div>

      <div className="fi-meta imp-card-chips">
        <FutureItemChips item={item} />
      </div>

      <div className="imp-card-foot">
        <span className="imp-card-time">
          {item.createdByName ? `${item.createdByName} · ` : ''}
          {timeAgo(item.createdAt)}
        </span>
        <FutureItemActions item={item} compact />
      </div>
    </article>
  );
}

export default function FutureImprovementsPage() {
  const { projectFutureItems = [], projectFeatures = [], addFutureItem, activeProject } = useApp();

  const [statusTab, setStatusTab] = useState('open');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [reminderFilter, setReminderFilter] = useState('all'); // all | due | upcoming | none
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('smart'); // smart | newest | oldest | remind
  const [showAdd, setShowAdd] = useState(false);
  const [openId, setOpenId] = useState(null);

  const modules = useMemo(
    () =>
      Array.from(new Set(projectFeatures.map((f) => (f.moduleName || 'General').trim()))).sort((a, b) => a.localeCompare(b)),
    [projectFeatures]
  );
  const featuresInModule = projectFeatures.filter(
    (f) => moduleFilter === 'all' || (f.moduleName || 'General').trim() === moduleFilter
  );

  const matchesNonStatus = (i) => {
    if (moduleFilter !== 'all' && (i.moduleName || 'General').trim() !== moduleFilter) return false;
    if (featureFilter !== 'all' && i.featureId !== featureFilter) return false;
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    const r = getReminderState(i);
    if (reminderFilter === 'due' && !['overdue', 'today'].includes(r)) return false;
    if (reminderFilter === 'upcoming' && r !== 'upcoming') return false;
    if (reminderFilter === 'none' && i.remindOn) return false;
    const q = search.trim().toLowerCase();
    if (
      q &&
      ![i.title, i.description, i.details, i.blockedBy, i.featureName, i.featureCode, i.moduleName].some((v) =>
        (v || '').toLowerCase().includes(q)
      )
    )
      return false;
    return true;
  };
  const matchesStatus = (i, tab) => (tab === 'all' ? true : tab === 'open' ? i.status !== 'done' : i.status === tab);

  const base = projectFutureItems.filter(matchesNonStatus);
  const countFor = (tab) => base.filter((i) => matchesStatus(i, tab)).length;

  const visible = base
    .filter((i) => matchesStatus(i, statusTab))
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sortBy === 'oldest') return (a.createdAt || '').localeCompare(b.createdAt || '');
      if (sortBy === 'remind') return (a.remindOn || '9999').localeCompare(b.remindOn || '9999');
      // smart: due reminders first, then ready → pending → in progress → done, newest first
      const ra = ['overdue', 'today'].includes(getReminderState(a)) ? 0 : 1;
      const rb = ['overdue', 'today'].includes(getReminderState(b)) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      const sa = STATUS_ORDER[a.status] ?? 9;
      const sb = STATUS_ORDER[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  const dueCount = projectFutureItems.filter((i) => ['overdue', 'today'].includes(getReminderState(i))).length;
  const filtersActive =
    moduleFilter !== 'all' || featureFilter !== 'all' || typeFilter !== 'all' || reminderFilter !== 'all' || search.trim();
  const resetFilters = () => {
    setModuleFilter('all');
    setFeatureFilter('all');
    setTypeFilter('all');
    setReminderFilter('all');
    setSearch('');
  };

  const openItem = projectFutureItems.find((i) => `${i.featureId}-${i.id}` === openId) || null;
  const selectedFeature = projectFeatures.find((f) => f.id === featureFilter);

  return (
    <div className="imp-page">
      {/* Header */}
      <div className="imp-head">
        <div>
          <h1 className="imp-title">
            <Hourglass size={20} /> Future Improvements
          </h1>
          <p className="fi-hint" style={{ margin: 0 }}>
            Deferred work for {activeProject?.name || 'this project'}: pending dependencies, later suggestions and reminders.
          </p>
        </div>
        <div className="imp-head-actions">
          {dueCount > 0 && (
            <button type="button" className="fi-stat due imp-due" onClick={() => setReminderFilter('due')} title="Show due reminders">
              <BellRing size={13} />
              <strong>{dueCount}</strong> reminder{dueCount === 1 ? '' : 's'} due
            </button>
          )}
          <button type="button" className="fb-btn fb-btn-primary" onClick={() => setShowAdd(true)} disabled={projectFeatures.length === 0}>
            <Plus size={14} />
            <span>Add Improvement</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="imp-filters">
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

        <div className="imp-filter-row">
          <div className="fi-search imp-search">
            <Search size={12} />
            <input
              type="text"
              className="form-input"
              placeholder="Search title, description, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} title="Clear">
                <X size={12} />
              </button>
            )}
          </div>

          <select
            className="form-select"
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setFeatureFilter('all');
            }}
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select className="form-select" value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)}>
            <option value="all">All features</option>
            {featuresInModule.map((f) => (
              <option key={f.id} value={f.id}>
                {moduleFilter === 'all' ? `${f.moduleName || 'General'} › ` : ''}
                {f.name}
              </option>
            ))}
          </select>

          <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            {Object.entries(FUTURE_TYPES).map(([key, t]) => (
              <option key={key} value={key}>
                {t.label}
              </option>
            ))}
          </select>

          <select className="form-select" value={reminderFilter} onChange={(e) => setReminderFilter(e.target.value)}>
            <option value="all">Any reminder</option>
            <option value="due">Due / overdue</option>
            <option value="upcoming">Upcoming</option>
            <option value="none">No reminder</option>
          </select>

          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="smart">Sort: priority</option>
            <option value="newest">Sort: newest</option>
            <option value="oldest">Sort: oldest</option>
            <option value="remind">Sort: reminder date</option>
          </select>

          {filtersActive && (
            <button type="button" className="fb-btn imp-reset" onClick={resetFilters}>
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {filtersActive && (
          <div className="imp-active-filters">
            {moduleFilter !== 'all' && (
              <span className="imp-filter-chip">
                Module: {moduleFilter}
                <button type="button" onClick={() => { setModuleFilter('all'); setFeatureFilter('all'); }}>
                  <X size={10} />
                </button>
              </span>
            )}
            {selectedFeature && (
              <span className="imp-filter-chip">
                Feature: {selectedFeature.name}
                <button type="button" onClick={() => setFeatureFilter('all')}>
                  <X size={10} />
                </button>
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="imp-filter-chip">
                Type: {FUTURE_TYPES[typeFilter]?.short}
                <button type="button" onClick={() => setTypeFilter('all')}>
                  <X size={10} />
                </button>
              </span>
            )}
            {reminderFilter !== 'all' && (
              <span className="imp-filter-chip">
                Reminder: {reminderFilter === 'due' ? 'Due' : reminderFilter === 'upcoming' ? 'Upcoming' : 'None'}
                <button type="button" onClick={() => setReminderFilter('all')}>
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="imp-empty">
          <Hourglass size={28} />
          <p>
            {projectFutureItems.length === 0
              ? 'No future improvements yet. Add one, or move a defect/suggestion here with the ⏳ button.'
              : 'Nothing matches these filters.'}
          </p>
          {filtersActive && (
            <button type="button" className="fb-btn" onClick={resetFilters}>
              <RotateCcw size={12} /> Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="imp-grid">
          {visible.map((item) => (
            <ImprovementCard key={`${item.featureId}-${item.id}`} item={item} onOpen={(it) => setOpenId(`${it.featureId}-${it.id}`)} />
          ))}
        </div>
      )}

      {/* Add */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)} style={{ zIndex: 140 }}>
          <div className="modal-container" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="fi-panel-title" style={{ fontSize: '1rem' }}>
                <Plus size={16} /> Add Improvement
              </div>
              <button type="button" className="btn-icon" onClick={() => setShowAdd(false)} title="Close">
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto' }}>
              <FutureItemForm
                submitLabel="Add Improvement"
                featureOptions={projectFeatures}
                defaultModule={moduleFilter !== 'all' ? moduleFilter : ''}
                defaultFeatureId={featureFilter !== 'all' ? featureFilter : ''}
                onCancel={() => setShowAdd(false)}
                onSubmit={async ({ featureId, ...data }) => {
                  await addFutureItem(featureId, data);
                  setShowAdd(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Detail */}
      {openItem && <FutureItemDetailModal item={openItem} onClose={() => setOpenId(null)} />}

    </div>
  );
}
