import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Copy,
  Check,
  Code2,
  FileText,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function ReleaseGate() {
  const {
    releases,
    tickets,
    testSuites,
    environments,
    signOffRelease,
    openTicket,
    addToast
  } = useApp();

  const [devNote, setDevNote] = useState('');
  const [qaNote, setQaNote] = useState('');
  const [copiedBrief, setCopiedBrief] = useState(false);

  const activeRelease = (releases && releases[0]) || {
    id: 'REL-2.4.0',
    version: 'v2.4.0-rc2',
    sprint: 'Sprint 24',
    targetDate: 'Tomorrow',
    targetEnvironment: 'Staging -> Production',
    changeSummary: 'Release candidate',
    gateChecks: {
      zeroBlockers: false,
      devLeadSignoff: { signed: false, date: null, note: '' },
      qaLeadSignoff: { signed: false, date: null, note: '' }
    }
  };
  const staging = (environments && environments.find((e) => e.id === 'staging')) || (environments && environments[0]) || {
    id: 'staging',
    status: 'healthy',
    buildNumber: '412',
    latencyMs: 34
  };

  // Dynamic live calculations
  const openBlockers = (tickets || []).filter(
    (t) => t.severity === 'Critical' && t.status !== 'verified'
  );
  const zeroBlockersPassed = openBlockers.length === 0;

  let totalSteps = 0;
  let passedSteps = 0;
  (testSuites || []).forEach((s) => {
    (s.cases || []).forEach((c) => {
      (c.steps || []).forEach((st) => {
        totalSteps++;
        if (st.status === 'passed') passedSteps++;
      });
    });
  });
  const currentPassRate = totalSteps > 0 ? Math.round((passedSteps / totalSteps) * 100) : 100;
  const testPassRatePassed = currentPassRate >= 85;

  const stagingHealthPassed = staging.status === 'healthy';

  const devSigned = !!activeRelease.gateChecks?.devLeadSignoff?.signed;
  const qaSigned = !!activeRelease.gateChecks?.qaLeadSignoff?.signed;

  const isProductionReady =
    zeroBlockersPassed &&
    testPassRatePassed &&
    stagingHealthPassed &&
    devSigned &&
    qaSigned;

  const handleCopyReleaseBrief = () => {
    const brief = `
🚀 **RELEASE CANDIDATE BRIEF: ${activeRelease.version}**
- **Sprint**: ${activeRelease.sprint}
- **Target Date**: ${activeRelease.targetDate}
- **Gate Status**: ${isProductionReady ? '✅ APPROVED FOR PRODUCTION' : '⚠️ PENDING SIGNOFF / BLOCKED'}

**Gate Checks Summary:**
- Critical Blockers: ${openBlockers.length} open (${zeroBlockersPassed ? 'PASS' : 'FAIL'})
- Test Pass Rate: ${currentPassRate}% (${testPassRatePassed ? 'PASS' : 'FAIL'})
- Staging Health: ${staging.status.toUpperCase()} (${stagingHealthPassed ? 'PASS' : 'FAIL'})
- Dev Lead Sign-off: ${devSigned ? 'SIGNED by Maya Patel' : 'PENDING'}
- QA Lead Sign-off: ${qaSigned ? 'SIGNED by Elena Rostova' : 'PENDING'}

**Changes & Highlights:**
${activeRelease.changeSummary}
    `.trim();

    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    addToast('Release brief copied to clipboard!', 'success');
    setTimeout(() => setCopiedBrief(false), 2500);
  };

  return (
    <div>
      {/* Top Banner Card */}
      <div className="release-gate-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {activeRelease.version} Release Gate
              </h2>
              <span className="tag-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                {activeRelease.sprint}
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Target Deploy: <strong>{activeRelease.targetDate}</strong> • Route:{' '}
              <code>{activeRelease.targetEnvironment}</code>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={handleCopyReleaseBrief}>
              {copiedBrief ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copiedBrief ? 'Copied Brief' : 'Export Release Brief'}</span>
            </button>

            <span
              className={`gate-status-pill ${
                isProductionReady
                  ? 'gate-ready'
                  : !zeroBlockersPassed
                  ? 'gate-blocked'
                  : 'gate-pending'
              }`}
            >
              {isProductionReady ? (
                <>
                  <Sparkles size={16} />
                  GREEN TO DEPLOY
                </>
              ) : !zeroBlockersPassed ? (
                <>
                  <ShieldAlert size={16} />
                  BLOCKED BY {openBlockers.length} CRITICAL DEFECTS
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  PENDING SIGN-OFF
                </>
              )}
            </span>
          </div>
        </div>

        {/* Change Summary */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.86rem',
            color: 'var(--text-secondary)'
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Scope of Release: </strong>
          {activeRelease.changeSummary}
        </div>

        {/* 4 Gate Conditions Grid */}
        <div className="checklist-grid">
          {/* Check 1: Zero Blockers */}
          <div className="checklist-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                CRITERIA 1
              </span>
              {zeroBlockersPassed ? (
                <CheckCircle2 size={18} color="var(--accent-qa)" />
              ) : (
                <XCircle size={18} color="var(--status-critical)" />
              )}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>0 Critical Blockers</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {zeroBlockersPassed ? (
                <span style={{ color: 'var(--accent-qa)' }}>All critical blockers resolved & closed.</span>
              ) : (
                <span style={{ color: 'var(--status-critical)' }}>
                  {openBlockers.length} critical ticket(s) currently open:
                </span>
              )}
            </div>

            {/* List open blockers */}
            {!zeroBlockersPassed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                {openBlockers.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => openTicket(b)}
                    style={{
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid var(--status-critical-border)',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.74rem',
                      color: 'var(--status-critical)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{b.id}: {b.title.substring(0, 32)}...</span>
                    <ExternalLink size={11} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Check 2: Test Pass Rate */}
          <div className="checklist-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                CRITERIA 2
              </span>
              {testPassRatePassed ? (
                <CheckCircle2 size={18} color="var(--accent-qa)" />
              ) : (
                <XCircle size={18} color="var(--status-critical)" />
              )}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>Test Run Pass Rate ≥ 85%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Current suite pass rate is <strong>{currentPassRate}%</strong> across all test cases.
            </div>
          </div>

          {/* Check 3: Staging Stability */}
          <div className="checklist-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                CRITERIA 3
              </span>
              {stagingHealthPassed ? (
                <CheckCircle2 size={18} color="var(--accent-qa)" />
              ) : (
                <XCircle size={18} color="var(--status-critical)" />
              )}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>Staging Environment Stable</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Build #{staging.buildNumber} deployed • {staging.latencyMs}ms ping response.
            </div>
          </div>
        </div>

        {/* Dual Sign-off Section */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
            Dual Engineering Sign-off Gate
          </h3>

          <div className="dual-signoff-grid">
            {/* Dev Lead Box */}
            <div
              style={{
                background: devSigned ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-secondary)',
                border: `1px solid ${devSigned ? 'var(--accent-dev-border)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Code2 size={18} color="var(--accent-dev)" />
                  <span style={{ fontWeight: 700 }}>Dev Lead Sign-off</span>
                </div>
                {devSigned ? (
                  <span className="tag-pill" style={{ background: 'var(--accent-dev-subtle)', color: 'var(--accent-dev)' }}>
                    ✅ Signed
                  </span>
                ) : (
                  <span className="tag-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    Pending
                  </span>
                )}
              </div>

              {devSigned ? (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Signed by:</strong> Maya Patel (Lead Backend)</div>
                  <div><strong>Timestamp:</strong> {activeRelease.gateChecks.devLeadSignoff.date}</div>
                  <div style={{ marginTop: '0.4rem', fontStyle: 'italic' }}>
                    "{activeRelease.gateChecks.devLeadSignoff.note}"
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Dev sign-off note (e.g. Code frozen, PRs merged)..."
                    value={devNote}
                    onChange={(e) => setDevNote(e.target.value)}
                    style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                    onClick={() => signOffRelease(activeRelease.id, 'developer', devNote)}
                  >
                    <span>Sign-off as Dev Lead</span>
                  </button>
                </div>
              )}
            </div>

            {/* QA Lead Box */}
            <div
              style={{
                background: qaSigned ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                border: `1px solid ${qaSigned ? 'var(--accent-qa-border)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--accent-qa)" />
                  <span style={{ fontWeight: 700 }}>QA Lead Sign-off</span>
                </div>
                {qaSigned ? (
                  <span className="tag-pill" style={{ background: 'var(--accent-qa-subtle)', color: 'var(--accent-qa)' }}>
                    ✅ Signed
                  </span>
                ) : (
                  <span className="tag-pill" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    Pending
                  </span>
                )}
              </div>

              {qaSigned ? (
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Signed by:</strong> Elena Rostova (QA Lead)</div>
                  <div><strong>Timestamp:</strong> {activeRelease.gateChecks.qaLeadSignoff.date}</div>
                  <div style={{ marginTop: '0.4rem', fontStyle: 'italic' }}>
                    "{activeRelease.gateChecks.qaLeadSignoff.note}"
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="QA sign-off note (e.g. All test cases verified)..."
                    value={qaNote}
                    onChange={(e) => setQaNote(e.target.value)}
                    style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}
                  />
                  <button
                    className="btn btn-qa"
                    style={{ width: '100%', fontSize: '0.82rem' }}
                    onClick={() => signOffRelease(activeRelease.id, 'qa', qaNote)}
                  >
                    <span>Sign-off as QA Lead</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
