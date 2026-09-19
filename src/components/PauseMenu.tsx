/**
 * Pause Menu & How to Play modal
 */
import React from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Keyboard,
  Crosshair,
  Flame,
  Shield,
  HelpCircle,
  X
} from 'lucide-react';

interface PauseMenuProps {
  isOpen: boolean;
  isHelpOnly?: boolean;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onToggleSound: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  isHelpOnly = false,
  isMuted,
  onResume,
  onRestart,
  onToggleSound
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pause-menu-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div
        id="pause-menu"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 relative max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onResume}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {isHelpOnly ? 'Como Jogar' : 'Jogo Pausado'}
            </h2>
            <p className="text-xs text-slate-400">Fuga Urbana 2D - Perseguição Sem Fim</p>
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div className="space-y-4 mb-6">
          {/* CONTROLS GUIDE */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Keyboard className="w-4 h-4 text-indigo-400" />
              <span>Controles do Teclado</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Acelerar / Ré:</span>
                <strong className="text-amber-400">W / S ou ↑ / ↓</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Virar / Direção:</span>
                <strong className="text-amber-400">A / D ou ← / →</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Derrapagem / Drift:</span>
                <strong className="text-cyan-400">ESPAÇO</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Turbo Nitro:</span>
                <strong className="text-cyan-400">SHIFT</strong>
              </div>
              <div className="col-span-2 bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Contratar Ajudantes:</span>
                <strong className="text-emerald-400">Teclas [1] a [5]</strong>
              </div>
            </div>
          </div>

          {/* OBJECTIVES & MECHANICS */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
            <p className="flex items-start gap-2">
              <Flame className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                <strong>Destruição Urbana:</strong> Destrua hidrantes (jorram água), postes de luz, cercas, lixeiras e bombas de combustível para ganhar dinheiro e aumentar seu nível de procurado!
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Estrelas de Procurado:</strong> Começa com 1 estrela e vai até 5 estrelas! Mais viaturas, camburões do SWAT, viaturas blindadas do FBI e até um helicóptero policial serão acionados!
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Crosshair className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Ajudantes de Fuga:</strong> Use a grana coletada para contratar atiradores de janela, mecânicos de reparo instantâneo, carros de escolta para abalroar viaturas e pulso EMP!
              </span>
            </p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Continuar Fuga</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleSound}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? 'Ativar Som' : 'Silenciar'}</span>
            </button>

            <button
              onClick={onRestart}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-red-900/50 hover:border-red-500/50 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-red-400" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
