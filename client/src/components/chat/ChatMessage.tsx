import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, REACTIONS } from '../../types';

interface Props {
  message: ChatMessageType;
  isOwn: boolean;
  onReact: (emoji: string) => void;
}

function formatTime(ts: string | Date): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ChatMessage({ message, isOwn, onReact }: Props) {
  const [showReactions, setShowReactions] = useState(false);

  // System message
  if (message.type === 'system') {
    return (
      <div className="text-center py-1">
        <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Sticker
  if (message.type === 'sticker') {
    return (
      <div className={`flex items-end gap-2 group message-enter ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        {!isOwn && (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mb-1"
            style={{ backgroundColor: message.avatar }}
          >
            {message.userName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && (
            <span className="text-xs text-slate-500 ml-1 mb-0.5">{message.userName}</span>
          )}

          <div
            className="text-5xl leading-none select-none cursor-pointer hover:scale-110 transition-transform"
            onClick={() => setShowReactions(v => !v)}
          >
            {message.content}
          </div>

          {/* Reactions display */}
          {Object.entries(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(message.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className="flex items-center gap-0.5 bg-slate-700 hover:bg-slate-600 rounded-full px-1.5 py-0.5 text-xs transition"
                >
                  {emoji} <span className="text-slate-400">{users.length}</span>
                </button>
              ))}
            </div>
          )}

          <span className="text-xs text-slate-600 mt-0.5">{formatTime(message.timestamp)}</span>
        </div>

        {/* Reaction picker */}
        {showReactions && (
          <div className="flex gap-1 bg-slate-700 rounded-full px-2 py-1 shadow-lg">
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => { onReact(emoji); setShowReactions(false); }}
                className="text-lg hover:scale-125 transition-transform">
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // File message
  if (message.type === 'file' && message.fileData) {
    const { url, name, size, mimeType } = message.fileData;
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isPdf = mimeType === 'application/pdf';
    const serverUrl = process.env.REACT_APP_SERVER_URL || '';

    return (
      <div className={`flex items-end gap-2 group message-enter ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwn && (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mb-1"
            style={{ backgroundColor: message.avatar }}
          >
            {message.userName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className={`flex flex-col max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
          {!isOwn && <span className="text-xs text-slate-500 ml-1 mb-0.5">{message.userName}</span>}

          <div className="bg-slate-700 rounded-2xl overflow-hidden max-w-xs">
            {isImage && (
              <img
                src={`${serverUrl}${url}`}
                alt={name}
                className="max-w-full max-h-48 object-contain cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(`${serverUrl}${url}`, '_blank')}
              />
            )}
            {isVideo && (
              <video src={`${serverUrl}${url}`} controls className="max-w-full max-h-48" />
            )}

            <div className="px-3 py-2 flex items-center gap-2">
              <span className="text-lg">{isImage ? '🖼️' : isVideo ? '🎬' : isPdf ? '📄' : '📁'}</span>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate max-w-40">{name}</p>
                <p className="text-slate-400 text-xs">{formatFileSize(size)}</p>
              </div>
              <a
                href={`${serverUrl}${url}`}
                download={name}
                className="text-blue-400 hover:text-blue-300 text-xs ml-auto"
                onClick={e => e.stopPropagation()}
              >
                ↓
              </a>
            </div>
          </div>

          <span className="text-xs text-slate-600 mt-0.5">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    );
  }

  // Text message
  return (
    <div
      className={`flex items-end gap-2 group message-enter ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Avatar */}
      {!isOwn && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mb-1"
          style={{ backgroundColor: message.avatar }}
        >
          {message.userName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className={`flex flex-col max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && (
          <span className="text-xs text-slate-500 ml-2 mb-0.5">{message.userName}</span>
        )}

        <div className="relative">
          <div
            className={`rounded-2xl px-3 py-2 text-sm break-words max-w-xs cursor-default ${
              isOwn
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-slate-700 text-slate-100 rounded-bl-sm'
            }`}
            onDoubleClick={() => setShowReactions(v => !v)}
          >
            {message.content}
          </div>

          {/* Reaction button (on hover) */}
          <button
            className="absolute -right-6 top-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white text-sm transition-all"
            onClick={() => setShowReactions(v => !v)}
          >
            😊
          </button>
        </div>

        {/* Reactions display */}
        {Object.entries(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 ml-1">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="flex items-center gap-0.5 bg-slate-700 hover:bg-slate-600 rounded-full px-1.5 py-0.5 text-xs transition"
              >
                {emoji} <span className="text-slate-400">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-slate-600 mt-0.5 mx-1">{formatTime(message.timestamp)}</span>
      </div>

      {/* Reaction picker */}
      {showReactions && (
        <div className="flex gap-1 bg-slate-700 rounded-full px-2 py-1 shadow-lg z-10">
          {REACTIONS.map(emoji => (
            <button key={emoji} onClick={() => { onReact(emoji); setShowReactions(false); }}
              className="text-lg hover:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
