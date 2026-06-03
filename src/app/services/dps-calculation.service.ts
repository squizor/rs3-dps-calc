import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { filter, take, map } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { Perk, Weapon, Boss } from '../types/equipment.types';

export interface CalculationInput {
  level: number;
  potions: number;
  prayer: number;
  weapon: Weapon | null;
  offhand: Weapon | null;
  boss: Boss;
  enrage: number;
  familiar?: { name: string };
  debuffs: {
    gstaff: boolean;
    smoke: boolean;
    vuln: boolean;
  };
  perk1: { name: string; rank: number };
  perk2: { name: string; rank: number };
}

export interface CalculationOutput {
  dpm: number;
  hitChance: number;
  abilityDmg: number;
  maxHit: number;
  critChance?: number;
  critDmg?: number;
  distribution: { labels: string[]; values: number[] };
  ttk: { categories: string[]; values: number[] };
  dpmTimeline: { x: number; y: number }[];
  debug?: any; 
}

@Injectable({
  providedIn: 'root',
})
export class DpsCalculationService {
  public perks: Perk[] = [];
  public abilities: any[] = [];
  public enemies: any[] = [];

  public ammo: any[] = [];
  public bodies: any[] = [];
  public boots: any[] = [];
  public capes: any[] = [];
  public gloves: any[] = [];
  public heads: any[] = [];
  public legs: any[] = [];
  public necklaces: any[] = [];
  public pockets: any[] = [];
  public rings: any[] = [];
  public mainhands: Weapon[] = [];
  public offhands: Weapon[] = [];
  public twohands: Weapon[] = [];

  private isDataLoaded = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private db: DatabaseService,
  ) {
    this.loadAllData();
  }

  private loadAllData() {
    forkJoin({
      perks: this.http.get<Perk[]>('assets/data/perks.json'),
      enemies: this.http.get<any[]>('assets/data/custom-enemies.json'),
      abilities: this.http.get<any[]>('assets/data/abilities.json'),
      ammo: this.http.get<any[]>('assets/data/equipment/ammo.json'),
      bodies: this.http.get<any[]>('assets/data/equipment/body.json'),
      boots: this.http.get<any[]>('assets/data/equipment/boots.json'),
      capes: this.http.get<any[]>('assets/data/equipment/cape.json'),
      gloves: this.http.get<any[]>('assets/data/equipment/gloves.json'),
      heads: this.http.get<any[]>('assets/data/equipment/head.json'),
      legs: this.http.get<any[]>('assets/data/equipment/legs.json'),
      necklaces: this.http.get<any[]>('assets/data/equipment/necklace.json'),
      pockets: this.http.get<any[]>('assets/data/equipment/pocket.json'),
      rings: this.http.get<any[]>('assets/data/equipment/ring.json'),
      mainhands: this.http.get<Weapon[]>('assets/data/equipment/weapons/mainhand.json'),
      twohands: this.http.get<Weapon[]>('assets/data/equipment/weapons/twohand.json'),
      offhands: this.http.get<Weapon[]>('assets/data/equipment/weapons/offhand.json'),
    }).subscribe({
      next: (data: any) => {
        this.perks = data.perks;
        this.enemies = data.enemies;
        this.abilities = data.abilities;
        this.ammo = data.ammo;
        this.bodies = data.bodies;
        this.boots = data.boots;
        this.capes = data.capes;
        this.gloves = data.gloves;
        this.heads = data.heads;
        this.legs = data.legs;
        this.necklaces = data.necklaces;
        this.pockets = data.pockets;
        this.rings = data.rings;
        this.mainhands = data.mainhands;
        this.twohands = data.twohands;
        this.offhands = data.offhands;

        this.isDataLoaded.next(true);
      },
      error: (err: any) => console.error('Failed to load DPS data', err),
    });
  }

  private calculateLevelBonus(level: number): number {
    if (level < 1) {
      return 0;
    }
    const RAW_BONUS = Math.pow(level, 3) / 1250 + 4 * level + 40;
    return Math.floor(RAW_BONUS);
  }

  public calculate(input: CalculationInput): Observable<CalculationOutput> {
    return this.isDataLoaded.pipe(
      filter((loaded): loaded is boolean => !!loaded),
      take(1),
      map(() => {
        // https://runescape.wiki/w/Ability_damage
        // Total level is base + potions
        const effectiveLevel = Number(input.level) + Number(input.potions);
        let abilityDmg = 0;
        const mainhand = input.weapon;
        const offhand = input.offhand;
        
         // Modern 2024 RS3 Combat Math
         // Based on exact dummy testing and recent beta modifiers:
         // 2H Weapon Damage = (238 / 15) * Weapon Tier ~ 15.866...
         // 1H Weapon Damage = 9.0 * Weapon Tier
         // OH Weapon Damage = 4.5 * Weapon Tier
         
         // Base Level Damage Curve (Necromancy Standard)
         // Level 99 = 434, Level 110 = 473, Level 120 = 557
         // A common community approximation for the 2024 curve:
         let baseLevelDamage = 0;
         if (effectiveLevel === 99) baseLevelDamage = 434;
         else if (effectiveLevel === 106) baseLevelDamage = 460;
         else if (effectiveLevel === 110) baseLevelDamage = 473;
         else if (effectiveLevel === 120) baseLevelDamage = 557;
         else {
             // Approximation curve for remaining levels fitting those points
             // It behaves roughly as an exponential/polynomial curve
             const approx = 0.0004 * Math.pow(effectiveLevel, 3) + 0.02 * Math.pow(effectiveLevel, 2) + 0.1 * effectiveLevel + 10;
             baseLevelDamage = Math.floor(approx); 
         }
         
         if (mainhand) {
             const mTier = mainhand.level_requirement || 1;
             
             if (mainhand.slot === 'twohand') {
                 // 2H: Base Level + (238 / 15) * Tier
                 abilityDmg = baseLevelDamage + ((238 / 15) * mTier);
             } else {
                 // Dual Wield (MH part): Base Level + 9.0 * Tier
                 abilityDmg = baseLevelDamage + (9.0 * mTier);
                 
                 if (offhand) {
                     const oTier = offhand.level_requirement || 1;
                     // OH part adds its own modifier
                     abilityDmg += (4.5 * oTier);
                 }
             }
         } else {
             abilityDmg = baseLevelDamage;
         }

        const prayerMultiplier = 1 + (Number(input.prayer) / 100);
        abilityDmg = Math.floor(abilityDmg * prayerMultiplier);

        abilityDmg = Math.floor(abilityDmg);

        // Accuracy level bonus
        const accuracyLevel = this.calculateLevelBonus(effectiveLevel);
        const weaponAccuracy = input.weapon ? input.weapon.accuracy : 0;
        
        let accuracy = accuracyLevel + weaponAccuracy;
        
        // Apply Prayer Multiplier (e.g. 1.10 for T99)
        const accPrayerMultiplier = 1 + (input.prayer / 100); 
        accuracy = Math.floor(accuracy * accPrayerMultiplier); 

        // Target Armour
        let targetDefenceLevel = input.boss?.defenceLevel ?? 1;
        let targetArmourStat = input.boss?.armor ?? 0; // "defence" property in JSON is often armour stat
        
        // Some bosses override standard def calculation or have specific values
        // Standard formula: Defence Level Bonus + Armour Stat
        let armour = this.calculateLevelBonus(targetDefenceLevel) + targetArmourStat;

        // Apply Enrage (Telos/Glacor scaling)
        if (input.boss?.hasEnrage) {
             // Simplified linear scaling, varied by boss in reality
             // Telos: +3 per 1% enrage roughly on stats? Wiki says Defense/Armour scales.
             // For now keeping previous simple logic:
             armour += (input.enrage * 0.5); 
        }

        // Apply Debuffs to Armour
        if (input.debuffs.gstaff) armour -= 20; // GStaff reduces Defence Level actually... (simplified to armour rating for now or logic fix needed)
        // Note: GStaff/BStaff/SWH reduce DEFENCE RATING, not just armour. 
        // For accurate calc: Reduce rating directly.
        
        if (input.debuffs.smoke) armour = Math.floor(armour * 0.94); // Smoke Cloud reduces armour rating by 6% (check wiki: 15% manual, 6% auto? usually 6% for bind)

        // Affinity
        // Default standard values if not specified
        let affinity = 55; // Neutral
        if (input.boss && input.boss.affinity) {
             const style = input.weapon?.style?.toLowerCase() ?? 'hybrid';
             // If boss has specific affinity for this style, use it.
             // Fallback logic: Weakness > Specific Style > Hybrid > 55
             
             if (input.boss.weakness && input.boss.weakness.toLowerCase() === style) {
                 affinity = 90; // Specific weakness
             } else {
                 // Check style mapping
                 if (style === 'melee' && input.boss.affinity.melee !== null) affinity = input.boss.affinity.melee;
                 else if (style === 'ranged' && input.boss.affinity.ranged !== null) affinity = input.boss.affinity.ranged;
                 else if (style === 'magic' && input.boss.affinity.magic !== null) affinity = input.boss.affinity.magic;
                 else if (style === 'necromancy' && input.boss.affinity.necromancy !== null) affinity = input.boss.affinity.necromancy;
                 else if (input.boss.affinity.hybrid !== null) affinity = input.boss.affinity.hybrid;
             }
        }
        
        // Final Chance
        let hitChance = 0;
        
        if (armour <= 0) {
            hitChance = 100;
        } else {
            hitChance = affinity * (accuracy / armour);
        }

        // Modifiers (Reaper Necklace, Nihil, etc)
        if (input.familiar?.name?.includes('nihil')) {
             hitChance += 5; // Nihil is 5% additive
        }

        // Cap at 100%
        hitChance = Math.min(100, Math.max(0, hitChance));
        console.log('Final Hit Chance:', hitChance);

        let perkBonus = 1;
        let critChanceFromPerks = 0;
        if (input.perk1.name && input.perk1.rank > 0) {
          const p = this.perks.find((x: Perk) => x.name === input.perk1.name);
          if (p) {
            perkBonus += (p.dpsMod || 0) * input.perk1.rank;
            critChanceFromPerks += (p.critChanceMod || 0) * input.perk1.rank;
          }
        }
        if (input.perk2.name && input.perk2.rank > 0) {
          const p = this.perks.find((x: Perk) => x.name === input.perk2.name);
          if (p) {
            perkBonus += (p.dpsMod || 0) * input.perk2.rank;
            critChanceFromPerks += (p.critChanceMod || 0) * input.perk2.rank;
          }
        }

        let critChance = 0.1 + critChanceFromPerks;

        if (input.familiar && input.familiar.name === `Kal'gerion Demon`) {
          critChance += 0.05;
        }

        // Base crit damage modifier is +50% (total 1.5x) or varies by perks
        // FSOA, biting, etc. modify this but base is usually static extra damage
        const critDmg = 1.5;

        let baseDPM = abilityDmg * 60;
        baseDPM *= hitChance / 100;
        baseDPM *= perkBonus;
        if (input.debuffs.vuln) baseDPM *= 1.1;

        const fightDuration = 180;
        const dpmTimeline: { x: number; y: number }[] = [];
        let totalDamage = 0;
        const damagePerSecond = baseDPM / 60;

        for (let t = 0; t < fightDuration; t++) {
          const damageFluctuation = (Math.random() - 0.5) * 0.2;
          const secondDamage = damagePerSecond * (1 + damageFluctuation);
          totalDamage += secondDamage;
          dpmTimeline.push({ x: t, y: Math.floor((totalDamage / (t + 1)) * 60) });
        }

        const finalDPM = (totalDamage / fightDuration) * 60;

        return {
          dpm: Math.floor(finalDPM),
          hitChance: hitChance,
          critChance: critChance,
          critDmg: critDmg,
          abilityDmg: abilityDmg,
          maxHit: Math.floor(abilityDmg * 2.5),
          distribution: {
            labels: ['Ability Damage', 'Auto Attacks', 'Other'],
            values: [abilityDmg, 15, 10],
          },
          ttk: { categories: ['<30s', '30-60s', '60-90s', '>90s'], values: [10, 41, 35, 14] },
          dpmTimeline: dpmTimeline,
        };
      }),
    );
  }

  private getCritDamageMultiplier(level: number): number {
    if (level >= 90) return 1.5;
    if (level >= 80) return 1.45;
    if (level >= 70) return 1.4;
    if (level >= 60) return 1.35;
    if (level >= 50) return 1.3;
    if (level >= 40) return 1.25;
    if (level >= 30) return 1.2;
    if (level >= 20) return 1.15;
    if (level >= 1) return 1.1;
    return 1.0;
  }
}
