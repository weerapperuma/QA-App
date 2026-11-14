// Timeline & deadline helpers for Testing > Features

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(monthIdx) || Number.isNaN(day) || !MONTH_NAMES[monthIdx]) return dateStr;
  return `${MONTH_NAMES[monthIdx]} ${day}`;
}

export function getFeatureTimelineStatus(feature, now = new Date()) {
  const hours = Number(feature?.estimatedHours);
  const estimatedHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const startDate = feature?.startDate || '';
  const dueDate = feature?.dueDate || '';
  const isClosed = feature?.status === 'verified';
  const hasTimeline = estimatedHours > 0 || Boolean(dueDate) || Boolean(startDate);

  let shortDateRange = '';
  if (startDate && dueDate) {
    shortDateRange = `${formatShortDate(startDate)} – ${formatShortDate(dueDate)}`;
  } else if (dueDate) {
    shortDateRange = `Due ${formatShortDate(dueDate)}`;
  } else if (startDate) {
    shortDateRange = `From ${formatShortDate(startDate)}`;
  }

  if (!dueDate) {
    return {
      hasTimeline,
      estimatedHours,
      startDate,
      dueDate,
      isClosed,
      status: isClosed ? 'closed' : hasTimeline ? 'scheduled' : 'none',
      daysLeft: null,
      label: isClosed ? 'Closed' : estimatedHours > 0 ? `${estimatedHours}h planned` : 'No deadline',
      shortDateRange
    };
  }

  // Compare calendar days in local time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = dueDate.split('-').map((n) => parseInt(n, 10));
  const target = new Date(y, (m || 1) - 1, d || 1);
  const daysLeft = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (isClosed) {
    return {
      hasTimeline,
      estimatedHours,
      startDate,
      dueDate,
      isClosed: true,
      status: 'closed',
      daysLeft,
      label: 'Closed',
      shortDateRange
    };
  }

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return {
      hasTimeline,
      estimatedHours,
      startDate,
      dueDate,
      isClosed: false,
      status: 'overdue',
      daysLeft,
      label: `Expired ${overdueDays}d ago`,
      shortDateRange
    };
  }

  if (daysLeft === 0) {
    return {
      hasTimeline,
      estimatedHours,
      startDate,
      dueDate,
      isClosed: false,
      status: 'due_soon',
      daysLeft: 0,
      label: 'Expires today',
      shortDateRange
    };
  }

  if (daysLeft <= 2) {
    return {
      hasTimeline,
      estimatedHours,
      startDate,
      dueDate,
      isClosed: false,
      status: 'due_soon',
      daysLeft,
      label: `${daysLeft}d left`,
      shortDateRange
    };
  }

  return {
    hasTimeline,
    estimatedHours,
    startDate,
    dueDate,
    isClosed: false,
    status: 'on_track',
    daysLeft,
    label: `${daysLeft}d left`,
    shortDateRange
  };
}
