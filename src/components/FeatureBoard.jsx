import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bug,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Plus,
  GripVertical,
  FolderTree,
  FolderPlus,
  Layers,
  ChevronRight,
  Filter,
  Kanban as KanbanIcon,
  ListTree,
  Trash2,
  Edit2
} from 'lucide-react';

const FEATURE_COLUMNS = [
  { id: 'in_dev', title: '1. In Development', label: 'Active Coding' },
  { id: 'ready_for_qa', title: '2. Ready for Retest', label: 'Deployed to Staging' },
  { id: 'in_qa', title: '3. QA Verification', label: 'Testing & Defects' },
  { id: 'verified', title: '4. Verified & Closed', label: 'Completed' }
];

export default function FeatureBoard() {
  const {
    projectFeatures,
    projectModules,
    allModuleNames,
    activeProject,
    openFeature,
    openEditFeatureModal,
    updateFeatureStatus,
    moveFeatureCard,
    team,
    openCreateFeatureModal,
    setIsCreateModuleModalOpen,
    deleteModule
  } = useApp();

  const [draggedFeatId, setDraggedFeatId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const dragCounterRef = useRef({});
  const wasDraggingRef = useRef(false);

  // View state: 'kanban' | 'modules'
  const [viewMode, setViewMode] = useState('kanban');

  // Filter by Module: 'all' | specific moduleName
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');

  // Mobile Column Filter: 'all' | columnId
  const [mobileColFilter, setMobileColFilter] = useState('all');

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

  // Filter features based on selected module filter (Features ONLY on board!)
  const visibleFeatures = (projectFeatures || []).filter((feat) => {
    if (selectedModuleFilter === 'all') return true;
    return (feat.moduleName || '').trim().toLowerCase() === selectedModuleFilter.trim().toLowerCase();
  });

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

  // Drop on column container
  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    const featId = e.dataTransfer.getData('text/plain') || draggedFeatId;
    cleanupDragState();

    if (!featId) return;
    if (moveFeatureCard) {
      moveFeatureCard(featId, targetColId);
    } else {
      updateFeatureStatus(featId, targetColId);
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

    if (targetFeatId !== draggedFeatId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      setDragOverTarget({ cardId: targetFeatId, position });
    }
  };

  // Drop on card
  const handleCardDrop = (e, colId, targetFeatId) => {
    e.preventDefault();
    e.stopPropagation();
    const featId = e.dataTransfer.getData('text/plain') || draggedFeatId;
    const position = dragOverTarget?.position || 'after';

    cleanupDragState();

    if (!featId) return;
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
    <div>
      {/* Top Title & Actions Bar */}
      <div
        className="feature-top-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {activeProject?.name || 'Project Workspace'}
            </h1>
            <span
              style={{
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg-secondary)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {projectFeatures.length} Features
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px', marginBottom: 0 }}>
            Features organized under business modules (e.g. SETUP, Purchasing and inventory).
          </p>
        </div>

        {/* View Mode Toggle & Action Buttons */}
        <div className="feature-top-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* View Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-medium)'
            }}
          >
            <button
              className={`btn-icon ${viewMode === 'kanban' ? 'active' : ''}`}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                width: 'auto',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: viewMode === 'kanban' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)'
              }}
              onClick={() => setViewMode('kanban')}
              title="Kanban Board View"
            >
              <KanbanIcon size={14} />
              <span>Kanban Board</span>
            </button>
            <button
              className={`btn-icon ${viewMode === 'modules' ? 'active' : ''}`}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                width: 'auto',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: viewMode === 'modules' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'modules' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)'
              }}
              onClick={() => setViewMode('modules')}
              title="Modules & Features List"
            >
              <ListTree size={14} />
              <span>Modules & Features</span>
            </button>
          </div>

          {/* Modules Button */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsCreateModuleModalOpen(true)}
            style={{
              fontSize: '0.8rem',
              padding: '0.45rem 0.85rem',
              background: 'rgba(56, 189, 248, 0.1)',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: 'var(--accent-dev)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Manage modules with edit and delete options"
          >
            <FolderTree size={14} />
            <span>Modules</span>
            {distinctModuleNames.length > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'rgba(56, 189, 248, 0.2)',
                  fontWeight: 700
                }}
              >
                {distinctModuleNames.length}
              </span>
            )}
          </button>

          {/* Add Feature Button */}
          <button
            className="btn btn-primary"
            onClick={() => openCreateFeatureModal()}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
          >
            <Plus size={14} />
            <span>+ Add Feature</span>
          </button>
        </div>
      </div>

      {/* Module Navigation & Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.3rem'
        }}
      >
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Filter size={12} /> Modules:
        </span>

        {/* All Filter */}
        <button
          className={`tag-pill ${selectedModuleFilter === 'all' ? 'active-filter' : ''}`}
          onClick={() => setSelectedModuleFilter('all')}
          style={{
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: '0.75rem',
            background: selectedModuleFilter === 'all' ? 'var(--accent-dev)' : 'var(--bg-secondary)',
            color: selectedModuleFilter === 'all' ? '#fff' : 'var(--text-secondary)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-full)',
            whiteSpace: 'nowrap'
          }}
        >
          All Features ({projectFeatures.length})
        </button>

        {/* Dynamic Module Pills */}
        {distinctModuleNames.map((modName) => {
          const count = getFeaturesInModule(modName).length;
          const isSelected = selectedModuleFilter.toLowerCase() === modName.toLowerCase();

          return (
            <button
              key={modName}
              className={`tag-pill ${isSelected ? 'active-filter' : ''}`}
              onClick={() => setSelectedModuleFilter(isSelected ? 'all' : modName)}
              style={{
                cursor: 'pointer',
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: isSelected ? 'var(--accent-dev)' : 'var(--bg-secondary)',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-full)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span>📁 {modName}</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 5px',
                  borderRadius: '999px',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-elevated)',
                  color: isSelected ? '#fff' : 'var(--text-muted)'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: MODULES & FEATURES LIST VIEW */}
      {viewMode === 'modules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            distinctModuleNames.map((modName) => {
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
            {FEATURE_COLUMNS.map((c) => {
              const count = visibleFeatures.filter((f) => f.status === c.id).length;
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

          <div className="kanban-board">
            {FEATURE_COLUMNS.map((col) => {
              // Features ONLY go to the board columns!
              const colFeatures = visibleFeatures.filter((f) => f.status === col.id);
              const isOverCol = dragOverColId === col.id;
              const isHiddenOnMobile = mobileColFilter !== 'all' && mobileColFilter !== col.id;

              return (
                <div
                  key={col.id}
                  className={`kanban-col ${isOverCol ? 'col-drag-over' : ''} ${isHiddenOnMobile ? 'mobile-hidden' : ''}`}
                onDragOver={(e) => handleColDragOver(e, col.id)}
                onDragEnter={(e) => handleColDragEnter(e, col.id)}
                onDragLeave={(e) => handleColDragLeave(e, col.id)}
                onDrop={(e) => handleColDrop(e, col.id)}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
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
                  style={{ padding: '0.75rem', gap: '0.75rem', minHeight: '380px' }}
                >
                  {colFeatures.length === 0 ? (
                    <div
                      style={{
                        padding: '2.5rem 1rem',
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
                    colFeatures.map((feat) => {
                      const dev = team.find((m) => m.id === feat.assignedDev);
                      const qa = team.find((m) => m.id === feat.assignedQa);

                      const bugs = feat.bugs || [];
                      const openBugs = bugs.filter((b) => b.status !== 'verified');
                      const criticalOpen = openBugs.filter((b) => b.severity === 'Critical');
                      const suggestions = feat.suggestions || [];

                      const nextAction = getNextStatusAction(feat.status, openBugs.length);
                      const NextIcon = nextAction ? nextAction.icon : null;
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
                          className={`ticket-card ${isDragging ? 'is-dragging' : ''} ${dropPosClass}`}
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
                          style={{
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            cursor: 'grab'
                          }}
                          title="Drag to move or click to view details"
                        >
                          {/* Module Badge & Code */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span className="drag-grip-handle" title="Drag to move card">
                                <GripVertical size={14} />
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  color: 'var(--accent-dev)'
                                }}
                              >
                                {feat.code || feat.id}
                              </span>

                              {/* Module Badge */}
                              {feat.moduleName && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(56, 189, 248, 0.1)',
                                    color: 'var(--accent-dev)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  📁 {feat.moduleName}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {/* Release Pill */}
                              {feat.targetRelease && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'var(--font-mono)'
                                  }}
                                >
                                  {feat.targetRelease}
                                </span>
                              )}

                              {/* Edit Feature Button */}
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditFeatureModal(feat);
                                }}
                                title="Edit Feature"
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  padding: '2px',
                                  color: 'var(--text-muted)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '4px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-dev)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Feature Name */}
                          <div
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              lineHeight: 1.35,
                              color: 'var(--text-primary)'
                            }}
                          >
                            {feat.name}
                          </div>

                          {/* Description Snippet */}
                          {feat.description && (
                            <p
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--text-secondary)',
                                margin: 0,
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                            >
                              {feat.description}
                            </p>
                          )}

                          {/* Bottom Row: Bugs / Suggestions & Next Action */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '0.45rem',
                              borderTop: '1px solid var(--border-subtle)',
                              marginTop: '0.2rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                              {/* Open Bugs */}
                              {openBugs.length > 0 ? (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: criticalOpen.length > 0 ? 'var(--status-critical)' : '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  title={`${openBugs.length} open bugs (${criticalOpen.length} critical)`}
                                >
                                  <Bug size={13} />
                                  <span>{openBugs.length}</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--status-verified)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  title="No open defects"
                                >
                                  <CheckCircle2 size={13} />
                                </span>
                              )}

                              {/* Suggestions */}
                              {suggestions.length > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--status-suggested)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                  title={`${suggestions.length} suggestions`}
                                >
                                  <Lightbulb size={13} />
                                  <span>{suggestions.length}</span>
                                </span>
                              )}
                            </div>

                            {/* Dev & QA Avatars */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {dev && (
                                <span
                                  className="user-avatar-small"
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.65rem',
                                    background: dev.color
                                  }}
                                  title={`Dev: ${dev.name}`}
                                >
                                  {dev.initials}
                                </span>
                              )}
                              {qa && (
                                <span
                                  className="user-avatar-small"
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.65rem',
                                    background: qa.color
                                  }}
                                  title={`QA: ${qa.name}`}
                                >
                                  {qa.initials}
                                </span>
                              )}

                              {/* Quick Move Action */}
                              {nextAction && (
                                <button
                                  type="button"
                                  style={{
                                    marginLeft: '0.3rem',
                                    padding: '2px 7px',
                                    fontSize: '0.7rem',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-medium)',
                                    borderRadius: '4px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateFeatureStatus(feat.id, nextAction.next);
                                  }}
                                  title={`Move to ${nextAction.label}`}
                                >
                                  {NextIcon && <NextIcon size={11} />}
                                  <span>{nextAction.label}</span>
                                </button>
                              )}
                            </div>
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
        </>
      )}
    </div>
  );
}
