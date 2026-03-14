import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useSocket } from '../../hooks/useSocket';

interface Props {
  isHost: boolean;
}

export default function ControlRequest({ isHost }: Props) {
  const { pendingControlRequest, setPendingControlRequest } = useRoomStore();
  const { grantControl } = useSocket();

  if (!pendingControlRequest || !isHost) return null;

  const handleGrant = () => {
    grantControl(pendingControlRequest.userId);
    setPendingControlRequest(null);
  };

  const handleDeny = () => {
    setPendingControlRequest(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-800 border border-slate-600 rounded-2xl p-4 shadow-2xl max-w-sm animate-bounce-once">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🎮</span>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{pendingControlRequest.userName}</p>
          <p className="text-slate-400 text-xs mt-0.5">is requesting browser control</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleGrant}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2 rounded-xl transition"
            >
              Grant ✅
            </button>
            <button
              onClick={handleDeny}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium py-2 rounded-xl transition"
            >
              Deny ❌
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
