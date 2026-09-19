/**
 * Types and interfaces for Fuga Urbana 2D
 */

export type VehicleType =
  | 'player'
  | 'police_cruiser'
  | 'police_suv'
  | 'swat_van'
  | 'fbi_sedan'
  | 'tank'
  | 'helper_escort'
  | 'civilian';

export interface Vehicle {
  id: string;
  type: VehicleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians
  speed: number;
  maxSpeed: number;
  accel: number;
  reverseSpeed: number;
  turnSpeed: number;
  width: number;
  length: number;
  health: number;
  maxHealth: number;
  color: string;
  roofColor?: string;
  isDrifting: boolean;
  driftFactor: number;
  destroyed: boolean;
  sirenState?: number;
  sirenTimer?: number;
  aiState?: 'chasing' | 'ramming' | 'flanking' | 'stalled' | 'escorting';
  stalledTimer?: number;
  lastShootTimer?: number;
}

export type DestructibleType =
  | 'hydrant'
  | 'lamp'
  | 'trash_can'
  | 'fence_h'
  | 'fence_v'
  | 'traffic_cone'
  | 'barrier'
  | 'billboard'
  | 'gas_pump'
  | 'parked_car'
  | 'tree';

export interface DestructibleObject {
  id: string;
  type: DestructibleType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  cashReward: number;
  wantedPoints: number;
  solid: boolean; // if false, car passes through easily (cones, trash)
  weight: number; // impacts how much it slows the car down
  color?: string;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  roofDetails: 'plain' | 'helipad' | 'ac_units' | 'solar' | 'water_tower';
  neonSign?: {
    text: string;
    color: string;
  };
}

export interface RoadTile {
  x: number;
  y: number;
  width: number;
  height: number;
  isIntersection: boolean;
  roadType: 'avenue_h' | 'avenue_v' | 'street_h' | 'street_v' | 'cross';
}

export interface CityChunk {
  chunkX: number;
  chunkY: number;
  buildings: Building[];
  roads: RoadTile[];
  objects: DestructibleObject[];
  cashDrops: CashDrop[];
  sidewalks: { x: number; y: number; width: number; height: number }[];
}

export interface CashDrop {
  id: string;
  x: number;
  y: number;
  value: number;
  collected: boolean;
  spawnTime: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  range: number;
  distanceTraveled: number;
  damage: number;
  shooterType: 'player_helper' | 'police' | 'swat' | 'helicopter';
  color: string;
}

export interface Helicopter {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  rotorAngle: number;
  spotlightX: number;
  spotlightY: number;
  health: number;
  maxHealth: number;
  shootTimer: number;
  destroyed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'smoke' | 'fire' | 'spark' | 'water' | 'debris' | 'cash' | 'emp' | 'oil';
}

export interface TireSkid {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
}

export interface TrapItem {
  id: string;
  type: 'oil' | 'spikes';
  x: number;
  y: number;
  radius: number;
  life: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  vy: number;
}

export type HelperId = 'gunner' | 'mechanic' | 'escort' | 'emp' | 'spikes';

export interface HelperConfig {
  id: HelperId;
  name: string;
  title: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  level: number;
  maxLevel: number;
  icon: string;
  unlocked: boolean;
  cooldown?: number; // for active helpers like EMP or Spikes
  maxCooldown?: number;
}

export interface GameState {
  cash: number;
  score: number;
  wantedStars: number; // 1 to 5
  wantedPoints: number;
  wantedThresholds: number[];
  destructionCount: number;
  policeDestroyed: number;
  distanceTraveled: number;
  timeSurvived: number; // in seconds
  multiplier: number;
  multiplierTimer: number;
  isGameOver: boolean;
  isPaused: boolean;
  nitro: number; // 0 to 100
  isNitroActive: boolean;
  copsEvadedTimer: number;
  isEvading: boolean; // stars flashing
}
