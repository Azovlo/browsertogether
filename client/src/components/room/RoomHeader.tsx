import React, { useState } from 'react';
import { Room } from '../../types';

interface Props {
  room: Room;
  isHost: boolean;
  hasControl: boolean;
  onLeave: () => void;
  onToggleUsers: () => void;
  onToggleChat: () => void;
  chatOpen: boolean;
  unreadCount: number;
  showUsers: boolean;
}

export default function RoomHeader({ room, isHost, hasControl, onLeave, onToggleUsers, onToggleChat, chatOpen, unreadCount, showUsers }: Props) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const link = `${window.location.origin}?invite=${room.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3 flex-shrink-0">
      {/* Room name */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg">🌐</span>
        <div className="min-w-0">
          <h1 className="font-semibold text-white text-sm truncate">{room.name}</h1>
          <div className="flex items-center gap-2">
            {isHost && <span className="text-xs text-amber-400 font-medium">Host</span>}
            {hasControl && <span className="text-xs text-green-400 font-medium">● Control</span>}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Invite code */}
      <button
        onClick={copyCode}
        className="hidden sm:flex items-center gap-2 bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-1.5 text-sm transition"
        title="Click to copy invite code"
      >
        <span className="text-slate-400 text-xs">Code:</span>
        <span className="font-mono font-bold text-white tracking-widest">{room.inviteCode}</span>
      </button>

      <button
        onClick={copyInviteLink}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
      >
        {copied ? '✅ Copied!' : '🔗 Invite'}
      </button>

      {/* Users button */}
      <button
        onClick={onToggleUsers}
        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${showUsers ? 'bg-slate-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
      >
        👥 <span className="font-medium">{room.userCount}/{room.maxUsers}</span>
      </button>

      {/* Chat toggle */}
      <button
        onClick={onToggleChat}
        className={`relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${chatOpen ? 'bg-slate-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
      >
        💬
        {!chatOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Leave */}
      <button
        onClick={onLeave}
        className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
      >
        Leave
      </button>
    </header>
  );
}
