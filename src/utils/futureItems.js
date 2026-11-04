import { Hourglass, Lightbulb, BellRing } from 'lucide-react';

// Shared definitions for Future Improvement items
export const FUTURE_TYPES = {
  dependency: { label: 'Pending Dependency', short: 'Dependency', icon: Hourglass },
  suggestion: { label: 'Suggestion', short: 'Suggestion', icon: Lightbulb },
  reminder: { label: 'Reminder', short: 'Reminder', icon: BellRing }
};

export const FUTURE_STATUSES = {
  waiting: { label: 'Pending' },
  ready: { label: 'Ready to Implement' },
  in_progress: { label: 'In Progress' },
  done: { label: 'Done' }
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 'overdue' | 'today' | 'upcoming' | null
export const getReminderState = (item) => {
  if (!item?.remindOn || item.status === 'done') return null;
  const today = todayStr();
  if (item.remindOn < today) return 'overdue';
  if (item.remindOn === today) return 'today';
  return 'upcoming';
};

export const formatDate = (ymd) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
