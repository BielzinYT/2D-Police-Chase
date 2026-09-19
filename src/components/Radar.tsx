/**
 * Tactical Radar / Minimap for tracking police & objectives
 */
import React, { useEffect, useRef } from 'react';
import { Vehicle, Helicopter, CashDrop } from '../types';

interface RadarProps {
  player: Vehicle;
  cops: Vehicle[];
  escort: Vehicle | null;
  helicopter: Helicopter | null;
  cashDrops: CashDrop[];
}

export const Radar: React.FC<RadarProps> = ({
  player,
  cops,
  escort,
  helicopter,
  cashDrops
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarRange = 1400; // in world pixels
  const radarSize = 130; // canvas pixel dimensions

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = radarSize / 2;
    const scale = center / radarRange;

    // Clear
    ctx.clearRect(0, 0, radarSize, radarSize);

    // Radar background circle
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();

    // Radar grid rings
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, center * 0.4, 0, Math.PI * 2);
    ctx.arc(center, center, center * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // Cross lines
    ctx.beginPath();
    ctx.moveTo(center, 4);
    ctx.lineTo(center, radarSize - 4);
    ctx.moveTo(4, center);
    ctx.lineTo(radarSize - 4, center);
    ctx.stroke();

    // Sweep line animation
    const now = Date.now();
    const sweepAngle = (now * 0.003) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(sweepAngle) * center, center + Math.sin(sweepAngle) * center);
    ctx.stroke();

    // Cash drops (tiny green dots)
    for (const drop of cashDrops) {
      if (drop.collected) continue;
      const dx = (drop.x - player.x) * scale;
      const dy = (drop.y - player.y) * scale;
      if (dx * dx + dy * dy < center * center - 10) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(center + dx - 1.5, center + dy - 1.5, 3, 3);
      }
    }

    // Escort car (Cyan dot)
    if (escort && !escort.destroyed) {
      const dx = (escort.x - player.x) * scale;
      const dy = (escort.y - player.y) * scale;
      if (dx * dx + dy * dy < center * center - 8) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(center + dx, center + dy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Police Cars (Red dots)
    for (const cop of cops) {
      if (cop.destroyed) continue;
      const dx = (cop.x - player.x) * scale;
      const dy = (cop.y - player.y) * scale;
      if (dx * dx + dy * dy < center * center - 6) {
        ctx.fillStyle = cop.type === 'swat_van' ? '#f43f5e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(center + dx, center + dy, cop.type === 'swat_van' ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Helicopter (Yellow flashing target)
    if (helicopter && !helicopter.destroyed) {
      const dx = (helicopter.x - player.x) * scale;
      const dy = (helicopter.y - player.y) * scale;
      if (dx * dx + dy * dy < center * center - 8) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(center + dx, center + dy, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Player Car in center (Green triangle pointing towards heading)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(player.angle);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Radar border ring
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [player, cops, escort, helicopter, cashDrops]);

  return (
    <div id="tactical-radar" className="pointer-events-auto absolute top-20 right-3 sm:top-24 sm:right-5 rounded-full p-1 bg-slate-950/80 border border-slate-700/80 shadow-2xl backdrop-blur-md">
      <canvas
        ref={canvasRef}
        width={radarSize}
        height={radarSize}
        className="rounded-full block"
      />
    </div>
  );
};
