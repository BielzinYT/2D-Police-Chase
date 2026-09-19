/**
 * Infinite Procedural City Generator
 */
import {
  CityChunk,
  Building,
  RoadTile,
  DestructibleObject,
  CashDrop,
  DestructibleType
} from '../types';

export const CHUNK_SIZE = 1200;
export const ROAD_WIDTH = 180;
export const SIDEWALK_WIDTH = 28;

// Deterministic pseudo-random number generator for chunk consistency
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getChunkSeed(cx: number, cy: number): number {
  return ((cx * 73856093) ^ (cy * 19349663) ^ 83492791) >>> 0;
}

const BUILDING_COLORS = [
  '#1e293b', '#334155', '#475569', '#1e1b4b', '#172554',
  '#0f172a', '#262626', '#27272a', '#3f3f46', '#2e1065'
];

const NEON_TEXTS = [
  { text: 'BANCO OURO', color: '#fbbf24' },
  { text: 'NITRO BURGER', color: '#f87171' },
  { text: 'CASINO LUX', color: '#c084fc' },
  { text: 'HOTEL FUGA', color: '#38bdf8' },
  { text: 'GARAGEM 24H', color: '#34d399' },
  { text: 'BAR DO PNEU', color: '#fb923c' }
];

export class CityManager {
  private chunks: Map<string, CityChunk> = new Map();
  private maxActiveRadius = 2; // load chunks within 2 chunks away

  public getChunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  public getChunkAt(cx: number, cy: number): CityChunk {
    const key = this.getChunkKey(cx, cy);
    if (!this.chunks.has(key)) {
      const chunk = this.generateChunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    return this.chunks.get(key)!;
  }

  public updateChunksAround(playerX: number, playerY: number): CityChunk[] {
    const centerCX = Math.floor(playerX / CHUNK_SIZE);
    const centerCY = Math.floor(playerY / CHUNK_SIZE);

    const activeChunks: CityChunk[] = [];
    const activeKeys = new Set<string>();

    for (let dx = -this.maxActiveRadius; dx <= this.maxActiveRadius; dx++) {
      for (let dy = -this.maxActiveRadius; dy <= this.maxActiveRadius; dy++) {
        const cx = centerCX + dx;
        const cy = centerCY + dy;
        const key = this.getChunkKey(cx, cy);
        activeKeys.add(key);
        activeChunks.push(this.getChunkAt(cx, cy));
      }
    }

    // Cull very distant chunks to keep memory lean
    if (this.chunks.size > 40) {
      for (const [key] of this.chunks.entries()) {
        if (!activeKeys.has(key)) {
          const [scx, scy] = key.split(',').map(Number);
          if (Math.abs(scx - centerCX) > 3 || Math.abs(scy - centerCY) > 3) {
            this.chunks.delete(key);
          }
        }
      }
    }

    return activeChunks;
  }

  private generateChunk(cx: number, cy: number): CityChunk {
    const rng = seededRandom(getChunkSeed(cx, cy));
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;

    const buildings: Building[] = [];
    const roads: RoadTile[] = [];
    const objects: DestructibleObject[] = [];
    const cashDrops: CashDrop[] = [];
    const sidewalks: { x: number; y: number; width: number; height: number }[] = [];

    // Road Grid Layout:
    // Road running horizontally along top and center, vertically along left and center
    // Let's create a regular urban block grid:
    // Road center at X = baseX + CHUNK_SIZE / 2
    // Road center at Y = baseY + CHUNK_SIZE / 2
    // Perimeter roads at borders shared with neighboring chunks!
    // That gives 4 city quadrants per chunk, surrounded by wide avenues!

    const half = CHUNK_SIZE / 2;
    const roadHCenter = baseY + half;
    const roadVCenter = baseX + half;

    // Crossroad in the middle:
    roads.push({
      x: baseX,
      y: roadHCenter - ROAD_WIDTH / 2,
      width: CHUNK_SIZE,
      height: ROAD_WIDTH,
      isIntersection: false,
      roadType: 'avenue_h'
    });

    roads.push({
      x: roadVCenter - ROAD_WIDTH / 2,
      y: baseY,
      width: ROAD_WIDTH,
      height: CHUNK_SIZE,
      isIntersection: false,
      roadType: 'avenue_v'
    });

    // Middle Intersection
    roads.push({
      x: roadVCenter - ROAD_WIDTH / 2,
      y: roadHCenter - ROAD_WIDTH / 2,
      width: ROAD_WIDTH,
      height: ROAD_WIDTH,
      isIntersection: true,
      roadType: 'cross'
    });

    // Sidewalks along roads
    // Horizontal road sidewalks:
    sidewalks.push({
      x: baseX,
      y: roadHCenter - ROAD_WIDTH / 2 - SIDEWALK_WIDTH,
      width: CHUNK_SIZE,
      height: SIDEWALK_WIDTH
    });
    sidewalks.push({
      x: baseX,
      y: roadHCenter + ROAD_WIDTH / 2,
      width: CHUNK_SIZE,
      height: SIDEWALK_WIDTH
    });
    // Vertical road sidewalks:
    sidewalks.push({
      x: roadVCenter - ROAD_WIDTH / 2 - SIDEWALK_WIDTH,
      y: baseY,
      width: SIDEWALK_WIDTH,
      height: CHUNK_SIZE
    });
    sidewalks.push({
      x: roadVCenter + ROAD_WIDTH / 2,
      y: baseY,
      width: SIDEWALK_WIDTH,
      height: CHUNK_SIZE
    });

    // Four quadrants for city blocks:
    // Q1: Top-Left, Q2: Top-Right, Q3: Bottom-Left, Q4: Bottom-Right
    const quadrants = [
      { x: baseX + 40, y: baseY + 40, w: half - ROAD_WIDTH / 2 - 80, h: half - ROAD_WIDTH / 2 - 80 },
      { x: roadVCenter + ROAD_WIDTH / 2 + 40, y: baseY + 40, w: half - ROAD_WIDTH / 2 - 80, h: half - ROAD_WIDTH / 2 - 80 },
      { x: baseX + 40, y: roadHCenter + ROAD_WIDTH / 2 + 40, w: half - ROAD_WIDTH / 2 - 80, h: half - ROAD_WIDTH / 2 - 80 },
      { x: roadVCenter + ROAD_WIDTH / 2 + 40, y: roadHCenter + ROAD_WIDTH / 2 + 40, w: half - ROAD_WIDTH / 2 - 80, h: half - ROAD_WIDTH / 2 - 80 }
    ];

    // Theme variations per quadrant:
    // 0: Commercial buildings (high-rise)
    // 1: Gas station / Parking lot with cars
    // 2: City park with trees, benches, fences
    // 3: Industrial warehouses / containers / barrels
    quadrants.forEach((quad, qIndex) => {
      const quadRoll = (rng() * 4 + qIndex) % 4;

      if (quadRoll < 1.2) {
        // High-rise Commercial / Mixed Buildings
        // 1 or 2 buildings with an alleyway
        const split = rng() > 0.4;
        if (split) {
          const bw1 = quad.w * 0.45;
          const bw2 = quad.w * 0.45;
          const bColor1 = BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)];
          const bColor2 = BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)];
          
          buildings.push({
            id: `b_${cx}_${cy}_${qIndex}_1`,
            x: quad.x,
            y: quad.y,
            width: bw1,
            height: quad.h,
            color: bColor1,
            roofDetails: rng() > 0.6 ? 'helipad' : 'ac_units',
            neonSign: rng() > 0.4 ? NEON_TEXTS[Math.floor(rng() * NEON_TEXTS.length)] : undefined
          });

          buildings.push({
            id: `b_${cx}_${cy}_${qIndex}_2`,
            x: quad.x + bw1 + (quad.w * 0.1),
            y: quad.y,
            width: bw2,
            height: quad.h,
            color: bColor2,
            roofDetails: 'solar'
          });

          // Alleyway in between has trash cans and cash drops
          objects.push({
            id: `trash_${cx}_${cy}_${qIndex}`,
            type: 'trash_can',
            x: quad.x + bw1 + (quad.w * 0.05),
            y: quad.y + quad.h * 0.5,
            width: 24,
            height: 24,
            angle: rng() * Math.PI * 2,
            health: 20,
            maxHealth: 20,
            destroyed: false,
            cashReward: 50,
            wantedPoints: 25,
            solid: false,
            weight: 0.1
          });

          if (rng() > 0.3) {
            cashDrops.push({
              id: `cash_${cx}_${cy}_${qIndex}`,
              x: quad.x + bw1 + (quad.w * 0.05),
              y: quad.y + quad.h * 0.3,
              value: 150 + Math.floor(rng() * 300),
              collected: false,
              spawnTime: Date.now()
            });
          }
        } else {
          // Large single corporate block
          buildings.push({
            id: `b_${cx}_${cy}_${qIndex}_mega`,
            x: quad.x,
            y: quad.y,
            width: quad.w,
            height: quad.h,
            color: BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)],
            roofDetails: 'water_tower',
            neonSign: NEON_TEXTS[Math.floor(rng() * NEON_TEXTS.length)]
          });
        }
      } else if (quadRoll < 2.2) {
        // Gas Station or Parking Lot
        const isGasStation = rng() > 0.5;
        if (isGasStation) {
          // Small shop building
          buildings.push({
            id: `gas_shop_${cx}_${cy}_${qIndex}`,
            x: quad.x + quad.w * 0.45,
            y: quad.y,
            width: quad.w * 0.55,
            height: quad.h * 0.5,
            color: '#1e293b',
            roofDetails: 'plain',
            neonSign: { text: 'POSTO FUGA', color: '#f59e0b' }
          });

          // Gas pumps in front (super explosive!)
          for (let p = 0; p < 2; p++) {
            objects.push({
              id: `pump_${cx}_${cy}_${qIndex}_${p}`,
              type: 'gas_pump',
              x: quad.x + 40 + p * 60,
              y: quad.y + quad.h * 0.6,
              width: 32,
              height: 32,
              angle: 0,
              health: 30,
              maxHealth: 30,
              destroyed: false,
              cashReward: 350,
              wantedPoints: 200,
              solid: true,
              weight: 0.8
            });
          }
        } else {
          // Open Parking Lot with parked cars
          const carColors = ['#dc2626', '#2563eb', '#16a34a', '#eab308', '#9333ea', '#ffffff'];
          for (let c = 0; c < 3; c++) {
            objects.push({
              id: `pcar_${cx}_${cy}_${qIndex}_${c}`,
              type: 'parked_car',
              x: quad.x + 30 + c * 75,
              y: quad.y + quad.h * 0.5,
              width: 38,
              height: 72,
              angle: Math.PI / 2,
              health: 80,
              maxHealth: 80,
              destroyed: false,
              cashReward: 250,
              wantedPoints: 120,
              solid: true,
              weight: 0.6,
              color: carColors[Math.floor(rng() * carColors.length)]
            });
          }
        }
      } else if (quadRoll < 3.2) {
        // Park / Plaza with destructible fences, trees, and street props
        // Fences along the perimeter
        for (let fx = quad.x; fx < quad.x + quad.w; fx += 50) {
          objects.push({
            id: `fence_${cx}_${cy}_${fx}_top`,
            type: 'fence_h',
            x: fx + 25,
            y: quad.y,
            width: 48,
            height: 12,
            angle: 0,
            health: 25,
            maxHealth: 25,
            destroyed: false,
            cashReward: 40,
            wantedPoints: 20,
            solid: false,
            weight: 0.1
          });
        }

        // Trees inside park
        for (let t = 0; t < 3; t++) {
          objects.push({
            id: `tree_${cx}_${cy}_${qIndex}_${t}`,
            type: 'tree',
            x: quad.x + 50 + (t % 2) * 120,
            y: quad.y + 50 + Math.floor(t / 2) * 120,
            width: 44,
            height: 44,
            angle: rng() * Math.PI * 2,
            health: 90,
            maxHealth: 90,
            destroyed: false,
            cashReward: 80,
            wantedPoints: 40,
            solid: true,
            weight: 0.5
          });
        }

        // Central cash loot or briefcase in park
        cashDrops.push({
          id: `park_cash_${cx}_${cy}_${qIndex}`,
          x: quad.x + quad.w * 0.5,
          y: quad.y + quad.h * 0.5,
          value: 200 + Math.floor(rng() * 400),
          collected: false,
          spawnTime: Date.now()
        });
      } else {
        // Industrial warehouse
        buildings.push({
          id: `warehouse_${cx}_${cy}_${qIndex}`,
          x: quad.x,
          y: quad.y,
          width: quad.w,
          height: quad.h * 0.7,
          color: '#334155',
          roofDetails: 'plain'
        });

        // Barricades / barrels in loading bay
        for (let b = 0; b < 2; b++) {
          objects.push({
            id: `barrier_${cx}_${cy}_${qIndex}_${b}`,
            type: 'barrier',
            x: quad.x + 40 + b * 80,
            y: quad.y + quad.h * 0.85,
            width: 45,
            height: 18,
            angle: 0,
            health: 40,
            maxHealth: 40,
            destroyed: false,
            cashReward: 60,
            wantedPoints: 30,
            solid: false,
            weight: 0.2
          });
        }
      }
    });

    // Street Furniture & Props along sidewalks:
    // Fire Hydrants (at road curb corners)
    const hydrantCorners = [
      { x: roadVCenter - ROAD_WIDTH / 2 - 14, y: roadHCenter - ROAD_WIDTH / 2 - 14 },
      { x: roadVCenter + ROAD_WIDTH / 2 + 14, y: roadHCenter - ROAD_WIDTH / 2 - 14 },
      { x: roadVCenter - ROAD_WIDTH / 2 - 14, y: roadHCenter + ROAD_WIDTH / 2 + 14 },
      { x: roadVCenter + ROAD_WIDTH / 2 + 14, y: roadHCenter + ROAD_WIDTH / 2 + 14 }
    ];

    hydrantCorners.forEach((c, idx) => {
      if (rng() > 0.25) {
        objects.push({
          id: `hydrant_${cx}_${cy}_${idx}`,
          type: 'hydrant',
          x: c.x,
          y: c.y,
          width: 20,
          height: 20,
          angle: 0,
          health: 30,
          maxHealth: 30,
          destroyed: false,
          cashReward: 75,
          wantedPoints: 50,
          solid: false,
          weight: 0.15
        });
      }
    });

    // Street Lamps along roads
    const lampPositions = [
      { x: baseX + 180, y: roadHCenter - ROAD_WIDTH / 2 - 14 },
      { x: baseX + CHUNK_SIZE - 180, y: roadHCenter - ROAD_WIDTH / 2 - 14 },
      { x: baseX + 180, y: roadHCenter + ROAD_WIDTH / 2 + 14 },
      { x: baseX + CHUNK_SIZE - 180, y: roadHCenter + ROAD_WIDTH / 2 + 14 },
      { x: roadVCenter - ROAD_WIDTH / 2 - 14, y: baseY + 180 },
      { x: roadVCenter - ROAD_WIDTH / 2 - 14, y: baseY + CHUNK_SIZE - 180 },
      { x: roadVCenter + ROAD_WIDTH / 2 + 14, y: baseY + 180 },
      { x: roadVCenter + ROAD_WIDTH / 2 + 14, y: baseY + CHUNK_SIZE - 180 }
    ];

    lampPositions.forEach((lp, idx) => {
      objects.push({
        id: `lamp_${cx}_${cy}_${idx}`,
        type: 'lamp',
        x: lp.x,
        y: lp.y,
        width: 18,
        height: 18,
        angle: 0,
        health: 25,
        maxHealth: 25,
        destroyed: false,
        cashReward: 60,
        wantedPoints: 40,
        solid: false,
        weight: 0.1
      });
    });

    // Traffic cones and road barriers near intersection
    for (let tc = 0; tc < 3; tc++) {
      if (rng() > 0.4) {
        objects.push({
          id: `cone_${cx}_${cy}_${tc}`,
          type: 'traffic_cone',
          x: roadVCenter + (tc - 1) * 35,
          y: roadHCenter - ROAD_WIDTH / 2 + 25,
          width: 14,
          height: 14,
          angle: 0,
          health: 10,
          maxHealth: 10,
          destroyed: false,
          cashReward: 25,
          wantedPoints: 15,
          solid: false,
          weight: 0.05
        });
      }
    }

    return {
      chunkX: cx,
      chunkY: cy,
      buildings,
      roads,
      objects,
      cashDrops,
      sidewalks
    };
  }
}
