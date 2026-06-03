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
  public damageMultiplier = computed(() => this.calculateMultiplier(this._playerBuffs()));
  public critChanceBonus = computed(() => this.calculateCritBonus(this._playerBuffs()));

  constructor() {}

  public calculateMultiplier(buffs: ActiveBuff[]): number {
    const mods = buffs.filter(b => b.type === 'damage-mod');
    return mods.reduce((acc, curr) => acc * (curr.value || 1), 1.0);
  }

  public calculateCritBonus(buffs: ActiveBuff[]): number {
    return buffs
      .filter(b => b.name.toLowerCase().includes('crit') || b.name === 'biting')
      .reduce((acc, curr) => acc + (curr.value || 0), 0);
  }

  public reset() {
    this._playerBuffs.set([]);
    this._targetDebuffs.set([]);
  }

  public addBuff(effect: Effect, source: string, currentTick: number, buffsArray?: ActiveBuff[]) {
    const newBuff: ActiveBuff = {
      ...effect,
      id: `${source}-${currentTick}-${Math.random().toString(36).substr(2, 9)}`,
      source,
      startTime: currentTick,
      endTime: effect.duration ? currentTick + effect.duration : Infinity,
    };

    if (buffsArray) {
        this.applyBuffToArray(buffsArray, newBuff);
        return;
    }

    if (effect.type === 'buff' || effect.type === 'damage-mod') {
      this.handleStacking(this._playerBuffs, newBuff);
    } else if (effect.type === 'debuff' || effect.type === 'dot') {
      this.handleStacking(this._targetDebuffs, newBuff);
    }
  }

  public removeBuff(name: string) {
    this._playerBuffs.update(buffs => buffs.filter(b => b.name !== name));
    this._targetDebuffs.update(buffs => buffs.filter(b => b.name !== name));
  }

  public tick(currentTick: number, buffsArray?: ActiveBuff[], debuffsArray?: ActiveBuff[]) {
    if (buffsArray) {
        for (let i = buffsArray.length - 1; i >= 0; i--) {
            if (buffsArray[i].endTime <= currentTick) buffsArray.splice(i, 1);
        }
    }
    if (debuffsArray) {
        for (let i = debuffsArray.length - 1; i >= 0; i--) {
            if (debuffsArray[i].endTime <= currentTick) debuffsArray.splice(i, 1);
        }
    }

    if (!buffsArray && !debuffsArray) {
        this._playerBuffs.update(buffs => buffs.filter(b => b.endTime > currentTick));
        this._targetDebuffs.update(buffs => buffs.filter(b => b.endTime > currentTick));
    }
  }

  private applyBuffToArray(arr: ActiveBuff[], newBuff: ActiveBuff) {
      if (!newBuff.stackable) {
          const idx = arr.findIndex(b => b.name === newBuff.name);
          if (idx !== -1) arr.splice(idx, 1);
      }
      arr.push(newBuff);
  }

  private handleStacking(signalList: any, newBuff: ActiveBuff) {
    signalList.update((current: ActiveBuff[]) => {
      if (!newBuff.stackable) {
        const filtered = current.filter(b => b.name !== newBuff.name);
        return [...filtered, newBuff];
      }
      return [...current, newBuff];
    });
  }
}
