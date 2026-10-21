import React from 'react';
import { useApp } from '../context/AppContext';
import { Search, X, Filter } from 'lucide-react';

export default function FilterBar() {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    team,
    environments
  } = useApp();

  const isFiltered =
    searchQuery !== '' ||
    filters.severity !== 'all' ||
    filters.status !== 'all' ||
    filters.environment !== 'all' ||
    filters.assignedDev !== 'all' ||
    filters.assignedQa !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilters({
      severity: 'all',
      status: 'all',
      environment: 'all',
      component: 'all',
      assignedDev: 'all',
      assignedQa: 'all'
    });
  };

  const devs = team.filter((m) => m.role === 'developer');
  const qas = team.filter((m) => m.role === 'qa');

  return (
    <div className="filter-bar">
      {/* Search Input */}
      <div className="search-input-wrap">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search by ticket ID, summary, error trace..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '0.75rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Filters */}
      <div className="filter-group">
        <Filter size={15} color="var(--text-muted)" />

        {/* Severity */}
        <select
          className="filter-select"
          value={filters.severity}
          onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
        >
          <option value="all">Severity: All</option>
          <option value="Critical">🔴 Critical / Blocker</option>
          <option value="High">🟠 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🔵 Low</option>
          <option value="Minor">⚪ Minor</option>
        </select>

        {/* Status */}
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
        >
          <option value="all">Status: All</option>
          <option value="backlog">Backlog / Triage</option>
          <option value="in_dev">In Development</option>
          <option value="ready_for_qa">Ready for Retest (Staging)</option>
          <option value="in_qa">QA Verification</option>
          <option value="verified">Verified & Closed</option>
          <option value="reopened">Reopened / Blocked</option>
        </select>

        {/* Environment */}
        <select
          className="filter-select"
          value={filters.environment}
          onChange={(e) => setFilters((prev) => ({ ...prev, environment: e.target.value }))}
        >
          <option value="all">Env: All</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>

        {/* Assigned Dev */}
        <select
          className="filter-select"
          value={filters.assignedDev}
          onChange={(e) => setFilters((prev) => ({ ...prev, assignedDev: e.target.value }))}
        >
          <option value="all">Dev: All</option>
          {devs.map((dev) => (
            <option key={dev.id} value={dev.id}>
              👨‍💻 {dev.name}
            </option>
          ))}
        </select>

        {/* Assigned QA */}
        <select
          className="filter-select"
          value={filters.assignedQa}
          onChange={(e) => setFilters((prev) => ({ ...prev, assignedQa: e.target.value }))}
        >
          <option value="all">QA: All</option>
          {qas.map((qa) => (
            <option key={qa.id} value={qa.id}>
              🧪 {qa.name}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {isFiltered && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            onClick={resetAllFilters}
          >
            <X size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
