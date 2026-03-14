import React from 'react';
import { useRoomStore } from '../../stores/roomStore';

const typeStyles = {
  info: 'bg-slate-700 border-slate-600 text-white',
  success: 'bg-green-900/80 border-green-700 text-green-100',
  error: 'bg-red-900/80 border-red-700 text-red-100',
  warning: 'bg-amber-900/80 border-amber-700 text-amber-100',
};

const typeIcons = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

export function Toaster() {
  const { toasts, removeToast } = useRoomStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg backdrop-blur text-sm font-medium transition-all animate-pulse-once ${typeStyles[toast.type]}`}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <span>{typeIcons[toast.type]}</span>
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-60 hover:opacity-100 transition ml-1 text-base leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
