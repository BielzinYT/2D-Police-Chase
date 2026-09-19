/**
 * Helper Crew System ("Contratar Ajudantes")
 */
import { HelperConfig, HelperId, Projectile, Vehicle, TrapItem } from '../types';

export const INITIAL_HELPERS: HelperConfig[] = [
  {
    id: 'gunner',
    name: 'Atirador de Janela',
    title: 'Drive-By Gunner',
    description: 'Atira automaticamente nas viaturas policiais que perseguem você.',
    baseCost: 400,
    costMultiplier: 1.8,
    level: 0,
    maxLevel: 4,
    icon: 'Crosshair',
    unlocked: false
  },
  {
    id: 'mechanic',
    name: 'Mecânico de Fuga',
    title: 'Pit Crew / Reparo',
    description: 'Conserta a blindagem do carro continuamente e regenera o Nitro.',
    baseCost: 350,
    costMultiplier: 1.6,
    level: 0,
    maxLevel: 4,
    icon: 'Wrench',
    unlocked: false
  },
  {
    id: 'escort',
    name: 'Carro de Escolta',
    title: 'Muscle Car Aliado',
    description: 'Um carro aliado fortemente blindado que abalroa e destrói as viaturas da polícia.',
    baseCost: 900,
    costMultiplier: 2.0,
    level: 0,
    maxLevel: 3,
    icon: 'Shield',
    unlocked: false,
    cooldown: 0,
    maxCooldown: 30
  },
  {
    id: 'emp',
    name: 'Hacker EMP',
    title: 'Pulso Eletromagnético',
    description: 'Dispara uma onda de choque que desativa os motores dos policiais próximos.',
    baseCost: 650,
    costMultiplier: 1.7,
    level: 0,
    maxLevel: 3,
    icon: 'Zap',
    unlocked: false,
    cooldown: 0,
    maxCooldown: 14
  },
  {
    id: 'spikes',
    name: 'Lança-Óleo & Espinhos',
    title: 'Armadilhas Traseiras',
    description: 'Solta poças de óleo e esteiras de pregos para fazer os policiais derraparem e capotarem.',
    baseCost: 500,
    costMultiplier: 1.7,
    level: 0,
    maxLevel: 3,
    icon: 'Flame',
    unlocked: false,
    cooldown: 0,
    maxCooldown: 8
  }
];

export class HelperManager {
  public helpers: HelperConfig[];
  private gunnerTimer: number = 0;
  private escortVehicle: Vehicle | null = null;

  constructor() {
    this.helpers = JSON.parse(JSON.stringify(INITIAL_HELPERS));
  }

  public getHelper(id: HelperId): HelperConfig | undefined {
    return this.helpers.find(h => h.id === id);
  }

  public getNextCost(helper: HelperConfig): number {
    if (helper.level >= helper.maxLevel) return 0;
    return Math.round(helper.baseCost * Math.pow(helper.costMultiplier, helper.level));
  }

  public canAfford(id: HelperId, cash: number): boolean {
    const helper = this.getHelper(id);
    if (!helper || helper.level >= helper.maxLevel) return false;
    return cash >= this.getNextCost(helper);
  }

  public upgradeHelper(id: HelperId, currentCash: number): { success: boolean; newCash: number; helper?: HelperConfig } {
    const helper = this.getHelper(id);
    if (!helper) return { success: false, newCash: currentCash };
    const cost = this.getNextCost(helper);
    if (currentCash < cost || helper.level >= helper.maxLevel) {
      return { success: false, newCash: currentCash };
    }

    helper.level += 1;
    helper.unlocked = true;
    if (helper.maxCooldown && helper.cooldown === undefined) {
      helper.cooldown = 0;
    }

    return {
      success: true,
      newCash: currentCash - cost,
      helper
    };
  }

  public update(
    dt: number,
    player: Vehicle,
    cops: Vehicle[],
    spawnProjectile: (p: Projectile) => void,
    spawnTrap: (t: TrapItem) => void,
    triggerEmpWave: (x: number, y: number, radius: number) => void,
    spawnEscortVehicle: () => Vehicle
  ) {
    // 1. Mechanic logic: repair player car passively
    const mechanic = this.getHelper('mechanic');
    if (mechanic && mechanic.level > 0 && player.health < player.maxHealth && !player.destroyed) {
      const repairRate = mechanic.level * 4.5; // HP per second
      player.health = Math.min(player.maxHealth, player.health + repairRate * dt);
    }

    // 2. Gunner logic: shoots at nearest chasing police car
    const gunner = this.getHelper('gunner');
    if (gunner && gunner.level > 0 && !player.destroyed) {
      this.gunnerTimer += dt;
      const fireInterval = Math.max(0.2, 0.65 - gunner.level * 0.12); // faster fire with upgrades
      const gunRange = 350 + gunner.level * 60;

      if (this.gunnerTimer >= fireInterval) {
        this.gunnerTimer = 0;
        // Find nearest active cop within range
        let nearestCop: Vehicle | null = null;
        let minDist = gunRange;

        for (const cop of cops) {
          if (cop.destroyed) continue;
          const dx = cop.x - player.x;
          const dy = cop.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            nearestCop = cop;
          }
        }

        if (nearestCop) {
          const dx = nearestCop.x - player.x;
          const dy = nearestCop.y - player.y;
          const angle = Math.atan2(dy, dx);
          // Add slight spread
          const spread = (Math.random() - 0.5) * 0.15;
          const finalAngle = angle + spread;
          const bulletSpeed = 650;

          spawnProjectile({
            id: `p_bullet_${Date.now()}_${Math.random()}`,
            x: player.x + Math.cos(player.angle) * 10,
            y: player.y + Math.sin(player.angle) * 10,
            vx: Math.cos(finalAngle) * bulletSpeed,
            vy: Math.sin(finalAngle) * bulletSpeed,
            range: gunRange,
            distanceTraveled: 0,
            damage: 18 + gunner.level * 8,
            shooterType: 'player_helper',
            color: '#fbbf24'
          });
        }
      }
    }

    // 3. EMP Specialist logic
    const emp = this.getHelper('emp');
    if (emp && emp.level > 0 && !player.destroyed) {
      if (emp.cooldown! > 0) {
        emp.cooldown = Math.max(0, emp.cooldown! - dt);
      } else {
        // Auto trigger or ready
        emp.cooldown = Math.max(8, (emp.maxCooldown || 14) - emp.level * 2);
        const radius = 280 + emp.level * 70;
        triggerEmpWave(player.x, player.y, radius);
      }
    }

    // 4. Trap / Oil & Spikes logic
    const traps = this.getHelper('spikes');
    if (traps && traps.level > 0 && !player.destroyed) {
      if (traps.cooldown! > 0) {
        traps.cooldown = Math.max(0, traps.cooldown! - dt);
      } else {
        traps.cooldown = Math.max(4, (traps.maxCooldown || 8) - traps.level * 1.2);
        // Drop behind player's car
        const backX = player.x - Math.cos(player.angle) * (player.length / 2 + 15);
        const backY = player.y - Math.sin(player.angle) * (player.length / 2 + 15);
        const isOil = Math.random() > 0.5;
        spawnTrap({
          id: `trap_${Date.now()}_${Math.random()}`,
          type: isOil ? 'oil' : 'spikes',
          x: backX,
          y: backY,
          radius: isOil ? 28 : 22,
          life: 18 // lasts 18 seconds on pavement
        });
      }
    }

    // 5. Escort Muscle Car logic
    const escort = this.getHelper('escort');
    if (escort && escort.level > 0 && !player.destroyed) {
      if (!this.escortVehicle || this.escortVehicle.destroyed) {
        if (escort.cooldown! > 0) {
          escort.cooldown = Math.max(0, escort.cooldown! - dt);
        } else {
          // Spawn or respawn escort vehicle
          this.escortVehicle = spawnEscortVehicle();
          escort.cooldown = escort.maxCooldown || 30;
        }
      }
    }
  }

  public reset() {
    this.helpers = JSON.parse(JSON.stringify(INITIAL_HELPERS));
    this.gunnerTimer = 0;
    this.escortVehicle = null;
  }
}
