import React, { useState } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useSocket } from '../../hooks/useSocket';
import BrowserView from '../browser/BrowserView';
import ChatPanel from '../chat/ChatPanel';
import UsersPanel from './UsersPanel';
import RoomHeader from './RoomHeader';
import ControlRequest from './ControlRequest';

export default function RoomPage() {
  const { room, userId, chatOpen, setChatOpen, unreadCount } = useRoomStore();
  const [showUsers, setShowUsers] = useState(false);
  const { leaveRoom } = useSocket();

  if (!room) return null;

  const me = room.users.find(u => u.id === userId);
  const hasControl = me?.hasControl || false;
  const isHost = me?.isHost || false;

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <RoomHeader
        room={room}
        isHost={isHost}
        hasControl={hasControl}
        onLeave={leaveRoom}
        onToggleUsers={() => setShowUsers(v => !v)}
        onToggleChat={() => {
          setChatOpen(!chatOpen);
        }}
        chatOpen={chatOpen}
        unreadCount={unreadCount}
        showUsers={showUsers}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Browser view */}
        <div className="flex-1 overflow-hidden relative">
          <BrowserView hasControl={hasControl} />
        </div>

        {/* Users sidebar (overlay on mobile) */}
        {showUsers && (
          <div className="absolute right-0 top-14 z-30 sm:relative sm:top-auto sm:z-auto w-64 h-full">
            <UsersPanel
              users={room.users}
              currentUserId={userId || ''}
              isHost={isHost}
              onClose={() => setShowUsers(false)}
            />
          </div>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-80 flex-shrink-0 border-l border-slate-700">
            <ChatPanel
              currentUserId={userId || ''}
              isHost={isHost}
            />
          </div>
        )}
      </div>

      {/* Control request modal */}
      <ControlRequest isHost={isHost} />
    </div>
  );
}
