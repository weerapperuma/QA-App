import React from 'react';
import { useApp } from '../context/AppContext';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function TicketList() {
  const { filteredTickets, openTicket, team, updateTicketStatus } = useApp();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'backlog':
        return <span className="tag-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>Backlog</span>;
      case 'in_dev':
        return <span className="tag-pill" style={{ background: 'var(--accent-dev-subtle)', color: 'var(--accent-dev)', border: '1px solid var(--accent-dev-border)' }}>In Development</span>;
      case 'ready_for_qa':
        return <span className="tag-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>Ready for QA</span>;
      case 'in_qa':
        return <span className="tag-pill" style={{ background: 'var(--accent-qa-subtle)', color: 'var(--accent-qa)', border: '1px solid var(--accent-qa-border)' }}>QA Retesting</span>;
      case 'verified':
        return <span className="tag-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Verified & Closed</span>;
      case 'reopened':
        return <span className="tag-pill" style={{ background: 'var(--status-critical-bg)', color: 'var(--status-critical)', border: '1px solid var(--status-critical-border)' }}>Reopened / Failed</span>;
      default:
        return <span className="tag-pill">{status}</span>;
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <span className="tag-pill tag-severity-critical">🔴 Critical</span>;
      case 'high':
        return <span className="tag-pill tag-severity-high">🟠 High</span>;
      case 'medium':
        return <span className="tag-pill tag-severity-medium">🟡 Medium</span>;
      default:
        return <span className="tag-pill tag-severity-low">🔵 {sev}</span>;
    }
  };

  if (filteredTickets.length === 0) {
    return (
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
        <h3>No defects matched the selected filters</h3>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          Try clearing search keywords or removing severity/status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="tickets-table-wrap">
      <table className="tickets-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Summary</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Environment</th>
            <th>Component</th>
            <th>Assigned Dev</th>
            <th>Assigned QA</th>
            <th>PR / Staging</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredTickets.map((ticket) => {
            const dev = team.find((m) => m.id === ticket.assignedDev);
            const qa = team.find((m) => m.id === ticket.assignedQa);

            return (
              <tr key={ticket.id} onClick={() => openTicket(ticket)}>
                <td>
                  <span className="ticket-id">{ticket.id}</span>
                </td>
                <td style={{ maxWidth: '380px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ticket.title}
                  </div>
                </td>
                <td>{getSeverityBadge(ticket.severity)}</td>
                <td>{getStatusBadge(ticket.status)}</td>
                <td>
                  <span className="tag-pill tag-env">{ticket.environment}</span>
                </td>
                <td>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {ticket.component}
                  </span>
                </td>
                <td>
                  {dev ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                      <div className="user-avatar-small" style={{ background: dev.color }}>
                        {dev.initials}
                      </div>
                      <span>{dev.name.split(' ')[0]}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  {qa ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                      <div className="user-avatar-small" style={{ background: qa.color }}>
                        {qa.initials}
                      </div>
                      <span>{qa.name.split(' ')[0]}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td>
                  {ticket.prLink ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.78rem',
                        color: 'var(--accent-dev)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      <GitPullRequest size={12} />
                      #{ticket.prLink.split('/').pop()}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
