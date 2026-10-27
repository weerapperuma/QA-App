import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import SearchableDropdown from './SearchableDropdown';
import {
  Bug,
  Lightbulb,
  Search,
  CheckCircle2,
  Plus,
  Layers,
  Folder,
  X,
  Check,
  Trash2,
  Edit2,
  Code2,
  ChevronDown,
  Filter,
  RotateCcw
} from 'lucide-react';

export default function DefectsListView() {
  const {
    allFeatureDefects,
    projectFeatures,
    activeProject,
    openFeature,
    updateFeatureBugStatus,
    updateFeatureBug,
    updateSuggestionStatus,
    updateFeatureSuggestion,
    convertDefectType,
    addBugToFeature,
    addSuggestionToFeature,
    deleteBugFromFeature,
    deleteSuggestionFromFeature,
    modules = []
  } = useApp();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'bug' | 'suggestion'
  const [moduleFilter, setModuleFilter] = useState('all');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Quick Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetFeatureId, setTargetFeatureId] = useState(projectFeatures[0]?.id || '');
  const [itemType, setItemType] = useState('bug'); // 'bug' | 'suggestion'
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Critical');
  const [priority, setPriority] = useState('High');
  const [reproSteps, setReproSteps] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dev Fixed Note Modal state
  const [isDevFixedModalOpen, setIsDevFixedModalOpen] = useState(false);
  const [devFixedTarget, setDevFixedTarget] = useState(null);
  const [devNoteText, setDevNoteText] = useState('');

  // Edit Modal state
  const [editItem, setEditItem] = useState(null);
  const [editType, setEditType] = useState('bug');
  const [editTitle, setEditTitle] = useState('');
  const [editSeverity, setEditSeverity] = useState('Medium');
  const [editReproSteps, setEditReproSteps] = useState('');
  const [editDevNote, setEditDevNote] = useState('');
  const [editStatus, setEditStatus] = useState('open');

  // Selected item modal for inspecting details
  const [viewItem, setViewItem] = useState(null);

  const getSeverityColor = (sev) => {
    switch ((sev || '').toLowerCase()) {
      case 'critical':
        return 'var(--status-critical)';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#38bdf8';
      default:
        return 'var(--text-secondary)';
    }
  };

  // Canonical status normalization to handle aliases seamlessly
  const normalizeStatus = (st) => {
    const s = (st || 'open').toLowerCase().trim();
    if (s === 'open' || s === 'new' || s === 'need dev' || s === 'need_dev') return 'open';
    if (s === 'in_dev' || s === 'in dev' || s === 'in_development' || s === 'in development') return 'in_dev';
    if (s === 'ready_for_qa' || s === 'dev fixed' || s === 'dev_fixed' || s === 'retest') return 'ready_for_qa';
    if (s === 'verified' || s === 'implemented' || s === 'qa passed' || s === 'qa_passed' || s === 'closed') return 'verified';
    if (s === 'qa_failed' || s === 'qa failed' || s === 'failed' || s === 'reopened') return 'qa_failed';
    return s;
  };

  // Derive unique module names from features with consistent trimming
  const uniqueModules = Array.from(
    new Set((projectFeatures || []).map((f) => (f.moduleName || 'General').trim()).filter(Boolean))
  ).sort();

  // Module options formatted for SearchableDropdown with live defect counts
  const moduleOptions = uniqueModules.map((m) => {
    const count = allFeatureDefects.filter(
      (item) => (item.moduleName || 'General').trim().toLowerCase() === m.toLowerCase()
    ).length;
    return {
      value: m,
      label: m,
      badge: count,
      icon: <Folder size={12} color="var(--accent-dev)" />
    };
  });

  // Available features constrained by module filter
  const availableFeatures = moduleFilter === 'all'
    ? projectFeatures
    : projectFeatures.filter(
        (f) => (f.moduleName || 'General').trim().toLowerCase() === moduleFilter.trim().toLowerCase()
      );

  // Feature options formatted for SearchableDropdown with module tag and defect counts
  const featureOptions = availableFeatures.map((f) => {
    const count = allFeatureDefects.filter(
      (item) => String(item.featureId) === String(f.id) || String(item.featureCode || '') === String(f.id)
    ).length;
    return {
      value: f.id,
      label: f.name,
      sublabel: `${(f.moduleName || 'General').trim()} • ${f.code || f.id}`,
      badge: count,
      icon: <Layers size={12} color="var(--accent-dev)" />
    };
  });

  // Synchronized Filter Change Handlers
  const handleModuleChange = (newMod) => {
    setModuleFilter(newMod);
    if (newMod !== 'all' && featureFilter !== 'all') {
      const currentFeat = projectFeatures.find((f) => String(f.id) === String(featureFilter));
      if (!currentFeat || (currentFeat.moduleName || 'General').trim().toLowerCase() !== newMod.trim().toLowerCase()) {
        setFeatureFilter('all');
      }
    }
  };

  const handleFeatureChange = (newFeatId) => {
    setFeatureFilter(newFeatId);
    if (newFeatId !== 'all') {
      const chosenFeat = projectFeatures.find((f) => String(f.id) === String(newFeatId));
      if (chosenFeat && chosenFeat.moduleName) {
        setModuleFilter(chosenFeat.moduleName.trim());
      }
    }
  };

  // Check if any filter is active
  const isAnyFilterActive =
    search.trim() !== '' ||
    typeFilter !== 'all' ||
    moduleFilter !== 'all' ||
    featureFilter !== 'all' ||
    statusFilter !== 'all' ||
    severityFilter !== 'all';

  const resetAllFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setModuleFilter('all');
    setFeatureFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
  };

  // Pre-filter items strictly by criteria EXCEPT typeFilter (for dynamic, synchronized pill counts)
  const itemsMatchingOtherFilters = allFeatureDefects.filter((item) => {
    // 1. Text Search Filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchFeat = (item.featureName || '').toLowerCase().includes(q);
      const matchDevNote = (item.devNote || '').toLowerCase().includes(q);
      const matchRepro = (item.reproSteps || item.notes || '').toLowerCase().includes(q);
      const matchSev = (item.severity || item.priority || '').toLowerCase().includes(q);
      if (!matchId && !matchTitle && !matchFeat && !matchDevNote && !matchRepro && !matchSev) return false;
    }

    // 2. Strict Module Filter
    if (moduleFilter !== 'all') {
      const itemMod = (item.moduleName || 'General').trim().toLowerCase();
      const targetMod = moduleFilter.trim().toLowerCase();
      if (itemMod !== targetMod) return false;
    }

    // 3. Strict Feature Filter (strictly isolative to selected feature)
    if (featureFilter !== 'all') {
      const targetFeat = projectFeatures.find((f) => String(f.id) === String(featureFilter));
      const matchId = String(item.featureId) === String(featureFilter);
      const matchCode = item.featureCode && String(item.featureCode) === String(featureFilter);
      const matchTargetCode = targetFeat && targetFeat.code && String(item.featureCode || item.featureId) === String(targetFeat.code);
      if (!matchId && !matchCode && !matchTargetCode) return false;
    }

    // 4. Status Filter
    if (statusFilter !== 'all' && normalizeStatus(item.status) !== normalizeStatus(statusFilter)) return false;

    // 5. Severity Filter
    if (severityFilter !== 'all') {
      const itemSev = (item.severity || item.priority || 'Medium').toLowerCase();
      if (itemSev !== severityFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Filtered defects including typeFilter, sorted by latest added top
  const filteredItems = itemsMatchingOtherFilters
    .filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA && timeB && timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
    });

  const totalFilteredAll = itemsMatchingOtherFilters.length;
  const totalFilteredBugs = itemsMatchingOtherFilters.filter((d) => d.type === 'bug').length;
  const totalFilteredSuggs = itemsMatchingOtherFilters.filter((d) => d.type === 'suggestion').length;
  const openCount = filteredItems.filter((d) => normalizeStatus(d.status) !== 'verified').length;

  // Add Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (isSubmitting || !title.trim() || !targetFeatureId) return;

    setIsSubmitting(true);
    try {
      if (itemType === 'bug') {
        await addBugToFeature(targetFeatureId, {
          title: title.trim(),
          severity,
          reproSteps: reproSteps.trim()
        });
      } else {
        await addSuggestionToFeature(targetFeatureId, {
          title: title.trim(),
          priority,
          notes: notes.trim()
        });
      }

      setTitle('');
      setReproSteps('');
      setNotes('');
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workflow Action Handlers
  const handleMoveToInDev = (item) => {
    if (item.type === 'suggestion') {
      updateSuggestionStatus(item.featureId, item.id, 'in_dev');
    } else {
      updateFeatureBugStatus(item.featureId, item.id, 'in_dev');
    }
  };

  const openDevFixedModal = (item) => {
    setDevFixedTarget(item);
    setDevNoteText(item.devNote || '');
    setIsDevFixedModalOpen(true);
  };

  const handleConfirmDevFixed = (e) => {
    e.preventDefault();
    if (!devFixedTarget) return;

    const extra = { devNote: devNoteText.trim() };
    if (devFixedTarget.type === 'suggestion') {
      updateSuggestionStatus(devFixedTarget.featureId, devFixedTarget.id, 'ready_for_qa', extra);
    } else {
      updateFeatureBugStatus(devFixedTarget.featureId, devFixedTarget.id, 'ready_for_qa', extra);
    }

    setIsDevFixedModalOpen(false);
    if (viewItem && viewItem.id === devFixedTarget.id) {
      setViewItem((prev) => (prev ? { ...prev, status: 'ready_for_qa', devNote: devNoteText.trim() } : null));
    }
    setDevFixedTarget(null);
    setDevNoteText('');
  };

  const handleQAPass = (item) => {
    if (item.type === 'suggestion') {
      updateSuggestionStatus(item.featureId, item.id, 'verified');
    } else {
      updateFeatureBugStatus(item.featureId, item.id, 'verified');
    }
  };

  const handleReopen = (item) => {
    if (window.confirm(`Reopen this ${item.type === 'bug' ? 'defect' : 'suggestion'}?`)) {
      if (item.type === 'suggestion') {
        updateSuggestionStatus(item.featureId, item.id, 'open');
      } else {
        updateFeatureBugStatus(item.featureId, item.id, 'open');
      }
    }
  };

  // Edit Handlers
  const openEditModal = (item) => {
    setEditItem(item);
    setEditType(item.type || 'bug');
    setEditTitle(item.title || '');
    setEditSeverity(item.severity || item.priority || 'Medium');
    setEditReproSteps(item.reproSteps || item.notes || '');
    setEditDevNote(item.devNote || '');
    setEditStatus(item.status || 'open');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editItem || !editTitle.trim()) return;

    if (editType !== editItem.type) {
      convertDefectType(editItem.featureId, editItem.id, editItem.type, editType, {
        title: editTitle.trim(),
        severity: editSeverity,
        priority: editSeverity,
        reproSteps: editReproSteps.trim(),
        notes: editReproSteps.trim(),
        devNote: editDevNote.trim(),
        status: editStatus
      });
    } else if (editType === 'suggestion') {
      updateFeatureSuggestion(editItem.featureId, editItem.id, {
        title: editTitle.trim(),
        priority: editSeverity,
        notes: editReproSteps.trim(),
        devNote: editDevNote.trim(),
        status: editStatus
      });
    } else {
      updateFeatureBug(editItem.featureId, editItem.id, {
        title: editTitle.trim(),
        severity: editSeverity,
        reproSteps: editReproSteps.trim(),
        devNote: editDevNote.trim(),
        status: editStatus
      });
    }

    setEditItem(null);
  };

  // Delete Handler
  const handleDelete = (item) => {
    if (window.confirm(`Delete ${item.type === 'bug' ? 'defect' : 'suggestion'} "${item.title}"?`)) {
      if (item.type === 'suggestion') {
        deleteSuggestionFromFeature(item.featureId, item.id);
      } else {
        deleteBugFromFeature(item.featureId, item.id);
      }
    }
  };

  // Direct Status Change Handler
  const handleStatusChange = (item, newStatus) => {
    if (!newStatus || newStatus === item.status) return;

    if (item.type === 'suggestion') {
      updateSuggestionStatus(item.featureId, item.id, newStatus);
    } else {
      updateFeatureBugStatus(item.featureId, item.id, newStatus);
    }

    if (viewItem && viewItem.id === item.id) {
      setViewItem((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Status Dropdown rendering current status with theme-friendly styling
  const renderStatusDropdown = (item) => {
    const currentStatus = item.status || 'open';

    const getStatusStyle = (status) => {
      switch (status) {
        case 'in_dev':
          return {
            background: 'var(--accent-dev-subtle)',
            color: 'var(--accent-dev)',
            border: '1px solid var(--accent-dev-border)'
          };
        case 'ready_for_qa':
          return {
            background: 'var(--status-ready-bg)',
            color: 'var(--status-ready)',
            border: '1px solid var(--status-ready-border)'
          };
        case 'verified':
        case 'implemented':
          return {
            background: 'var(--accent-qa-subtle)',
            color: 'var(--accent-qa)',
            border: '1px solid var(--accent-qa-border)'
          };
        case 'qa_failed':
        case 'failed':
          return {
            background: 'var(--status-critical-bg)',
            color: 'var(--status-critical)',
            border: '1px solid var(--status-critical-border)'
          };
        case 'open':
        case 'new':
        default:
          return {
            background: 'var(--status-medium-bg)',
            color: 'var(--status-medium)',
            border: '1px solid var(--status-medium-border)'
          };
      }
    };

    return (
      <div
        className="status-dropdown-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(item, e.target.value)}
          className="status-dropdown-select"
          style={getStatusStyle(currentStatus)}
          title="Click to change status"
        >
          <option value="open">
            🟡 Need Dev
          </option>
          <option value="in_dev">
            🔵 In Dev
          </option>
          <option value="ready_for_qa">
            🟣 Dev Fixed
          </option>
          <option value="verified">
            🟢 QA Passed
          </option>
          <option value="qa_failed">
            🔴 QA Failed
          </option>
        </select>
        <ChevronDown
          size={12}
          style={{
            position: 'absolute',
            right: '0.55rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            opacity: 0.75,
            color: 'currentColor'
          }}
        />
      </div>
    );
  };

  return (
    <div>
      {/* Streamlined Filter & Search Bar with Integrated Add Action (No bulky top title bar) */}
      <div
        className="defects-filter-bar"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}
      >
        {/* Row 1: Search + Type Pills + Log Defect Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          {/* Search Input */}
          <div className="search-input-wrap" style={{ position: 'relative', minWidth: '220px', flex: '1 1 240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, title, repro steps, dev note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.45rem 2rem 0.45rem 2.2rem', fontSize: '0.82rem', width: '100%' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Action Row: Type Filter Pills & New Defect Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Type Filter Pills with Dynamic Synchronized Counts */}
            <div className="defects-type-pills" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-full)', overflowX: 'auto' }}>
              <button
                type="button"
                className={`persona-btn ${typeFilter === 'all' ? 'active-all' : ''}`}
                onClick={() => setTypeFilter('all')}
                style={{ fontSize: '0.76rem', padding: '0.3rem 0.75rem' }}
              >
                All ({totalFilteredAll})
              </button>
              <button
                type="button"
                className={`persona-btn ${typeFilter === 'bug' ? 'active-dev' : ''}`}
                onClick={() => setTypeFilter('bug')}
                style={{ fontSize: '0.76rem', padding: '0.3rem 0.75rem' }}
              >
                🐛 Bugs ({totalFilteredBugs})
              </button>
              <button
                type="button"
                className={`persona-btn ${typeFilter === 'suggestion' ? 'active-qa' : ''}`}
                onClick={() => setTypeFilter('suggestion')}
                style={{ fontSize: '0.76rem', padding: '0.3rem 0.75rem' }}
              >
                💡 Suggestions ({totalFilteredSuggs})
              </button>
            </div>

            {/* + Log Bug or Suggestion button (relocated to search row) */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setTargetFeatureId(projectFeatures[0]?.id || '');
                setIsAddModalOpen(true);
              }}
              style={{
                fontSize: '0.8rem',
                padding: '0.42rem 0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Plus size={14} />
              <span>Log Bug / Suggestion</span>
            </button>
          </div>
        </div>

        {/* Row 2: Searchable Module & Feature Dropdowns, Status, Severity, Meta counts */}
        <div className="defects-filter-selects" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Searchable Module Dropdown */}
          <SearchableDropdown
            options={moduleOptions}
            value={moduleFilter}
            onChange={handleModuleChange}
            allLabel={`📁 All Modules (${uniqueModules.length})`}
            placeholder="All Modules"
            searchPlaceholder="Search modules..."
            icon={Folder}
            minWidth="155px"
            maxWidth="220px"
            dropdownWidth="260px"
          />

          {/* Searchable Feature Dropdown */}
          <SearchableDropdown
            options={featureOptions}
            value={featureFilter}
            onChange={handleFeatureChange}
            allLabel={`📁 All Features (${availableFeatures.length})`}
            placeholder="All Features"
            searchPlaceholder="Search features by name/code..."
            icon={Layers}
            minWidth="185px"
            maxWidth="280px"
            dropdownWidth="320px"
          />

          {/* Status Filter Dropdown */}
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '0.42rem 0.65rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="open">🟡 Need Dev</option>
            <option value="in_dev">🔵 In Development</option>
            <option value="ready_for_qa">🟣 Dev Fixed</option>
            <option value="verified">🟢 QA Passed</option>
            <option value="qa_failed">🔴 QA Failed</option>
          </select>

          {/* Severity Filter Dropdown */}
          <select
            className="filter-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '0.42rem 0.65rem' }}
          >
            <option value="all">All Severities</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🔵 Low</option>
          </select>

          {/* Result Counter & Reset Button */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              Showing <strong style={{ color: 'var(--accent-dev)' }}>{filteredItems.length}</strong> of{' '}
              {allFeatureDefects.length} items
            </span>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetAllFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--status-critical)',
                  border: '1px solid var(--status-critical-border)',
                  cursor: 'pointer',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
                title="Reset all active filters"
              >
                <RotateCcw size={11} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simplified High-Capacity Table View */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}
        >
          <Filter size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No defects or suggestions match the selected criteria
          </h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {isAnyFilterActive
              ? 'Try relaxing or resetting your active filters to see items.'
              : 'No defects or suggestions logged yet for this project.'}
          </p>
          {isAnyFilterActive && (
            <button
              className="btn btn-secondary"
              onClick={resetAllFilters}
              style={{ fontSize: '0.8rem', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RotateCcw size={13} />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="tickets-table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Summary</th>
                <th style={{ width: '70px', textAlign: 'center' }}>Type</th>
                <th style={{ width: '200px' }}>Linked Feature</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isBug = item.type === 'bug';
                const sevColor = getSeverityColor(item.severity);

                return (
                  <tr
                    key={`${item.featureId}-${item.id}-${item.type}`}
                    onClick={() => setViewItem(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Summary */}
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                        {item.title}
                      </div>
                      {item.devNote && (
                        <div className="summary-dev-note">
                          <span className="summary-dev-badge">Dev Note</span>
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            "{item.devNote}"
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Type & Severity Icon */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        {isBug ? (
                          <div
                            className="type-icon-box"
                            style={{
                              background: item.severity === 'Critical' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                              border: `1px solid ${sevColor}`,
                              color: sevColor
                            }}
                            title={`Defect (${item.severity || 'Medium'})`}
                          >
                            <Bug size={14} />
                          </div>
                        ) : (
                          <div
                            className="type-icon-box"
                            style={{
                              background: 'rgba(234, 179, 8, 0.12)',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              color: '#eab308'
                            }}
                            title={`Suggestion (${item.priority || 'Medium'})`}
                          >
                            <Lightbulb size={14} />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Linked Feature */}
                    <td>
                      <span
                        className="tag-pill"
                        style={{
                          background: 'rgba(56, 189, 248, 0.08)',
                          color: 'var(--accent-dev)',
                          border: '1px solid var(--accent-dev-border)',
                          fontSize: '0.74rem',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const feat = projectFeatures.find((f) => f.id === item.featureId);
                          if (feat) openFeature(feat);
                        }}
                        title={`Click to open feature ${item.featureName}`}
                      >
                        <Layers size={11} />
                        <span>{item.featureName}</span>
                      </span>
                    </td>

                    {/* Status Dropdown */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {renderStatusDropdown(item)}
                      </div>
                    </td>

                    {/* Actions: Edit & Delete Icons */}
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            width: '26px',
                            height: '26px',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-surface)'
                          }}
                          onClick={() => openEditModal(item)}
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{
                            width: '26px',
                            height: '26px',
                            color: 'var(--status-critical)',
                            border: '1px solid var(--status-critical-border)',
                            background: 'var(--status-critical-bg)'
                          }}
                          onClick={() => handleDelete(item)}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dev Fixed Note Modal */}
      {isDevFixedModalOpen && devFixedTarget && (
        <div className="modal-overlay" onClick={() => setIsDevFixedModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', display: 'block' }}>
                  Mark as Dev Fixed
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Handover to QA for verification
                </span>
              </div>
              <button className="btn-icon" onClick={() => setIsDevFixedModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmDevFixed} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body single-col" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Target {devFixedTarget.type === 'bug' ? 'Defect' : 'Suggestion'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {devFixedTarget.title}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Developer Resolution Note (What was done?)
                  </label>
                  <textarea
                    className="form-textarea"
                    placeholder="e.g. Fixed null check on Safari, updated input validation pattern, and tested locally on staging..."
                    value={devNoteText}
                    onChange={(e) => setDevNoteText(e.target.value)}
                    style={{ minHeight: '90px' }}
                    autoFocus
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    This note will be shown directly to QA during retest verification.
                  </span>
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  flexShrink: 0,
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setIsDevFixedModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                    borderColor: 'rgba(139, 92, 246, 0.4)'
                  }}
                >
                  <Check size={14} />
                  <span>Confirm Dev Fixed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Defect / Suggestion Modal */}
      {editItem && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                Edit {editType === 'bug' ? 'Defect / Bug' : 'QA Suggestion'}
              </span>
              <button className="btn-icon" onClick={() => setEditItem(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body single-col" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                {/* Switch Classification: Bug vs Suggestion */}
                <div style={{ marginBottom: '1.15rem' }}>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
                    Item Classification
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`btn ${editType === 'bug' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        flex: 1,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem'
                      }}
                      onClick={() => setEditType('bug')}
                    >
                      <Bug size={14} />
                      <span>Defect / Bug</span>
                    </button>

                    <button
                      type="button"
                      className={`btn ${editType === 'suggestion' ? 'btn-qa' : 'btn-secondary'}`}
                      style={{
                        flex: 1,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem'
                      }}
                      onClick={() => setEditType('suggestion')}
                    >
                      <Lightbulb size={14} />
                      <span>QA Suggestion</span>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Summary / Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="responsive-form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      {editType === 'bug' ? 'Severity' : 'Priority'}
                    </label>
                    <select
                      className="form-select"
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value)}
                    >
                      {editType === 'bug' ? (
                        <>
                          <option value="Critical">🔴 Critical (Blocker)</option>
                          <option value="High">🟠 High Priority</option>
                          <option value="Medium">🟡 Medium Priority</option>
                          <option value="Low">🔵 Low Priority</option>
                        </>
                      ) : (
                        <>
                          <option value="High">🟠 High Priority</option>
                          <option value="Medium">🟡 Medium Priority</option>
                          <option value="Low">🔵 Low Priority</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="open">🟡 Need Dev (Open)</option>
                      <option value="in_dev">🔵 In Development</option>
                      <option value="ready_for_qa">🟣 Dev Fixed (Ready for QA)</option>
                      <option value="verified">🟢 QA Passed (Closed)</option>
                      <option value="qa_failed">🔴 QA Failed (Retest Failed)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {editType === 'bug' ? 'Steps to Reproduce' : 'Suggestion Details / Improvement Notes'}
                  </label>
                  <textarea
                    className="form-textarea"
                    value={editReproSteps}
                    onChange={(e) => setEditReproSteps(e.target.value)}
                    placeholder={editType === 'bug' ? '1. Navigate to screen\n2. Click action\n3. Observe crash...' : 'Explain the improvement and expected benefit...'}
                    style={{ minHeight: '75px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Developer Resolution Note</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Details of fix applied..."
                    value={editDevNote}
                    onChange={(e) => setEditDevNote(e.target.value)}
                    style={{ minHeight: '65px' }}
                  />
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  flexShrink: 0,
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                Log Bug or Suggestion Linked to Feature
              </span>
              <button className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body single-col" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                {/* Select Type: Bug vs Suggestion */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    className={`btn ${itemType === 'bug' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    onClick={() => setItemType('bug')}
                  >
                    <Bug size={14} />
                    <span>Defect / Bug</span>
                  </button>

                  <button
                    type="button"
                    className={`btn ${itemType === 'suggestion' ? 'btn-qa' : 'btn-secondary'}`}
                    style={{ flex: 1, fontSize: '0.82rem' }}
                    onClick={() => setItemType('suggestion')}
                  >
                    <Lightbulb size={14} />
                    <span>QA Suggestion</span>
                  </button>
                </div>

                {/* Target Feature Selector */}
                <div className="form-group">
                  <label className="form-label">Link to Feature *</label>
                  <SearchableDropdown
                    options={projectFeatures.map((f) => ({
                      value: f.id,
                      label: f.name,
                      sublabel: `${(f.moduleName || 'General').trim()} • ${f.code || f.id}`,
                      icon: <Layers size={12} color="var(--accent-dev)" />
                    }))}
                    value={targetFeatureId || (projectFeatures[0]?.id || '')}
                    onChange={(val) => setTargetFeatureId(val === 'all' ? (projectFeatures[0]?.id || '') : val)}
                    allLabel="Select a feature..."
                    allowClear={false}
                    placeholder="Search and select feature..."
                    searchPlaceholder="Type feature name, code or module..."
                    icon={Layers}
                    minWidth="100%"
                    maxWidth="100%"
                    dropdownWidth="100%"
                  />
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Summary / Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={itemType === 'bug' ? 'e.g. Phone number accepts letters on Safari...' : 'e.g. Add search-as-you-type filter to customer table...'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Severity / Priority */}
                {itemType === 'bug' ? (
                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select
                      className="form-select"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="Critical">🔴 Critical (Release Blocker)</option>
                      <option value="High">🟠 High Priority</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="Low">🔵 Low</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                )}

                {/* Repro Steps or Notes */}
                {itemType === 'bug' ? (
                  <div className="form-group">
                    <label className="form-label">Steps to Reproduce</label>
                    <textarea
                      className="form-textarea"
                      placeholder="1. Navigate to screen&#10;2. Click action&#10;3. Observe crash..."
                      value={reproSteps}
                      onChange={(e) => setReproSteps(e.target.value)}
                      style={{ minHeight: '65px' }}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Improvement Notes / Benefit</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Why would this improve the user or testing experience?..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{ minHeight: '65px' }}
                    />
                  </div>
                )}
              </div>

              <div
                className="modal-footer"
                style={{
                  flexShrink: 0,
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}
              >
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <span>{isSubmitting ? 'Saving...' : 'Save to Feature'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Item Detail Modal */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="tag-pill" style={{ background: 'var(--bg-surface)' }}>
                  📁 {viewItem.featureName}
                </span>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  {viewItem.type.toUpperCase()}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setViewItem(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body single-col">
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                {viewItem.title}
              </h2>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)', color: getSeverityColor(viewItem.severity) }}>
                  Severity: {viewItem.severity}
                </span>
                <span className="tag-pill" style={{ background: 'var(--bg-secondary)' }}>
                  Status: {viewItem.status || 'open'}
                </span>
              </div>

              {viewItem.reproSteps && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Steps to Reproduce:
                  </strong>
                  <div className="code-block" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                    {viewItem.reproSteps}
                  </div>
                </div>
              )}

              {viewItem.notes && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Suggestion Notes:
                  </strong>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {viewItem.notes}
                  </p>
                </div>
              )}

              {viewItem.devNote && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                  <strong style={{ fontSize: '0.8rem', color: '#c084fc', display: 'block', marginBottom: '4px' }}>
                    Developer Resolution Note:
                  </strong>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', margin: 0 }}>
                    {viewItem.devNote}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {renderStatusDropdown(viewItem)}

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => {
                    const item = viewItem;
                    setViewItem(null);
                    openEditModal(item);
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{
                    fontSize: '0.82rem',
                    background: 'rgba(244, 63, 94, 0.1)',
                    color: 'var(--status-critical)',
                    border: '1px solid var(--status-critical-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    handleDelete(viewItem);
                    setViewItem(null);
                  }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
