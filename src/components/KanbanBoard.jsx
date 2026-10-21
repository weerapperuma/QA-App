import React from 'react';
import { useApp } from '../context/AppContext';
import {
  GitPullRequest,
  CheckSquare,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

const COLUMNS = [
  { id: 'backlog', title: 'Backlog / Triage', roleFocus: 'all' },
  { id: 'in_dev', title: 'In Development', roleFocus: 'developer' },
  { id: 'ready_for_qa', title: 'Ready for Retest (Staging)', roleFocus: 'qa' },
  { id: 'in_qa', title: 'QA Verification', roleFocus: 'qa' },
  { id: 'verified', title: 'Verified & Closed', roleFocus: 'all' },
  { id: 'reopened', title: 'Reopened / Blocked', roleFocus: 'developer' }
];

export default function KanbanBoard() {
  const {
    filteredTickets,
    openTicket,
    updateTicketStatus,
    role,
    team
  } = useApp();

  const getSeverityClass = (sev) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return 'tag-severity-critical';
      case 'high':
        return 'tag-severity-high';
      case 'medium':
        return 'tag-severity-medium';
      case 'low':
      case 'minor':
        return 'tag-severity-low';
      default:
        return 'tag-severity-medium';
    }
  };

  const getNextStatusAction = (status) => {
    switch (status) {
      case 'backlog':
        return { next: 'in_dev', label: 'Start Dev', icon: ArrowRight };
      case 'in_dev':
        return { next: 'ready_for_qa', label: 'Deploy & QA', icon: Sparkles };
      case 'ready_for_qa':
        return { next: 'in_qa', label: 'Test Now', icon: ArrowRight };
      case 'in_qa':
        return { next: 'verified', label: 'Pass & Close', icon: ShieldCheck };
      case 'reopened':
        return { next: 'in_dev', label: 'Resume Fix', icon: RotateCcw };
      default:
        return null;
    }
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map((col) => {
        const columnTickets = filteredTickets.filter((t) => t.status === col.id);
        const isFocusedForRole =
          (role === 'developer' && col.roleFocus === 'developer') ||
          (role === 'qa' && col.roleFocus === 'qa');

        return (
          <div
            key={col.id}
            className={`kanban-col col-${col.id} ${isFocusedForRole ? 'role-focus-column' : ''}`}
          >
            <div className="col-indicator-line"></div>
            <div className="kanban-col-header">
              <div className="col-title-wrap">
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{col.title}</span>
                <span className="col-badge-count">{columnTickets.length}</span>
              </div>
            </div>

            <div className="kanban-cards-wrap">
              {columnTickets.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontStyle: 'italic'
                  }}
                >
                  No tickets in this stage
                </div>
              ) : (
                columnTickets.map((ticket) => {
                  const dev = team.find((m) => m.id === ticket.assignedDev);
                  const qa = team.find((m) => m.id === ticket.assignedQa);
                  const nextAction = getNextStatusAction(ticket.status);
                  const NextIcon = nextAction ? nextAction.icon : null;

                  const isDevHighlight = role === 'developer' && (ticket.status === 'in_dev' || ticket.status === 'reopened');
                  const isQaHighlight = role === 'qa' && ticket.status === 'ready_for_qa';

                  const checkedSteps = (ticket.reproSteps || []).filter((s) => s.checked).length;
                  const totalSteps = (ticket.reproSteps || []).length;

                  return (
                    <div
                      key={ticket.id}
                      className={`ticket-card ${
                        isDevHighlight ? 'role-highlight-dev' : isQaHighlight ? 'role-highlight-qa' : ''
                      }`}
                      onClick={() => openTicket(ticket)}
                    >
                      {/* Top Header */}
                      <div className="ticket-card-top">
                        <span className="ticket-id">{ticket.id}</span>
                        <span className={`tag-pill ${getSeverityClass(ticket.severity)}`}>
                          {ticket.severity}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="ticket-title">{ticket.title}</div>

                      {/* Tags & Environment */}
                      <div className="ticket-tags-row">
                        <span className="tag-pill tag-env">{ticket.environment}</span>
                        <span className="tag-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                          {ticket.component}
                        </span>
                        {ticket.prLink && (
                          <span
                            className="tag-pill"
                            style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}
                            title={ticket.prLink}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(ticket.prLink, '_blank');
                            }}
                          >
                            <GitPullRequest size={10} />
                            PR #{ticket.prLink.split('/').pop()}
                          </span>
                        )}
                      </div>

                      {/* Steps checklist & comments indicator */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckSquare size={13} color="var(--accent-qa)" />
                          <span>
                            {checkedSteps}/{totalSteps} repro steps
                          </span>
                        </div>

                        {ticket.comments && ticket.comments.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MessageSquare size={12} />
                            <span>{ticket.comments.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Assignees & Quick Advance */}
                      <div className="ticket-footer">
                        <div className="ticket-assignees" title={`Dev: ${dev?.name || 'Unassigned'} | QA: ${qa?.name || 'Unassigned'}`}>
                          {dev && (
                            <div
                              className="user-avatar-small"
                              style={{ background: dev.color }}
                              title={`Assigned Dev: ${dev.name}`}
                            >
                              {dev.initials}
                              <span className="avatar-badge-role dev"></span>
                            </div>
                          )}
                          {qa && (
                            <div
                              className="user-avatar-small"
                              style={{ background: qa.color }}
                              title={`Assigned QA: ${qa.name}`}
                            >
                              {qa.initials}
                              <span className="avatar-badge-role qa"></span>
                            </div>
                          )}
                        </div>

                        {nextAction && (
                          <button
                            className="quick-advance-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTicketStatus(ticket.id, nextAction.next);
                            }}
                            title={`Advance ticket to ${nextAction.next.replace('_', ' ')}`}
                          >
                            <span>{nextAction.label}</span>
                            <NextIcon size={12} />
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
  );
}
