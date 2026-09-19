/**
 * 2D Top-Down Car Physics & Collision Detection
 */
import { Vehicle, Building, DestructibleObject, Particle, TireSkid, CashDrop } from '../types';

export interface ControlInput {
  throttle: number; // -1 (reverse/brake) to 1 (forward)
  steer: number;    // -1 (left) to 1 (right)
  handbrake: boolean; // drift
  nitro: boolean;
}

export class PhysicsEngine {
  // Update player vehicle physics
  public updateVehicle(
    v: Vehicle,
    input: ControlInput,
    dt: number,
    isNitroActive: boolean
  ): { spawnedSkid?: TireSkid; isDrifting: boolean } {
    if (v.destroyed) {
      // Coast to halt
      v.vx *= Math.pow(0.85, dt * 60);
      v.vy *= Math.pow(0.85, dt * 60);
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
      return { isDrifting: false };
    }

    // Check stalled state (from EMP)
    if (v.stalledTimer && v.stalledTimer > 0) {
      v.stalledTimer -= dt;
      v.vx *= Math.pow(0.9, dt * 60);
      v.vy *= Math.pow(0.9, dt * 60);
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
      return { isDrifting: false };
    }

    // Forward and right unit vectors
    const fwdX = Math.cos(v.angle);
    const fwdY = Math.sin(v.angle);
    const rightX = -Math.sin(v.angle);
    const rightY = Math.cos(v.angle);

    // Current forward and lateral speeds
    const fwdSpeed = v.vx * fwdX + v.vy * fwdY;
    const latSpeed = v.vx * rightX + v.vy * rightY;

    // Acceleration & Nitro
    let accel = v.accel;
    let maxSpeed = v.maxSpeed;
    if (isNitroActive && input.throttle > 0) {
      accel *= 1.8;
      maxSpeed *= 1.45;
    }

    let newFwdSpeed = fwdSpeed;
    if (input.throttle > 0) {
      newFwdSpeed += input.throttle * accel * dt;
      if (newFwdSpeed > maxSpeed) newFwdSpeed = maxSpeed;
    } else if (input.throttle < 0) {
      // Reversing or braking
      if (fwdSpeed > 20) {
        // Strong brake
        newFwdSpeed -= 650 * dt;
        if (newFwdSpeed < 0) newFwdSpeed = 0;
      } else {
        // Reverse gear
        newFwdSpeed += input.throttle * (accel * 0.5) * dt;
        if (newFwdSpeed < -v.reverseSpeed) newFwdSpeed = -v.reverseSpeed;
      }
    } else {
      // Rolling drag
      newFwdSpeed *= Math.pow(0.96, dt * 60);
      if (Math.abs(newFwdSpeed) < 2) newFwdSpeed = 0;
    }

    // Lateral grip vs drift factor
    let grip = 0.88; // standard high road grip
    const isHandbrake = input.handbrake;
    if (isHandbrake) {
      grip = 0.985; // very low grip = slide
    }

    let newLatSpeed = latSpeed * Math.pow(1 - grip, dt * 60);

    // Steering
    // Turning is proportional to forward velocity (can't turn in place unless sliding)
    const speedRatio = Math.min(1, Math.abs(fwdSpeed) / 80);
    const reverseSign = fwdSpeed < -5 ? -1 : 1;
    const driftMultiplier = isHandbrake ? 1.4 : 1.0;
    const turnAmount = input.steer * v.turnSpeed * speedRatio * reverseSign * driftMultiplier * dt;
    v.angle += turnAmount;

    // Reconstruct velocity from forward + lateral
    v.vx = fwdX * newFwdSpeed + rightX * newLatSpeed;
    v.vy = fwdY * newFwdSpeed + rightY * newLatSpeed;

    v.x += v.vx * dt;
    v.y += v.vy * dt;
    v.speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);

    // Check drift status for skids and smoke
    const driftSlip = Math.abs(latSpeed);
    const isDrifting = (isHandbrake && v.speed > 60) || driftSlip > 110;
    v.isDrifting = isDrifting;

    let spawnedSkid: TireSkid | undefined;
    if (isDrifting && v.speed > 70) {
      // Rear tire skid
      const rearDist = v.length * 0.4;
      const rx = v.x - fwdX * rearDist;
      const ry = v.y - fwdY * rearDist;
      spawnedSkid = {
        x1: rx - v.vx * dt,
        y1: ry - v.vy * dt,
        x2: rx,
        y2: ry,
        alpha: Math.min(0.6, driftSlip / 250),
        width: 6
      };
    }

    return { spawnedSkid, isDrifting };
  }

  // Check collision between a vehicle and static buildings
  public resolveBuildingCollisions(
    v: Vehicle,
    buildings: Building[],
    onHit?: (impactSpeed: number) => void
  ) {
    const radius = v.width * 0.45;

    for (const b of buildings) {
      // Simple AABB vs Circle
      const closestX = Math.max(b.x, Math.min(v.x, b.x + b.width));
      const closestY = Math.max(b.y, Math.min(v.y, b.y + b.height));

      const dx = v.x - closestX;
      const dy = v.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const nx = dist === 0 ? 1 : dx / dist;
        const ny = dist === 0 ? 0 : dy / dist;
        const overlap = radius - dist;

        // Push vehicle out
        v.x += nx * overlap;
        v.y += ny * overlap;

        // Bounce velocity
        const dot = v.vx * nx + v.vy * ny;
        if (dot < 0) {
          const impactSpeed = Math.abs(dot);
          v.vx = (v.vx - 1.4 * dot * nx) * 0.6;
          v.vy = (v.vy - 1.4 * dot * ny) * 0.6;
          v.speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);

          if (impactSpeed > 80 && onHit) {
            onHit(impactSpeed);
          }
        }
      }
    }
  }

  // Check collision with destructible props (hydrants, lamps, fences, etc.)
  public checkDestructibleCollisions(
    v: Vehicle,
    objects: DestructibleObject[],
    onSmash: (obj: DestructibleObject, impactSpeed: number) => void
  ) {
    const vRadius = (v.width + v.length) * 0.25;

    for (const obj of objects) {
      if (obj.destroyed) continue;

      const objRadius = Math.max(obj.width, obj.height) * 0.5;
      const dx = v.x - obj.x;
      const dy = v.y - obj.y;
      const distSq = dx * dx + dy * dy;
      const minDist = vRadius + objRadius;

      if (distSq < minDist * minDist) {
        const impactSpeed = Math.max(40, v.speed);

        if (obj.solid && v.speed < 70) {
          // Push back if too slow
          const dist = Math.sqrt(distSq) || 1;
          const nx = dx / dist;
          const ny = dy / dist;
          v.x = obj.x + nx * minDist;
          v.y = obj.y + ny * minDist;
          v.vx *= 0.5;
          v.vy *= 0.5;
        } else {
          // Smash through!
          obj.destroyed = true;
          // Apply drag to vehicle based on object weight
          v.vx *= Math.max(0.7, 1 - obj.weight * 0.4);
          v.vy *= Math.max(0.7, 1 - obj.weight * 0.4);
          v.speed = Math.sqrt(v.vx * v.vx + v.vy * v.vy);

          onSmash(obj, impactSpeed);
        }
      }
    }
  }

  // Vehicle-to-Vehicle Collision (Player vs Cop, Cop vs Cop, Escort vs Cop)
  public resolveVehicleVehicleCollision(
    v1: Vehicle,
    v2: Vehicle,
    onCrash?: (vA: Vehicle, vB: Vehicle, damageA: number, damageB: number, impactSpeed: number) => void
  ) {
    if (v1.destroyed && v2.destroyed) return;

    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const distSq = dx * dx + dy * dy;
    const r1 = (v1.width + v1.length) * 0.3;
    const r2 = (v2.width + v2.length) * 0.3;
    const minDist = r1 + r2;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Positional correction
      v1.x -= nx * overlap * 0.5;
      v1.y -= ny * overlap * 0.5;
      v2.x += nx * overlap * 0.5;
      v2.y += ny * overlap * 0.5;

      // Relative velocity
      const relVx = v1.vx - v2.vx;
      const relVy = v1.vy - v2.vy;
      const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

      // Mass estimation
      const m1 = v1.type === 'swat_van' || v1.type === 'tank' ? 2.5 : v1.type === 'police_suv' || v1.type === 'helper_escort' ? 1.6 : 1.0;
      const m2 = v2.type === 'swat_van' || v2.type === 'tank' ? 2.5 : v2.type === 'police_suv' || v2.type === 'helper_escort' ? 1.6 : 1.0;

      // Elastic collision impulse
      const impulse = (2 * (relVx * nx + relVy * ny)) / (m1 + m2);
      v1.vx -= (impulse * m2 * nx) * 0.9;
      v1.vy -= (impulse * m2 * ny) * 0.9;
      v2.vx += (impulse * m1 * nx) * 0.9;
      v2.vy += (impulse * m1 * ny) * 0.9;

      // Spin vehicles slightly on heavy impacts
      if (relSpeed > 100) {
        v1.angle += (Math.random() - 0.5) * 0.3;
        v2.angle += (Math.random() - 0.5) * 0.4;
      }

      if (onCrash && relSpeed > 50) {
        // Escort vehicle deals double ram damage to cops
        const escortBonusA = v1.type === 'helper_escort' ? 2.2 : 1.0;
        const escortBonusB = v2.type === 'helper_escort' ? 2.2 : 1.0;

        const damageA = (relSpeed * 0.12 * (m2 / m1)) / escortBonusA;
        const damageB = relSpeed * 0.12 * (m1 / m2) * escortBonusA;

        onCrash(v1, v2, damageA, damageB, relSpeed);
      }
    }
  }

  // Check cash drop pickups
  public checkCashPickups(
    v: Vehicle,
    cashDrops: CashDrop[],
    onCollect: (cash: CashDrop) => void
  ) {
    const pickupDist = (v.width + v.length) * 0.4 + 20;
    const pickupDistSq = pickupDist * pickupDist;

    for (const drop of cashDrops) {
      if (drop.collected) continue;
      const dx = v.x - drop.x;
      const dy = v.y - drop.y;
      if (dx * dx + dy * dy < pickupDistSq) {
        drop.collected = true;
        onCollect(drop);
      }
    }
  }
}

export const physics = new PhysicsEngine();
