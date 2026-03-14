import React, { useRef, useCallback, useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useSocket } from '../../hooks/useSocket';
import BrowserToolbar from './BrowserToolbar';

interface Props {
  hasControl: boolean;
}

const BROWSER_WIDTH = 1280;
const BROWSER_HEIGHT = 720;

export default function BrowserView({ hasControl }: Props) {
  const { browserFrame, currentUrl } = useRoomStore();
  const { click, scroll, mouseMove, keyPress, typeText, navigate, goBack, goForward } = useSocket();
  const containerRef = useRef<HTMLDivElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate scale from container to browser coordinates
  const getScale = useCallback((): { scaleX: number; scaleY: number } => {
    const container = containerRef.current;
    if (!container) return { scaleX: 1, scaleY: 1 };

    const rect = container.getBoundingClientRect();
    return {
      scaleX: BROWSER_WIDTH / rect.width,
      scaleY: BROWSER_HEIGHT / rect.height,
    };
  }, []);

  const toServerCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const { scaleX, scaleY } = getScale();

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  }, [getScale]);

  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    if (!hasControl) return;
    const { x, y } = toServerCoords(e.clientX, e.clientY);
    click(x, y);
  }, [hasControl, click, toServerCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!hasControl) return;
    const { x, y } = toServerCoords(e.clientX, e.clientY);
    mouseMove(x, y);
  }, [hasControl, mouseMove, toServerCoords]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!hasControl) return;
    e.preventDefault();
    const { x, y } = toServerCoords(e.clientX, e.clientY);
    scroll(x, y, e.deltaX, e.deltaY);
  }, [hasControl, scroll, toServerCoords]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!hasControl) return;

    // Only forward non-typing keys here (typing goes through type event)
    const specialKeys = ['Enter', 'Backspace', 'Delete', 'Escape', 'Tab',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown'];

    if (specialKeys.includes(e.key)) {
      e.preventDefault();
      keyPress(e.key);
    } else if (e.ctrlKey || e.metaKey) {
      // Allow ctrl+key combos
      const combo = `${e.ctrlKey ? 'Control+' : ''}${e.metaKey ? 'Meta+' : ''}${e.key}`;
      keyPress(combo);
    } else if (e.key.length === 1) {
      typeText(e.key);
    }
  }, [hasControl, keyPress, typeText]);

  const handleNavigate = async (url: string) => {
    if (!hasControl || !url.trim()) return;
    setIsLoading(true);
    try {
      await navigate(url.trim());
    } catch (err) {
      console.error('Navigation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Browser toolbar */}
      <BrowserToolbar
        url={currentUrl}
        urlInput={urlInput}
        setUrlInput={setUrlInput}
        hasControl={hasControl}
        isLoading={isLoading}
        onNavigate={handleNavigate}
        onBack={() => hasControl && goBack()}
        onForward={() => hasControl && goForward()}
      />

      {/* Browser frame */}
      <div className="flex-1 relative overflow-hidden bg-slate-950">
        {browserFrame ? (
          <div
            ref={containerRef}
            className="absolute inset-0"
            onClick={handleMouseClick}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            style={{ cursor: hasControl ? 'default' : 'not-allowed' }}
          >
            <img
              src={browserFrame}
              alt="Browser view"
              className="w-full h-full object-fill select-none"
              draggable={false}
            />

            {/* Viewer overlay when no control */}
            {!hasControl && (
              <div className="absolute inset-0 bg-transparent cursor-default" />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">🌐</div>
              <p className="text-slate-400 text-lg">Loading browser...</p>
            </div>
          </div>
        )}

        {/* No control banner */}
        {browserFrame && !hasControl && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur text-slate-300 text-xs px-3 py-1.5 rounded-full border border-slate-600 pointer-events-none">
            👀 Viewing — request control to interact
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}
