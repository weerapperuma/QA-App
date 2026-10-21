import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bug,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Plus,
  GripVertical
} from 'lucide-react';

const FEATURE_COLUMNS = [
  { id: 'in_dev', title: '1. In Development', label: 'Active Coding' },
  { id: 'ready_for_qa', title: '2. Ready for Retest', label: 'Deployed to Staging' },
  { id: 'in_qa', title: '3. QA Verification', label: 'Bug Logging & Testing' },
  { id: 'verified', title: '4. Verified & Closed', label: 'Completed' }
];

export default function FeatureBoard() {
  const {
    projectFeatures,
    activeProject,
    openFeature,
    updateFeatureStatus,
    moveFeatureCard,
    team,
    setIsCreateFeatureModalOpen
  } = useApp();

  const [draggedFeatId, setDraggedFeatId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null); // { cardId, position: 'before' | 'after' }
  const dragCounterRef = useRef({});
  const wasDraggingRef = useRef(false);

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

  // Drop on column container (appends or moves to that column)
  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    const featId = e.dataTransfer.getData('text/plain') || draggedFeatId;
    cleanupDragState();

    if (!featId) return;
    if (moveFeatureCard) {
      moveFeatureCard(featId, targetColId, null);
    } else {
      updateFeatureStatus(featId, targetColId);
    }
  };

  // Drag over a specific card to show insertion line (before/after)
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

  // Drop on a specific card to insert before/after
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
      updateFeatureStatus(featId, targetColId);
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
        return { next: 'in_qa', label: 'Start Retest', icon: ArrowRight };
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
      {/* Clean Top Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            {activeProject?.name || 'ERP Suite'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {projectFeatures.length} features • Drag & drop cards across columns or within a list to prioritize.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setIsCreateFeatureModalOpen(true)}
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
        >
          <Plus size={14} />
          <span>New Feature</span>
        </button>
      </div>

      {/* 4-Column Clean Kanban Board with Drag & Drop */}
      <div
        className="kanban-board"
        style={{ gridTemplateColumns: 'repeat(4, minmax(280px, 1fr))' }}
      >
        {FEATURE_COLUMNS.map((col) => {
          const colFeatures = projectFeatures.filter((f) => f.status === col.id);
          const isOverCol = dragOverColId === col.id;

          return (
            <div
              key={col.id}
              className={`kanban-col ${isOverCol ? 'col-drag-over' : ''}`}
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
                        title="Drag to move or click to view feature details"
                      >
                        {/* Top: Code & Grip Handle & Assignees */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {dev && (
                              <div
                                className="user-avatar-small"
                                style={{ background: dev.color, width: '20px', height: '20px', fontSize: '0.62rem' }}
                                title={`Dev: ${dev.name}`}
                              >
                                {dev.initials}
                              </div>
                            )}
                            {qa && (
                              <div
                                className="user-avatar-small"
                                style={{ background: qa.color, width: '20px', height: '20px', fontSize: '0.62rem' }}
                                title={`QA: ${qa.name}`}
                              >
                                {qa.initials}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title & Short Description */}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                            {feat.name}
                          </div>
                          <p
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-secondary)',
                              marginTop: '3px',
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {feat.description}
                          </p>
                        </div>

                        {/* Clean Bug / Suggestion Counter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {bugs.length > 0 ? (
                            <span
                              className="tag-pill"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 7px',
                                background:
                                  openBugs.length > 0
                                    ? 'var(--status-critical-bg)'
                                    : 'var(--status-passed-bg)',
                                color:
                                  openBugs.length > 0
                                    ? 'var(--status-critical)'
                                    : 'var(--status-passed)',
                                border: `1px solid ${
                                  openBugs.length > 0
                                    ? 'var(--status-critical-border)'
                                    : 'rgba(16, 185, 129, 0.3)'
                                }`
                              }}
                            >
                              <Bug size={11} />
                              {openBugs.length > 0
                                ? `${openBugs.length} bug${openBugs.length > 1 ? 's' : ''} open ${
                                    criticalOpen.length > 0 ? '(1 blocker)' : ''
                                  }`
                                : 'All bugs verified ✅'}
                            </span>
                          ) : (
                            <span
                              className="tag-pill"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 7px',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              0 bugs reported
                            </span>
                          )}

                          {suggestions.length > 0 && (
                            <span
                              className="tag-pill"
                              style={{
                                fontSize: '0.7rem',
                                padding: '2px 7px',
                                background: 'rgba(234, 179, 8, 0.12)',
                                color: '#eab308',
                                border: '1px solid rgba(234, 179, 8, 0.3)'
                              }}
                            >
                              <Lightbulb size={11} />
                              {suggestions.length} sugg
                            </span>
                          )}
                        </div>

                        {/* Footer: Quick Next Action Button (Click or Drag!) */}
                        {nextAction && (
                          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              className="quick-advance-btn"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateFeatureStatus(feat.id, nextAction.next);
                              }}
                              title={`Advance to ${nextAction.label}`}
                            >
                              <span>{nextAction.label}</span>
                              <NextIcon size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Drop indicator at bottom when dragging over column with items */}
                {isOverCol && colFeatures.length > 0 && !dragOverTarget && (
                  <div
                    style={{
                      padding: '0.85rem',
                      textAlign: 'center',
                      color: 'var(--accent-dev)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      border: '2px dashed var(--accent-dev-border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(56, 189, 248, 0.06)'
                    }}
                  >
                    Drop here to move to {col.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
