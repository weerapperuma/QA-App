/**
 * Date and time utilities for formatting and robust timezone handling.
 */

/**
 * Safely parses any date string, timestamp, or Date object into a valid Date object.
 * Correctly handles legacy UTC strings generated without timezone offsets (e.g. "2026-10-29 06:00" or "2026-10-29T06:00")
 * which were produced by `.toISOString().replace('T', ' ').substring(0, 16)`.
 */
export function parseDateSafe(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateVal !== 'string') return null;

  const trimmed = dateVal.trim();
  if (!trimmed) return null;

  // Check if it already has an explicit timezone offset or indicator ('Z', '+05:30', '-04:00', etc.)
  const hasTimezone = /[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(trimmed);

  // If it's a date-time string lacking a timezone offset (e.g. "2026-10-29 06:00" or "2026-10-29T06:00")
  // These were generated via new Date().toISOString() where 'Z' was truncated, so they represent UTC time.
  if (!hasTimezone && (trimmed.includes(' ') || (trimmed.includes('T') && trimmed.length > 10))) {
    const isoUtc = trimmed.replace(' ', 'T') + 'Z';
    const d = new Date(isoUtc);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date value into human readable local date & time in the user's browser timezone:
 * e.g. "Oct 29, 2026 • 11:30 AM"
 */
export function formatItemDateTime(dateVal) {
  if (!dateVal) return '';
  const d = parseDateSafe(dateVal);
  if (!d) return String(dateVal);

  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // If input was strictly a date without time (e.g. "2026-10-29"), only return datePart
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    return datePart;
  }

  const timePart = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${datePart} • ${timePart}`;
}

/**
 * Formats timestamp into human-readable relative time (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(dateVal) {
  if (!dateVal) return 'Just now';
  const date = parseDateSafe(dateVal);
  if (!date) return 'Just now';

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec) || diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

