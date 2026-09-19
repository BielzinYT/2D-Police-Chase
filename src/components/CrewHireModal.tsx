/**
 * Crew Recruitment & Upgrade Modal ("Contratar Ajudantes")
 */
import React from 'react';
import {
  X,
  Users,
  Crosshair,
  Wrench,
  Shield,
  Zap,
  Flame,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { HelperConfig, HelperId } from '../types';

interface CrewHireModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpers: HelperConfig[];
  cash: number;
  onUpgradeHelper: (id: HelperId) => void;
}

export const CrewHireModal: React.FC<CrewHireModalProps> = ({
  isOpen,
  onClose,
  helpers,
  cash,
  onUpgradeHelper
}) => {
  if (!isOpen) return null;

  const getIcon = (id: string) => {
    switch (id) {
      case 'gunner':
        return <Crosshair className="w-6 h-6 text-amber-400" />;
      case 'mechanic':
        return <Wrench className="w-6 h-6 text-emerald-400" />;
      case 'escort':
        return <Shield className="w-6 h-6 text-yellow-400" />;
      case 'emp':
        return <Zap className="w-6 h-6 text-cyan-400" />;
      case 'spikes':
        return <Flame className="w-6 h-6 text-orange-400" />;
      default:
        return <Users className="w-6 h-6 text-indigo-400" />;
    }
  };

  return (
    <div id="crew-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        id="crew-modal"
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                Contratar Ajudantes de Fuga
              </h2>
              <p className="text-xs text-slate-400">
                Recrute parceiros de crime para te proteger, destruir viaturas e manter seu carro funcionando!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* CASH BADGE */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 font-mono font-bold text-sm">
              <DollarSign className="w-4 h-4" />
              <span>{cash.toLocaleString()}</span>
            </div>
            <button
              id="btn-close-crew-modal"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HELPERS LIST */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 divide-y divide-slate-800/60">
          {helpers.map((h) => {
            const nextCost = Math.round(h.baseCost * Math.pow(h.costMultiplier, h.level));
            const isMax = h.level >= h.maxLevel;
            const canBuy = !isMax && cash >= nextCost;

            return (
              <div
                key={h.id}
                id={`crew-card-${h.id}`}
                className="pt-3.5 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700">
                    {getIcon(h.id)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-100">
                        {h.name}
                      </h3>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-indigo-700/40">
                        {isMax ? 'NÍVEL MÁXIMO' : `Nível ${h.level}/${h.maxLevel}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {h.description}
                    </p>
                    {/* Level progress dots */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {Array.from({ length: h.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-6 rounded-full transition-all ${
                            i < h.level ? 'bg-indigo-500' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end">
                  <button
                    id={`btn-upgrade-crew-${h.id}`}
                    onClick={() => onUpgradeHelper(h.id)}
                    disabled={isMax || !canBuy}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isMax
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                        : canBuy
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {isMax ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Contratado</span>
                      </>
                    ) : (
                      <>
                        <span>{h.level === 0 ? 'Contratar' : 'Melhorar'}</span>
                        <span className="font-mono font-bold text-emerald-200">
                          ${nextCost.toLocaleString()}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Dica: Use as teclas [1] a [5] no teclado para contratar durante a fuga!</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors cursor-pointer"
          >
            Voltar ao Jogo
          </button>
        </div>
      </div>
    </div>
  );
};
