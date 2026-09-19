/**
 * Wanted Level System & Police AI
 */
import { Vehicle, Helicopter, Projectile, VehicleType } from '../types';

export const WANTED_THRESHOLDS = [0, 350, 1000, 2400, 4800];

export class PoliceSystem {
  public cops: Vehicle[] = [];
  public helicopter: Helicopter | null = null;
  private spawnTimer: number = 0;
  private helicopterSpawned: boolean = false;

  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerVx: number,
    playerVy: number,
    playerAngle: number,
    wantedStars: number,
    spawnProjectile: (p: Projectile) => void
  ) {
    // 1. Determine max cops based on wanted level
    const maxCops = Math.min(10, wantedStars * 2);

    // Filter out destroyed cops after smoke/fire duration
    this.cops = this.cops.filter(cop => !cop.destroyed || (cop.stalledTimer && cop.stalledTimer > 0));

    // 2. Spawn cops if below limit
    this.spawnTimer += dt;
    const spawnInterval = Math.max(1.8, 5.0 - wantedStars * 0.7);

    if (this.cops.filter(c => !c.destroyed).length < maxCops && this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnPoliceCar(playerX, playerY, wantedStars);
    }

    // 3. Update cop AI behaviors
    for (const cop of this.cops) {
      if (cop.destroyed) continue;

      // Siren strobe timer
      cop.sirenTimer = ((cop.sirenTimer || 0) + dt * 10) % 2;
      cop.sirenState = cop.sirenTimer < 1 ? 0 : 1;

      // If stalled by EMP or oil
      if (cop.stalledTimer && cop.stalledTimer > 0) {
        cop.stalledTimer -= dt;
        cop.vx *= Math.pow(0.9, dt * 60);
        cop.vy *= Math.pow(0.9, dt * 60);
        cop.x += cop.vx * dt;
        cop.y += cop.vy * dt;
        cop.speed = Math.sqrt(cop.vx * vSpeed(cop));
        continue;
      }

      // Pursue player
      const dx = playerX - cop.x;
      const dy = playerY - cop.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Despawn if too far away (> 2400px)
      if (dist > 2400) {
        cop.destroyed = true;
        continue;
      }

      // Target lead point (predict player movement slightly)
      const leadTime = Math.min(1.2, dist / 400);
      const targetX = playerX + playerVx * leadTime;
      const targetY = playerY + playerVy * leadTime;

      const targetAngle = Math.atan2(targetY - cop.y, targetX - cop.x);
      let angleDiff = targetAngle - cop.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Turn towards target
      const turnStep = cop.turnSpeed * dt;
      if (Math.abs(angleDiff) < turnStep) {
        cop.angle = targetAngle;
      } else {
        cop.angle += Math.sign(angleDiff) * turnStep;
      }

      // Acceleration towards heading
      const fwdX = Math.cos(cop.angle);
      const fwdY = Math.sin(cop.angle);

      // Accelerate if facing mostly towards player
      if (Math.abs(angleDiff) < Math.PI * 0.6) {
        cop.vx += fwdX * cop.accel * dt;
        cop.vy += fwdY * cop.accel * dt;
      } else {
        // Brake to turn tighter
        cop.vx *= Math.pow(0.94, dt * 60);
        cop.vy *= Math.pow(0.94, dt * 60);
      }

      // Speed clamp
      const curSpeed = Math.sqrt(cop.vx * cop.vx + cop.vy * cop.vy);
      if (curSpeed > cop.maxSpeed) {
        cop.vx = (cop.vx / curSpeed) * cop.maxSpeed;
        cop.vy = (cop.vy / curSpeed) * cop.maxSpeed;
      }

      cop.x += cop.vx * dt;
      cop.y += cop.vy * dt;
      cop.speed = Math.sqrt(cop.vx * cop.vx + cop.vy * cop.vy);

      // SWAT shooters firing from van windows
      if (cop.type === 'swat_van' && dist < 320 && dist > 70) {
        cop.lastShootTimer = (cop.lastShootTimer || 0) + dt;
        if (cop.lastShootTimer >= 1.4) {
          cop.lastShootTimer = 0;
          const shootAngle = Math.atan2(playerY - cop.y, playerX - cop.x);
          spawnProjectile({
            id: `cop_shot_${Date.now()}_${Math.random()}`,
            x: cop.x,
            y: cop.y,
            vx: Math.cos(shootAngle) * 520,
            vy: Math.sin(shootAngle) * 520,
            range: 350,
            distanceTraveled: 0,
            damage: 10,
            shooterType: 'swat',
            color: '#ef4444'
          });
        }
      }
    }

    // 4. Helicopter behavior (5 Stars)
    if (wantedStars >= 5) {
      if (!this.helicopter) {
        this.helicopter = {
          id: 'police_heli_1',
          x: playerX + (Math.random() > 0.5 ? 800 : -800),
          y: playerY + (Math.random() > 0.5 ? 800 : -800),
          vx: 0,
          vy: 0,
          angle: 0,
          rotorAngle: 0,
          spotlightX: playerX,
          spotlightY: playerY,
          health: 350,
          maxHealth: 350,
          shootTimer: 0,
          destroyed: false
        };
      } else if (!this.helicopter.destroyed) {
        const heli = this.helicopter;
        heli.rotorAngle = (heli.rotorAngle + dt * 35) % (Math.PI * 2);

        // Hover smoothly near player
        const targetHoverX = playerX - Math.cos(playerAngle) * 120;
        const targetHoverY = playerY - Math.sin(playerAngle) * 120;

        const hdx = targetHoverX - heli.x;
        const hdy = targetHoverY - heli.y;
        const hdist = Math.sqrt(hdx * hdx + hdy * hdy);

        const heliTargetAngle = Math.atan2(playerY - heli.y, playerX - heli.x);
        heli.angle = heliTargetAngle;

        const heliSpeed = Math.min(320, hdist * 1.5);
        if (hdist > 20) {
          heli.vx = (hdx / hdist) * heliSpeed;
          heli.vy = (hdy / hdist) * heliSpeed;
        } else {
          heli.vx *= 0.95;
          heli.vy *= 0.95;
        }

        heli.x += heli.vx * dt;
        heli.y += heli.vy * dt;

        // Move spotlight smoothly to player
        heli.spotlightX += (playerX - heli.spotlightX) * 0.1;
        heli.spotlightY += (playerY - heli.spotlightY) * 0.1;

        // Helicopter marksman shooting
        heli.shootTimer += dt;
        if (heli.shootTimer >= 2.2 && hdist < 450) {
          heli.shootTimer = 0;
          const shootAngle = Math.atan2(playerY - heli.y, playerX - heli.x);
          spawnProjectile({
            id: `heli_shot_${Date.now()}_${Math.random()}`,
            x: heli.x,
            y: heli.y,
            vx: Math.cos(shootAngle) * 550,
            vy: Math.sin(shootAngle) * 550,
            range: 480,
            distanceTraveled: 0,
            damage: 12,
            shooterType: 'helicopter',
            color: '#f87171'
          });
        }
      }
    } else {
      if (this.helicopter) {
        this.helicopter = null;
      }
    }
  }

  private spawnPoliceCar(playerX: number, playerY: number, wantedStars: number) {
    // Spawn off-screen along road grid
    const spawnDist = 950 + Math.random() * 250;
    const angle = Math.random() * Math.PI * 2;
    const spawnX = playerX + Math.cos(angle) * spawnDist;
    const spawnY = playerY + Math.sin(angle) * spawnDist;

    let type: VehicleType = 'police_cruiser';
    let maxSpeed = 340;
    let accel = 420;
    let turnSpeed = 2.4;
    let health = 100;
    let width = 36;
    let length = 68;
    let color = '#f8fafc';
    let roofColor = '#1e293b';

    // Pick vehicle type based on wanted level
    const roll = Math.random();
    if (wantedStars >= 5 && roll > 0.4) {
      // FBI Sedan: Fast, blacked out, agile
      type = 'fbi_sedan';
      maxSpeed = 390;
      accel = 520;
      turnSpeed = 2.7;
      health = 140;
      width = 38;
      length = 72;
      color = '#09090b';
      roofColor = '#18181b';
    } else if (wantedStars >= 4 && roll > 0.4) {
      // SWAT Armored Van: Heavy, high health, ramming machine
      type = 'swat_van';
      maxSpeed = 310;
      accel = 380;
      turnSpeed = 1.8;
      health = 280;
      width = 46;
      length = 82;
      color = '#1e293b';
      roofColor = '#0f172a';
    } else if (wantedStars >= 3 && roll > 0.35) {
      // Police SUV: Interceptor with push bar
      type = 'police_suv';
      maxSpeed = 360;
      accel = 460;
      turnSpeed = 2.2;
      health = 180;
      width = 42;
      length = 76;
      color = '#f1f5f9';
      roofColor = '#0284c7';
    } else if (wantedStars >= 2) {
      // Upgraded pursuit cruiser
      maxSpeed = 365;
      accel = 450;
      turnSpeed = 2.5;
      health = 120;
    }

    const headingToPlayer = Math.atan2(playerY - spawnY, playerX - spawnX);

    const copVehicle: Vehicle = {
      id: `cop_${Date.now()}_${Math.random()}`,
      type,
      x: spawnX,
      y: spawnY,
      vx: Math.cos(headingToPlayer) * 150,
      vy: Math.sin(headingToPlayer) * 150,
      angle: headingToPlayer,
      speed: 150,
      maxSpeed,
      accel,
      reverseSpeed: 160,
      turnSpeed,
      width,
      length,
      health,
      maxHealth: health,
      color,
      roofColor,
      isDrifting: false,
      driftFactor: 0,
      destroyed: false,
      sirenState: 0,
      sirenTimer: Math.random() * 2,
      aiState: 'chasing'
    };

    this.cops.push(copVehicle);
  }

  public reset() {
    this.cops = [];
    this.helicopter = null;
    this.spawnTimer = 0;
  }
}

function vSpeed(cop: Vehicle): number {
  return cop.vy;
}
