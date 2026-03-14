import React, { useState } from 'react';

interface Props {
  url: string;
  urlInput: string;
  setUrlInput: (v: string) => void;
  hasControl: boolean;
  isLoading: boolean;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
}

export default function BrowserToolbar({ url, urlInput, setUrlInput, hasControl, isLoading, onNavigate, onBack, onForward }: Props) {
  const [editing, setEditing] = useState(false);

  const displayUrl = editing ? urlInput : url;

  const handleFocus = () => {
    setEditing(true);
    setUrlInput(url);
  };

  const handleBlur = () => {
    setEditing(false);
    setUrlInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onNavigate(urlInput.trim());
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setEditing(false);
      setUrlInput('');
      (e.target as HTMLInputElement).blur();
    }
  };

  // Get favicon URL
  const getFaviconUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`;
    } catch {
      return null;
    }
  };

  const favicon = getFaviconUrl(url);

  return (
    <div className="h-11 bg-slate-800 border-b border-slate-700 flex items-center gap-2 px-3 flex-shrink-0">
      {/* Nav buttons */}
      <button
        onClick={onBack}
        disabled={!hasControl}
        className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded transition text-lg leading-none"
        title="Back"
      >
        ◀
      </button>
      <button
        onClick={onForward}
        disabled={!hasControl}
        className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded transition text-lg leading-none"
        title="Forward"
      >
        ▶
      </button>

      {/* URL bar */}
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="flex items-center gap-2 bg-slate-700 rounded-xl px-3 py-1.5">
          {/* Favicon */}
          {favicon && !editing && (
            <img src={favicon} alt="" className="w-4 h-4 flex-shrink-0" onError={e => { e.currentTarget.style.display = 'none'; }} />
          )}
          {(!favicon || editing) && (
            <span className="text-slate-400 text-xs flex-shrink-0">
              {isLoading ? '⏳' : '🔒'}
            </span>
          )}

          <input
            type="text"
            value={displayUrl}
            onChange={e => setUrlInput(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={!hasControl}
            placeholder="Enter URL..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500 min-w-0"
          />
        </div>
      </form>

      {/* Reload */}
      <button
        onClick={() => hasControl && onNavigate(url)}
        disabled={!hasControl}
        className="text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1 rounded transition text-sm"
        title="Reload"
      >
        🔄
      </button>
    </div>
  );
}
