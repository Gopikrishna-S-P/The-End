import { createPortal } from 'react-dom';
import { CornerDownLeft } from 'lucide-react';
import type { SlashMenuState } from '../hooks/useSlashMenu';
import './SlashMenu.css';

interface SlashMenuProps {
  state: SlashMenuState;
}

export default function SlashMenu({ state }: SlashMenuProps) {
  if (!state.open || !state.position) return null;
  const { left, top } = state.position;
  return createPortal(
    <div
      className="app-slash-menu"
      role="listbox"
      style={{ left: `${left}px`, top: `${top}px` }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <div className="app-slash-menu-hint">
        <CornerDownLeft size={10} aria-hidden="true" />
        <span>Tab or ⏎ to insert</span>
      </div>
      {state.filteredItems.map((item, i) => {
        const isActive = i === state.activeIndex;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isActive}
            className={`app-slash-menu-item${isActive ? ' is-active' : ''}`}
            onMouseEnter={() => state.setActiveIndex(i)}
            onClick={() => state.commitId(item.id)}
          >
            <span className="app-slash-menu-item-label">{item.label}</span>
            {item.category && (
              <span className="app-slash-menu-item-cat">{item.category}</span>
            )}
            <span className="app-slash-menu-item-snippet">{item.snippet}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
