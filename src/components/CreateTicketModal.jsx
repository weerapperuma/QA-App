import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Plus, Trash2, Wand2, Bug, CheckSquare } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'api',
    name: '⚡ API / Backend Bug',
    data: {
      title: 'API endpoint returns 500 on unexpected null payload',
      component: 'Core API & Data',
      severity: 'High',
      priority: 'P1',
      expectedResult: 'Returns 400 Bad Request with JSON error validation details.',
      actualResult: 'Unhandled TypeError crashes container process and returns 502/500.',
      networkLog: 'TypeError: Cannot read properties of undefined (reading "id")\n  at handler (/app/src/api/routes.js:88)',
      curlSnippet: 'curl -X POST https://staging.app.internal/api/v2/resource \\\n  -H "Content-Type: application/json" \\\n  -d \'{}\'',
      reproSteps: [
        { id: '1', text: 'Send POST request with empty body {}', checked: true },
        { id: '2', text: 'Observe HTTP status code and response payload', checked: true }
      ]
    }
  },
  {
    id: 'ui',
    name: '🎨 Frontend / UI Glitch',
    data: {
      title: 'Button hover state causes layout shift on mobile viewports',
      component: 'Design System & UI',
      severity: 'Medium',
      priority: 'P2',
      expectedResult: 'Button maintains fixed bounding box with opacity or background color transition.',
      actualResult: 'Adding 2px border on :hover pushes adjacent table elements by 4px.',
      networkLog: '',
      curlSnippet: '',
      reproSteps: [
        { id: '1', text: 'Open app in Chrome DevTools mobile view (iPhone 14, 390px)', checked: true },
        { id: '2', text: 'Hover or tap on primary action button in table row', checked: true },
        { id: '3', text: 'Observe layout shift in adjacent columns', checked: false }
      ]
    }
  },
  {
    id: 'sec',
    name: '🔒 Security / Auth Vulnerability',
    data: {
      title: 'Auth token expiry fails to invalidate active WebSocket subscriptions',
      component: 'Auth & Security',
      severity: 'Critical',
      priority: 'P0',
      expectedResult: 'WebSocket connection disconnects immediately when token expires.',
      actualResult: 'Client continues receiving live subscription events after token expiry.',
      networkLog: 'Warning: Client connection active without valid authentication context.',
      curlSnippet: '',
      reproSteps: [
        { id: '1', text: 'Connect WebSocket client with valid JWT', checked: true },
        { id: '2', text: 'Manually revoke token in Redis session store', checked: true },
        { id: '3', text: 'Verify if message frames still stream to client', checked: true }
      ]
    }
  }
];

export default function CreateTicketModal() {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    createTicket,
    prefillBugData,
    setPrefillBugData,
    team,
    environments,
    role
  } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Critical');
  const [priority, setPriority] = useState('P0');
  const [component, setComponent] = useState('Core API & Data');
  const [environment, setEnvironment] = useState('staging');
  const [assignedDev, setAssignedDev] = useState(() => (team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin');
  const [assignedQa, setAssignedQa] = useState(() => (team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [networkLog, setNetworkLog] = useState('');
  const [curlSnippet, setCurlSnippet] = useState('');
  const [reproSteps, setReproSteps] = useState([
    { id: '1', text: 'Navigate to target screen or send request', checked: true },
    { id: '2', text: 'Observe unexpected behavior', checked: false }
  ]);

  const devs = team.filter((m) => m.role === 'developer');
  const qas = team.filter((m) => m.role === 'qa');
  const availableDevs = devs.length > 0 ? devs : team;
  const availableQas = qas.length > 0 ? qas : team;

  useEffect(() => {
    if (!assignedDev && team.length > 0) {
      setAssignedDev((team.find((m) => m.role === 'developer') || team[0])?.id || 'user-admin');
    }
    if (!assignedQa && team.length > 0) {
      setAssignedQa((team.find((m) => m.role === 'qa') || team[0])?.id || 'user-admin');
    }
  }, [team]);

  // Load prefilled data if opened from failed test step
  useEffect(() => {
    if (prefillBugData) {
      setTitle(prefillBugData.title || '');
      setDescription(prefillBugData.description || '');
      setSeverity(prefillBugData.severity || 'Critical');
      setPriority(prefillBugData.priority || 'P0');
      setComponent(prefillBugData.component || 'Core Platform');
      setEnvironment(prefillBugData.environment || 'staging');
      setExpectedResult(prefillBugData.expectedResult || '');
      setActualResult(prefillBugData.actualResult || '');
      if (prefillBugData.reproSteps) {
        setReproSteps(prefillBugData.reproSteps);
      }
    }
  }, [prefillBugData]);

  if (!isCreateModalOpen) return null;

  const applyTemplate = (tpl) => {
    setTitle(tpl.data.title);
    setComponent(tpl.data.component);
    setSeverity(tpl.data.severity);
    setPriority(tpl.data.priority);
    setExpectedResult(tpl.data.expectedResult);
    setActualResult(tpl.data.actualResult);
    setNetworkLog(tpl.data.networkLog);
    setCurlSnippet(tpl.data.curlSnippet);
    setReproSteps(tpl.data.reproSteps);
  };

  const handleAddStep = () => {
    setReproSteps((prev) => [
      ...prev,
      { id: Date.now().toString(), text: '', checked: false }
    ]);
  };

  const handleUpdateStepText = (id, text) => {
    setReproSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text } : s))
    );
  };

  const handleRemoveStep = (id) => {
    setReproSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTicket({
      title,
      description,
      severity,
      priority,
      component,
      environment,
      assignedDev: assignedDev || availableDevs[0]?.id || 'user-admin',
      assignedQa: assignedQa || availableQas[0]?.id || 'user-admin',
      expectedResult,
      actualResult,
      networkLog,
      curlSnippet,
      reproSteps: reproSteps.filter((s) => s.text.trim())
    });

    // Reset
    setTitle('');
    setDescription('');
    setPrefillBugData(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
      <div
        className="modal-container"
        style={{ maxWidth: '820px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bug size={18} color="var(--accent-qa)" />
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              File New Defect / Regression
            </span>
          </div>
          <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="modal-body single-col" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Template Selector Bar */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Wand2 size={13} color="var(--accent-dev)" />
                Quick Bug Templates:
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                    onClick={() => applyTemplate(tpl)}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">
                Defect Title / Summary *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Stripe checkout fails with 409 conflict under rapid multi-tab clicks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Row 1: Severity, Priority, Component */}
            <div className="responsive-form-grid-3">
              <div className="form-group">
                <label className="form-label">Severity Level</label>
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

              <div className="form-group">
                <label className="form-label">Target Environment</label>
                <select
                  className="form-select"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                >
                  {environments.map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Component</label>
                <select
                  className="form-select"
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                >
                  <option value="Billing & Webhooks">Billing & Webhooks</option>
                  <option value="Auth & Security">Auth & Security</option>
                  <option value="Core API & Data">Core API & Data</option>
                  <option value="Design System & UI">Design System & UI</option>
                  <option value="Data & Reporting">Data & Reporting</option>
                </select>
              </div>
            </div>

            {/* Row 2: Dev & QA Assignees */}
            <div className="responsive-form-grid-2">
              <div className="form-group">
                <label className="form-label">Assign Developer</label>
                <select
                  className="form-select"
                  value={assignedDev}
                  onChange={(e) => setAssignedDev(e.target.value)}
                >
                  {availableDevs.map((d) => (
                    <option key={d.id} value={d.id}>
                      👨‍💻 {d.name} ({d.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign QA Engineer</label>
                <select
                  className="form-select"
                  value={assignedQa}
                  onChange={(e) => setAssignedQa(e.target.value)}
                >
                  {availableQas.map((q) => (
                    <option key={q.id} value={q.id}>
                      🧪 {q.name} ({q.title})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Detailed Description / Context</label>
              <textarea
                className="form-textarea"
                placeholder="Explain the background, user journey, impacted accounts, or recent commits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Reproduction Steps */}
            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.4rem'
                }}
              >
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Steps to Reproduce
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  onClick={handleAddStep}
                >
                  <Plus size={13} />
                  <span>Add Step</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {reproSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        width: '20px'
                      }}
                    >
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      value={step.text}
                      onChange={(e) => handleUpdateStepText(step.id, e.target.value)}
                      placeholder={`Step ${idx + 1}...`}
                      style={{ padding: '0.45rem 0.75rem' }}
                    />
                    {reproSteps.length > 1 && (
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: '32px', height: '32px', flexShrink: 0 }}
                        onClick={() => handleRemoveStep(step.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Expected vs Actual */}
            <div className="responsive-form-grid-2">
              <div className="form-group">
                <label className="form-label">Expected Result</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '65px' }}
                  placeholder="What should have happened..."
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Actual Result</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '65px' }}
                  placeholder="What actually occurred..."
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                />
              </div>
            </div>

            {/* cURL & Log */}
            <div className="responsive-form-grid-2">
              <div className="form-group">
                <label className="form-label">cURL / Request Snippet (Optional)</label>
                <textarea
                  className="form-textarea"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                  placeholder="curl -X POST https://..."
                  value={curlSnippet}
                  onChange={(e) => setCurlSnippet(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Console / Error Trace Log (Optional)</label>
                <textarea
                  className="form-textarea"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                  placeholder="Stack trace or terminal output..."
                  value={networkLog}
                  onChange={(e) => setNetworkLog(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={15} />
              <span>Log Defect to Backlog</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
