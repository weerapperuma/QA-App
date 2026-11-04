import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Bug, CheckCircle2, XCircle, Wrench, Rocket, FlaskConical, Code2, Bell, X, Hourglass } from 'lucide-react';

// Personal pop-ups for things other people did that concern *me* (I'm the assigned dev/QA).
// Related events from the same person on the same feature are merged into one message,
// e.g. "Ishan marked 3 defects and 2 suggestions Dev Fixed". Each closes after 1 minute.

const TOAST_LIFETIME_MS = 60 * 1000;
const MAX_VISIBLE = 4;

const GROUP_OF = {
  bug_logged: 'logged',
  suggestion_logged: 'logged',
  dev_fixed: 'dev_fixed',
  qa_passed: 'qa_passed',
  qa_failed: 'qa_failed'
};

const META = {
  logged: { icon: Bug, tone: 'warn', title: 'New items assigned to you' },
  dev_fixed: { icon: Wrench, tone: 'info', title: 'Ready for retest' },
  qa_passed: { icon: CheckCircle2, tone: 'ok', title: 'QA passed' },
  qa_failed: { icon: XCircle, tone: 'bad', title: 'QA failed — needs rework' },
  feature_in_dev: { icon: Code2, tone: 'info' },
  feature_started: { icon: Code2, tone: 'info' },
  feature_ready_for_qa: { icon: Rocket, tone: 'info' },
  feature_in_qa: { icon: FlaskConical, tone: 'info' },
  feature_verified: { icon: CheckCircle2, tone: 'ok' },
  future_item_ready: { icon: Hourglass, tone: 'info' }
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const itemsText = (bugs, suggs) =>
  [bugs > 0 && plural(bugs, 'defect'), suggs > 0 && plural(suggs, 'suggestion')].filter(Boolean).join(' and ') || 'items';

const describe = (g) => {
  const what = itemsText(g.bugIds.size, g.suggIds.size);
  const on = g.featureName ? ` on "${g.featureName}"` : '';
  switch (g.group) {
    case 'logged':
      return `${g.authorName} logged ${what}${on}.`;
    case 'dev_fixed':
      return `${g.authorName} marked ${what} Dev Fixed${on}. Ready for your retest.`;
    case 'qa_passed':
      return `${g.authorName} passed ${what}${on}.`;
    case 'qa_failed':
      return `${g.authorName} failed ${what}${on}. Please rework.`;
    default:
      return g.message;
  }
};

// Re-mounted per signed-in user (see App.jsx), so state starts fresh on every login
export default function PersonalToasts() {
  const { notifications = [], currentUser, openFeatureItems } = useApp();
  const me = currentUser?.id;
  const [groups, setGroups] = useState([]);
  const seenRef = useRef(new Set());
  // Only notifications created after this moment can pop up (history doesn't)
  const [since] = useState(() => Date.now());
  const sinceRef = useRef(since);

  // Collect new personal notifications and merge them into groups
  useEffect(() => {
    if (!me) return;
    const fresh = [];
    notifications.forEach((n) => {
      if (!n || seenRef.current.has(n.id)) return;
      seenRef.current.add(n.id);
      const created = Date.parse(n.createdAt || '') || 0;
      if (created < sinceRef.current - 5000) return; // old notification (loaded from history)
      if (n.authorId === me) return; // my own action
      if (!(n.targetUserIds || []).includes(me)) return; // not for me
      fresh.push(n);
    });
    if (fresh.length === 0) return;

    const now = Date.now();
    setGroups((prev) => {
      const next = [...prev];
      fresh
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
        .forEach((n) => {
          const group = GROUP_OF[n.type] || n.type;
          const key = `${group}|${n.authorId}|${n.targetFeatureId || ''}`;
          const isSugg = n.itemKind === 'suggestion' || n.type === 'suggestion_logged';
          let g = next.find((x) => x.key === key);
          if (!g) {
            g = {
              key,
              group,
              authorName: n.authorName || 'Someone',
              featureId: n.targetFeatureId,
              featureName: n.targetFeatureName,
              title: n.title,
              message: n.message,
              bugIds: new Set(),
              suggIds: new Set()
            };
            next.push(g);
          } else {
            g = { ...g, bugIds: new Set(g.bugIds), suggIds: new Set(g.suggIds), title: n.title, message: n.message };
            next[next.findIndex((x) => x.key === key)] = g;
          }
          if (n.targetDefectId) (isSugg ? g.suggIds : g.bugIds).add(n.targetDefectId);
          g.expiresAt = now + TOAST_LIFETIME_MS;
          g.updatedAt = now;
        });
      return next;
    });
  }, [notifications, me]);

  // Auto-close after 1 minute
  useEffect(() => {
    if (groups.length === 0) return undefined;
    const timer = setInterval(() => {
      const now = Date.now();
      setGroups((prev) => (prev.some((g) => g.expiresAt <= now) ? prev.filter((g) => g.expiresAt > now) : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [groups.length]);

  if (!me || groups.length === 0) return null;

  const visible = [...groups].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_VISIBLE);
  const dismiss = (key) => setGroups((prev) => prev.filter((g) => g.key !== key));

  return (
    <div className="ptoast-container" aria-live="polite">
      {visible.map((g) => {
        const meta = META[g.group] || { icon: Bell, tone: 'info' };
        const Icon = meta.icon;
        return (
          <div key={`${g.key}-${g.updatedAt}`} className={`ptoast tone-${meta.tone}`}>
            <span className="ptoast-icon">
              <Icon size={16} />
            </span>
            <button
              type="button"
              className="ptoast-body"
              onClick={() => {
                if (g.featureId) openFeatureItems(g.featureId, [...g.bugIds, ...g.suggIds]);
                dismiss(g.key);
              }}
              title={g.featureId ? (g.bugIds.size + g.suggIds.size > 0 ? 'Show these items' : 'Open feature') : undefined}
            >
              <span className="ptoast-title">{meta.title || g.title}</span>
              <span className="ptoast-msg">{describe(g)}</span>
            </button>
            <button type="button" className="ptoast-close" onClick={() => dismiss(g.key)} title="Dismiss">
              <X size={14} />
            </button>
            <span className="ptoast-timer" style={{ animationDuration: `${TOAST_LIFETIME_MS}ms` }} />
          </div>
        );
      })}
    </div>
  );
}
