import React, { useRef, useState } from 'react';

interface FileData {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

interface Props {
  onFileShared: (fileData: FileData) => void;
  onClose: () => void;
}

const SERVER_URL = process.env.REACT_APP_SERVER_URL || '';

export default function FileUpload({ onFileShared, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${SERVER_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onFileShared(data.file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="border-t border-slate-700 bg-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">SHARE FILE</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-sm transition">✕</button>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
          dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-slate-600 hover:border-slate-500'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-300 text-sm">Uploading...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl mb-1">📁</div>
            <p className="text-slate-300 text-sm font-medium">Click or drag a file</p>
            <p className="text-slate-500 text-xs mt-0.5">Images, PDF, Video, ZIP — max 50MB</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,video/mp4,video/webm,text/plain,application/zip"
        onChange={handleFileChange}
      />
    </div>
  );
}
