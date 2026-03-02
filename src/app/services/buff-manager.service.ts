import { Injectable, signal, computed } from '@angular/core';
import { Effect } from '../types/abilities';

export interface ActiveBuff extends Effect {
  id: string; // Unique instance ID
  source: string; // Ability name or 'potion'
  startTime: number; // Tick when applied
  endTime: number; // Tick when expires
}

@Injectable({
  providedIn: 'root',
})
export class BuffManagerService {
  // We track buffs on the Player (self) and Debuffs on the Target (current boss)
  private _playerBuffs = signal<ActiveBuff[]>([]);
  private _targetDebuffs = signal<ActiveBuff[]>([]);

  public playerBuffs = this._playerBuffs.asReadonly();
  public targetDebuffs = this._targetDebuffs.asReadonly();

  // Computed Helpers
  public damageMultiplier = computed(() => {
    // Sum of all 'damage-mod' buffs on player
    const mods = this._playerBuffs().filter(b => b.type === 'damage-mod');
    const base = 1.0;
    // Most damage mods are additive or multiplicative?
    // Runescape usually: Base * (Prayer + Aura) * (Sunshine/Zerk/DS) * (Vuln)
    // We might need to categorize them better (e.g. 'additive' vs 'multiplicative')
    // For now, let's assume multiplicative for distinct sources.
    return mods.reduce((acc, curr) => acc * (curr.value || 1), base);
  });

  public critChanceBonus = computed(() => {
    // Sum of all crit chance buffs (e.g. Biting)
    // We need a specific effect type or value for this.
    // Assuming value is the % chance (e.g. 0.05 for 5%)
    return this._playerBuffs()
      .filter(b => b.name.toLowerCase().includes('crit') || b.name === 'biting')
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
  });

  constructor() {}

  public reset() {
    this._playerBuffs.set([]);
    this._targetDebuffs.set([]);
  }

  public addBuff(effect: Effect, source: string, currentTick: number) {
    const newBuff: ActiveBuff = {
      ...effect,
      id: `${source}-${currentTick}-${Math.random().toString(36).substr(2, 9)}`,
      source,
      startTime: currentTick,
      endTime: currentTick + (effect.duration || 0),
    };

    if (effect.type === 'buff' || effect.type === 'damage-mod') {
      this.handleStacking(this._playerBuffs, newBuff);
    } else if (effect.type === 'debuff' || effect.type === 'dot') {
      this.handleStacking(this._targetDebuffs, newBuff);
    }
  }

  public tick(currentTick: number) {
    // Remove expired buffs
    this._playerBuffs.update(buffs => buffs.filter(b => b.endTime > currentTick));
    this._targetDebuffs.update(buffs => buffs.filter(b => b.endTime > currentTick));
  }

  private handleStacking(signalList: any, newBuff: ActiveBuff) {
    signalList.update((current: ActiveBuff[]) => {
      if (!newBuff.stackable) {
        // Remove existing of same name
        const filtered = current.filter(b => b.name !== newBuff.name);
        return [...filtered, newBuff];
      }
      return [...current, newBuff];
    });
  }
}
