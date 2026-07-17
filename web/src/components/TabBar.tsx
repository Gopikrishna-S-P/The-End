import { useRef } from 'react';
import { X, Plus, FileText } from 'lucide-react';
import { useTabs, tabs as tabsStore } from '../utils/tabs';
import './TabBar.css';

interface TabBarProps {
  /** Called when the user clicks a tab. AppLayout navigates to the tab's path. */
  onActivate: (path: string) => void;
  /** Called when the user clicks "+" — receives current path so the new tab can clone it. */
  onOpenNew: () => void;
  /** Optional sound trigger. */
  onPlay?: () => void;
  /** Lookup function to get the nav icon component for a given path. */
  getIcon?: (path: string) => React.ElementType | undefined;
}

export default function TabBar({ onActivate, onOpenNew, onPlay, getIcon }: TabBarProps) {
  const { tabs, activeId } = useTabs();
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (tabs.length < 1) return null;

  return (
    <nav className="app-tab-bar" aria-label="Open tabs">
      <div className="app-tab-bar-scroll" ref={scrollerRef}>
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          return (
            <div
              key={t.id}
              className={`app-tab${isActive ? ' is-active' : ''}`}
              onClick={() => {
                if (isActive) return;
                onPlay?.();
                tabsStore.setActive(t.id);
                onActivate(t.path);
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isActive) {
                    tabsStore.setActive(t.id);
                    onActivate(t.path);
                  }
                }
              }}
            >
              {(() => { const Icon = getIcon?.(t.path) ?? FileText; return <Icon size={11} aria-hidden="true" className="app-tab-icon" />; })()}
              <span className="app-tab-title">{t.title}</span>
              <button
                type="button"
                className="app-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay?.();
                  tabsStore.close(t.id);
                }}
                aria-label={`Close ${t.title}`}
                title="Close tab"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="app-tab-new"
        onClick={() => { onPlay?.(); onOpenNew(); }}
        aria-label="Open new tab"
        title="New tab"
      >
        <Plus size={13} aria-hidden="true" />
      </button>
    </nav>
  );
}
