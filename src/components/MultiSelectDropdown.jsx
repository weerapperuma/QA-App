import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check, Filter } from 'lucide-react';

/**
 * Reusable Multi-Select Dropdown Component
 * Allows selecting one or more options simultaneously (e.g. Status, Tags, Categories)
 * Supports live badge counts, color dots/emojis, select-all/clear-all, and outside-click dismissal.
 */
export default function MultiSelectDropdown({
  options = [],
  value = 'all',
  onChange,
  placeholder = 'All Statuses',
  allLabel = 'All Statuses',
  icon: Icon = Filter,
  minWidth = '160px',
  maxWidth = '250px',
  dropdownWidth = '260px',
  disabled = false,
  allowClear = true,
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse incoming value to an array of selected keys
  const selectedValues = useMemo(() => {
    if (!value || value === 'all') return [];
    if (Array.isArray(value)) return value.filter((v) => v && v !== 'all');
    return [value];
  }, [value]);

  const isAllSelected = selectedValues.length === 0;

  // Total count across all options (if badges are provided)
  const totalCount = useMemo(() => {
    let sum = 0;
    let hasBadges = false;
    for (const opt of options) {
      if (typeof opt.badge === 'number') {
        sum += opt.badge;
        hasBadges = true;
      }
    }
    return hasBadges ? sum : undefined;
  }, [options]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectAll = (e) => {
    e?.stopPropagation();
    onChange('all');
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    onChange('all');
  };

  const handleToggleOption = (optVal, e) => {
    e?.stopPropagation();
    let next;
    if (selectedValues.includes(optVal)) {
      next = selectedValues.filter((v) => v !== optVal);
    } else {
      next = [...selectedValues, optVal];
    }

    if (next.length === 0) {
      onChange('all');
    } else {
      onChange(next);
    }
  };

  // Derive trigger text and badge
  const triggerDisplay = useMemo(() => {
    if (isAllSelected) {
      return {
        label: allLabel || placeholder,
        badgeCount: null,
        icon: null
      };
    }

    if (selectedValues.length === 1) {
      const opt = options.find((o) => o.value === selectedValues[0]);
      return {
        label: opt?.label || selectedValues[0],
        badgeCount: null,
        icon: opt?.icon || null
      };
    }

    // 2 items selected
    const firstOpt = options.find((o) => o.value === selectedValues[0]);
    const firstLabel = firstOpt?.label || selectedValues[0];

    if (selectedValues.length === 2) {
      const secondOpt = options.find((o) => o.value === selectedValues[1]);
      const secondLabel = secondOpt?.label || selectedValues[1];
      const combined = `${firstLabel}, ${secondLabel}`;
      if (combined.length <= 20) {
        return {
          label: combined,
          badgeCount: 2,
          icon: null
        };
      }
    }

    return {
      label: `${firstLabel} +${selectedValues.length - 1}`,
      badgeCount: selectedValues.length,
      icon: null
    };
  }, [isAllSelected, selectedValues, options, allLabel, placeholder]);

  return (
    <div
      ref={containerRef}
      className="searchable-dropdown-container multi-select-dropdown-container"
      style={{
        position: 'relative',
        display: 'inline-block',
        minWidth,
        maxWidth
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="filter-select searchable-dropdown-trigger"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.45rem',
          padding: '0.42rem 0.65rem',
          fontSize: '0.8rem',
          background: !isAllSelected ? 'var(--accent-dev-subtle)' : 'var(--bg-surface)',
          borderColor: !isAllSelected ? 'var(--accent-dev-border)' : 'var(--border-medium)',
          color: !isAllSelected ? 'var(--accent-dev)' : 'var(--text-primary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.15s ease'
        }}
        title={isAllSelected ? allLabel : `Filtering by: ${selectedValues.join(', ')}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, overflow: 'hidden' }}>
          {triggerDisplay.icon ? (
            <span style={{ fontSize: '0.82rem', flexShrink: 0, lineHeight: 1 }}>{triggerDisplay.icon}</span>
          ) : Icon ? (
            <Icon
              size={13}
              style={{
                flexShrink: 0,
                color: !isAllSelected ? 'var(--accent-dev)' : 'var(--text-muted)'
              }}
            />
          ) : null}

          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: !isAllSelected ? 700 : 500
            }}
          >
            {triggerDisplay.label}
          </span>

          {triggerDisplay.badgeCount && (
            <span
              style={{
                flexShrink: 0,
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.05rem 0.35rem',
                borderRadius: '999px',
                background: 'var(--accent-dev)',
                color: '#ffffff',
                lineHeight: 1.2
              }}
            >
              {triggerDisplay.badgeCount}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          {allowClear && !isAllSelected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear(e);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--status-critical)',
                cursor: 'pointer'
              }}
              title="Reset to All Statuses"
            >
              <X size={10} />
            </span>
          )}
          <ChevronDown
            size={12}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
              opacity: 0.7
            }}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="searchable-dropdown-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width: dropdownWidth,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.12s ease-out'
          }}
        >
          {/* Header Action Bar */}
          <div
            style={{
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem'
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
              Filter by Status
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isAllSelected ? 'var(--accent-dev)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  padding: '2px 4px'
                }}
              >
                All
              </button>
              {!isAllSelected && (
                <>
                  <span style={{ color: 'var(--border-medium)' }}>•</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--status-critical)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      padding: '2px 4px'
                    }}
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '0.35rem 0'
            }}
          >
            {/* "All Statuses" Option */}
            <div
              onClick={handleSelectAll}
              style={{
                padding: '0.45rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: '0.8rem',
                background: isAllSelected ? 'var(--accent-dev-subtle)' : 'transparent',
                color: isAllSelected ? 'var(--accent-dev)' : 'var(--text-primary)',
                fontWeight: isAllSelected ? 700 : 500,
                transition: 'background 0.1s ease'
              }}
              onMouseEnter={(e) => {
                if (!isAllSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isAllSelected) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div
                  style={{
                    width: '15px',
                    height: '15px',
                    borderRadius: '3px',
                    border: isAllSelected ? '1px solid var(--accent-dev)' : '1px solid var(--border-medium)',
                    background: isAllSelected ? 'var(--accent-dev)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.12s ease',
                    flexShrink: 0
                  }}
                >
                  {isAllSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                </div>
                <span>{allLabel}</span>
              </div>
              {totalCount !== undefined && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    background: isAllSelected ? 'var(--accent-dev-subtle)' : 'var(--bg-surface)',
                    color: isAllSelected ? 'var(--accent-dev)' : 'var(--text-muted)',
                    fontWeight: 600,
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  {totalCount}
                </span>
              )}
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.6rem' }} />

            {/* Individual Status Options */}
            {options.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);

              return (
                <div
                  key={opt.value}
                  onClick={(e) => handleToggleOption(opt.value, e)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    background: isSelected ? 'var(--accent-dev-subtle)' : 'transparent',
                    color: isSelected ? 'var(--accent-dev)' : 'var(--text-primary)',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'background 0.1s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                    {/* Checkbox square */}
                    <div
                      style={{
                        width: '15px',
                        height: '15px',
                        borderRadius: '3px',
                        border: isSelected ? '1px solid var(--accent-dev)' : '1px solid var(--border-medium)',
                        background: isSelected ? 'var(--accent-dev)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.12s ease',
                        flexShrink: 0
                      }}
                    >
                      {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                    </div>

                    {/* Status icon or dot */}
                    {opt.icon ? (
                      <span style={{ fontSize: '0.82rem', flexShrink: 0, lineHeight: 1 }}>{opt.icon}</span>
                    ) : opt.dotColor ? (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: opt.dotColor,
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                    ) : null}

                    {/* Status text */}
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {opt.label}
                    </span>
                  </div>

                  {/* Badge count */}
                  {opt.badge !== undefined && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.1rem 0.42rem',
                        borderRadius: '999px',
                        background: isSelected ? 'var(--accent-dev-subtle)' : 'var(--bg-surface)',
                        color: isSelected ? 'var(--accent-dev)' : 'var(--text-muted)',
                        fontWeight: 600,
                        border: '1px solid var(--border-subtle)',
                        flexShrink: 0
                      }}
                    >
                      {opt.badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div
            style={{
              padding: '0.4rem 0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>Select one or more statuses</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 8px',
                fontSize: '0.72rem',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
