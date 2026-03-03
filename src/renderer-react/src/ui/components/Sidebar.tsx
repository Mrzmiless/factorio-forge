import React from 'react';

type Icon = 'grid' | 'cog';

export function Sidebar<T extends string>({
  items,
  active,
  onSelect
}: {
  items: Array<{ id: T; label: string; icon: Icon }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="sidebarHero">
        <img src="images/defualt banner.png" alt="" className="sidebarBanner" aria-hidden />
        <div className="sidebarHeroOverlay">
          <div className="appMark">Factorio Forge</div>
        </div>
      </div>

      <nav className="nav">
        {items.map(it => (
          <button
            key={it.id}
            className={it.id === active ? 'navItem active' : 'navItem'}
            onClick={() => onSelect(it.id)}
          >
            <span className="navIcon">{iconFor(it.icon)}</span>
            <span className="navLabel">{it.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebarFooter">v0.1.0</div>
    </aside>
  );
}

function iconFor(icon: Icon) {
  switch (icon) {
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
          />
        </svg>
      );
    case 'cog':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 7.8a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.6.22l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.21.08.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"
          />
        </svg>
      );
  }
}

