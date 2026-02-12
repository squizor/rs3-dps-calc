import { Injectable, inject } from '@angular/core';
import { PlayerDataService } from './player-data.service';
import { RotationItem, RotationPause } from '../types/abilities';
import { IEquipmentSlot } from '../components/playerinput/playerinput.model';

@Injectable({
  providedIn: 'root',
})
export class CalculationService {
  private playerDataService = inject(PlayerDataService);
  private stats: any[] = [];

  constructor() {
    this.playerDataService.stats$.subscribe((stats) => (this.stats = stats));
  }

  private getStat(name: string): number {
    const stat = this.stats.find((s) => s.name === name);
    return stat ? stat.level : 99;
  }

  private getAccuracyBonusBase(level: number): number {
    if (level < 1) {
      return 0;
    }
    return Math.pow(level, 3) / 1250 + 4 * level + 40;
  }

  calculateAccuracy(): number {
    const attackLevel = this.getStat('attack');
    const weaponBonus = 0;

    const skillBonusAcc = Math.floor(this.getAccuracyBonusBase(attackLevel));
    return skillBonusAcc + weaponBonus;
  }

  calculateHitChance(bossDefence: number): number {
    const accuracy = this.calculateAccuracy();
    let hitChance = (accuracy / bossDefence) * 0.55;
    if (hitChance > 1) hitChance = 1;
    return hitChance * 100;
  }

  calculateBaseAbilityDamage(): number {
    const strengthLevel = this.getStat('strength');
    const is2h = true;
    const weaponTier = 90;
    const styleBonus = 0;

    if (is2h) {
      return 3.75 * strengthLevel + 14.4 * weaponTier + 1.5 * styleBonus;
    } else {
      return 2.5 * strengthLevel + 9.6 * weaponTier + 1 * styleBonus;
    }
  }

  private isAbility(item: RotationItem): item is import('../types/abilities').RotationAbility {
    return 'skill' in item;
  }

  calculateDPM(rotation: RotationItem[]): number {
    const baseAbilityDamage = this.calculateBaseAbilityDamage();
    let totalDamage = 0;
    let totalTime = 0;

    rotation.forEach((item) => {
      if (this.isAbility(item)) {
        const avgDamageMultiplier = (item.damage.min + item.damage.max) / 2 / 100;
        totalDamage += baseAbilityDamage * avgDamageMultiplier;
        totalTime += item.cooldown;
      } else if (item.type === 'pause') {
        totalTime += (item as RotationPause).duration;
      }
    });

    if (totalTime === 0) return 0;

    const dps = totalDamage / (totalTime * 0.6);
    return dps * 60;
  }

  calculateTTK(bossHealth: number, rotation: RotationItem[]): number {
    const dpm = this.calculateDPM(rotation);
    if (dpm === 0) return Infinity;
    const dps = dpm / 60;
    return bossHealth / dps;
  }
}
