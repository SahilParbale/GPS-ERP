import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

/**
 * GPS Spindle Industrial ERP — Custom Select Dropdown
 * 
 * Replaces native browser select menus with a sleek, branded dropdown
 * that matches the app's Maroon (#7A1F3D), slate, and white industrial theme.
 * 
 * Supports both:
 * 1. Array of options: options={[{ value: 'all', label: 'All Statuses' }, ...]}
 * 2. Nested <option> children for drop-in compatibility:
 *    <CustomSelect value={status} onChange={(e) => setStatus(e.target.value)}>
 *      <option value="active">Active</option>
 *    </CustomSelect>
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  children,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  style = {},
  triggerStyle = {},
  menuStyle = {},
  icon = null,
  name = '',
  searchable = false,
  size = 'md', // 'sm' | 'md'
  id = '',
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Parse options from either `options` prop or `<option>` children
  const parsedOptions = useMemo(() => {
    if (Array.isArray(options) && options.length > 0) {
      return options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value !== undefined ? opt.value : opt.id,
            label: opt.label !== undefined ? opt.label : (opt.name || String(opt.value)),
            badge: opt.badge,
            icon: opt.icon,
            disabled: opt.disabled
          };
        }
        return { value: opt, label: String(opt) };
      });
    }

    if (children) {
      const opts = [];
      React.Children.forEach(children, child => {
        if (React.isValidElement(child) && child.type === 'option') {
          opts.push({
            value: child.props.value !== undefined ? child.props.value : child.props.children,
            label: child.props.children,
            disabled: child.props.disabled
          });
        }
      });
      return opts;
    }

    return [];
  }, [options, children]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return parsedOptions.find(opt => String(opt.value) === String(value));
  }, [parsedOptions, value]);

  // Auto-detect if menu should open upwards if close to window bottom
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchQuery('');
    }
  }, [isOpen, searchable]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue, e) => {
    if (e) e.stopPropagation();
    if (disabled) return;

    setIsOpen(false);

    if (onChange) {
      // Synthetic event object for 100% backward compatibility
      const syntheticEvent = {
        target: { value: optValue, name, id },
        currentTarget: { value: optValue, name, id },
        value: optValue,
        preventDefault: () => {},
        stopPropagation: () => {},
        toString: () => String(optValue),
        valueOf: () => optValue
      };
      onChange(syntheticEvent, optValue);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return parsedOptions;
    const q = searchQuery.toLowerCase().trim();
    return parsedOptions.filter(opt => String(opt.label).toLowerCase().includes(q));
  }, [parsedOptions, searchQuery]);

  const height = size === 'sm' ? '28px' : '34px';
  const fontSize = size === 'sm' ? '11.5px' : '12.5px';
  const padding = size === 'sm' ? '0 8px' : '0 10px';

  return (
    <div 
      ref={containerRef}
      className={`custom-select-container ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: style.width || '100%',
        minWidth: style.minWidth || '140px',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Hidden native input for form validation / accessibility */}
      {required && (
        <input 
          type="text" 
          name={name} 
          value={value || ''} 
          required={required} 
          onChange={() => {}} 
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} 
        />
      )}

      {/* Dropdown Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          height,
          padding,
          fontSize,
          fontWeight: 500,
          color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)',
          backgroundColor: disabled ? 'var(--bg-surface-subtle)' : '#ffffff',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: isOpen 
            ? '0 0 0 3px rgba(122, 31, 61, 0.12), var(--shadow-xs)' 
            : 'var(--shadow-xs)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          ...triggerStyle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {icon && <span style={{ color: 'var(--primary)', flexShrink: 0, display: 'flex' }}>{icon}</span>}
          {selectedOption?.icon && <span style={{ flexShrink: 0, display: 'flex' }}>{selectedOption.icon}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span style={{ 
              fontSize: '10px', 
              padding: '1px 5px', 
              borderRadius: '4px', 
              background: 'var(--primary-light)', 
              color: 'var(--primary)', 
              fontWeight: 700 
            }}>
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown 
          size={14} 
          style={{ 
            color: isOpen ? 'var(--primary)' : 'var(--text-secondary)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s ease, color 0.15s ease',
            flexShrink: 0,
            marginLeft: '4px'
          }} 
        />
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="custom-select-menu"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            [openUpwards ? 'bottom' : 'top']: 'calc(100% + 4px)',
            zIndex: 1050,
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px -5px rgba(122, 31, 61, 0.14), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            padding: '4px',
            maxHeight: '230px',
            overflowY: 'auto',
            animation: openUpwards ? 'customSelectFadeUp 0.14s ease' : 'customSelectFadeDown 0.14s ease',
            minWidth: '100%',
            ...menuStyle
          }}
        >
          {/* Optional search input inside dropdown */}
          {(searchable || parsedOptions.length > 8) && (
            <div style={{ padding: '4px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter options..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '4px 8px 4px 26px',
                    fontSize: '11px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    outline: 'none',
                    background: 'var(--bg-surface-subtle)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Option Items */}
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '10px', fontSize: '11.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => !opt.disabled && handleSelect(opt.value, e)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: size === 'sm' ? '5px 8px' : '7px 10px',
                    fontSize,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.5 : 1,
                    transition: 'background-color 0.12s ease, color 0.12s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !opt.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                      e.currentTarget.style.color = 'var(--primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !opt.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {opt.icon && <span style={{ flexShrink: 0 }}>{opt.icon}</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {opt.badge && (
                      <span style={{ 
                        fontSize: '9.5px', 
                        padding: '1px 5px', 
                        borderRadius: '4px', 
                        background: isSelected ? 'var(--primary)' : 'var(--border-subtle)', 
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)', 
                        fontWeight: 700 
                      }}>
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check size={13} color="var(--primary)" style={{ flexShrink: 0, strokeWidth: 2.5 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
