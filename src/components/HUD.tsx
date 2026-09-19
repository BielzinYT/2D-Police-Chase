/**
 * Game Head-Up Display (HUD)
 */
import React from 'react';
import {
  Shield,
  Gauge,
  Volume2,
  VolumeX,
  Pause,
  Users,
  Crosshair,
  Wrench,
  Zap,
  Flame,
  FlameKindling,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { GameState, HelperConfig, Vehicle } from '../types';

interface HUDProps {
  gameState: GameState;
  player: Vehicle;
  helpers: HelperConfig[];
  onUpgradeHelper: (id: HelperConfig['id']) => void;
  onOpenCrewModal: () => void;
  onTogglePause: () => void;
  onToggleSound: () => void;
  isMuted: boolean;
  onOpenHelp: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  gameState,
  player,
  helpers,
  onUpgradeHelper,
  onOpenCrewModal,
  onTogglePause,
  onToggleSound,
  isMuted,
  onOpenHelp
}) => {
  const speedKmh = Math.round((player.speed / 450) * 160);
  const healthPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
  const nitroPct = Math.max(0, Math.min(100, gameState.nitro));

  const helperIcons: Record<string, React.ReactNode> = {
    gunner: <Crosshair className="w-4 h-4 text-amber-400" />,
    mechanic: <Wrench className="w-4 h-4 text-emerald-400" />,
    escort: <Shield className="w-4 h-4 text-yellow-400" />,
    emp: <Zap className="w-4 h-4 text-cyan-400" />,
    spikes: <Flame className="w-4 h-4 text-orange-400" />
  };

  return (
    <div id="game-hud" className="pointer-events-none absolute inset-0 select-none flex flex-col justify-between p-3 sm:p-5">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-3">
        {/* WANTED STARS & STATUS */}
        <div className="flex flex-col gap-1.5 bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-slate-700/60 shadow-xl max-w-sm pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Procurado:
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= gameState.wantedStars;
                return (
                  <span
                    key={star}
                    className={`text-2xl transition-all duration-300 transform ${
                      isActive
                        ? gameState.isEvading
                          ? 'text-yellow-400 animate-pulse scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]'
                          : 'text-amber-400 scale-105 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                        : 'text-slate-700 opacity-40'
                    }`}
                  >
                    ★
                  </span>
                );
              })}
            </div>
          </div>

          {/* EVASION / ALERT STATUS */}
          {gameState.isEvading ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-yellow-300 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
              EVADINDO DA POLÍCIA... MANTER DISTÂNCIA!
            </div>
          ) : (
            <div className="text-[11px] text-slate-300 font-medium flex items-center justify-between">
              <span>Nível {gameState.wantedStars} - Viaturas em Perseguição</span>
              <span className="text-red-400 font-mono font-bold">+{gameState.wantedPoints} pts</span>
            </div>
          )}

          {/* COMBO & DESTRUCTION */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1 text-orange-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COMBO {gameState.multiplier.toFixed(1)}x</span>
            </div>
            <div className="text-slate-400">
              Caos: <strong className="text-slate-200">{gameState.destructionCount}</strong> objetos
            </div>
          </div>
        </div>

        {/* CASH & CONTROLS HEADER */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* CASH BALANCE */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/40 shadow-xl">
            <span className="text-emerald-400 font-mono font-extrabold text-lg sm:text-xl tracking-wide">
              $ {gameState.cash.toLocaleString()}
            </span>
          </div>

          {/* CREW RECRUITMENT BUTTON */}
          <button
            id="btn-open-crew"
            onClick={onOpenCrewModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-lg border border-indigo-400/40 transition-all cursor-pointer"
            title="Contratar e Evoluir Ajudantes"
          >
            <Users className="w-4 h-4 text-indigo-200" />
            <span className="hidden sm:inline">Equipe</span>
            <span className="bg-indigo-900/80 px-1.5 py-0.5 rounded text-[11px] font-mono">
              {helpers.filter(h => h.level > 0).length}/5
            </span>
          </button>

          {/* SOUND TOGGLE */}
          <button
            id="btn-sound"
            onClick={onToggleSound}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title={isMuted ? 'Ativar Som' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* HELP / HOW TO PLAY */}
          <button
            id="btn-help"
            onClick={onOpenHelp}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Instruções"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {/* PAUSE */}
          <button
            id="btn-pause"
            onClick={onTogglePause}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 active:scale-95 text-slate-300 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Pausar"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </div>

      {/* BOTTOM SECTION: CAR STATUS & QUICK RECRUIT SLOTS */}
      <div className="flex flex-col gap-3">
        {/* CAR HEALTH & GAUGES BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-700/60 shadow-2xl pointer-events-auto">
          {/* VEHICLE HEALTH */}
          <div className="flex-1 min-w-[160px] flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-mono font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Blindagem do Carro
              </span>
              <span className={healthPct > 40 ? 'text-emerald-400' : healthPct > 20 ? 'text-yellow-400' : 'text-red-400'}>
                {Math.round(player.health)}/{player.maxHealth}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  healthPct > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : healthPct > 25
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                    : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                }`}
                style={{ width: `${healthPct}%` }}
              ></div>
            </div>
          </div>

          {/* NITRO GAUGE */}
          <div className="flex-1 min-w-[140px] flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs font-mono font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <FlameKindling className="w-3.5 h-3.5 text-cyan-400" />
                Nitro Boost [SHIFT / ESPAÇO]
              </span>
              <span className="text-cyan-400">{Math.round(nitroPct)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-150 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-sky-300 ${
                  gameState.isNitroActive ? 'shadow-[0_0_12px_#38bdf8]' : ''
                }`}
                style={{ width: `${nitroPct}%` }}
              ></div>
            </div>
          </div>

          {/* SPEEDOMETER & DRIFT INDICATOR */}
          <div className="flex items-center gap-3 px-3 py-1 bg-slate-900/90 rounded-xl border border-slate-800 font-mono">
            <Gauge className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <div className="text-base sm:text-lg font-black text-slate-100 leading-none">
                {speedKmh} <span className="text-[10px] text-slate-400 font-normal">km/h</span>
              </div>
              {player.isDrifting && (
                <div className="text-[10px] text-amber-400 font-bold tracking-wider animate-pulse">
                  DERRAPANDO!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK HELPER ACTION BAR (HOTKEYS [1] - [5]) */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pointer-events-auto">
          {helpers.map((helper, idx) => {
            const nextCost = Math.round(helper.baseCost * Math.pow(helper.costMultiplier, helper.level));
            const canAfford = helper.level < helper.maxLevel && gameState.cash >= nextCost;
            const isMax = helper.level >= helper.maxLevel;

            return (
              <button
                key={helper.id}
                id={`quick-helper-${helper.id}`}
                onClick={() => onUpgradeHelper(helper.id)}
                disabled={isMax || !canAfford}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center relative overflow-hidden group ${
                  helper.level > 0
                    ? 'bg-slate-900/90 border-indigo-500/50 hover:border-indigo-400 shadow-md'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                } ${canAfford && !isMax ? 'cursor-pointer hover:bg-slate-800/90 active:scale-95' : 'opacity-70'}`}
                title={`${helper.name}: ${helper.description}`}
              >
                {/* Hotkey Tag */}
                <span className="absolute top-1 left-1 text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400 hidden sm:inline">
                  [{idx + 1}]
                </span>

                {/* Level badge */}
                <span className="absolute top-1 right-1 text-[9px] font-mono font-bold px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                  {isMax ? 'MAX' : `Nv ${helper.level}`}
                </span>

                <div className="my-1">{helperIcons[helper.id]}</div>

                <span className="text-[11px] sm:text-xs font-bold text-slate-200 truncate w-full">
                  {helper.name}
                </span>

                <span className="text-[10px] font-mono font-semibold text-emerald-400">
                  {isMax ? 'CONTRATADO' : `$${nextCost}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
