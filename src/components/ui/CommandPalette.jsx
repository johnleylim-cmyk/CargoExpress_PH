import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Package, Truck, Users, BarChart3,
  Megaphone, MessageSquare, Settings, FileText, Mail
} from 'lucide-react';

const COMMANDS = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, section: 'Navigation', keywords: 'home overview stats' },
  { label: 'Orders', to: '/admin/orders', icon: Package, section: 'Navigation', keywords: 'shipments bookings packages' },
  { label: 'Trips', to: '/admin/trips', icon: Truck, section: 'Navigation', keywords: 'routes vehicles delivery' },
  { label: 'Customers', to: '/admin/customers', icon: Users, section: 'Navigation', keywords: 'clients users accounts' },
  { label: 'Sales', to: '/admin/sales', icon: BarChart3, section: 'Management', keywords: 'revenue income payments' },
  { label: 'Reports', to: '/admin/reports', icon: FileText, section: 'Management', keywords: 'analytics data export' },
  { label: 'Announcements', to: '/admin/announcements', icon: Megaphone, section: 'Management', keywords: 'notifications broadcast' },
  { label: 'Inbox', to: '/admin/inbox', icon: MessageSquare, section: 'Management', keywords: 'messages chat support' },
  { label: 'Contact Inquiries', to: '/admin/contact-inquiries', icon: Mail, section: 'Management', keywords: 'messages inquiries contact' },
  { label: 'Settings', to: '/admin/settings', icon: Settings, section: 'System', keywords: 'profile config preferences' },
];

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? COMMANDS.filter(cmd => {
        const q = query.toLowerCase();
        return cmd.label.toLowerCase().includes(q) || cmd.keywords.includes(q);
      })
    : COMMANDS;

  // Group by section
  const sections = {};
  filtered.forEach(cmd => {
    if (!sections[cmd.section]) sections[cmd.section] = [];
    sections[cmd.section].push(cmd);
  });

  const flatFiltered = filtered;

  const selectCommand = useCallback((cmd) => {
    navigate(cmd.to);
    onClose();
  }, [navigate, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const highlighted = resultsRef.current.querySelector('.highlighted');
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatFiltered[highlightedIndex]) {
      e.preventDefault();
      selectCommand(flatFiltered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  let itemIndex = -1;

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        {/* Search Input */}
        <div className="cmd-palette-input-wrap">
          <Search size={18} />
          <input
            ref={inputRef}
            className="cmd-palette-input"
            placeholder="Search pages, actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-palette-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cmd-palette-results" ref={resultsRef}>
          {flatFiltered.length === 0 ? (
            <div className="cmd-palette-empty">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <div className="cmd-palette-section-label">{section}</div>
                {items.map(cmd => {
                  itemIndex++;
                  const idx = itemIndex;
                  return (
                    <button
                      key={cmd.to}
                      className={`cmd-palette-item${idx === highlightedIndex ? ' highlighted' : ''}`}
                      onClick={() => selectCommand(cmd)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <cmd.icon size={18} />
                      <span className="cmd-palette-item-label">{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="cmd-palette-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
