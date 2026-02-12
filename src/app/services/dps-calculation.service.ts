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
}

@Injectable({
  providedIn: 'root',
})
export class DpsCalculationService {
  public perks: Perk[] = [];
  public abilities: any[] = [];
  public enemies: any[] = [];

  public ammo: any[] = [];
  public auras: any[] = [];
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
      auras: this.http.get<any[]>('assets/data/equipment/aura.json'),
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
        this.auras = data.auras;
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
        const effectiveLevel = Number(input.level) + Number(input.potions);
        const levelBonus = effectiveLevel * 10;

        const mhDmg = input.weapon ? input.weapon.ability_damage : 0;
        const ohDmg = input.offhand ? input.offhand.ability_damage : 0;

        const abilityDmg = Math.floor(levelBonus + mhDmg + ohDmg + Number(input.prayer) * 20);

        const skillAccuracy = this.calculateLevelBonus(effectiveLevel);
        const weaponAccuracy = input.weapon ? input.weapon.accuracy : 0;
        let totalAccuracy = skillAccuracy + weaponAccuracy;

        const PRAYER_ACC_MULTIPLIER = 1 + input.prayer / 100;
        totalAccuracy *= PRAYER_ACC_MULTIPLIER;

        let bossDef = input.boss ? input.boss.def : 1500;
        let effectiveBossAffinity = 55;

        if (input.boss && input.boss.affinity) {
          const weaponStyle = input.weapon?.style;
          switch (weaponStyle) {
            case 'melee':
              effectiveBossAffinity = input.boss.affinity.melee ?? input.boss.affinity.hybrid ?? 55;
              break;
            case 'ranged':
              effectiveBossAffinity =
                input.boss.affinity.ranged ?? input.boss.affinity.hybrid ?? 55;
              break;
            case 'magic':
              effectiveBossAffinity = input.boss.affinity.magic ?? input.boss.affinity.hybrid ?? 55;
              break;
            case 'necromancy':
              effectiveBossAffinity =
                input.boss.affinity.necromancy ?? input.boss.affinity.hybrid ?? 55;
              break;
            default:
              effectiveBossAffinity = input.boss.affinity.hybrid ?? 55;
              break;
          }
        }
        const bossAffinity = effectiveBossAffinity;

        if (input.boss) {
          const ARMOUR_BONUS = this.calculateLevelBonus(input.boss.defenceLevel ?? 0);
          const ARMOUR_RATING = Math.floor(bossDef + ARMOUR_BONUS);
          bossDef = ARMOUR_RATING;

          if (input.boss.hasEnrage) {
            bossDef += input.enrage * 0.5;
          }
        }

        if (input.debuffs.gstaff) bossDef -= 20;
        if (input.debuffs.smoke) bossDef *= 0.94;

        const hitChanceRaw = bossDef > 0 ? (bossAffinity / 100) * (totalAccuracy / bossDef) : 1.0;
        const hitChance = Math.min(100, Math.max(0, hitChanceRaw * 100));

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

        const critDmg = this.getCritDamageMultiplier(input.level);

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
