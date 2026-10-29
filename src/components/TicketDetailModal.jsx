import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckSquare,
  Square,
  GitPullRequest,
  Copy,
  Check,
  Send,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Code2,
  ShieldCheck,
  Server,
  ArrowRight
} from 'lucide-react';
import { parseDateSafe } from '../utils/dateUtils';

export default function TicketDetailModal() {
  const {
    selectedTicket,
    closeTicket,
    updateTicket,
    updateTicketStatus,
    toggleReproStep,
    addComment,
    deleteTicket,
    team,
    environments,
    role
  } = useApp();

  const [copiedCurl, setCopiedCurl] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  const [showFailForm, setShowFailForm] = useState(false);

  // Dev handoff form fields
  const [handoffPr, setHandoffPr] = useState('');
  const [handoffBuild, setHandoffBuild] = useState('#413');
  const [handoffNotes, setHandoffNotes] = useState('');

  // QA fail form fields
  const [failReason, setFailReason] = useState('');

  if (!selectedTicket) return null;

  const dev = team.find((m) => m.id === selectedTicket.assignedDev);
  const qa = team.find((m) => m.id === selectedTicket.assignedQa);
  const reporter = team.find((m) => m.id === selectedTicket.reportedBy);

  const copyCurl = () => {
    if (!selectedTicket.curlSnippet) return;
    navigator.clipboard.writeText(selectedTicket.curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handlePostComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment(
      selectedTicket.id,
      commentText,
      role === 'developer' ? selectedTicket.assignedDev || 'user-1' : selectedTicket.assignedQa || 'user-2'
    );
    setCommentText('');
  };

  const handleDevHandoffSubmit = (e) => {
    e.preventDefault();
    updateTicketStatus(selectedTicket.id, 'ready_for_qa', {
      prLink: handoffPr || selectedTicket.prLink,
      stagingBuild: handoffBuild,
      devHandoffNotes: handoffNotes
    });
    setShowHandoffForm(false);
  };

  const handleQaFailSubmit = (e) => {
    e.preventDefault();
    updateTicketStatus(selectedTicket.id, 'reopened', {
      qaVerificationNotes: failReason
    });
    setShowFailForm(false);
  };

  return (
    <div className="modal-overlay" onClick={closeTicket}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span className="ticket-id" style={{ fontSize: '1rem' }}>
              {selectedTicket.id}
            </span>
            <span
              className="tag-pill tag-env"
              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
            >
              {selectedTicket.environment}
            </span>
            <span
              className="tag-pill"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                fontSize: '0.75rem'
              }}
            >
              {selectedTicket.component}
            </span>
          </div>

          <button className="btn-icon" onClick={closeTicket}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Main Left Pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            {/* Title & Description */}
            <div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '0.6rem',
                  color: 'var(--text-primary)'
                }}
              >
                {selectedTicket.title}
              </h2>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.6'
                }}
              >
                {selectedTicket.description}
              </p>
            </div>

            {/* Repro Steps Checklist */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.4rem'
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <CheckSquare size={16} color="var(--accent-qa)" />
                  Steps to Reproduce (Interactive Verification)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click to check off verified steps
                </span>
              </div>

              <div className="repro-list">
                {selectedTicket.reproSteps && selectedTicket.reproSteps.length > 0 ? (
                  selectedTicket.reproSteps.map((step) => (
                    <div
                      key={step.id}
                      className={`repro-item ${step.checked ? 'checked' : ''}`}
                      onClick={() => toggleReproStep(selectedTicket.id, step.id)}
                    >
                      <input
                        type="checkbox"
                        checked={step.checked}
                        onChange={() => {}}
                        className="repro-checkbox"
                      />
                      <span>{step.text}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No steps specified.
                  </div>
                )}
              </div>
            </div>

            {/* Expected vs Actual Comparison */}
            <div
              className="responsive-form-grid-2"
              style={{
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--accent-qa)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.3rem'
                  }}
                >
                  Expected Behavior
                </span>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  {selectedTicket.expectedResult || 'Not specified'}
                </p>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--status-critical)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.3rem'
                  }}
                >
                  Actual Behavior
                </span>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  {selectedTicket.actualResult || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Logs & cURL Snippet */}
            {selectedTicket.curlSnippet && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.4rem'
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Reproduction cURL / API Payload
                  </span>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    onClick={copyCurl}
                  >
                    {copiedCurl ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedCurl ? 'Copied!' : 'Copy cURL'}</span>
                  </button>
                </div>
                <div className="code-block">{selectedTicket.curlSnippet}</div>
              </div>
            )}

            {selectedTicket.networkLog && (
              <div>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'block',
                    marginBottom: '0.4rem'
                  }}
                >
                  Server / Network Trace Log
                </span>
                <div
                  className="code-block"
                  style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.04)' }}
                >
                  {selectedTicket.networkLog}
                </div>
              </div>
            )}

            {/* Developer Handoff Box */}
            <div className="handoff-box dev-box">
              <div className="handoff-box-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-dev)' }}>
                  <Code2 size={16} />
                  Developer Handoff Information
                </span>
                {selectedTicket.prLink && (
                  <a
                    href={selectedTicket.prLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: 'var(--accent-dev)',
                      fontSize: '0.75rem',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    <GitPullRequest size={12} />
                    View Pull Request
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.82rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Staging Build: </strong>
                  <span>{selectedTicket.stagingBuild || 'Pending'}</span>
                </div>
                {selectedTicket.commitSha && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Commit SHA: </strong>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedTicket.commitSha}</span>
                  </div>
                )}
              </div>

              {selectedTicket.devHandoffNotes && (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  <strong>Developer Testing Notes: </strong>
                  {selectedTicket.devHandoffNotes}
                </div>
              )}
            </div>

            {/* QA Verification Box */}
            {selectedTicket.qaVerificationNotes && (
              <div className="handoff-box qa-box">
                <div className="handoff-box-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-qa)' }}>
                    <ShieldCheck size={16} />
                    QA Verification Results
                  </span>
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  {selectedTicket.qaVerificationNotes}
                </div>
              </div>
            )}

            {/* Collaboration Comment Thread */}
            <div style={{ marginTop: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '0.8rem'
                }}
              >
                Developer & QA Discussion ({selectedTicket.comments?.length || 0})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedTicket.comments?.map((comment) => {
                  const author = team.find((m) => m.id === comment.authorId);
                  const isDev = author?.role === 'developer';

                  return (
                    <div
                      key={comment.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.35rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            className="user-avatar-small"
                            style={{ background: author?.color || '#6366f1' }}
                          >
                            {author?.initials || 'U'}
                          </div>
                          <span style={{ fontSize: '0.83rem', fontWeight: 600 }}>
                            {author?.name || 'User'}
                          </span>
                          <span
                            className="tag-pill"
                            style={{
                              fontSize: '0.65rem',
                              background: isDev ? 'var(--accent-dev-subtle)' : 'var(--accent-qa-subtle)',
                              color: isDev ? 'var(--accent-dev)' : 'var(--accent-qa)'
                            }}
                          >
                            {isDev ? 'Dev' : 'QA'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                        {comment.text}
                      </p>
                    </div>
                  );
                })}

                {/* Comment Input */}
                <form
                  onSubmit={handlePostComment}
                  style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Write a message to dev or QA (e.g. repro steps, staging build details)..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem' }}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Sidebar Metadata */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem',
              height: 'fit-content'
            }}
          >
            {/* Quick Collaborative Workflow Actions */}
            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginBottom: '0.6rem'
                }}
              >
                Handoff Actions
              </span>

              {/* Developer: Mark Ready for QA */}
              {(selectedTicket.status === 'in_dev' || selectedTicket.status === 'reopened') && (
                <div>
                  {!showHandoffForm ? (
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                      onClick={() => setShowHandoffForm(true)}
                    >
                      <Server size={14} />
                      <span>Deploy & Send to QA</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--accent-dev-border)',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-dev)' }}>
                        Confirm Staging Handoff
                      </span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="PR Link (e.g. #342)"
                        value={handoffPr}
                        onChange={(e) => setHandoffPr(e.target.value)}
                        style={{ fontSize: '0.78rem', padding: '0.4rem' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Staging Build (e.g. #412)"
                        value={handoffBuild}
                        onChange={(e) => setHandoffBuild(e.target.value)}
                        style={{ fontSize: '0.78rem', padding: '0.4rem' }}
                      />
                      <textarea
                        className="form-textarea"
                        placeholder="Testing tips for QA..."
                        value={handoffNotes}
                        onChange={(e) => setHandoffNotes(e.target.value)}
                        style={{ fontSize: '0.78rem', minHeight: '60px' }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
                          onClick={handleDevHandoffSubmit}
                        >
                          Confirm & Notify QA
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                          onClick={() => setShowHandoffForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* QA: Ready for QA -> In QA */}
              {selectedTicket.status === 'ready_for_qa' && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                  onClick={() => updateTicketStatus(selectedTicket.id, 'in_qa')}
                >
                  <ArrowRight size={14} />
                  <span>Start QA Verification</span>
                </button>
              )}

              {/* QA: In Verification Actions */}
              {selectedTicket.status === 'in_qa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="btn btn-qa"
                    style={{ width: '100%' }}
                    onClick={() => updateTicketStatus(selectedTicket.id, 'verified')}
                  >
                    <CheckCircle2 size={15} />
                    <span>Pass & Close (Verified)</span>
                  </button>

                  {!showFailForm ? (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', color: 'var(--status-critical)' }}
                      onClick={() => setShowFailForm(true)}
                    >
                      <AlertTriangle size={14} />
                      <span>Fail Retest & Reopen</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--status-critical-border)',
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--status-critical)' }}>
                        Retest Failure Reason
                      </span>
                      <textarea
                        className="form-textarea"
                        placeholder="Explain why verification failed on staging..."
                        value={failReason}
                        onChange={(e) => setFailReason(e.target.value)}
                        style={{ fontSize: '0.78rem', minHeight: '60px' }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            color: 'var(--status-critical)',
                            padding: '0.4rem'
                          }}
                          onClick={handleQaFailSubmit}
                        >
                          Reopen Ticket
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.4rem' }}
                          onClick={() => setShowFailForm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Workflow Status</label>
              <select
                className="form-select"
                value={selectedTicket.status}
                onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
              >
                <option value="backlog">Backlog / Triage</option>
                <option value="in_dev">In Development</option>
                <option value="ready_for_qa">Ready for QA (Staging)</option>
                <option value="in_qa">QA Verification</option>
                <option value="verified">Verified & Closed</option>
                <option value="reopened">Reopened / Blocked</option>
              </select>
            </div>

            {/* Severity */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Severity Level</label>
              <select
                className="form-select"
                value={selectedTicket.severity}
                onChange={(e) => updateTicket(selectedTicket.id, { severity: e.target.value })}
              >
                <option value="Critical">🔴 Critical (Release Blocker)</option>
                <option value="High">🟠 High Priority</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🔵 Low</option>
                <option value="Minor">⚪ Minor</option>
              </select>
            </div>

            {/* Target Environment */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Environment</label>
              <select
                className="form-select"
                value={selectedTicket.environment}
                onChange={(e) => updateTicket(selectedTicket.id, { environment: e.target.value })}
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Developer */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assigned Developer</label>
              <select
                className="form-select"
                value={selectedTicket.assignedDev || ''}
                onChange={(e) => updateTicket(selectedTicket.id, { assignedDev: e.target.value })}
              >
                <option value="">Unassigned</option>
                {team
                  .filter((m) => m.role === 'developer')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      👨‍💻 {m.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Assigned QA */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Assigned QA Engineer</label>
              <select
                className="form-select"
                value={selectedTicket.assignedQa || ''}
                onChange={(e) => updateTicket(selectedTicket.id, { assignedQa: e.target.value })}
              >
                <option value="">Unassigned</option>
                {team
                  .filter((m) => m.role === 'qa')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      🧪 {m.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Reporter & Date */}
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}
            >
              <div>
                <strong>Reported By: </strong>
                <span>{reporter?.name || 'Automated Test'}</span>
              </div>
              <div>
                <strong>Created: </strong>
                <span>{parseDateSafe(selectedTicket.createdAt)?.toLocaleDateString() || selectedTicket.createdAt || 'N/A'}</span>
              </div>
            </div>

            {/* Delete ticket */}
            <button
              className="btn btn-ghost"
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
                justifyContent: 'flex-start',
                padding: '0.4rem 0'
              }}
              onClick={() => deleteTicket(selectedTicket.id)}
            >
              <Trash2 size={13} />
              <span>Delete ticket</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
