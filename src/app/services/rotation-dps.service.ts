import { Injectable, signal, inject } from '@angular/core';
import { DisplayRotationTick, RotationAbility } from '../types/abilities';
import { IActivePrayer, PlayerDataService } from './player-data.service';
import { CalculationInput, DpsCalculationService } from './dps-calculation.service';
import { Boss, Weapon } from '../types/equipment.types';
import { take } from 'rxjs';
import { IEquipmentSlot } from '../components/playerinput/playerinput.model';

export interface DamageTick {
  time: number;
  damage: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class RotationDpsService {
  private playerDataService = inject(PlayerDataService);
  private dpsCalculationService = inject(DpsCalculationService);

  private rotation = signal<DisplayRotationTick[]>([]);
  public rotation$ = this.rotation.asReadonly();
  public damageOverTime = signal<DamageTick[]>([]);

  private hitChance = 0;
  private currentEquipment: IEquipmentSlot[] = [];
  private currentActivePrayers: IActivePrayer[] = [];
  private currentStats: any[] = [];

  constructor() {
    this.playerDataService.calculatedStats$.subscribe((stats) => {
      this.hitChance = stats.hitChance / 100;
    });

    this.playerDataService.equipmentSlots$.subscribe((equipment) => {
      this.currentEquipment = equipment;
    });

    this.playerDataService.activePrayers$.subscribe((prayers) => {
      this.currentActivePrayers = prayers;
    });

    this.playerDataService.stats$.subscribe((stats) => {
      this.currentStats = stats;
    });
  }

  public updateRotation(rotation: DisplayRotationTick[]) {
    this.rotation.set(rotation);
    this.calculateDps();
  }

  private calculateDps() {
    const mainhand = this.currentEquipment.find((slot) => slot.name === 'mainhand')
      ?.selectedArmor as Weapon | null;
    const offhand = this.currentEquipment.find((slot) => slot.name === 'offhand')
      ?.selectedArmor as Weapon | null;
    const activePrayer = this.currentActivePrayers.find((p) => p.isActive);
    const combatStyle = mainhand?.style || 'melee';
    const relevantStat = this.currentStats.find((s) => s.name === combatStyle);

    const mockBoss: Boss = {
      name: 'Dummy',
      def: 1500,
      defenceLevel: 75,
      affinity: { melee: 55, ranged: 55, magic: 55, necromancy: 55, hybrid: 55 },
      hasEnrage: false,
      phases: [],
    };

    const calculationInput: CalculationInput = {
      level: relevantStat?.level || 99,
      potions: 0,
      prayer: activePrayer?.boost || 0,
      weapon: mainhand,
      offhand: offhand,
      boss: mockBoss,
      enrage: 0,
      debuffs: { gstaff: false, smoke: false, vuln: false },
      perk1: { name: '', rank: 0 },
      perk2: { name: '', rank: 0 },
    };

    this.dpsCalculationService
      .calculate(calculationInput)
      .pipe(take(1))
      .subscribe((output) => {
        const newDamageTicks: DamageTick[] = [];
        let currentTime = 0;
        const PLAYER_DAMAGE = output.abilityDmg;

        this.rotation().forEach((tick) => {
          tick.items.forEach((item) => {
            if (item.type === 'phase-break') {
              newDamageTicks.push({
                time: currentTime,
                damage: 0,
                name: item.text,
              });
            } else if ('damage' in item && item.damage) {
              const ability = item as RotationAbility;
              const averageDamage = (ability.damage.min + ability.damage.max) / 2;
              const ABILITY_DAMAGE_MOD = averageDamage / 100;
              const damage = PLAYER_DAMAGE * ABILITY_DAMAGE_MOD * this.hitChance;
              newDamageTicks.push({
                time: currentTime,
                damage,
                name: ability.name,
              });
            }
          });

          const hasActionableAbility = tick.items.some((item) => 'skill' in item);
          if (hasActionableAbility) {
            currentTime += 1.8;
          }
        });

        this.damageOverTime.set(newDamageTicks);
      });
  }
}
