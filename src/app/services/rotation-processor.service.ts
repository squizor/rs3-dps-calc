import { Injectable } from '@angular/core';
import { DisplayRotationItem } from '../types/abilities';

export interface ActiveEffect {
  name: string;
  sourceAbility: string;
  ticksRemaining: number;
}

export interface TickData {
  tick: number;
  totalDamage: number;
  dps: number;
  activeEffects: ActiveEffect[];
  log: string[];
}

export interface ProcessedRotation {
  tickData: TickData[];
  totalTime: number;
  averageDps: number;
}

@Injectable({
  providedIn: 'root',
})
export class RotationProcessorService {
  constructor() {}

  process(rotation: DisplayRotationItem[]): ProcessedRotation {
    const tickData: TickData[] = [];
    let totalDamage = 0;
    let currentTick = 0;

    if (rotation.length === 0) {
      return { tickData: [], totalTime: 0, averageDps: 0 };
    }

    rotation.forEach((item) => {
      if ('damage' in item && typeof item.damage === 'number') {
        const burstDamage = item.damage * 0.75;
        totalDamage += burstDamage;
        tickData.push({
          tick: currentTick,
          totalDamage: totalDamage,
          dps: totalDamage / ((currentTick + 1) * 0.6),
          activeEffects: [],
          log: [`Tick ${currentTick}: ${item.name} hits for ${burstDamage.toFixed(0)} damage.`],
        });
        currentTick++;

        const dotDamage = item.damage * 0.15;
        for (let i = 0; i < 2; i++) {
          totalDamage += dotDamage;
          tickData.push({
            tick: currentTick,
            totalDamage: totalDamage,
            dps: totalDamage / ((currentTick + 1) * 0.6),
            activeEffects: [],
            log: [
              `Tick ${currentTick}: ${item.name} deals ${dotDamage.toFixed(0)} damage over time.`,
            ],
          });
          currentTick++;
        }
      } else {
        tickData.push({
          tick: currentTick,
          totalDamage: totalDamage,
          dps: tickData.length > 0 ? totalDamage / (currentTick * 0.6) : 0,
          activeEffects: [],
          log: [`Tick ${currentTick}: ${item.type}`],
        });
        currentTick++;
      }
    });

    const totalTime = currentTick;
    const averageDps = totalTime > 0 ? totalDamage / (totalTime * 0.6) : 0;

    return {
      tickData,
      totalTime,
      averageDps,
    };
  }
}
