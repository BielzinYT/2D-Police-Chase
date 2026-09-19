/**
 * Game Over Modal ("DESTRUÍDO / PRESO")
 */
import React from 'react';
import {
  RotateCcw,
  Trophy,
  Skull,
  Clock,
  Car,
  Flame,
  DollarSign
} from 'lucide-react';
import { GameState } from '../types';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: GameState;
  highScore: number;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  gameState,
  highScore,
  onRestart
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isNewRecord = gameState.score > highScore;

  return (
    <div
      id="gameover-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 animate-in fade-in duration-300"
    >
      <div
        id="gameover-modal"
        className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl shadow-2xl overflow-hidden text-center p-6 sm:p-8 relative"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-red-600/30 blur-3xl pointer-events-none rounded-full" />

        {/* BUSTED / WASTED TITLE */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-500 shadow-xl">
            <Skull className="w-10 h-10 animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">
          Fim de Fuga!
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Seu carro foi interceptado e destruído pela força policial.
        </p>

        {/* STARS REACHED */}
        <div className="flex justify-center items-center gap-1.5 my-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-2xl ${
                star <= gameState.wantedStars
                  ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                  : 'text-slate-700 opacity-40'
              }`}
            >
              ★
            </span>
          ))}
        </div>

        {/* STATS RUN SUMMARY */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5 my-5 text-left text-xs font-mono">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4 text-sky-400" />
              Tempo de Sobrevivência:
            </span>
            <span className="font-bold text-slate-100">{formatTime(gameState.timeSurvived)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <Car className="w-4 h-4 text-red-400" />
              Viaturas Destruídas:
            </span>
            <span className="font-bold text-slate-100">{gameState.policeDestroyed}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <Flame className="w-4 h-4 text-orange-400" />
              Objetos Urbanos Destruídos:
            </span>
            <span className="font-bold text-slate-100">{gameState.destructionCount}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Grana Acumulada:
            </span>
            <span className="font-bold text-emerald-400">${gameState.cash.toLocaleString()}</span>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2 text-amber-400 font-bold">
              <Trophy className="w-4 h-4" />
              Pontuação Final:
            </span>
            <span className="font-bold text-base text-amber-400">
              {Math.round(gameState.score).toLocaleString()} pts
            </span>
          </div>

          {isNewRecord && (
            <div className="text-center text-xs font-sans font-bold text-emerald-400 bg-emerald-950/50 py-1 rounded-lg border border-emerald-500/30 animate-pulse">
              🎉 NOVO RECORDE PESSOAL!
            </div>
          )}
        </div>

        {/* RESTART BUTTON */}
        <button
          id="btn-restart-game"
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-base shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Jogar Novamente</span>
        </button>
      </div>
    </div>
  );
};
