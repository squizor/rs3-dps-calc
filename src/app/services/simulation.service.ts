import { Injectable } from '@angular/core';
import { Ability } from '../types/abilities';
import { Observable, of } from 'rxjs';
import { PlayerDataService } from './player-data.service';

export interface SimulationResult {
  dps: number;
  ttk: number;
  chartData: { x: number; y: number }[];
}

@Injectable({
  providedIn: 'root',
})
export class SimulationService {
  private abilityDamage: number = 0;
  private hitChance: number = 1;

  private readonly CRIT_CHANCE = 0.1;
  private readonly CRIT_MULTIPLIER = 1.5;
  private readonly AVERAGE_CRIT_MULTIPLIER = 1 + this.CRIT_CHANCE * (this.CRIT_MULTIPLIER - 1);

  private readonly BLEED_ABILITIES: string[] = [
    'Dismember',
    'Slaughter',
    'Fragmentation Shot',
    'Combust',
  ];

  constructor(private playerDataService: PlayerDataService) {
    this.playerDataService.abilityDamage$.subscribe((damage) => {
      this.abilityDamage = damage;
    });

    this.playerDataService.calculatedStats$.subscribe((stats) => {
      this.hitChance = stats.hitChance;
    });
  }

  runSimulation(rotation: Ability[], bossHp: number): Observable<SimulationResult> {
    const chartData: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    if (rotation.length === 0 || this.abilityDamage === 0) {
      return of({ dps: 0, ttk: Infinity, chartData });
    }

    const duration = rotation.length * 1.8;
    const damageTimeline = new Map<number, number>();

    rotation.forEach((ability, index) => {
      const abilityTime = parseFloat(((index + 1) * 1.8).toFixed(1));
      const avgAbilityDamage = (ability.damage.min + ability.damage.max) / 2;
      const baseHit = this.abilityDamage * (avgAbilityDamage / 100);

      const initialHitDamage = baseHit * this.AVERAGE_CRIT_MULTIPLIER * this.hitChance;
      damageTimeline.set(abilityTime, (damageTimeline.get(abilityTime) || 0) + initialHitDamage);

      if (this.BLEED_ABILITIES.includes(ability.name)) {
        const bleedTicks = 5;
        const tickInterval = 1.2;
        const bleedDamagePerTick = baseHit / bleedTicks;

        for (let i = 1; i <= bleedTicks; i++) {
          const bleedTickTime = parseFloat((abilityTime + i * tickInterval).toFixed(1));
          damageTimeline.set(
            bleedTickTime,
            (damageTimeline.get(bleedTickTime) || 0) + bleedDamagePerTick,
          );
        }
      }
    });

    let totalDamage = 0;
    let lastTime = 0;
    const sortedTimes = Array.from(damageTimeline.keys()).sort((a, b) => a - b);

    for (const time of sortedTimes) {
      if (time > duration) continue;

      if (time > lastTime + 0.1) {
        for (let t = lastTime + 0.1; t < time; t += 0.1) {
          const currentTime = parseFloat(t.toFixed(1));
          chartData.push({ x: currentTime, y: Math.round(totalDamage / currentTime) });
        }
      }

      totalDamage += damageTimeline.get(time) || 0;
      chartData.push({ x: time, y: Math.round(totalDamage / time) });
      lastTime = time;
    }

    const finalAverageDps = Math.round(totalDamage / duration);
    const ttk = bossHp > 0 ? bossHp / finalAverageDps : Infinity;

    const result: SimulationResult = {
      dps: finalAverageDps,
      ttk: ttk,
      chartData: chartData,
    };

    return of(result);
  }
}
