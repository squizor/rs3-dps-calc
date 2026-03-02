import { Injectable, inject } from '@angular/core';
import { Ability, RotationAbility } from '../types/abilities';
import { BuffManagerService } from './buff-manager.service';
import { IEquipmentSlot, IPotion } from '../components/playerinput/playerinput.model';
import { Weapon, Boss } from '../types/equipment.types';
import { IActivePrayer } from './player-data.service';

export interface AttackerState {
  equipment: IEquipmentSlot[];
  activePrayers: IActivePrayer[];
  activePotion: string;
  levels: any[]; // Stats
  weaponStyle: '2h' | 'dual-wield';
}

export interface DamageResult {
  damage: number;
  hitChance: number;
  isCrit: boolean;
  minDamage: number;
  maxDamage: number;
  breakdown?: any; // For debug/tooltips
}

@Injectable({
  providedIn: 'root',
})
export class DamageCalculatorService {
  private buffManager = inject(BuffManagerService);

  constructor() {}

  public calculateHit(
    ability: RotationAbility,
    attacker: AttackerState,
    target: Boss | null
  ): DamageResult {
    // 1. Determine Weapon & Style
    const { mainhand, offhand, twohand, weaponToUse } = this.getWeapons(attacker);
    
    // 2. Calculate Base Ability Damage (AD)
    const ad = this.calculateAbilityDamageStat(attacker, weaponToUse, mainhand, offhand, twohand, ability);
    
    // 3. Calculate Modifiers (Prayers, Potions, Buffs)
    // Potion boosts are already in AD via level boosts usually, 
    // but we need to check if we handle them in 'levels' or separately.
    // For now assuming 'attacker.levels' has raw levels, so we apply potion boost here.
    
    // 4. Crit Roll
    const critChance = 0.05 + (ability.crit?.chance || 0) + this.buffManager.critChanceBonus();
    const isCrit = Math.random() < critChance;
    
    // 5. Damage Range (Ability % of AD)
    let minPct = ability.damage.min / 100;
    let maxPct = ability.damage.max / 100;
    
    if (isCrit) {
      // Force Max Hit + Crit Mod (usually 1.5x? or just max hit forcing?)
      // RS3 Crit: Forces Max Hit of the range, usually doesn't multiply unless forced by specific buffs (E.g. Grimoire).
      // Standard "Crit" in most games is 1.5x. 
      // RS3 "Critical Hit" (orange hitsplat) means you rolled high (95-100% of max).
      // "Forced Crit" (Biting) forces 95-100% roll.
      // For simulation simplicity: Let's assume Crit = Max Hit.
      minPct = maxPct; 
    }
    
    // Roll damage within range
    const roll = minPct + (Math.random() * (maxPct - minPct));
    let damage = Math.floor(ad * roll);
    
    // 6. Apply Multipliers (Prayers, Buffs like Sunshine)
    const prayerMult = this.calculatePrayerMultiplier(attacker.activePrayers);
    const buffMult = this.buffManager.damageMultiplier(); // Sunshine, etc.
    
    damage = Math.floor(damage * prayerMult * buffMult);
    
    // 7. Hit Chance
    const hitChance = this.calculateHitChance(attacker, target, weaponToUse, prayerMult); // Pass prayer for accuracy too if needed
    
    // Average expectation (for graph) vs Simulation (Roll)
    // For specific "Calculate Hit", we usually want the Result of a specific roll.
    // But since we might miss...
    const hitRoll = Math.random();
    if (hitRoll > (hitChance / 100)) {
        damage = 0; // Miss
    }

    return {
      damage,
      hitChance,
      isCrit,
      minDamage: Math.floor(ad * ability.damage.min / 100 * prayerMult * buffMult),
      maxDamage: Math.floor(ad * ability.damage.max / 100 * prayerMult * buffMult)
    };
  }

  // --- Helper Methods (Migrated from RotationDpsService) ---

  private getWeapons(attacker: AttackerState) {
    const twohand = attacker.equipment.find(s => s.name === 'twohand')?.selectedArmor as unknown as Weapon | undefined;
    const mainhand = attacker.equipment.find(s => s.name === 'mainhand')?.selectedArmor as unknown as Weapon | undefined;
    const offhand = attacker.equipment.find(s => s.name === 'offhand')?.selectedArmor as unknown as Weapon | undefined;

    let weaponToUse: Weapon | undefined;
    if (attacker.weaponStyle === '2h') {
        weaponToUse = twohand;
    } else {
        weaponToUse = mainhand;
    }
    return { mainhand, offhand, twohand, weaponToUse };
  }

  private calculateAbilityDamageStat(
      attacker: AttackerState, 
      weapon: Weapon | undefined, 
      mh: Weapon | undefined, 
      oh: Weapon | undefined, 
      th: Weapon | undefined,
      ability: Ability
  ): number {
    const combatStyle = ability.skill; 
    const relevantStat = attacker.levels.find((s) => s.name === combatStyle);
    const level = relevantStat?.level || 99;
    
    // Potion Boost
    const potionBoost = this.getPotionBoost(attacker.activePotion, level);
    const effectiveLevel = level + potionBoost;

    // Standard AD Formula
    let abilityDmg = 0;
    const isTwoHandActive = weapon && weapon.slot === 'twohand';
    const isMainHandActive = weapon && (weapon.slot === 'mainhand' || weapon.slot === 'offhand');

    if (isTwoHandActive && th) {
         const tier = th.level_requirement || 1;
         abilityDmg = (3.75 * effectiveLevel) + (14.4 * tier);
    } else if (isMainHandActive && mh) {
         const mhTier = mh.level_requirement || 1;
         abilityDmg = (2.5 * effectiveLevel) + (9.6 * mhTier);
         if (oh) {
             const ohTier = oh.level_requirement || 1;
             abilityDmg += (1.25 * effectiveLevel) + (4.8 * ohTier);
         }
    } else {
         abilityDmg = effectiveLevel * 3.75; 
    }

    return abilityDmg;
  }

  private getPotionBoost(potionName: string, level: number): number {
    let potionBoost = 0;
    const name = potionName.toLowerCase();
    
    if (name.includes('overload')) {
        if (name.includes('elder')) potionBoost = Math.floor(level * 0.17) + 5;
        else if (name.includes('supreme')) potionBoost = Math.floor(level * 0.16) + 4;
        else potionBoost = Math.floor(level * 0.15) + 3;
    } else if (name.includes('extreme')) {
         potionBoost = Math.floor(level * 0.15) + 3;
    } else if (name.includes('super')) {
         potionBoost = Math.floor(level * 0.12) + 2;
    } else if (name !== 'none') {
         potionBoost = Math.floor(level * 0.08) + 1;
    }
    return potionBoost;
  }

  private calculatePrayerMultiplier(prayers: IActivePrayer[]): number {
    const activePrayers = prayers.filter(p => p.isActive);
    const boost = activePrayers.reduce((acc, curr) => {
        const val = curr.damageBoost || (curr as any).boost || 0;
        return acc + val;
    }, 0);
    return 1 + boost;
  }

  private calculateHitChance(
      attacker: AttackerState, 
      target: Boss | null, 
      weapon: Weapon | undefined,
      prayerMult: number
  ): number {
    if (!target) return 100;

    // 1. Accuracy
    // Re-calculating effective level (duplicated logic, should refactor later)
    // For now assuming generic style or ability style match
    const relevantStat = attacker.levels.find(s => s.name === 'magic') || { level: 99 }; // Simplified lookup
    const level = relevantStat.level; 
    const potionBoost = this.getPotionBoost(attacker.activePotion, level);
    const effectiveLevel = level + potionBoost;

    const accuracyLevel = Math.floor(Math.pow(effectiveLevel, 3) / 1250 + 4 * effectiveLevel + 40);
    const weaponAccuracy = weapon ? weapon.accuracy : 0;
    
    let totalAccuracy = accuracyLevel + weaponAccuracy;
    totalAccuracy = Math.floor(totalAccuracy * prayerMult);

    // 2. Armour
    const bossDef = target.defenceLevel ?? 1;
    const bossArmour = target.armor ?? 0;
    const armourLevelBonus = Math.floor(Math.pow(bossDef, 3) / 1250 + 4 * bossDef + 40);
    let armour = armourLevelBonus + bossArmour;

    // 3. Affinity
    // Logic needs to know Ability Style. Assuming attacker.weaponStyle for now?
    // We need ability.skill passed in for perfect affinity.
    let affinity = 55;
    // ... (simplified affinity lookup for now) ...
    
    if (armour <= 0) return 100;
    let hitChance = (affinity * (totalAccuracy / armour)); // Wiki formula result is 0-100 usually? 
    // Wait, earlier fix was `affinity * (accuracy / armour)`. 
    // If affinity is 55, and acc/arm is 1, result is 55%.
    return Math.min(100, Math.max(0, hitChance));
  }
}
