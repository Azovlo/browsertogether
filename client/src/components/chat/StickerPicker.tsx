import React from 'react';
import { STICKERS } from '../../types';

interface Props {
  onSelect: (stickerId: string) => void;
  onClose: () => void;
}

export default function StickerPicker({ onSelect, onClose }: Props) {
  return (
    <div className="border-t border-slate-700 bg-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400 font-medium">STICKERS</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white text-sm transition">✕</button>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {STICKERS.map(sticker => (
          <button
            key={sticker.id}
            onClick={() => onSelect(sticker.id)}
            title={sticker.label}
            className="text-2xl p-1 rounded-lg hover:bg-slate-700 transition hover:scale-125 aspect-square flex items-center justify-center"
          >
            {sticker.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
