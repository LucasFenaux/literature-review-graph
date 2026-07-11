'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  storageKey: string;  // localStorage key for search history
  style?: React.CSSProperties;
}

function getHistory(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(key: string, query: string) {
  if (!query.trim()) return;
  const history = getHistory(key);
  const filtered = history.filter(h => h.toLowerCase() !== query.toLowerCase());
  filtered.unshift(query.trim());
  // Keep last 50 searches
  localStorage.setItem(key, JSON.stringify(filtered.slice(0, 50)));
}

function getSuggestions(key: string, input: string): string[] {
  if (!input.trim()) return getHistory(key).slice(0, 3);
  const q = input.toLowerCase();
  return getHistory(key)
    .filter(h => h.toLowerCase().includes(q) && h.toLowerCase() !== q)
    .slice(0, 3);
}

export default function SearchInput({ value, onChange, onSubmit, placeholder, storageKey, style }: SearchInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSuggestions = useCallback((val: string) => {
    setSuggestions(getSuggestions(storageKey, val));
  }, [storageKey]);

  const handleFocus = () => {
    updateSuggestions(value);
    setShowDropdown(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    updateSuggestions(v);
    setShowDropdown(true);
  };

  const handleClear = () => {
    onChange('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowDropdown(false);
    if (onSubmit) {
      // Defer submit so state update propagates
      setTimeout(onSubmit, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      saveToHistory(storageKey, value);
      setShowDropdown(false);
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Save to history when a search is "committed" (on blur if non-empty)
  const handleBlur = () => {
    // Small delay so click on suggestion registers before dropdown closes
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
      }
    }, 150);
  };

  // Also save to history externally when onSubmit is called
  useEffect(() => {
    // Expose save function via a custom attribute on the input
    if (inputRef.current) {
      (inputRef.current as any)._saveHistory = () => saveToHistory(storageKey, value);
    }
  }, [storageKey, value]);

  // For the related filter (no explicit submit), save after user stops typing
  useEffect(() => {
    if (!onSubmit && value.trim()) {
      const timer = setTimeout(() => {
        saveToHistory(storageKey, value);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [value, onSubmit, storageKey]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: style?.flex ?? undefined, width: style?.width ?? undefined }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            paddingRight: value ? '2rem' : '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontSize: '0.85rem',
            ...style
          }}
        />
        {value && (
          <button
            onClick={handleClear}
            type="button"
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '2px 4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            tabIndex={-1}
            title="Clear"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          marginTop: '4px',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>↻</span>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { saveToHistory };
