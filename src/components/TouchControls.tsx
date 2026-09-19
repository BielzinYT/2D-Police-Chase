/**
 * Touch / Mobile On-Screen Controls
 */
import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Flame, Sparkles } from 'lucide-react';
import { ControlInput } from '../game/physics';

interface TouchControlsProps {
  onInput: (setter: (prev: ControlInput) => ControlInput) => void;
  nitroReady: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onInput, nitroReady }) => {
  return (
    <div id="touch-controls" className="pointer-events-none absolute inset-x-0 bottom-24 sm:bottom-28 z-20 flex justify-between px-4 sm:px-8 select-none">
      {/* LEFT SIDE: STEERING */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          id="btn-touch-left"
          onTouchStart={(e) => { e.preventDefault(); onInput(p => ({ ...p, steer: -1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onInput(p => ({ ...p, steer: 0 })); }}
          onMouseDown={() => onInput(p => ({ ...p, steer: -1 }))}
          onMouseUp={() => onInput(p => ({ ...p, steer: 0 }))}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/80 active:bg-indigo-600/80 border border-slate-700/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-90"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        <button
          id="btn-touch-right"
          onTouchStart={(e) => { e.preventDefault(); onInput(p => ({ ...p, steer: 1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onInput(p => ({ ...p, steer: 0 })); }}
          onMouseDown={() => onInput(p => ({ ...p, steer: 1 }))}
          onMouseUp={() => onInput(p => ({ ...p, steer: 0 }))}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/80 active:bg-indigo-600/80 border border-slate-700/80 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-90"
        >
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>

      {/* RIGHT SIDE: THROTTLE, BRAKE, DRIFT, NITRO */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* DRIFT / HANDBRAKE */}
        <button
          id="btn-touch-drift"
          onTouchStart={(e) => { e.preventDefault(); onInput(p => ({ ...p, handbrake: true })); }}
          onTouchEnd={(e) => { e.preventDefault(); onInput(p => ({ ...p, handbrake: false })); }}
          onMouseDown={() => onInput(p => ({ ...p, handbrake: true }))}
          onMouseUp={() => onInput(p => ({ ...p, handbrake: false }))}
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-950/80 active:bg-amber-600/80 border border-amber-500/60 text-amber-300 font-bold text-xs flex flex-col items-center justify-center shadow-2xl backdrop-blur-md active:scale-90"
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>DRIFT</span>
        </button>

        {/* NITRO */}
        <button
          id="btn-touch-nitro"
          onTouchStart={(e) => { e.preventDefault(); onInput(p => ({ ...p, nitro: true })); }}
          onTouchEnd={(e) => { e.preventDefault(); onInput(p => ({ ...p, nitro: false })); }}
          onMouseDown={() => onInput(p => ({ ...p, nitro: true }))}
          onMouseUp={() => onInput(p => ({ ...p, nitro: false }))}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl border flex flex-col items-center justify-center shadow-2xl backdrop-blur-md active:scale-90 text-xs font-bold ${
            nitroReady
              ? 'bg-cyan-950/80 active:bg-cyan-500/80 border-cyan-400 text-cyan-300 animate-pulse'
              : 'bg-slate-900/60 border-slate-800 text-slate-500'
          }`}
        >
          <Flame className="w-4 h-4 mb-0.5" />
          <span>NITRO</span>
        </button>

        {/* REVERSE / BRAKE */}
        <button
          id="btn-touch-brake"
          onTouchStart={(e) => { e.preventDefault(); onInput(p => ({ ...p, throttle: -1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onInput(p => ({ ...p, throttle: 0 })); }}
          onMouseDown={() => onInput(p => ({ ...p, throttle: -1 }))}
          onMouseUp={() => onInput(p => ({ ...p, throttle: 0 }))}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-950/80 active:bg-rose-600/80 border border-rose-500/60 text-rose-200 flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-90"
        >
          <ArrowDown className="w-7 h-7" />
        </button>

        {/* ACCELERATE */}
        <button
          id="btn-touch-gas"
          onTouchStart={(e) => { e.preventDefault(); onInput(p => ({ ...p, throttle: 1 })); }}
          onTouchEnd={(e) => { e.preventDefault(); onInput(p => ({ ...p, throttle: 0 })); }}
          onMouseDown={() => onInput(p => ({ ...p, throttle: 1 }))}
          onMouseUp={() => onInput(p => ({ ...p, throttle: 0 }))}
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-emerald-700 active:bg-emerald-500 border border-emerald-400 text-white flex items-center justify-center shadow-2xl backdrop-blur-md active:scale-90"
        >
          <ArrowUp className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};
