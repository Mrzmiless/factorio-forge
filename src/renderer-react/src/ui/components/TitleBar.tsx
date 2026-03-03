import React from 'react';

export function TitleBar({ title }: { title: string }) {
  return (
    <header className="titleBar">
      <div className="titleBarDrag">
        <div className="titleBarTitle">{title}</div>
      </div>
      <div className="titleBarButtons">
        <button className="winBtn" onClick={() => window.api?.window.minimize()} aria-label="Minimize">
          <span className="winGlyph">—</span>
        </button>
        <button className="winBtn" onClick={() => window.api?.window.maximize()} aria-label="Maximize">
          <span className="winGlyph">▢</span>
        </button>
        <button className="winBtn winClose" onClick={() => window.api?.window.close()} aria-label="Close">
          <span className="winGlyph">×</span>
        </button>
      </div>
    </header>
  );
}

