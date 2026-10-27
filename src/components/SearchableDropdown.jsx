import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

/**
 * Reusable Searchable Dropdown / Combobox
 * Supports instant search filtering, keyboard navigation, clear action, and custom rendering.
 */
export default function SearchableDropdown({
  options = [],
  value = 'all',
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  icon: Icon = null,
  allLabel = 'All',
  minWidth = '170px',
  maxWidth = '260px',
  dropdownWidth = '280px',
  disabled = false,
  allowClear = true,
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
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

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const isAllSelected = value === 'all' || !value;

  const displayLabel = isAllSelected
    ? allLabel
    : selectedOption?.label || value;

  // Filter options based on search query
  const q = searchQuery.trim().toLowerCase();
  const filteredOptions = options.filter((opt) => {
    if (!q) return true;
    const matchLabel = (opt.label || '').toLowerCase().includes(q);
    const matchSub = (opt.sublabel || '').toLowerCase().includes(q);
    const matchVal = (String(opt.value) || '').toLowerCase().includes(q);
    return matchLabel || matchSub || matchVal;
  });

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('all');
  };

  return (
    <div
      ref={containerRef}
      className="searchable-dropdown-container"
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
        title={displayLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, overflow: 'hidden' }}>
          {Icon && (
            <Icon
              size={13}
              style={{
                flexShrink: 0,
                color: !isAllSelected ? 'var(--accent-dev)' : 'var(--text-muted)'
              }}
            />
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: !isAllSelected ? 700 : 500
            }}
          >
            {displayLabel}
          </span>
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
              title="Clear selection"
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

      {/* Popover Menu */}
      {isOpen && (
        <div
          className="searchable-dropdown-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width: dropdownWidth,
            maxHeight: '340px',
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
          {/* Search Header Input */}
          <div
            style={{
              padding: '0.55rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              position: 'relative'
            }}
          >
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '0.95rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                fontSize: '0.78rem',
                padding: '0.35rem 1.6rem 0.35rem 1.8rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            style={{
              flex: '1 1 auto',
              overflowY: 'auto',
              maxHeight: '260px',
              padding: '0.35rem 0'
            }}
          >
            {/* 'All' Option (shown when not actively searching or when it matches) */}
            {(!q || allLabel.toLowerCase().includes(q)) && (
              <div
                onClick={() => handleSelect('all')}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {Icon && <Icon size={12} style={{ opacity: 0.7 }} />}
                  <span>{allLabel}</span>
                </div>
                {isAllSelected && <Check size={13} color="var(--accent-dev)" />}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}
              >
                No matches found for "{searchQuery}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
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
                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {opt.icon && <span style={{ flexShrink: 0 }}>{opt.icon}</span>}
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {opt.label}
                        </span>
                      </div>
                      {opt.sublabel && (
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            marginTop: '1px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {opt.sublabel}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      {opt.badge !== undefined && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-full)',
                            background: isSelected ? 'var(--accent-dev)' : 'var(--bg-secondary)',
                            color: isSelected ? '#fff' : 'var(--text-muted)',
                            fontWeight: 600
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check size={13} color="var(--accent-dev)" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

