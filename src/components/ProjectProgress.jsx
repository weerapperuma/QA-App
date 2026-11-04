import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Building2, Check, FolderTree, Bug, Lightbulb, Hourglass, Code2, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { ROLES, hasRole } from '../utils/roles';

const DONE = ['verified', 'implemented', 'qa_passed', 'qa passed', 'closed'];
const isDone = (st) => DONE.includes((st || '').toLowerCase().trim());
const isFixed = (st) => isDone(st) || ['ready_for_qa', 'dev_fixed', 'dev fixed', 'retest'].includes((st || '').toLowerCase().trim());
const pct = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

const realFeatures = (features, projectId) =>
  (features || []).filter((f) => f && f.projectId === projectId && !f.isMainModule && f.status !== 'module');

// Remaining / closed counter
function Split({ icon: Icon, remaining, closed, label, tone }) {
  const total = remaining + closed;
  return (
    <span className={`pp-split ${remaining > 0 ? tone || '' : ''}`} title={`${label}: ${remaining} remaining, ${closed} closed`}>
      <Icon size={12} />
      <span className="pp-split-rem">{remaining}</span>
      <span className="pp-split-sep">/</span>
      <span className="pp-split-closed">{closed}</span>
      {total === 0 && <span className="pp-split-none">—</span>}
    </span>
  );
}

function Bar({ value, done }) {
  return (
    <div className="feat-card-bar">
      <div className={`feat-card-bar-fill ${done ? 'tone-done' : ''}`} style={{ width: `${value}%` }} />
    </div>
  );
}

/* ---------- Working project picker (top of My Profile) ---------- */
export function WorkingProjectPicker() {
  const { myProjects = [], activeProjectId, needsProjectSelection, selectWorkingProject, features, setActiveTab, isCurrentUserAdmin } =
    useApp();

  return (
    <div className={`pf-card pp-picker ${needsProjectSelection ? 'needs' : ''}`}>
      <div className="pp-picker-head">
        <div>
          <div className="pf-card-title">
            <Building2 size={15} /> {needsProjectSelection ? 'Choose your working project' : 'Working project'}
          </div>
          <p className="pf-note" style={{ marginTop: '0.2rem' }}>
            {needsProjectSelection
              ? 'Select the project you are working on to open the workspace.'
              : 'You can switch at any time.'}
          </p>
        </div>
        {!needsProjectSelection && (
          <button type="button" className="fb-btn fb-btn-primary" onClick={() => setActiveTab('features')}>
            <span>Open Workspace</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {myProjects.length === 0 ? (
        <div className="fi-empty">
          <Lock size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          {isCurrentUserAdmin
            ? 'No projects yet. Create one in the Projects section below.'
            : 'You have not been assigned to a project yet. Ask your workspace admin for access.'}
        </div>
      ) : (
        <div className="pp-project-grid">
          {myProjects.map((p) => {
            const feats = realFeatures(features, p.id);
            const closed = feats.filter((f) => f.status === 'verified').length;
            const value = pct(closed, feats.length);
            const isCurrent = !needsProjectSelection && p.id === activeProjectId;
            return (
              <button
                key={p.id}
                type="button"
                className={`pp-project ${isCurrent ? 'current' : ''}`}
                onClick={() => selectWorkingProject(p.id)}
              >
                <div className="pp-project-top">
                  <span className="pp-project-code">{p.code}</span>
                  {isCurrent && (
                    <span className="pp-current">
                      <Check size={11} /> Current
                    </span>
                  )}
                </div>
                <div className="pp-project-name">{p.name}</div>
                <Bar value={value} done={value === 100 && feats.length > 0} />
                <div className="pp-project-meta">
                  {closed}/{feats.length} features closed · {value}%
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Progress of the current project ---------- */
export function ProjectProgressSection() {
  const { activeProject, projectFeatures = [], allModuleNames = [], currentUser, needsProjectSelection } = useApp();
  const [selectedModule, setSelectedModule] = useState(null);
  const [onlyMine, setOnlyMine] = useState(false);

  const isDev = hasRole(currentUser, ROLES.DEVELOPER);
  const isQa = hasRole(currentUser, ROLES.QA);
  const me = currentUser?.id;

  const data = useMemo(() => {
    const feats = projectFeatures;
    const featStats = (f) => {
      const bugs = f.bugs || [];
      const suggs = f.suggestions || [];
      const fut = f.futureItems || [];
      const bugsClosed = bugs.filter((b) => isDone(b.status)).length;
      const suggClosed = suggs.filter((s) => isDone(s.status)).length;
      const futClosed = fut.filter((i) => i.status === 'done').length;
      return {
        bugsRem: bugs.length - bugsClosed,
        bugsClosed,
        suggRem: suggs.length - suggClosed,
        suggClosed,
        futRem: fut.length - futClosed,
        futClosed
      };
    };

    const moduleNames = Array.from(new Set([...allModuleNames, ...feats.map((f) => f.moduleName || 'General')]));
    const modules = moduleNames.map((name) => {
      const mf = feats.filter((f) => (f.moduleName || 'General').toLowerCase() === name.toLowerCase());
      const closed = mf.filter((f) => f.status === 'verified').length;
      return { name, total: mf.length, closed, remaining: mf.length - closed, value: pct(closed, mf.length) };
    });

    const closed = feats.filter((f) => f.status === 'verified').length;
    const totals = feats.reduce(
      (acc, f) => {
        const s = featStats(f);
        Object.keys(s).forEach((k) => (acc[k] += s[k]));
        return acc;
      },
      { bugsRem: 0, bugsClosed: 0, suggRem: 0, suggClosed: 0, futRem: 0, futClosed: 0 }
    );

    // My work
    const devFeats = feats.filter((f) => f.assignedDev === me);
    const myBugs = feats.flatMap((f) => (f.bugs || []).filter((b) => (b.assignedDev || f.assignedDev) === me));
    const qaFeats = feats.filter((f) => f.assignedQa === me);
    const loggedBugs = feats.flatMap((f) => (f.bugs || []).filter((b) => b.reportedBy === me));

    return {
      featStats,
      modules,
      total: feats.length,
      closed,
      totals,
      dev: {
        feats: devFeats.length,
        featsClosed: devFeats.filter((f) => f.status === 'verified').length,
        featsInDev: devFeats.filter((f) => f.status === 'in_dev').length,
        bugs: myBugs.length,
        bugsFixed: myBugs.filter((b) => isFixed(b.status)).length
      },
      qa: {
        feats: qaFeats.length,
        featsClosed: qaFeats.filter((f) => f.status === 'verified').length,
        toTest: qaFeats.filter((f) => ['ready_for_qa', 'in_qa'].includes(f.status)).length,
        logged: loggedBugs.length,
        loggedClosed: loggedBugs.filter((b) => isDone(b.status)).length
      }
    };
  }, [projectFeatures, allModuleNames, me]);

  if (needsProjectSelection || !activeProject) return null;

  const activeModule = selectedModule && data.modules.find((m) => m.name === selectedModule) ? selectedModule : null;
  const moduleFeatures = activeModule
    ? projectFeatures
        .filter((f) => (f.moduleName || 'General').toLowerCase() === activeModule.toLowerCase())
        .filter((f) => !onlyMine || f.assignedDev === me || f.assignedQa === me)
    : [];

  const overall = pct(data.closed, data.total);

  return (
    <div className="pf-card">
      <div className="pp-head">
        <div className="pf-card-title">
          <FolderTree size={15} /> {activeProject.name} progress
        </div>
        <span className="pp-overall">
          <strong>{data.closed}</strong>/{data.total} features closed · {overall}%
        </span>
      </div>
      <Bar value={overall} done={overall === 100 && data.total > 0} />

      <div className="pp-totals">
        <span>
          <FolderTree size={12} /> <strong>{data.modules.length}</strong> modules
        </span>
        <span>
          <strong>{data.total - data.closed}</strong> features remaining
        </span>
        <Split icon={Bug} label="Defects" remaining={data.totals.bugsRem} closed={data.totals.bugsClosed} tone="warn" />
        <Split icon={Lightbulb} label="Suggestions" remaining={data.totals.suggRem} closed={data.totals.suggClosed} />
        <Split icon={Hourglass} label="Future improvements" remaining={data.totals.futRem} closed={data.totals.futClosed} />
        <span className="pf-note">(remaining / closed)</span>
      </div>

      {/* Role-specific: my work */}
      {(isDev || isQa) && (
        <div className="pp-mine">
          {isDev && (
            <div className="pp-mine-card">
              <div className="pp-mine-title">
                <Code2 size={13} /> My development work
              </div>
              <div className="pp-mine-stats">
                <div>
                  <strong>{data.dev.featsClosed}/{data.dev.feats}</strong>
                  <span>assigned features closed</span>
                </div>
                <div>
                  <strong>{data.dev.featsInDev}</strong>
                  <span>in development</span>
                </div>
                <div>
                  <strong>{data.dev.bugsFixed}/{data.dev.bugs}</strong>
                  <span>assigned defects fixed</span>
                </div>
              </div>
              <Bar value={pct(data.dev.featsClosed, data.dev.feats)} done={data.dev.feats > 0 && data.dev.featsClosed === data.dev.feats} />
            </div>
          )}
          {isQa && (
            <div className="pp-mine-card">
              <div className="pp-mine-title">
                <CheckCircle2 size={13} /> My QA work
              </div>
              <div className="pp-mine-stats">
                <div>
                  <strong>{data.qa.featsClosed}/{data.qa.feats}</strong>
                  <span>assigned features verified</span>
                </div>
                <div>
                  <strong>{data.qa.toTest}</strong>
                  <span>waiting for testing</span>
                </div>
                <div>
                  <strong>{data.qa.loggedClosed}/{data.qa.logged}</strong>
                  <span>logged defects closed</span>
                </div>
              </div>
              <Bar value={pct(data.qa.featsClosed, data.qa.feats)} done={data.qa.feats > 0 && data.qa.featsClosed === data.qa.feats} />
            </div>
          )}
        </div>
      )}

      {/* Modules */}
      <div className="pp-section-label">Modules — click one to see its features</div>
      {data.modules.length === 0 ? (
        <div className="fi-empty">No modules or features in this project yet.</div>
      ) : (
        <div className="pp-modules">
          {data.modules.map((m) => (
            <button
              key={m.name}
              type="button"
              className={`pp-module ${activeModule === m.name ? 'active' : ''}`}
              onClick={() => setSelectedModule(activeModule === m.name ? null : m.name)}
            >
              <div className="pp-module-head">
                <span className="pp-module-name">{m.name}</span>
                <span className="pp-module-pct">{m.value}%</span>
              </div>
              <Bar value={m.value} done={m.value === 100 && m.total > 0} />
              <div className="pp-module-meta">
                <span>
                  <strong>{m.remaining}</strong> remaining
                </span>
                <span>
                  <strong>{m.closed}</strong> closed
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Features of the selected module */}
      {activeModule && (
        <div className="pp-features">
          <div className="pp-features-head">
            <span className="pp-section-label" style={{ margin: 0 }}>
              {activeModule} · features
            </span>
            {(isDev || isQa) && (
              <label className="pp-toggle">
                <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
                <span>Only my features</span>
              </label>
            )}
          </div>
          {moduleFeatures.length === 0 ? (
            <div className="fi-empty">No features to show.</div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Status</th>
                    <th title="remaining / closed">Defects</th>
                    <th title="remaining / closed">Suggestions</th>
                    <th title="remaining / closed">Future</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleFeatures.map((f) => {
                    const s = data.featStats(f);
                    const mine = [f.assignedDev === me && 'Dev', f.assignedQa === me && 'QA'].filter(Boolean);
                    return (
                      <tr key={f.id}>
                        <td>
                          <div className="um-name" style={{ fontWeight: 600 }}>
                            {f.name}
                            {mine.length > 0 && <span className="um-you">Mine · {mine.join(' + ')}</span>}
                          </div>
                          <div className="um-sub">{f.code}</div>
                        </td>
                        <td>
                          <span className={`pp-status st-${f.status}`}>{STATUS_LABELS[f.status] || f.status}</span>
                        </td>
                        <td>
                          <Split icon={Bug} label="Defects" remaining={s.bugsRem} closed={s.bugsClosed} tone="warn" />
                        </td>
                        <td>
                          <Split icon={Lightbulb} label="Suggestions" remaining={s.suggRem} closed={s.suggClosed} />
                        </td>
                        <td>
                          <Split icon={Hourglass} label="Future improvements" remaining={s.futRem} closed={s.futClosed} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS = {
  backlog: 'In Pool',
  in_dev: 'In Development',
  ready_for_qa: 'Ready for Retest',
  in_qa: 'QA Verification',
  verified: 'Closed'
};
