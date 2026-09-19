/**
 * Canvas 2D Game Renderer for Fuga Urbana 2D
 */
import {
  Vehicle,
  CityChunk,
  DestructibleObject,
  Building,
  RoadTile,
  CashDrop,
  Projectile,
  Helicopter,
  Particle,
  TireSkid,
  TrapItem,
  FloatingText
} from '../types';
import { ROAD_WIDTH } from './cityGenerator';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;

  // Camera coordinates
  public camX: number = 0;
  public camY: number = 0;
  public zoom: number = 1.0;
  private targetZoom: number = 1.0;

  // Screen shake
  public shakeDuration: number = 0;
  public shakeMagnitude: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public triggerShake(magnitude: number, duration: number) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  public updateCamera(
    player: Vehicle,
    dt: number,
    isNitroActive: boolean
  ) {
    // Smooth follow with lead towards velocity
    const leadX = player.vx * 0.45;
    const leadY = player.vy * 0.45;
    const targetCamX = player.x + leadX;
    const targetCamY = player.y + leadY;

    this.camX += (targetCamX - this.camX) * (1 - Math.exp(-dt * 6));
    this.camY += (targetCamY - this.camY) * (1 - Math.exp(-dt * 6));

    // Dynamic zoom based on speed & nitro
    const speedRatio = Math.min(1, player.speed / 450);
    this.targetZoom = 1.05 - speedRatio * 0.22 - (isNitroActive ? 0.08 : 0);
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-dt * 4));

    // Decay screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeMagnitude = 0;
      }
    }
  }

  public render(
    chunks: CityChunk[],
    player: Vehicle,
    cops: Vehicle[],
    escort: Vehicle | null,
    helicopter: Helicopter | null,
    projectiles: Projectile[],
    traps: TrapItem[],
    skids: TireSkid[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    isNitroActive: boolean
  ) {
    const ctx = this.ctx;
    ctx.save();

    // Clear background
    ctx.fillStyle = '#10141d';
    ctx.fillRect(0, 0, this.width, this.height);

    // Camera transform + Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeDuration > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeMagnitude;
      shakeY = (Math.random() - 0.5) * this.shakeMagnitude;
    }

    ctx.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camX, -this.camY);

    // 1. Render City Roads, Sidewalks & Buildings
    this.renderCity(chunks);

    // 2. Render Skid Marks
    this.renderSkids(skids);

    // 3. Render Traps (Oil & Spikes)
    this.renderTraps(traps);

    // 4. Render Cash Drops
    this.renderCashDrops(chunks);

    // 5. Render Destructible Props
    this.renderDestructibles(chunks);

    // 6. Render Vehicles (Cops, Escort, Player)
    for (const cop of cops) {
      this.renderVehicle(cop);
    }

    if (escort && !escort.destroyed) {
      this.renderVehicle(escort);
    }

    this.renderVehicle(player, isNitroActive);

    // 7. Render Projectiles
    this.renderProjectiles(projectiles);

    // 8. Render Helicopter & Searchlight
    if (helicopter && !helicopter.destroyed) {
      this.renderHelicopter(helicopter);
    }

    // 9. Render Particles (Smoke, Fire, Sparks, Water)
    this.renderParticles(particles);

    // 10. Render In-World Floating Texts
    this.renderFloatingTexts(floatingTexts);

    ctx.restore();
  }

  private renderCity(chunks: CityChunk[]) {
    const ctx = this.ctx;

    for (const chunk of chunks) {
      // Roads
      for (const road of chunk.roads) {
        ctx.fillStyle = '#1e232d';
        ctx.fillRect(road.x, road.y, road.width, road.height);

        // Road markings
        ctx.strokeStyle = '#eab308'; // yellow divider
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 16]);

        if (road.roadType === 'avenue_h') {
          ctx.beginPath();
          ctx.moveTo(road.x, road.y + road.height / 2);
          ctx.lineTo(road.x + road.width, road.y + road.height / 2);
          ctx.stroke();
        } else if (road.roadType === 'avenue_v') {
          ctx.beginPath();
          ctx.moveTo(road.x + road.width / 2, road.y);
          ctx.lineTo(road.x + road.width / 2, road.y + road.height);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // White border lines on roads
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(road.x, road.y, road.width, road.height);

        // Crosswalk markings at intersections
        if (road.isIntersection) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          const cwStep = 18;
          // North crosswalk
          for (let cx = road.x + 10; cx < road.x + road.width - 10; cx += cwStep) {
            ctx.fillRect(cx, road.y + 4, 10, 18);
          }
          // South crosswalk
          for (let cx = road.x + 10; cx < road.x + road.width - 10; cx += cwStep) {
            ctx.fillRect(cx, road.y + road.height - 22, 10, 18);
          }
        }
      }

      // Sidewalks
      for (const sw of chunk.sidewalks) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(sw.x, sw.y, sw.width, sw.height);
        // Concrete curb border
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sw.x, sw.y, sw.width, sw.height);
      }

      // Buildings
      for (const b of chunk.buildings) {
        // Drop shadow for 3D aerial perspective
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(b.x + 8, b.y + 8, b.width, b.height);

        // Building roof
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        // Roof border trim
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.width, b.height);

        // Roof details
        if (b.roofDetails === 'helipad') {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 4;
          const hSize = Math.min(b.width, b.height) * 0.35;
          ctx.strokeRect(b.x + b.width / 2 - hSize / 2, b.y + b.height / 2 - hSize / 2, hSize, hSize);
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('H', b.x + b.width / 2, b.y + b.height / 2);
        } else if (b.roofDetails === 'ac_units') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(b.x + 15, b.y + 15, 24, 20);
          ctx.fillRect(b.x + b.width - 35, b.y + b.height - 35, 20, 20);
        }

        // Neon Sign
        if (b.neonSign) {
          ctx.save();
          ctx.shadowColor = b.neonSign.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = b.neonSign.color;
          ctx.font = 'bold 15px Chakra Petch, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.neonSign.text, b.x + b.width / 2, b.y + 24);
          ctx.restore();
        }
      }
    }
  }

  private renderSkids(skids: TireSkid[]) {
    const ctx = this.ctx;
    for (const skid of skids) {
      if (skid.alpha <= 0.02) continue;
      ctx.strokeStyle = `rgba(15, 17, 23, ${skid.alpha})`;
      ctx.lineWidth = skid.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(skid.x1, skid.y1);
      ctx.lineTo(skid.x2, skid.y2);
      ctx.stroke();
    }
  }

  private renderTraps(traps: TrapItem[]) {
    const ctx = this.ctx;
    for (const trap of traps) {
      if (trap.type === 'oil') {
        ctx.save();
        ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
        ctx.beginPath();
        ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
        ctx.fill();
        // Slick rainbow sheen
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      } else {
        // Spikes
        ctx.save();
        ctx.translate(trap.x, trap.y);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-trap.radius, -5, trap.radius * 2, 10);
        // Spike points
        ctx.fillStyle = '#e2e8f0';
        for (let sx = -trap.radius + 4; sx < trap.radius; sx += 8) {
          ctx.beginPath();
          ctx.moveTo(sx, -8);
          ctx.lineTo(sx + 3, 2);
          ctx.lineTo(sx - 3, 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  private renderCashDrops(chunks: CityChunk[]) {
    const ctx = this.ctx;
    const now = Date.now();

    for (const chunk of chunks) {
      for (const drop of chunk.cashDrops) {
        if (drop.collected) continue;

        // Floating hover effect
        const bob = Math.sin(now * 0.005 + drop.x) * 4;
        const cy = drop.y + bob;

        ctx.save();
        // Soft golden glow
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 12;

        // Cash bundle
        ctx.fillStyle = '#15803d'; // dark green
        ctx.fillRect(drop.x - 14, cy - 8, 28, 16);
        ctx.fillStyle = '#22c55e'; // light green
        ctx.fillRect(drop.x - 12, cy - 6, 24, 12);

        // White paper band
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(drop.x - 4, cy - 8, 8, 16);

        // $ symbol
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px Chakra Petch, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', drop.x, cy);

        ctx.restore();
      }
    }
  }

  private renderDestructibles(chunks: CityChunk[]) {
    const ctx = this.ctx;

    for (const chunk of chunks) {
      for (const obj of chunk.objects) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate(obj.angle);

        if (obj.destroyed) {
          // Flattened/wrecked debris appearance
          ctx.fillStyle = '#475569';
          ctx.globalAlpha = 0.5;
          ctx.fillRect(-obj.width * 0.4, -obj.height * 0.4, obj.width * 0.8, obj.height * 0.8);
          ctx.restore();
          continue;
        }

        switch (obj.type) {
          case 'hydrant':
            // Red fire hydrant
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f87171';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(-11, -3, 22, 6);
            break;

          case 'lamp':
            // Street lamp pole
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            // Glowing bulb
            ctx.shadowColor = '#fef08a';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'trash_can':
            ctx.fillStyle = '#166534';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-8, -8, 16, 16);
            break;

          case 'gas_pump':
            // Gas pump with explosive symbol
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(-14, -14, 28, 28);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(-11, -11, 22, 22);
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', 0, 0);
            break;

          case 'fence_h':
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-obj.width / 2, -4, obj.width, 8);
            break;

          case 'barrier':
            // Striped road barrier
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
            ctx.fillStyle = '#ffffff';
            for (let bx = -obj.width / 2 + 5; bx < obj.width / 2; bx += 14) {
              ctx.fillRect(bx, -obj.height / 2, 7, obj.height);
            }
            break;

          case 'traffic_cone':
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'tree':
            // Tree canopy
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(0, 0, obj.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(-4, -4, obj.width / 3, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'parked_car':
            // Parked civilian car
            ctx.fillStyle = obj.color || '#3b82f6';
            ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
            // Windshield
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-obj.width * 0.35, -obj.height * 0.2, obj.width * 0.7, obj.height * 0.35);
            break;
        }

        ctx.restore();
      }
    }
  }

  public renderVehicle(v: Vehicle, isNitroActive: boolean = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    const halfW = v.width / 2;
    const halfL = v.length / 2;

    // Drop shadow under vehicle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-halfL + 4, -halfW + 4, v.length, v.width);

    // Headlight cones pointing forward
    if (!v.destroyed) {
      ctx.save();
      const grad = ctx.createRadialGradient(halfL, 0, 10, halfL + 120, 0, 150);
      grad.addColorStop(0, 'rgba(255, 255, 200, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW * 0.7);
      ctx.lineTo(halfL + 140, -halfW * 2.5);
      ctx.lineTo(halfL + 140, halfW * 2.5);
      ctx.lineTo(halfL, halfW * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Vehicle Chassis
    if (v.destroyed) {
      ctx.fillStyle = '#1e293b'; // burnt metal
    } else {
      ctx.fillStyle = v.color;
    }

    // Rounded car body rectangle
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, v.length, v.width, 6);
    ctx.fill();

    // Side mirrors
    ctx.fillStyle = v.destroyed ? '#0f172a' : v.roofColor || v.color;
    ctx.fillRect(-halfL * 0.1, -halfW - 3, 5, 3);
    ctx.fillRect(-halfL * 0.1, halfW, 5, 3);

    // Windshield & Glass
    ctx.fillStyle = v.destroyed ? '#09090b' : '#0f172a';
    ctx.fillRect(-halfL * 0.25, -halfW * 0.75, halfL * 0.7, v.width * 0.75);

    // Roof
    ctx.fillStyle = v.destroyed ? '#18181b' : v.roofColor || v.color;
    ctx.fillRect(-halfL * 0.15, -halfW * 0.65, halfL * 0.55, v.width * 0.65);

    // Front headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(halfL - 4, -halfW + 3, 4, 6);
    ctx.fillRect(halfL - 4, halfW - 9, 4, 6);

    // Rear taillights
    ctx.fillStyle = v.speed < 0 || v.vx * Math.cos(v.angle) < 0 ? '#ef4444' : '#991b1b';
    ctx.fillRect(-halfL, -halfW + 3, 3, 6);
    ctx.fillRect(-halfL, halfW - 9, 3, 6);

    // Special Liveries & Details:
    if (v.type === 'player') {
      // Racing stripes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-halfL, -3, v.length, 6);

      // Nitro exhaust flames
      if (isNitroActive && !v.destroyed) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-halfL, -5);
        ctx.lineTo(-halfL - 25 - Math.random() * 15, 0);
        ctx.lineTo(-halfL, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-halfL, -2);
        ctx.lineTo(-halfL - 14, 0);
        ctx.lineTo(-halfL, 2);
        ctx.fill();
      }
    } else if (v.type === 'helper_escort') {
      // Black & gold muscle escort
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-halfL * 0.2, -halfW * 0.4, halfL * 0.4, v.width * 0.4);
      // Heavy front bull-bar
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(halfL - 2, -halfW + 2, 5, v.width - 4);
    } else if (
      v.type === 'police_cruiser' ||
      v.type === 'police_suv' ||
      v.type === 'swat_van'
    ) {
      // Front push bumper
      ctx.fillStyle = '#334155';
      ctx.fillRect(halfL - 2, -halfW + 2, 4, v.width - 4);

      // Emergency Lightbar on roof
      if (!v.destroyed) {
        const isBlueStrobe = v.sirenState === 0;
        // Left light (Red)
        ctx.fillStyle = isBlueStrobe ? '#ef4444' : '#7f1d1d';
        ctx.fillRect(-halfL * 0.05, -halfW * 0.5, 6, 8);
        // Right light (Blue)
        ctx.fillStyle = !isBlueStrobe ? '#3b82f6' : '#1e3a8a';
        ctx.fillRect(-halfL * 0.05, halfW * 0.5 - 8, 6, 8);

        // Emergency strobe glow reflection
        ctx.save();
        ctx.shadowColor = isBlueStrobe ? '#ef4444' : '#3b82f6';
        ctx.shadowBlur = 18;
        ctx.fillStyle = isBlueStrobe ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Health Bar above vehicle if damaged
    if (!v.destroyed && v.health < v.maxHealth) {
      const barW = 40;
      const barH = 5;
      const pct = Math.max(0, v.health / v.maxHealth);
      ctx.save();
      // Keep health bar horizontal regardless of car rotation
      ctx.rotate(-v.angle);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barW / 2, -halfW - 14, barW, barH);
      ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(-barW / 2 + 1, -halfW - 13, (barW - 2) * pct, barH - 2);
      ctx.restore();
    }

    ctx.restore();
  }

  private renderProjectiles(projectiles: Projectile[]) {
    const ctx = this.ctx;
    for (const p of projectiles) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Tracer tail
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderHelicopter(heli: Helicopter) {
    const ctx = this.ctx;

    // Searchlight beam down onto ground
    ctx.save();
    const grad = ctx.createRadialGradient(
      heli.spotlightX,
      heli.spotlightY,
      10,
      heli.spotlightX,
      heli.spotlightY,
      110
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.7, 'rgba(240, 249, 255, 0.2)');
    grad.addColorStop(1, 'rgba(240, 249, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(heli.spotlightX, heli.spotlightY, 110, 0, Math.PI * 2);
    ctx.fill();

    // Beam cone from heli to spotlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(heli.x, heli.y);
    ctx.lineTo(heli.spotlightX - 80, heli.spotlightY);
    ctx.lineTo(heli.spotlightX + 80, heli.spotlightY);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Helicopter Chassis & Shadow
    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.rotate(heli.angle);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(25, 25, 35, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fuselage
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-40, -16, 75, 32, 12);
    ctx.fill();

    // Tail boom
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-75, -4, 40, 8);
    // Tail rotor
    ctx.fillRect(-78, -12, 6, 24);

    // Cockpit glass
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(22, 0, 10, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    // Spinning Main Rotor
    ctx.save();
    ctx.rotate(heli.rotorAngle);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.fillRect(-75, -2.5, 150, 5);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  private renderParticles(particles: Particle[]) {
    const ctx = this.ctx;
    for (const p of particles) {
      if (p.alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      if (p.type === 'emp') {
        // Glowing EMP shockwave ring
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'water') {
        // Water droplet
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Smoke, spark, explosion debris
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderFloatingTexts(floatingTexts: FloatingText[]) {
    const ctx = this.ctx;
    for (const ft of floatingTexts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${ft.size}px Chakra Petch, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
