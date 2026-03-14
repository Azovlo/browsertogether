import React, { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useSocket } from '../../hooks/useSocket';
import ChatMessage from './ChatMessage';
import StickerPicker from './StickerPicker';
import FileUpload from './FileUpload';
import { STICKERS } from '../../types';

interface Props {
  currentUserId: string;
  isHost: boolean;
}

export default function ChatPanel({ currentUserId, isHost }: Props) {
  const { messages } = useRoomStore();
  const { sendMessage, reactToMessage } = useSocket();
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed, 'text');
    setText('');
    inputRef.current?.focus();
  };

  const handleSendSticker = (stickerId: string) => {
    const sticker = STICKERS.find(s => s.id === stickerId);
    if (!sticker) return;
    sendMessage(sticker.emoji, 'sticker');
    setShowStickers(false);
  };

  const handleFileShared = (fileData: { url: string; name: string; size: number; mimeType: string }) => {
    sendMessage(fileData.name, 'file', fileData);
    setShowFiles(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-850">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-white text-sm">💬 Chat</h2>
        <span className="text-xs text-slate-500">{messages.filter(m => m.type !== 'system').length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            <div className="text-3xl mb-2">👋</div>
            <p>No messages yet. Say hi!</p>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isOwn={msg.userId === currentUserId}
            onReact={(emoji) => reactToMessage(msg.id, emoji)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Sticker picker */}
      {showStickers && (
        <StickerPicker onSelect={handleSendSticker} onClose={() => setShowStickers(false)} />
      )}

      {/* File upload */}
      {showFiles && (
        <FileUpload onFileShared={handleFileShared} onClose={() => setShowFiles(false)} />
      )}

      {/* Input */}
      <div className="border-t border-slate-700 p-3 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setShowStickers(v => !v); setShowFiles(false); }}
            className={`text-xl p-1.5 rounded-lg transition flex-shrink-0 ${showStickers ? 'bg-slate-600 text-yellow-400' : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-700'}`}
            title="Stickers"
          >
            😄
          </button>

          <button
            type="button"
            onClick={() => { setShowFiles(v => !v); setShowStickers(false); }}
            className={`text-xl p-1.5 rounded-lg transition flex-shrink-0 ${showFiles ? 'bg-slate-600 text-blue-400' : 'text-slate-400 hover:text-blue-400 hover:bg-slate-700'}`}
            title="Share file"
          >
            📎
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 bg-slate-700 text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 min-w-0"
          />

          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2 rounded-xl transition flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
