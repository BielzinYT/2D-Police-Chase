/**
 * Fuga Urbana 2D - Main Application
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Vehicle,
  GameState,
  Particle,
  TireSkid,
  Projectile,
  TrapItem,
  FloatingText,
  HelperId
} from './types';
import { CityManager } from './game/cityGenerator';
import { physics, ControlInput } from './game/physics';
import { PoliceSystem, WANTED_THRESHOLDS } from './game/policeSystem';
import { HelperManager } from './game/helpers';
import { GameRenderer } from './game/renderer';
import { sound } from './game/sound';
import { HUD } from './components/HUD';
import { CrewHireModal } from './components/CrewHireModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';
import { Radar } from './components/Radar';
import { TouchControls } from './components/TouchControls';

const INITIAL_PLAYER: Vehicle = {
  id: 'player_car',
  type: 'player',
  x: 600,
  y: 600,
  vx: 0,
  vy: 0,
  angle: 0,
  speed: 0,
  maxSpeed: 430,
  accel: 480,
  reverseSpeed: 180,
  turnSpeed: 3.2,
  width: 36,
  length: 70,
  health: 180,
  maxHealth: 180,
  color: '#dc2626', // Hot Red sports car
  roofColor: '#18181b',
  isDrifting: false,
  driftFactor: 0,
  destroyed: false
};

const INITIAL_GAME_STATE: GameState = {
  cash: 800, // starting budget to hire first helper or save
  score: 0,
  wantedStars: 1, // starts with 1 star as requested
  wantedPoints: 50,
  wantedThresholds: WANTED_THRESHOLDS,
  destructionCount: 0,
  policeDestroyed: 0,
  distanceTraveled: 0,
  timeSurvived: 0,
  multiplier: 1.0,
  multiplierTimer: 0,
  isGameOver: false,
  isPaused: false,
  nitro: 100,
  isNitroActive: false,
  copsEvadedTimer: 0,
  isEvading: false
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game Systems
  const cityManagerRef = useRef<CityManager>(new CityManager());
  const policeSystemRef = useRef<PoliceSystem>(new PoliceSystem());
  const helperManagerRef = useRef<HelperManager>(new HelperManager());
  const rendererRef = useRef<GameRenderer | null>(null);

  // Entities state refs for the 60fps game loop
  const playerRef = useRef<Vehicle>({ ...INITIAL_PLAYER });
  const escortRef = useRef<Vehicle | null>(null);
  const gameStateRef = useRef<GameState>({ ...INITIAL_GAME_STATE });
  const inputRef = useRef<ControlInput>({
    throttle: 0,
    steer: 0,
    handbrake: false,
    nitro: false
  });

  const particlesRef = useRef<Particle[]>([]);
  const skidsRef = useRef<TireSkid[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const trapsRef = useRef<TrapItem[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // React UI state for HUD & Modals
  const [hudGameState, setHudGameState] = useState<GameState>({ ...INITIAL_GAME_STATE });
  const [hudPlayer, setHudPlayer] = useState<Vehicle>({ ...INITIAL_PLAYER });
  const [helpersList, setHelpersList] = useState(helperManagerRef.current.helpers);
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [isHelpOnly, setIsHelpOnly] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Load High Score
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fuga_urbana_high_score');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Spawn visual floating text
  const addFloatingText = useCallback((text: string, x: number, y: number, color: string = '#fde047', size: number = 18) => {
    floatingTextsRef.current.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      size,
      life: 1.2,
      maxLife: 1.2,
      vy: -40
    });
  }, []);

  // Spawn Particle Helper
  const spawnParticles = useCallback((
    x: number,
    y: number,
    count: number,
    type: Particle['type'],
    color: string
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 120;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.7,
        maxLife: 1.0,
        size: type === 'water' ? 3 + Math.random() * 4 : 4 + Math.random() * 8,
        color,
        alpha: 1.0,
        type
      });
    }
  }, []);

  // Initialize Canvas & Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new GameRenderer(ctx);
    rendererRef.current = renderer;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderer.setDimensions(canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    let lastTime = performance.now();
    let hudSyncTimer = 0;

    // Main 60 FPS Loop
    const gameLoop = (currentTime: number) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const player = playerRef.current;
      const state = gameStateRef.current;

      if (!state.isPaused && !state.isGameOver) {
        // --- 1. Sound system initialization & engine sound update ---
        const speedNorm = player.speed / player.maxSpeed;
        sound.updateEngine(speedNorm, inputRef.current.throttle > 0);
        sound.updateSiren(state.wantedStars, policeSystemRef.current.cops.filter(c => !c.destroyed).length);

        // --- 2. Nitro Management ---
        const wantsNitro = inputRef.current.nitro && state.nitro > 5 && inputRef.current.throttle > 0;
        if (wantsNitro) {
          state.isNitroActive = true;
          state.nitro = Math.max(0, state.nitro - dt * 40);
          sound.playNitro();
        } else {
          state.isNitroActive = false;
          // Regenerate Nitro over time (faster if mechanic hired)
          const mechanic = helperManagerRef.current.getHelper('mechanic');
          const regenRate = 12 + (mechanic ? mechanic.level * 8 : 0);
          state.nitro = Math.min(100, state.nitro + dt * regenRate);
        }

        // --- 3. Update Player Car Physics ---
        const { spawnedSkid, isDrifting } = physics.updateVehicle(
          player,
          inputRef.current,
          dt,
          state.isNitroActive
        );

        if (spawnedSkid) {
          skidsRef.current.push(spawnedSkid);
          if (skidsRef.current.length > 300) skidsRef.current.shift();
          sound.playTireSkid();

          // Spawn tire smoke
          if (Math.random() > 0.4) {
            spawnParticles(spawnedSkid.x1, spawnedSkid.y1, 2, 'smoke', 'rgba(203, 213, 225, 0.5)');
          }
        }

        // Stats tracking: distance traveled & survival time
        state.timeSurvived += dt;
        state.distanceTraveled += player.speed * dt;
        state.score += (player.speed * 0.05 + state.wantedStars * 15) * dt;

        // Multiplier decay
        if (state.multiplierTimer > 0) {
          state.multiplierTimer -= dt;
          if (state.multiplierTimer <= 0) {
            state.multiplier = 1.0;
          }
        }

        // --- 4. Get active city chunks & resolve collisions ---
        const activeChunks = cityManagerRef.current.updateChunksAround(player.x, player.y);

        // All buildings in active chunks
        const allBuildings = activeChunks.flatMap(c => c.buildings);
        // All destructible objects
        const allObjects = activeChunks.flatMap(c => c.objects);
        // All cash drops
        const allCashDrops = activeChunks.flatMap(c => c.cashDrops);

        // Building collisions for player
        physics.resolveBuildingCollisions(player, allBuildings, (impactSpeed) => {
          const damage = impactSpeed * 0.14;
          player.health = Math.max(0, player.health - damage);
          sound.playCrash(impactSpeed > 220);
          renderer.triggerShake(Math.min(18, impactSpeed * 0.06), 0.25);
          spawnParticles(player.x, player.y, 8, 'spark', '#fbbf24');
        });

        // Building collisions for escort car
        if (escortRef.current && !escortRef.current.destroyed) {
          physics.resolveBuildingCollisions(escortRef.current, allBuildings);
        }

        // Building collisions for cops
        for (const cop of policeSystemRef.current.cops) {
          if (!cop.destroyed) {
            physics.resolveBuildingCollisions(cop, allBuildings);
          }
        }

        // Destructible objects collision (Hydrants, lamps, fences, etc.)
        physics.checkDestructibleCollisions(player, allObjects, (obj, impactSpeed) => {
          state.destructionCount += 1;
          const cashReward = Math.round(obj.cashReward * state.multiplier);
          state.cash += cashReward;
          state.wantedPoints += obj.wantedPoints;
          state.score += obj.wantedPoints * 5 * state.multiplier;
          state.multiplier = Math.min(5.0, state.multiplier + 0.1);
          state.multiplierTimer = 4.0;

          addFloatingText(`+$${cashReward}`, obj.x, obj.y - 15, '#4ade80', 16);

          if (obj.type === 'hydrant') {
            sound.playHydrant();
            spawnParticles(obj.x, obj.y, 25, 'water', '#38bdf8');
            addFloatingText('JATO DE ÁGUA!', obj.x, obj.y - 35, '#38bdf8', 14);
          } else if (obj.type === 'lamp') {
            sound.playCrash(false);
            spawnParticles(obj.x, obj.y, 14, 'spark', '#fef08a');
          } else if (obj.type === 'gas_pump') {
            // HUGE EXPLOSION!
            sound.playExplosion();
            renderer.triggerShake(24, 0.45);
            spawnParticles(obj.x, obj.y, 40, 'fire', '#f97316');
            spawnParticles(obj.x, obj.y, 20, 'smoke', '#334155');
            addFloatingText('BOMBA EXPLODIU! 💥', obj.x, obj.y - 30, '#ef4444', 20);

            // Blast nearby police cars!
            for (const cop of policeSystemRef.current.cops) {
              const cdx = cop.x - obj.x;
              const cdy = cop.y - obj.y;
              const dist = Math.sqrt(cdx * cdx + cdy * cdy);
              if (dist < 280) {
                cop.health -= 250;
                cop.vx += (cdx / (dist || 1)) * 400;
                cop.vy += (cdy / (dist || 1)) * 400;
              }
            }
          } else {
            sound.playCrash(false);
            spawnParticles(obj.x, obj.y, 10, 'debris', '#94a3b8');
          }
        });

        // Cash Drops Pickups
        physics.checkCashPickups(player, allCashDrops, (drop) => {
          const value = Math.round(drop.value * state.multiplier);
          state.cash += value;
          sound.playCashPickup();
          addFloatingText(`+$${value}`, drop.x, drop.y - 10, '#22c55e', 18);
          spawnParticles(drop.x, drop.y, 8, 'cash', '#86efac');
        });

        // --- 5. Update Wanted Level Progression ---
        const prevWanted = state.wantedStars;
        let newStars = 1;
        if (state.wantedPoints >= WANTED_THRESHOLDS[4]) newStars = 5;
        else if (state.wantedPoints >= WANTED_THRESHOLDS[3]) newStars = 4;
        else if (state.wantedPoints >= WANTED_THRESHOLDS[2]) newStars = 3;
        else if (state.wantedPoints >= WANTED_THRESHOLDS[1]) newStars = 2;

        if (newStars > prevWanted) {
          state.wantedStars = newStars;
          sound.playStarUp();
          renderer.triggerShake(14, 0.35);
          addFloatingText(`ALERTA: NÍVEL ${newStars} DE PROCURADO! ⭐`, player.x, player.y - 50, '#f59e0b', 22);
        }

        // --- 6. Update Police AI & Spawning ---
        policeSystemRef.current.update(
          dt,
          player.x,
          player.y,
          player.vx,
          player.vy,
          player.angle,
          state.wantedStars,
          (proj) => projectilesRef.current.push(proj)
        );

        // Check Evasion status
        const nearbyCopsCount = policeSystemRef.current.cops.filter(
          c => !c.destroyed && Math.hypot(c.x - player.x, c.y - player.y) < 950
        ).length;

        if (nearbyCopsCount === 0 && state.wantedStars > 1) {
          state.isEvading = true;
          state.copsEvadedTimer += dt;
          if (state.copsEvadedTimer >= 10.0) {
            state.copsEvadedTimer = 0;
            state.wantedStars = Math.max(1, state.wantedStars - 1);
            state.wantedPoints = WANTED_THRESHOLDS[state.wantedStars - 1];
            addFloatingText('NÍVEL DE PROCURADO REDUZIDO! 🛡️', player.x, player.y - 40, '#38bdf8', 18);
          }
        } else {
          state.isEvading = false;
          state.copsEvadedTimer = 0;
        }

        // --- 7. Helper Crew Logic & Actions ---
        helperManagerRef.current.update(
          dt,
          player,
          policeSystemRef.current.cops,
          (proj) => {
            projectilesRef.current.push(proj);
            sound.playGunshot();
          },
          (trap) => trapsRef.current.push(trap),
          (x, y, radius) => {
            // Trigger EMP Shockwave
            sound.playEmp();
            renderer.triggerShake(12, 0.3);
            addFloatingText('PULSO EMP DISPARADO! ⚡', x, y - 40, '#38bdf8', 20);
            particlesRef.current.push({
              x,
              y,
              vx: 0,
              vy: 0,
              life: 0.6,
              maxLife: 0.6,
              size: radius,
              color: '#38bdf8',
              alpha: 0.9,
              type: 'emp'
            });

            // Stall all nearby cops
            for (const cop of policeSystemRef.current.cops) {
              if (cop.destroyed) continue;
              const dist = Math.hypot(cop.x - x, cop.y - y);
              if (dist <= radius) {
                cop.stalledTimer = 5.0; // stalled for 5 seconds!
                spawnParticles(cop.x, cop.y, 12, 'spark', '#38bdf8');
                addFloatingText('DESATIVADO!', cop.x, cop.y - 20, '#38bdf8', 14);
              }
            }
          },
          () => {
            // Spawn Allied Escort Muscle Car
            const escort: Vehicle = {
              id: 'helper_escort_1',
              type: 'helper_escort',
              x: player.x - Math.cos(player.angle) * 80,
              y: player.y - Math.sin(player.angle) * 80,
              vx: player.vx,
              vy: player.vy,
              angle: player.angle,
              speed: player.speed,
              maxSpeed: 440,
              accel: 500,
              reverseSpeed: 180,
              turnSpeed: 2.8,
              width: 40,
              length: 76,
              health: 300,
              maxHealth: 300,
              color: '#09090b',
              roofColor: '#eab308',
              isDrifting: false,
              driftFactor: 0,
              destroyed: false,
              aiState: 'escorting'
            };
            escortRef.current = escort;
            addFloatingText('CARRO DE ESCOLTA ENTROU NA FUGA! 🏎️', player.x, player.y - 45, '#eab308', 20);
            return escort;
          }
        );

        // Update Allied Escort Car AI
        if (escortRef.current && !escortRef.current.destroyed) {
          const esc = escortRef.current;
          // Target nearest cop pursuing player or drive alongside player
          let targetX = player.x + Math.cos(player.angle + 0.6) * 110;
          let targetY = player.y + Math.sin(player.angle + 0.6) * 110;

          // If a cop is close to player, escort hunts it down!
          let nearestThreat: Vehicle | null = null;
          let minThreatDist = 450;
          for (const cop of policeSystemRef.current.cops) {
            if (cop.destroyed) continue;
            const dist = Math.hypot(cop.x - player.x, cop.y - player.y);
            if (dist < minThreatDist) {
              minThreatDist = dist;
              nearestThreat = cop;
            }
          }

          if (nearestThreat) {
            targetX = nearestThreat.x;
            targetY = nearestThreat.y;
          }

          const edx = targetX - esc.x;
          const edy = targetY - esc.y;
          const targetAngle = Math.atan2(edy, edx);
          let angleDiff = targetAngle - esc.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          esc.angle += Math.sign(angleDiff) * Math.min(esc.turnSpeed * dt, Math.abs(angleDiff));
          esc.vx += Math.cos(esc.angle) * esc.accel * dt;
          esc.vy += Math.sin(esc.angle) * esc.accel * dt;

          const eSpeed = Math.hypot(esc.vx, esc.vy);
          if (eSpeed > esc.maxSpeed) {
            esc.vx = (esc.vx / eSpeed) * esc.maxSpeed;
            esc.vy = (esc.vy / eSpeed) * esc.maxSpeed;
          }
          esc.x += esc.vx * dt;
          esc.y += esc.vy * dt;
          esc.speed = Math.hypot(esc.vx, esc.vy);
        }

        // --- 8. Vehicle vs Vehicle Collisions ---
        // Player vs Cops
        for (const cop of policeSystemRef.current.cops) {
          if (cop.destroyed) continue;
          physics.resolveVehicleVehicleCollision(player, cop, (vA, vB, dmgA, dmgB, speed) => {
            sound.playCrash(speed > 160);
            renderer.triggerShake(Math.min(16, speed * 0.05), 0.25);
            spawnParticles((vA.x + vB.x) / 2, (vA.y + vB.y) / 2, 8, 'spark', '#f59e0b');

            // Apply damage
            player.health = Math.max(0, player.health - dmgA * 0.65);
            cop.health -= dmgB * 1.5;

            if (cop.health <= 0 && !cop.destroyed) {
              cop.destroyed = true;
              state.policeDestroyed += 1;
              const bounty = cop.type === 'swat_van' ? 500 : cop.type === 'fbi_sedan' ? 450 : 300;
              state.cash += bounty;
              state.wantedPoints += 150;
              sound.playExplosion();
              spawnParticles(cop.x, cop.y, 25, 'fire', '#ef4444');
              addFloatingText(`VIATURA DESTRUÍDA! +$${bounty}`, cop.x, cop.y - 25, '#fbbf24', 18);
            }
          });
        }

        // Escort vs Cops
        if (escortRef.current && !escortRef.current.destroyed) {
          for (const cop of policeSystemRef.current.cops) {
            if (cop.destroyed) continue;
            physics.resolveVehicleVehicleCollision(escortRef.current, cop, (vA, vB, dmgA, dmgB, speed) => {
              sound.playCrash(true);
              renderer.triggerShake(8, 0.2);
              spawnParticles((vA.x + vB.x) / 2, (vA.y + vB.y) / 2, 10, 'spark', '#facc15');

              escortRef.current!.health -= dmgA * 0.4; // heavy armor
              cop.health -= dmgB * 2.5; // massive ram damage

              if (cop.health <= 0 && !cop.destroyed) {
                cop.destroyed = true;
                state.policeDestroyed += 1;
                state.cash += 350;
                sound.playExplosion();
                spawnParticles(cop.x, cop.y, 25, 'fire', '#ef4444');
                addFloatingText('ABALROADO PELA ESCOLTA! +$350', cop.x, cop.y - 25, '#eab308', 16);
              }
            });
          }
        }

        // Cop vs Cop Collisions
        for (let i = 0; i < policeSystemRef.current.cops.length; i++) {
          for (let j = i + 1; j < policeSystemRef.current.cops.length; j++) {
            const c1 = policeSystemRef.current.cops[i];
            const c2 = policeSystemRef.current.cops[j];
            if (!c1.destroyed && !c2.destroyed) {
              physics.resolveVehicleVehicleCollision(c1, c2, (vA, vB, dmgA, dmgB, speed) => {
                if (speed > 120) {
                  sound.playCrash(false);
                  c1.health -= dmgA;
                  c2.health -= dmgB;
                  if (c1.health <= 0) c1.destroyed = true;
                  if (c2.health <= 0) c2.destroyed = true;
                }
              });
            }
          }
        }

        // --- 9. Traps vs Cops ---
        for (const trap of trapsRef.current) {
          trap.life -= dt;
          for (const cop of policeSystemRef.current.cops) {
            if (cop.destroyed) continue;
            const dist = Math.hypot(cop.x - trap.x, cop.y - trap.y);
            if (dist < trap.radius + cop.width * 0.5) {
              if (trap.type === 'oil') {
                // Spin out wildly!
                cop.angle += (Math.random() - 0.5) * 2.5;
                cop.vx *= 0.6;
                cop.vy *= 0.6;
                sound.playTireSkid();
                spawnParticles(cop.x, cop.y, 8, 'smoke', '#1e293b');
                addFloatingText('DERRAPOU NO ÓLEO! 🌀', cop.x, cop.y - 20, '#cbd5e1', 14);
              } else {
                // Spikes puncture tires
                cop.health -= 60;
                cop.maxSpeed *= 0.5;
                cop.stalledTimer = 3.0;
                sound.playCrash(false);
                spawnParticles(cop.x, cop.y, 10, 'spark', '#ef4444');
                addFloatingText('PNEU FURADO! 📌', cop.x, cop.y - 20, '#ef4444', 14);
              }
            }
          }
        }
        trapsRef.current = trapsRef.current.filter(t => t.life > 0);

        // --- 10. Update Projectiles ---
        for (const p of projectilesRef.current) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.distanceTraveled += Math.hypot(p.vx, p.vy) * dt;

          // Check hit against player
          if (p.shooterType !== 'player_helper') {
            const pdx = p.x - player.x;
            const pdy = p.y - player.y;
            if (Math.hypot(pdx, pdy) < player.width * 0.6) {
              p.distanceTraveled = p.range + 1; // consume
              player.health = Math.max(0, player.health - p.damage);
              spawnParticles(p.x, p.y, 5, 'spark', '#ef4444');
              sound.playCrash(false);
            }
          }

          // Check hit against cops
          if (p.shooterType === 'player_helper') {
            for (const cop of policeSystemRef.current.cops) {
              if (cop.destroyed) continue;
              const cdx = p.x - cop.x;
              const cdy = p.y - cop.y;
              if (Math.hypot(cdx, cdy) < cop.width * 0.6) {
                p.distanceTraveled = p.range + 1;
                cop.health -= p.damage;
                spawnParticles(p.x, p.y, 6, 'spark', '#fbbf24');

                if (cop.health <= 0 && !cop.destroyed) {
                  cop.destroyed = true;
                  state.policeDestroyed += 1;
                  state.cash += 300;
                  state.score += 800;
                  sound.playExplosion();
                  spawnParticles(cop.x, cop.y, 25, 'fire', '#ef4444');
                  addFloatingText('ELIMINADO PELO ATIRADOR! +$300 🎯', cop.x, cop.y - 25, '#fbbf24', 16);
                }
                break;
              }
            }
          }
        }
        projectilesRef.current = projectilesRef.current.filter(p => p.distanceTraveled < p.range);

        // --- 11. Update Particles & Floating Texts ---
        for (const pt of particlesRef.current) {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life -= dt;
          pt.alpha = Math.max(0, pt.life / pt.maxLife);
        }
        particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

        for (const ft of floatingTextsRef.current) {
          ft.y += ft.vy * dt;
          ft.life -= dt;
        }
        floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

        // --- 12. Check Game Over (Player Health 0) ---
        if (player.health <= 0 && !player.destroyed) {
          player.destroyed = true;
          state.isGameOver = true;
          sound.playExplosion();
          renderer.triggerShake(30, 0.8);
          spawnParticles(player.x, player.y, 50, 'fire', '#dc2626');
          spawnParticles(player.x, player.y, 35, 'smoke', '#0f172a');

          // Save high score
          if (state.score > highScore) {
            setHighScore(Math.round(state.score));
            try {
              localStorage.setItem('fuga_urbana_high_score', Math.round(state.score).toString());
            } catch {
              // ignored
            }
          }
        }

        // Camera follow
        renderer.updateCamera(player, dt, state.isNitroActive);

        // Sync React HUD state every few frames
        hudSyncTimer += dt;
        if (hudSyncTimer > 0.08) {
          hudSyncTimer = 0;
          setHudGameState({ ...state });
          setHudPlayer({ ...player });
        }
      }

      // Render Frame
      const activeChunks = cityManagerRef.current.updateChunksAround(player.x, player.y);
      renderer.render(
        activeChunks,
        player,
        policeSystemRef.current.cops,
        escortRef.current,
        policeSystemRef.current.helicopter,
        projectilesRef.current,
        trapsRef.current,
        skidsRef.current,
        particlesRef.current,
        floatingTextsRef.current,
        state.isNitroActive
      );

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [highScore, addFloatingText, spawnParticles]);

  // Keyboard Event Listeners (WASD, Arrows, Space, Shift, 1-5 keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Initialize audio on first user key/click
      sound.resume();

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputRef.current.throttle = 1;
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputRef.current.throttle = -1;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputRef.current.steer = -1;
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputRef.current.steer = 1;
      } else if (e.code === 'Space') {
        inputRef.current.handbrake = true;
        e.preventDefault();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        inputRef.current.nitro = true;
      } else if (e.code === 'Digit1') {
        handleUpgradeHelper('gunner');
      } else if (e.code === 'Digit2') {
        handleUpgradeHelper('mechanic');
      } else if (e.code === 'Digit3') {
        handleUpgradeHelper('escort');
      } else if (e.code === 'Digit4') {
        handleUpgradeHelper('emp');
      } else if (e.code === 'Digit5') {
        handleUpgradeHelper('spikes');
      } else if (e.code === 'Escape') {
        handleTogglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        (e.code === 'KeyW' || e.code === 'ArrowUp') &&
        inputRef.current.throttle > 0
      ) {
        inputRef.current.throttle = 0;
      } else if (
        (e.code === 'KeyS' || e.code === 'ArrowDown') &&
        inputRef.current.throttle < 0
      ) {
        inputRef.current.throttle = 0;
      } else if (
        (e.code === 'KeyA' || e.code === 'ArrowLeft') &&
        inputRef.current.steer < 0
      ) {
        inputRef.current.steer = 0;
      } else if (
        (e.code === 'KeyD' || e.code === 'ArrowRight') &&
        inputRef.current.steer > 0
      ) {
        inputRef.current.steer = 0;
      } else if (e.code === 'Space') {
        inputRef.current.handbrake = false;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        inputRef.current.nitro = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper Upgrade / Hire action
  const handleUpgradeHelper = useCallback((id: HelperId) => {
    sound.resume();
    const result = helperManagerRef.current.upgradeHelper(id, gameStateRef.current.cash);
    if (result.success) {
      gameStateRef.current.cash = result.newCash;
      sound.playCashPickup();
      const updated = [...helperManagerRef.current.helpers];
      setHelpersList(updated);
      setHudGameState({ ...gameStateRef.current });
      const helper = helperManagerRef.current.getHelper(id);
      if (helper) {
        addFloatingText(
          `${helper.name.toUpperCase()} NÍVEL ${helper.level}!`,
          playerRef.current.x,
          playerRef.current.y - 35,
          '#60a5fa',
          20
        );
      }
    }
  }, [addFloatingText]);

  // Restart Run
  const handleRestart = useCallback(() => {
    sound.resume();
    playerRef.current = { ...INITIAL_PLAYER };
    escortRef.current = null;
    gameStateRef.current = { ...INITIAL_GAME_STATE };
    inputRef.current = { throttle: 0, steer: 0, handbrake: false, nitro: false };

    policeSystemRef.current.reset();
    helperManagerRef.current.reset();
    setHelpersList(helperManagerRef.current.helpers);

    particlesRef.current = [];
    skidsRef.current = [];
    projectilesRef.current = [];
    trapsRef.current = [];
    floatingTextsRef.current = [];

    setHudGameState({ ...INITIAL_GAME_STATE });
    setHudPlayer({ ...INITIAL_PLAYER });
    setIsPauseMenuOpen(false);
  }, []);

  // Pause / Sound Toggles
  const handleTogglePause = useCallback(() => {
    sound.resume();
    gameStateRef.current.isPaused = !gameStateRef.current.isPaused;
    setIsPauseMenuOpen(gameStateRef.current.isPaused);
    setIsHelpOnly(false);
    setHudGameState({ ...gameStateRef.current });
  }, []);

  const handleOpenHelp = useCallback(() => {
    sound.resume();
    gameStateRef.current.isPaused = true;
    setIsHelpOnly(true);
    setIsPauseMenuOpen(true);
    setHudGameState({ ...gameStateRef.current });
  }, []);

  const handleToggleSound = useCallback(() => {
    sound.resume();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  return (
    <main
      id="game-container"
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none"
      onClick={() => sound.resume()}
    >
      {/* 2D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* TACTICAL MINIMAP RADAR */}
      <Radar
        player={hudPlayer}
        cops={policeSystemRef.current.cops}
        escort={escortRef.current}
        helicopter={policeSystemRef.current.helicopter}
        cashDrops={cityManagerRef.current.getChunkAt(
          Math.floor(hudPlayer.x / 1200),
          Math.floor(hudPlayer.y / 1200)
        ).cashDrops}
      />

      {/* HEAD-UP DISPLAY */}
      <HUD
        gameState={hudGameState}
        player={hudPlayer}
        helpers={helpersList}
        onUpgradeHelper={handleUpgradeHelper}
        onOpenCrewModal={() => {
          sound.resume();
          setIsCrewModalOpen(true);
        }}
        onTogglePause={handleTogglePause}
        onToggleSound={handleToggleSound}
        isMuted={isMuted}
        onOpenHelp={handleOpenHelp}
      />

      {/* MOBILE TOUCH CONTROLS */}
      <TouchControls
        onInput={(setter) => {
          sound.resume();
          inputRef.current = setter(inputRef.current);
        }}
        nitroReady={hudGameState.nitro > 15}
      />

      {/* CREW HIRE MODAL */}
      <CrewHireModal
        isOpen={isCrewModalOpen}
        onClose={() => setIsCrewModalOpen(false)}
        helpers={helpersList}
        cash={hudGameState.cash}
        onUpgradeHelper={handleUpgradeHelper}
      />

      {/* PAUSE / HELP MENU */}
      <PauseMenu
        isOpen={isPauseMenuOpen}
        isHelpOnly={isHelpOnly}
        isMuted={isMuted}
        onResume={() => {
          gameStateRef.current.isPaused = false;
          setIsPauseMenuOpen(false);
          setHudGameState({ ...gameStateRef.current });
        }}
        onRestart={handleRestart}
        onToggleSound={handleToggleSound}
      />

      {/* GAME OVER SCREEN */}
      <GameOverModal
        isOpen={hudGameState.isGameOver}
        gameState={hudGameState}
        highScore={highScore}
        onRestart={handleRestart}
      />
    </main>
  );
}
