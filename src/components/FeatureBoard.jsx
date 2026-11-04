import React, { useState, useRef, useLayoutEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bug,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Plus,
  FolderTree,
  FolderPlus,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Kanban as KanbanIcon,
  ListTree,
  Trash2,
  Edit2,
  Inbox,
  Hourglass,
  Play,
  Search,
  X
} from 'lucide-react';

const FEATURE_COLUMNS = [
  { id: 'in_dev', title: '1. In Development', label: 'Active Coding' },
  { id: 'ready_for_qa', title: '2. Ready for Retest', label: 'Deployed to Staging' },
  { id: 'in_qa', title: '3. QA Verification', label: 'Testing & Defects' },
  { id: 'verified', title: '4. Verified & Closed', label: 'Completed' }
];

// Bug / suggestion statuses that count as resolved
const DONE_ITEM_STATUSES = ['verified', 'implemented', 'qa_passed', 'qa passed', 'closed'];
const isItemDone = (st) => DONE_ITEM_STATUSES.includes((st || '').toLowerCase().trim());

export default function FeatureBoard() {
  const {
    projectFeatures,
    projectModules,
    allModuleNames,
    openFeature,
    openEditFeatureModal,
    updateFeatureStatus,
    moveFeatureCard,
    reorderFeatureInPhase,
    deleteFeature,
    startFeaturesDevelopment,
    canQaDecide,
    team,
    openCreateFeatureModal,
    setIsCreateModuleModalOpen,
    deleteModule,
    featureBoardModuleFilter: storedModuleFilter,
    setFeatureBoardModuleFilter: setSelectedModuleFilter,
    featureBoardViewMode: viewMode = 'kanban',
    setFeatureBoardViewMode: setViewMode
  } = useApp();

  const [draggedFeatId, setDraggedFeatId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const dragCounterRef = useRef({});
  const wasDraggingRef = useRef(false);

  // Mobile Column Filter: 'all' | columnId
  const [mobileColFilter, setMobileColFilter] = useState('all');

  // Feature Pool (backlog) UI state
  const [poolSearch, setPoolSearch] = useState('');
  // Horizontal board scroll: pool lives off-screen to the left of "In Development"
  const boardRef = useRef(null);
  const [isPoolInView, setIsPoolInView] = useState(false);
  const [poolSelectedIds, setPoolSelectedIds] = useState(() => new Set());

  // Distinct module names across all project modules and features
  const distinctModuleNames = Array.from(
    new Set([
      ...(allModuleNames || []),
      ...(projectModules || []).map((m) => m.name),
      ...(projectFeatures || []).map((f) => f.moduleName).filter(Boolean)
    ])
  );

  // Helper to get features belonging to a module
  const getFeaturesInModule = (modName) => {
    return (projectFeatures || []).filter(
      (f) => (f.moduleName || '').trim().toLowerCase() === (modName || '').trim().toLowerCase()
    );
  };

  // Resolve the active module: the remembered choice if it still exists,
  // otherwise default to the first module (only fall back to "all" when there are no modules).
  const storedMatch =
    storedModuleFilter && storedModuleFilter !== 'all'
      ? distinctModuleNames.find((m) => m.toLowerCase() === storedModuleFilter.toLowerCase())
      : null;
  const selectedModuleFilter =
    storedModuleFilter === 'all' ? 'all' : storedMatch || distinctModuleNames[0] || 'all';
  const isAllModules = selectedModuleFilter === 'all';

  // Filter features based on selected module filter
  const visibleFeatures = (projectFeatures || []).filter((feat) => {
    if (isAllModules) return true;
    return (feat.moduleName || '').trim().toLowerCase() === selectedModuleFilter.trim().toLowerCase();
  });

  // Pool (not yet started) vs. board (in the development lifecycle)
  const poolFeatures = visibleFeatures.filter((f) => f.status === 'backlog');
  const boardFeatures = visibleFeatures.filter((f) => f.status !== 'backlog');

  const poolQuery = poolSearch.trim().toLowerCase();
  const filteredPoolFeatures = poolQuery
    ? poolFeatures.filter((f) =>
        [f.name, f.code, f.description, f.moduleName].some((v) => (v || '').toLowerCase().includes(poolQuery))
      )
    : poolFeatures;
  const selectedPoolIds = filteredPoolFeatures.filter((f) => poolSelectedIds.has(f.id)).map((f) => f.id);
  const allPoolSelected = filteredPoolFeatures.length > 0 && selectedPoolIds.length === filteredPoolFeatures.length;

  const togglePoolSelect = (featId) => {
    setPoolSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(featId)) next.delete(featId);
      else next.add(featId);
      return next;
    });
  };

  const toggleSelectAllPool = () => {
    setPoolSelectedIds(allPoolSelected ? new Set() : new Set(filteredPoolFeatures.map((f) => f.id)));
  };

  const handleStartSelected = async () => {
    if (selectedPoolIds.length === 0 || !startFeaturesDevelopment) return;
    await startFeaturesDevelopment(selectedPoolIds);
    setPoolSelectedIds(new Set());
  };

  const selectModule = (modName) => {
    setSelectedModuleFilter(modName);
    setPoolSelectedIds(new Set());
    setPoolSearch('');
  };

  // Scroll the board so the given column sits at the left edge
  const scrollBoardTo = (colId, smooth = true) => {
    const board = boardRef.current;
    if (!board) return;
    if (colId === 'backlog') {
      board.scrollTo({ left: 0, behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    const col = board.querySelector(`[data-col-id="${colId}"]`);
    if (!col) return;
    const left = board.scrollLeft + (col.getBoundingClientRect().left - board.getBoundingClientRect().left);
    board.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleBoardScroll = () => {
    const board = boardRef.current;
    if (!board) return;
    const col = board.querySelector('[data-col-id="in_dev"]');
    const threshold = col ? col.offsetLeft - board.offsetLeft : 0;
    // Pool counts as "in view" once the user has scrolled noticeably toward it
    setIsPoolInView(board.scrollLeft < threshold - 40);
  };

  // On first view (and when switching module / back to kanban): show the 4 lifecycle columns
  useLayoutEffect(() => {
    if (viewMode !== 'kanban') return;
    scrollBoardTo('in_dev', false);
  }, [viewMode, selectedModuleFilter]);

  const addFeatureForCurrentModule = () =>
    openCreateFeatureModal(isAllModules ? undefined : { defaultModuleName: selectedModuleFilter });

  // Drag start
  const handleDragStart = (e, featId) => {
    setDraggedFeatId(featId);
    wasDraggingRef.current = true;
    e.dataTransfer.setData('text/plain', featId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag over column
  const handleColDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  // Drag enter column
  const handleColDragEnter = (e, colId) => {
    e.preventDefault();
    dragCounterRef.current[colId] = (dragCounterRef.current[colId] || 0) + 1;
    setDragOverColId(colId);
  };

  // Drag leave column
  const handleColDragLeave = (e, colId) => {
    dragCounterRef.current[colId] = (dragCounterRef.current[colId] || 0) - 1;
    if (dragCounterRef.current[colId] <= 0) {
      dragCounterRef.current[colId] = 0;
      if (dragOverColId === colId) {
        setDragOverColId(null);
      }
    }
  };

  // Drag over cards wrap (intelligent edge detection for blank spaces)
  const handleCardsWrapDragOver = (e, colId, colFeatures) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }

    if (!colFeatures || colFeatures.length === 0) {
      setDragOverTarget((prev) => (prev ? null : prev));
      return;
    }

    // Detect if pointer is above first card or below last card
    const wrap = e.currentTarget;
    const cards = wrap.querySelectorAll('.ticket-card:not(.is-dragging)');
    if (cards.length === 0) return;

    const firstCardRect = cards[0].getBoundingClientRect();
    const lastCardRect = cards[cards.length - 1].getBoundingClientRect();

    if (e.clientY < firstCardRect.top) {
      const firstFeatId = colFeatures[0]?.id;
      if (firstFeatId && firstFeatId !== draggedFeatId) {
        setDragOverTarget((prev) => {
          if (prev?.cardId === firstFeatId && prev?.position === 'before') return prev;
          return { cardId: firstFeatId, position: 'before' };
        });
      }
    } else if (e.clientY > lastCardRect.bottom) {
      const lastFeatId = colFeatures[colFeatures.length - 1]?.id;
      if (lastFeatId && lastFeatId !== draggedFeatId) {
        setDragOverTarget((prev) => {
          if (prev?.cardId === lastFeatId && prev?.position === 'after') return prev;
          return { cardId: lastFeatId, position: 'after' };
        });
      }
    }
  };

  // Drop on column container or cards wrap
  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    const featId = e.dataTransfer.getData('text/plain') || draggedFeatId;
    const currentTarget = dragOverTarget;
    cleanupDragState();

    if (!featId) return;
    if (currentTarget && currentTarget.cardId && currentTarget.cardId !== featId) {
      if (moveFeatureCard) {
        moveFeatureCard(featId, targetColId, currentTarget.cardId, currentTarget.position || 'after');
      } else {
        updateFeatureStatus(featId, targetColId);
      }
    } else {
      if (moveFeatureCard) {
        moveFeatureCard(featId, targetColId);
      } else {
        updateFeatureStatus(featId, targetColId);
      }
    }
  };

  // Drag over specific card
  const handleCardDragOver = (e, colId, targetFeatId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }

    if (targetFeatId === draggedFeatId) {
      setDragOverTarget((prev) => (prev ? null : prev));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    setDragOverTarget((prev) => {
      if (prev?.cardId === targetFeatId && prev?.position === position) {
        return prev;
      }
      return { cardId: targetFeatId, position };
    });
  };

  // Drop on card
  const handleCardDrop = (e, colId, targetFeatId) => {
    e.preventDefault();
    e.stopPropagation();
    const featId = e.dataTransfer.getData('text/plain') || draggedFeatId;
    const position = dragOverTarget?.cardId === targetFeatId ? dragOverTarget.position : 'after';

    cleanupDragState();

    if (!featId || featId === targetFeatId) return;
    if (moveFeatureCard) {
      moveFeatureCard(featId, colId, targetFeatId, position);
    } else {
      updateFeatureStatus(featId, colId);
    }
  };

  const cleanupDragState = () => {
    setDraggedFeatId(null);
    setDragOverColId(null);
    setDragOverTarget(null);
    dragCounterRef.current = {};
    setTimeout(() => {
      wasDraggingRef.current = false;
    }, 120);
  };

  const handleDragEnd = () => {
    cleanupDragState();
  };

  const getNextStatusAction = (status, openBugsCount) => {
    switch (status) {
      case 'in_dev':
        return { next: 'ready_for_qa', label: 'Deploy to QA', icon: Sparkles };
      case 'ready_for_qa':
        return { next: 'in_qa', label: 'Start Testing', icon: ArrowRight };
      case 'in_qa':
        if (openBugsCount === 0) {
          return { next: 'verified', label: 'Verify & Close', icon: CheckCircle2 };
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="feature-board-view">
      {/* Toolbar: module tabs (left) + actions (right) */}
      <div className="fb-toolbar">
        <div className="fb-module-tabs">
          {distinctModuleNames.map((modName) => {
            const isSelected = selectedModuleFilter.toLowerCase() === modName.toLowerCase();
            return (
              <button
                key={modName}
                type="button"
                className={`fb-tab ${isSelected ? 'active' : ''}`}
                onClick={() => selectModule(modName)}
              >
                <span>{modName}</span>
                <span className="fb-tab-count">{getFeaturesInModule(modName).length}</span>
              </button>
            );
          })}
          <button
            type="button"
            className={`fb-tab ${isAllModules ? 'active' : ''}`}
            onClick={() => selectModule('all')}
          >
            <span>All</span>
            <span className="fb-tab-count">{projectFeatures.length}</span>
          </button>
        </div>

        <div className="fb-actions">
          <div className="fb-segmented">
            <button
              type="button"
              className={viewMode === 'kanban' ? 'active' : ''}
              onClick={() => setViewMode('kanban')}
              title="Board view"
            >
              <KanbanIcon size={14} />
              <span>Board</span>
            </button>
            <button
              type="button"
              className={viewMode === 'modules' ? 'active' : ''}
              onClick={() => setViewMode('modules')}
              title="List view"
            >
              <ListTree size={14} />
              <span>List</span>
            </button>
          </div>

          <button
            type="button"
            className="fb-btn"
            onClick={() => setIsCreateModuleModalOpen(true)}
            title="Manage modules"
          >
            <FolderTree size={14} />
            <span>Modules</span>
          </button>

          <button type="button" className="fb-btn fb-btn-primary" onClick={addFeatureForCurrentModule}>
            <Plus size={14} />
            <span>Add Feature</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MODULES & FEATURES LIST VIEW */}
      {viewMode === 'modules' && (
        <div className="modules-list-view" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {distinctModuleNames.length === 0 ? (
            <div
              style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border-medium)'
              }}
            >
              <FolderPlus size={36} color="var(--accent-dev)" style={{ marginBottom: '0.75rem', opacity: 0.7 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
                No Modules Declared Yet
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.25rem' }}>
                Declare modules like "SETUP" or "Purchasing and inventory" to organize your features.
              </p>
              <button className="btn btn-primary" onClick={() => setIsCreateModuleModalOpen(true)}>
                <FolderPlus size={15} />
                <span>Declare First Module</span>
              </button>
            </div>
          ) : (
            (isAllModules
              ? distinctModuleNames
              : distinctModuleNames.filter((m) => m.toLowerCase() === selectedModuleFilter.toLowerCase())
            ).map((modName) => {
              const feats = getFeaturesInModule(modName);
              const verifiedCount = feats.filter((s) => s.status === 'verified').length;
              const passPct = feats.length > 0 ? Math.round((verifiedCount / feats.length) * 100) : 0;
              const modObj = (projectModules || []).find(
                (m) => m.name.toLowerCase() === modName.toLowerCase()
              );

              return (
                <div
                  key={modName}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Module Header Bar */}
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      background: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: 'var(--accent-dev)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FolderTree size={18} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                            {modName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontFamily: 'var(--font-mono)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: 'var(--accent-dev)',
                              fontWeight: 700
                            }}
                          >
                            MODULE
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {feats.length} {feats.length === 1 ? 'feature' : 'features'} • {verifiedCount}/{feats.length} verified ({passPct}%)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                        onClick={() => openCreateFeatureModal({ defaultModuleName: modName })}
                      >
                        <Plus size={13} />
                        <span>Add Feature to {modName}</span>
                      </button>

                      {modObj && deleteModule && (
                        <button
                          className="btn-icon"
                          style={{ padding: '6px', color: 'var(--text-muted)' }}
                          onClick={() => {
                            if (window.confirm(`Delete module "${modName}"? Features will remain.`)) {
                              deleteModule(modObj.id);
                            }
                          }}
                          title="Delete Module"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  {feats.length > 0 && (
                    <div style={{ width: '100%', height: '3px', background: 'var(--bg-surface)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${passPct}%`,
                          background: passPct === 100 ? 'var(--status-verified)' : 'var(--accent-dev)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  )}

                  {/* Features List in this Module */}
                  <div style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {feats.length === 0 ? (
                      <div
                        style={{
                          padding: '1.25rem',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          background: 'var(--bg-canvas)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border-color)'
                        }}
                      >
                        No features added to this module yet.
                        <button
                          className="btn-link"
                          style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-dev)', fontWeight: 600 }}
                          onClick={() => openCreateFeatureModal({ defaultModuleName: modName })}
                        >
                          + Add First Feature (e.g. Items, Customers)
                        </button>
                      </div>
                    ) : (
                      feats.map((feat) => {
                        const dev = team.find((m) => m.id === feat.assignedDev);
                        const qa = team.find((m) => m.id === feat.assignedQa);
                        const bugs = feat.bugs || [];
                        const openBugs = bugs.filter((b) => b.status !== 'verified');

                        const getStatusBadge = (st) => {
                          switch (st) {
                            case 'backlog':
                              return <span className="tag-pill" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px dashed var(--border-medium)' }}>In Pool</span>;
                            case 'in_dev':
                              return <span className="tag-pill" style={{ background: 'var(--accent-dev-subtle)', color: 'var(--accent-dev)' }}>In Development</span>;
                            case 'ready_for_qa':
                              return <span className="tag-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>Ready for Retest</span>;
                            case 'in_qa':
                              return <span className="tag-pill" style={{ background: 'var(--accent-qa-subtle)', color: 'var(--accent-qa)' }}>QA Testing</span>;
                            case 'verified':
                              return <span className="tag-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Verified</span>;
                            default:
                              return <span className="tag-pill">{st}</span>;
                          }
                        };

                        return (
                          <div
                            key={feat.id}
                            onClick={() => openFeature(feat)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.65rem 0.85rem',
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              gap: '0.75rem'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-dev)')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                              <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-dev)' }}>
                                {feat.code || feat.id}
                              </span>
                              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {feat.name}
                              </span>
                              {feat.description && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                                  — {feat.description}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0 }}>
                              {getStatusBadge(feat.status)}

                              {dev && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                  <span className="user-avatar-small" style={{ width: '18px', height: '18px', fontSize: '0.65rem', background: dev.color }}>
                                    {dev.initials}
                                  </span>
                                  <span>{dev.name.split(' ')[0]}</span>
                                </div>
                              )}

                              {openBugs.length > 0 && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--status-critical)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Bug size={12} /> {openBugs.length}
                                </span>
                              )}

                              {feat.status === 'backlog' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFeatureStatus(feat.id, 'in_dev');
                                  }}
                                  title="Pull this feature into development"
                                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Play size={11} />
                                  <span>Start Dev</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditFeatureModal(feat);
                                }}
                                title="Edit Feature"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  color: 'var(--accent-dev)',
                                  background: 'rgba(56, 189, 248, 0.1)',
                                  border: '1px solid var(--accent-dev-border)'
                                }}
                              >
                                <Edit2 size={12} />
                              </button>

                              <button
                                type="button"
                                className="btn-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      `Delete feature "${feat.name}"? This will permanently remove all associated bugs and suggestions.`
                                    )
                                  ) {
                                    deleteFeature(feat.id);
                                  }
                                }}
                                title="Delete Feature"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  color: 'var(--status-critical)',
                                  background: 'rgba(244, 63, 94, 0.1)',
                                  border: '1px solid var(--status-critical-border)'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>

                              <ChevronRight size={14} color="var(--text-muted)" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: 4-COLUMN KANBAN BOARD (FEATURES ONLY GO HERE!) */}
      {viewMode === 'kanban' && (
        <>
          {/* Mobile Column Switcher (visible on small screens) */}
          <div className="mobile-kanban-nav">
            <button
              type="button"
              className={`mobile-col-tab ${mobileColFilter === 'all' ? 'active' : ''}`}
              onClick={() => setMobileColFilter('all')}
            >
              <span>All Columns</span>
              <span className="mobile-col-badge">{visibleFeatures.length}</span>
            </button>
            <button
              type="button"
              className={`mobile-col-tab ${mobileColFilter === 'backlog' ? 'active' : ''}`}
              onClick={() => setMobileColFilter('backlog')}
            >
              <span>Feature Pool</span>
              <span className="mobile-col-badge">{poolFeatures.length}</span>
            </button>
            {FEATURE_COLUMNS.map((c) => {
              const count = boardFeatures.filter((f) => f.status === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`mobile-col-tab ${mobileColFilter === c.id ? 'active' : ''}`}
                  onClick={() => setMobileColFilter(c.id)}
                >
                  <span>{c.title.replace(/^\d+\.\s*/, '')}</span>
                  <span className="mobile-col-badge">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="kanban-board-wrap">
          {/* Left-edge tab to reveal the Feature Pool (also opens it while dragging a card) */}
          {!isPoolInView && mobileColFilter === 'all' && (
            <button
              type="button"
              className="pool-reveal-tab"
              onClick={() => scrollBoardTo('backlog')}
              onDragEnter={() => scrollBoardTo('backlog')}
              title="Show Feature Pool (features not started yet)"
            >
              <ChevronLeft size={14} />
              <span className="pool-reveal-label">Feature Pool</span>
              <span className="pool-reveal-count">{poolFeatures.length}</span>
            </button>
          )}

          <div className="kanban-board with-pool" ref={boardRef} onScroll={handleBoardScroll}>
            {/* FEATURE POOL (backlog): features added but not yet started */}
            <div
              data-col-id="backlog"
              className={`kanban-col feature-pool-col ${dragOverColId === 'backlog' ? 'col-drag-over' : ''} ${
                mobileColFilter !== 'all' && mobileColFilter !== 'backlog' ? 'mobile-hidden' : ''
              }`}
              onDragOver={(e) => handleColDragOver(e, 'backlog')}
              onDragEnter={(e) => handleColDragEnter(e, 'backlog')}
              onDragLeave={(e) => handleColDragLeave(e, 'backlog')}
              onDrop={(e) => {
                e.preventDefault();
                const featId = e.dataTransfer.getData('text/plain') || draggedFeatId;
                cleanupDragState();
                const dropped = (projectFeatures || []).find((f) => f.id === featId);
                if (dropped && dropped.status !== 'backlog' && moveFeatureCard) {
                  moveFeatureCard(featId, 'backlog');
                }
              }}
            >
              <div
                className="kanban-col-header"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Inbox size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Feature Pool</span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-surface)',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    {poolFeatures.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={addFeatureForCurrentModule}
                    title={isAllModules ? 'Add feature to pool' : `Add feature to ${selectedModuleFilter} pool`}
                    style={{ width: '24px', height: '24px', color: 'var(--accent-dev)' }}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => scrollBoardTo('in_dev')}
                    title="Back to board"
                    style={{ width: '24px', height: '24px', color: 'var(--text-muted)' }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Pool toolbar: search + bulk start */}
              <div
                style={{
                  padding: '0.5rem 0.6rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  flexShrink: 0
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Search
                    size={12}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    placeholder="Search pool…"
                    style={{ width: '100%', fontSize: '0.76rem', padding: '0.3rem 1.6rem' }}
                  />
                  {poolSearch && (
                    <button
                      type="button"
                      onClick={() => setPoolSearch('')}
                      title="Clear search"
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex'
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {filteredPoolFeatures.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <input type="checkbox" checked={allPoolSelected} onChange={toggleSelectAllPool} />
                      <span>Select all</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={selectedPoolIds.length === 0}
                      onClick={handleStartSelected}
                      title="Move the selected features into In Development"
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.25rem 0.55rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        opacity: selectedPoolIds.length === 0 ? 0.5 : 1
                      }}
                    >
                      <Play size={11} />
                      <span>Start Dev{selectedPoolIds.length > 0 ? ` (${selectedPoolIds.length})` : ''}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="kanban-cards-wrap" style={{ gap: '0.35rem' }}>
                {filteredPoolFeatures.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem 0.75rem',
                      textAlign: 'center',
                      color: dragOverColId === 'backlog' ? 'var(--accent-dev)' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      lineHeight: 1.45
                    }}
                  >
                    {dragOverColId === 'backlog'
                      ? 'Drop to move back to the pool'
                      : poolQuery
                      ? 'No pooled features match your search.'
                      : 'Pool is empty. Add features here, then pull them into development.'}
                  </div>
                ) : (
                  filteredPoolFeatures.map((feat) => {
                    const isChecked = poolSelectedIds.has(feat.id);
                    return (
                      <div
                        key={feat.id}
                        className={`ticket-card ${draggedFeatId === feat.id ? 'is-dragging' : ''}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, feat.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (!wasDraggingRef.current) openFeature(feat);
                        }}
                        title="Drag into In Development, or click to view details"
                        style={{
                          padding: '0.45rem 0.55rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          cursor: 'grab',
                          borderStyle: 'dashed',
                          borderColor: isChecked ? 'var(--accent-dev)' : undefined
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => togglePoolSelect(feat.id)}
                          title="Select for bulk start"
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: 'var(--accent-dev)'
                              }}
                            >
                              {feat.code || feat.id}
                            </span>
                            {isAllModules && feat.moduleName && (
                              <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>📁 {feat.moduleName}</span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={feat.name}
                          >
                            {feat.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateFeatureStatus(feat.id, 'in_dev');
                          }}
                          title="Start development"
                          style={{
                            width: '22px',
                            height: '22px',
                            flexShrink: 0,
                            color: 'var(--accent-dev)',
                            background: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid var(--accent-dev-border)'
                          }}
                        >
                          <Play size={11} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditFeatureModal(feat);
                          }}
                          title="Edit Feature"
                          style={{
                            width: '22px',
                            height: '22px',
                            flexShrink: 0,
                            color: 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none'
                          }}
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete feature "${feat.name}" from the pool?`)) {
                              deleteFeature(feat.id);
                            }
                          }}
                          title="Delete Feature"
                          style={{
                            width: '22px',
                            height: '22px',
                            flexShrink: 0,
                            color: 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none'
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {FEATURE_COLUMNS.map((col) => {
              // Only features in the development lifecycle go to the board columns
              const colFeatures = boardFeatures.filter((f) => f.status === col.id);
              const isOverCol = dragOverColId === col.id;
              const isHiddenOnMobile = mobileColFilter !== 'all' && mobileColFilter !== col.id;

              return (
                <div
                  key={col.id}
                  data-col-id={col.id}
                  className={`kanban-col ${isOverCol ? 'col-drag-over' : ''} ${isHiddenOnMobile ? 'mobile-hidden' : ''}`}
                onDragOver={(e) => handleColDragOver(e, col.id)}
                onDragEnter={(e) => handleColDragEnter(e, col.id)}
                onDragLeave={(e) => handleColDragLeave(e, col.id)}
                onDrop={(e) => handleColDrop(e, col.id)}
              >
                {/* Header */}
                <div
                  className="kanban-col-header"
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>{col.title}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-surface)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {colFeatures.length}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {col.label}
                  </span>
                </div>

                {/* Cards Wrap */}
                <div
                  className="kanban-cards-wrap"
                  onDragOver={(e) => handleCardsWrapDragOver(e, col.id, colFeatures)}
                  onDrop={(e) => handleColDrop(e, col.id)}
                >
                  {colFeatures.length === 0 ? (
                    <div
                      style={{
                        padding: '1.75rem 0.75rem',
                        textAlign: 'center',
                        color: isOverCol ? 'var(--accent-dev)' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        border: isOverCol ? '2px dashed var(--accent-dev-border)' : '1px dashed transparent',
                        borderRadius: 'var(--radius-md)',
                        transition: 'all 0.2s',
                        background: isOverCol ? 'rgba(56, 189, 248, 0.05)' : 'transparent'
                      }}
                    >
                      {isOverCol ? 'Drop card here' : 'No features'}
                    </div>
                  ) : (
                    colFeatures.map((feat, featIndex) => {
                      const dev = team.find((m) => m.id === feat.assignedDev);
                      const qa = team.find((m) => m.id === feat.assignedQa);

                      const bugs = feat.bugs || [];
                      const suggestions = feat.suggestions || [];
                      const fixedBugs = bugs.filter((b) => isItemDone(b.status)).length;
                      const doneSuggs = suggestions.filter((s) => isItemDone(s.status)).length;
                      const openBugCount = bugs.length - fixedBugs;
                      const hasCriticalOpen = bugs.some((b) => !isItemDone(b.status) && b.severity === 'Critical');

                      const openFutureItems = (feat.futureItems || []).filter((i) => i.status !== 'done').length;
                      const totalItems = bugs.length + suggestions.length;
                      const doneItems = fixedBugs + doneSuggs;
                      const isVerified = feat.status === 'verified';
                      const progressPct = isVerified
                        ? 100
                        : totalItems > 0
                        ? Math.round((doneItems / totalItems) * 100)
                        : 0;
                      const progressTone = isVerified || (totalItems > 0 && doneItems === totalItems)
                        ? 'done'
                        : hasCriticalOpen
                        ? 'critical'
                        : openBugCount > 0
                        ? 'warn'
                        : 'normal';
                      const progressLabel = isVerified
                        ? 'QA passed'
                        : totalItems === 0
                        ? feat.status === 'in_qa'
                          ? 'Testing — no issues yet'
                          : 'No issues logged'
                        : `${doneItems}/${totalItems} resolved`;

                      const rawNext = getNextStatusAction(feat.status, openBugCount);
                      // Verify & Close is a QA decision
                      const nextAction = rawNext && rawNext.next === 'verified' && !canQaDecide ? null : rawNext;
                      const isDragging = draggedFeatId === feat.id;

                      const isCardTarget = dragOverTarget?.cardId === feat.id;
                      const dropPosClass = isCardTarget
                        ? dragOverTarget.position === 'before'
                          ? 'drop-before'
                          : 'drop-after'
                        : '';

                      return (
                        <div
                          key={feat.id}
                          className={`ticket-card feat-card ${isDragging ? 'is-dragging' : ''} ${dropPosClass}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, feat.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleCardDragOver(e, col.id, feat.id)}
                          onDrop={(e) => handleCardDrop(e, col.id, feat.id)}
                          onClick={() => {
                            if (!wasDraggingRef.current) {
                              openFeature(feat);
                            }
                          }}
                          title="Drag to move or click to view details"
                        >
                          {/* Top row: code (+ module when viewing all) and hover actions */}
                          <div className="feat-card-top">
                            <span className="feat-card-code">{feat.code || feat.id}</span>
                            {isAllModules && feat.moduleName && (
                              <span className="feat-card-module">{feat.moduleName}</span>
                            )}

                            <div className="feat-card-actions" onClick={(e) => e.stopPropagation()}>
                              {colFeatures.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    disabled={featIndex === 0}
                                    onClick={() => reorderFeatureInPhase && reorderFeatureInPhase(feat.id, 'up')}
                                    title="Move up"
                                  >
                                    <ChevronUp size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={featIndex === colFeatures.length - 1}
                                    onClick={() => reorderFeatureInPhase && reorderFeatureInPhase(feat.id, 'down')}
                                    title="Move down"
                                  >
                                    <ChevronDown size={12} />
                                  </button>
                                </>
                              )}
                              <button type="button" onClick={() => openEditFeatureModal(feat)} title="Edit Feature">
                                <Edit2 size={11} />
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete feature "${feat.name}"? This will permanently remove all associated bugs and suggestions.`
                                    )
                                  ) {
                                    deleteFeature(feat.id);
                                  }
                                }}
                                title="Delete Feature"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <div className="feat-card-title">{feat.name}</div>

                          {/* Progress */}
                          <div className="feat-card-progress">
                            <div className="feat-card-bar">
                              <div
                                className={`feat-card-bar-fill tone-${progressTone}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className={`feat-card-progress-label tone-${progressTone}`}>
                              {isVerified && <CheckCircle2 size={11} />}
                              {progressLabel}
                            </span>
                          </div>

                          {/* Footer: counts, people, next step */}
                          <div className="feat-card-footer">
                            <span
                              className={`feat-card-stat ${openBugCount > 0 ? (hasCriticalOpen ? 'tone-critical' : 'tone-warn') : ''}`}
                              title={`Bugs: ${fixedBugs} fixed of ${bugs.length}${hasCriticalOpen ? ' (critical open)' : ''}`}
                            >
                              <Bug size={12} />
                              {fixedBugs}/{bugs.length}
                            </span>
                            <span
                              className="feat-card-stat"
                              title={`Suggestions: ${doneSuggs} done of ${suggestions.length}`}
                            >
                              <Lightbulb size={12} />
                              {doneSuggs}/{suggestions.length}
                            </span>
                            {openFutureItems > 0 && (
                              <span
                                className="feat-card-stat tone-warn"
                                title={`${openFutureItems} future item(s) pending — see Release Gate`}
                              >
                                <Hourglass size={12} />
                                {openFutureItems}
                              </span>
                            )}

                            <div className="feat-card-people">
                              {dev && (
                                <span className="user-avatar-small" style={{ background: dev.color }} title={`Dev: ${dev.name}`}>
                                  {dev.initials}
                                </span>
                              )}
                              {qa && qa.id !== dev?.id && (
                                <span className="user-avatar-small" style={{ background: qa.color }} title={`QA: ${qa.name}`}>
                                  {qa.initials}
                                </span>
                              )}
                            </div>

                            {nextAction && (
                              <button
                                type="button"
                                className="feat-card-next"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateFeatureStatus(feat.id, nextAction.next);
                                }}
                                title={nextAction.label}
                              >
                                <span>{nextAction.label}</span>
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
