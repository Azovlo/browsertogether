import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useRoomStore } from '../../stores/roomStore';

export default function LandingPage() {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createRoom, joinRoom } = useSocket();
  const { setRoom, setMessages, connected } = useRoomStore();

  // Parse invite code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode('join');
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    try {
      const { room, userId, messages } = await createRoom(userName.trim(), roomName.trim() || undefined);
      setRoom(room, userId);
      setMessages(messages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return setError('Enter your name');
    if (!inviteCode.trim()) return setError('Enter invite code');
    setLoading(true);
    setError('');
    try {
      const { room, userId, messages } = await joinRoom(inviteCode.trim(), userName.trim());
      setRoom(room, userId);
      setMessages(messages);
      window.history.replaceState({}, '', '/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-5xl">🌐</span>
          <h1 className="text-4xl font-bold text-white tracking-tight">BrowserTogether</h1>
        </div>
        <p className="text-slate-400 text-lg">Browse the web together in real time</p>
      </div>

      {/* Connection indicator */}
      <div className="mb-6 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
        <span className="text-sm text-slate-400">{connected ? 'Connected' : 'Connecting...'}</span>
      </div>

      {mode === 'home' && (
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={() => setMode('create')}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg shadow-blue-900/40 text-lg"
          >
            ✨ Create Room
          </button>
          <button
            onClick={() => setMode('join')}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg text-lg"
          >
            🔗 Join Room
          </button>
        </div>
      )}

      {mode === 'create' && (
        <form onSubmit={handleCreate} className="w-full max-w-md bg-slate-800/80 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-5">Create a Room</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name *</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={30}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Room Name (optional)</label>
              <input
                type="text"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="My Awesome Room"
                maxLength={50}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => { setMode('home'); setError(''); }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition">
              Back
            </button>
            <button type="submit" disabled={loading || !connected}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition">
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      )}

      {mode === 'join' && (
        <form onSubmit={handleJoin} className="w-full max-w-md bg-slate-800/80 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-5">Join a Room</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Your Name *</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Enter your name..."
                maxLength={30}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Invite Code *</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                maxLength={8}
                className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 font-mono tracking-widest text-center text-xl"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button type="button" onClick={() => { setMode('home'); setError(''); }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition">
              Back
            </button>
            <button type="submit" disabled={loading || !connected}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition">
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </form>
      )}

      {/* Features */}
      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl text-center">
        {[
          { icon: '🖥️', text: 'Shared Browser' },
          { icon: '💬', text: 'Live Chat' },
          { icon: '🎮', text: 'Control Sharing' },
          { icon: '📁', text: 'File Sharing' },
        ].map(f => (
          <div key={f.text} className="bg-slate-800/50 rounded-xl p-3">
            <div className="text-2xl mb-1">{f.icon}</div>
            <div className="text-sm text-slate-400">{f.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
