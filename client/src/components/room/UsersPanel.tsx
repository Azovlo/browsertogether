import React from 'react';
import { User } from '../../types';
import { useSocket } from '../../hooks/useSocket';

interface Props {
  users: User[];
  currentUserId: string;
  isHost: boolean;
  onClose: () => void;
}

export default function UsersPanel({ users, currentUserId, isHost, onClose }: Props) {
  const { grantControl, requestControl } = useSocket();

  return (
    <div className="h-full bg-slate-800 border-l border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-white text-sm">Participants ({users.length})</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {users.map(user => (
          <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/50 transition user-enter">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: user.avatar }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-white text-sm font-medium truncate">
                  {user.name}
                  {user.id === currentUserId && <span className="text-slate-400 text-xs ml-1">(you)</span>}
                </span>
              </div>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {user.isHost && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Host</span>
                )}
                {user.hasControl && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">● Control</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {isHost && user.id !== currentUserId && !user.hasControl && (
              <button
                onClick={() => grantControl(user.id)}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg transition flex-shrink-0"
                title="Give control"
              >
                🎮
              </button>
            )}

            {!isHost && user.id === currentUserId && !user.hasControl && (
              <button
                onClick={requestControl}
                className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded-lg transition flex-shrink-0"
                title="Request control"
              >
                🙋
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
