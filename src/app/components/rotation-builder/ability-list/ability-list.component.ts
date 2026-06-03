import { Component, inject, input, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { MatTabsModule } from '@angular/material/tabs';
import { faPause, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  map,
  Observable,
  startWith,
  take,
  withLatestFrom,
} from 'rxjs';
import { Ability, GearSwap, MagicSwap, PrayerSwap, RotationPause } from '../../../types/abilities';
import { AbilityService } from '../../../services/ability.service';
import { PlayerDataService } from '../../../services/player-data.service';
import { RotationService } from '../../../services/rotation.service';
import { IGearPreset, IPrayer, ISpell, IEquipmentSlot } from '../../playerinput/playerinput.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RotationDpsService } from '../../../services/rotation-dps.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
  selector: 'app-ability-list',
  templateUrl: './ability-list.component.html',
  styleUrls: ['./ability-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragPreview,
    AsyncPipe,
    CommonModule,
    FormsModule,
    MatTabsModule,
    FontAwesomeModule,
  ],
})
export class AbilityListComponent implements OnInit {
  connectedTo = input<string[]>([]);

  faPause: IconDefinition = faPause;

  activeDropdown: 'gear' | 'prayer' | 'magic' | 'potions' | null = null;
  isSavingPreset = false;
  newPresetName = '';

  get listsContainerOverflow(): 'visible' | 'auto' {
    return this.activeDropdown !== null ? 'visible' : 'auto';
  }

  pauseAction: RotationPause = { type: 'pause', duration: 1 };

  private abilityService = inject(AbilityService);
  public playerDataService = inject(PlayerDataService);
  private rotationService = inject(RotationService);
  public rotationDpsService = inject(RotationDpsService); // Public for template access
  public settingsService = inject(SettingsService); // Public for template access
  
  private allAbilities$: Observable<Ability[]> = this.abilityService.getAbilities();
  public gearPresets$: Observable<IGearPreset[]> = this.playerDataService.gearPresets$;
  
  abilityTabs = [
    { name: 'Attack', icon: this.playerDataService.getIconByName('tab_attack') },
    { name: 'Ranged', icon: this.playerDataService.getIconByName('tab_ranged') },
    { name: 'Magic', icon: this.playerDataService.getIconByName('tab_magic') },
    { name: 'Necromancy', icon: this.playerDataService.getIconByName('tab_necromancy') },
    { name: 'Constitution', icon: this.playerDataService.getIconByName('constitution') },
    { name: 'Defensive', icon: this.playerDataService.getIconByName('defence') },
  ];
  activeTab = new BehaviorSubject<string>('Attack');

  filterValue = new BehaviorSubject<string>('');
  
  public filteredAbilities$: Observable<Ability[]> = combineLatest([
    this.allAbilities$,
    this.filterValue.pipe(debounceTime(200), startWith('')),
    this.activeTab.asObservable(),
    this.playerDataService.toggles$.pipe(startWith(this.playerDataService.getToggles())),
  ]).pipe(
    map(([abilities, filterText, activeTabName, toggles]) =>
      this.filterAbilities(abilities, filterText, activeTabName, toggles),
    ),
  );

  public filteredAbilitiesSignal = toSignal(this.filteredAbilities$, { initialValue: [] as Ability[] });
  public gearPresetsSignal = toSignal(this.gearPresets$, { initialValue: [] as IGearPreset[] });
  public availablePrayersSignal = toSignal(this.playerDataService.prayers$, { initialValue: [] as IPrayer[] });
  public availableSpellsSignal = toSignal(this.playerDataService.spells$, { initialValue: [] as ISpell[] });

  public availablePotions$ = this.allAbilities$.pipe(
    map((abilities) =>
      abilities.filter((ability) => {
          const nameLower = ability.name.toLowerCase();
          return nameLower.includes('adrenaline') && nameLower.includes('potion');
      })
    )
  );
  public availablePotionsSignal = toSignal(this.availablePotions$, { initialValue: [] as Ability[] });

  ngOnInit() {
  }

  toggleDropdown(type: 'gear' | 'prayer' | 'magic' | 'potions') {
    if (this.activeDropdown === type) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = type;
    }
  }

  onDragStart() {
    this.activeDropdown = null;
  }

  getPrayerSwapAction(prayer: IPrayer): PrayerSwap {
    return {
      type: 'prayer_swap',
      prayerName: prayer.name,
      icon: this.playerDataService.getIconByName(prayer.name),
    };
  }

  getMagicSwapAction(spell: ISpell): MagicSwap {
    return {
      type: 'magic_swap',
      spellName: spell.name,
      icon: this.playerDataService.getIconByName(spell.name),
    };
  }

  applyGearPreset(preset: IGearPreset) {
    this.playerDataService.updateEquipment(preset.equipment);
    this.activeDropdown = null;
  }

  addPresetToRotation(preset: IGearPreset, event: MouseEvent) {
    event.stopPropagation();
    const actions = this.getGearPresetAction(preset);
    this.rotationService.addGearSwapsToRotation(actions);
  }

  addAbilityToTimeline(item: any, event?: MouseEvent) {
    if (event) {
       event.stopPropagation();
       event.preventDefault();
    }
    this.rotationService.addAbilityToRotation(item);
  }

  getGearPresetAction(preset: IGearPreset): GearSwap[] {
    return preset.equipment
      .filter((slot: IEquipmentSlot) => slot.selectedArmor && slot.selectedArmor.name !== 'None')
      .map((slot: IEquipmentSlot) => ({
        type: 'gear_swap',
        slot: slot.name,
        itemName: slot.selectedArmor!.name,
      }));
  }

  // --- Potions ---
  getPotionAction(potion: Ability): Ability {
    // Potions are just abilities in the system now
    return potion;
  }


  showSavePreset() {
    this.isSavingPreset = true;
    this.newPresetName = '';
  }

  saveCurrentGear() {
    if (!this.newPresetName) return;

    this.playerDataService.equipmentSlots$
      .pipe(take(1), withLatestFrom(this.gearPresets$))
      .subscribe(([currentEquipment, presets]: [IEquipmentSlot[], IGearPreset[]]) => {
        const NEW_PRESET: IGearPreset = {
          name: this.newPresetName,
          equipment: JSON.parse(JSON.stringify(currentEquipment)),
        };

        const UPDATED_PRESETS = [...presets];
        const EXISTING_INDEX = UPDATED_PRESETS.findIndex((p) => p.name === this.newPresetName);

        if (EXISTING_INDEX > -1) {
          UPDATED_PRESETS[EXISTING_INDEX] = NEW_PRESET;
        } else {
          UPDATED_PRESETS.push(NEW_PRESET);
        }

        this.playerDataService.updateGearPresets(UPDATED_PRESETS);
        this.isSavingPreset = false;
        this.newPresetName = '';
      });
  }

  deleteGearPreset(presetNameToDelete: string, event: MouseEvent) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete the preset "${presetNameToDelete}"?`)) {
      this.gearPresets$.pipe(take(1)).subscribe((presets) => {
        const UPDATED_PRESETS = presets.filter((p) => p.name !== presetNameToDelete);
        this.playerDataService.updateGearPresets(UPDATED_PRESETS);
      });
    }
  }

  selectTab(tabName: string) {
    this.activeTab.next(tabName);
  }

  getIcon(ability: Ability): string {
    return `assets/${ability.icon}`;
  }

  getAbilityTooltip(ability: Ability): string {
    return `${ability.name} - ${ability.type}
Damage: ${ability.damage.min}-${ability.damage.max}
Cooldown: ${ability.cooldown} ticks`;
  }

  getCooldownPercent(ability: Ability): number {
      const cooldowns = this.rotationDpsService.cooldownsAtCursor$();
      const expiry = cooldowns.get(ability.name);
      if (!expiry) return 100; // Not on cooldown -> Fully visible (100% elapsed)
      
      const currentTick = this.rotationDpsService.cursorTick();
      if (expiry <= currentTick) return 100; // Expired -> Fully visible
      
      const remaining = expiry - currentTick;
      // Calculate percentage ELAPSED (0 to 100)
      // 0% elapsed = 0% colored (Black)
      // 100% elapsed = 100% colored (Full Color)
      const elapsed = ability.cooldown - remaining;
      return (elapsed / ability.cooldown) * 100;
  }

  getCooldownText(ability: Ability): string {
      const cooldowns = this.rotationDpsService.cooldownsAtCursor$();
      const expiry = cooldowns.get(ability.name);
      if (!expiry) return '';
      
      const currentTick = this.rotationDpsService.cursorTick();
      if (expiry <= currentTick) return '';
      
      const remainingTicks = expiry - currentTick;
      const remainingSeconds = remainingTicks * 0.6;
      
      // Formatting: if < 1s, show "0.Xs", else show "X.Xs" or just integers?
      // "2s" off.
      return remainingSeconds.toFixed(1) + 's';
  }

  private filterAbilities(abilities: Ability[], filterText: string, activeTab: string, toggles: any): Ability[] {
    const FILTER_LOWER = filterText.toLowerCase();
    
    // Greater Ability Mapping
    const GREATER_MAP: Record<string, { basic: string; toggle: string }> = {
      'Greater Barge': { basic: 'Barge', toggle: 'greaterBarge' },
      'Greater Flurry': { basic: 'Flurry', toggle: 'greaterFlurry' },
      'Greater Fury': { basic: 'Fury', toggle: 'greaterFury' },
      'Greater Sunshine': { basic: 'Sunshine', toggle: 'greaterSunshine' },
      "Greater Death's Swiftness": { basic: "Death's Swiftness", toggle: 'greaterDeathsSwiftness' },
      'Greater Ricochet': { basic: 'Ricochet', toggle: 'greaterRicochet' },
      'Greater Chain': { basic: 'Chain', toggle: 'greaterChain' },
      'Greater Concentrated Blast': { basic: 'Concentrated Blast', toggle: 'greaterConcentratedBlast' },
      'Greater Dazing Shot': { basic: 'Dazing Shot', toggle: 'greaterDazingShot' },
      'Greater Sonic Wave': { basic: 'Sonic Wave', toggle: 'greaterSonicWave' },
    };

    // Dedicated Codex Abilities (only shown if unlocked)
    const CODEX_ABILITIES: Record<string, string> = {
        'Chaos Roar': 'chaosRoar',
        'Magma Tempest': 'magmaTempest',
        'Corruption Shot': 'corruptionShot',
        'Corruption Blast': 'corruptionBlast',
        'Limitless': 'limitless'
    };

    let filtered = abilities.filter(ability => {
        // 1. Check Greater swaps
        for (const [greaterName, config] of Object.entries(GREATER_MAP)) {
            const isUnlocked = !!toggles[config.toggle];
            if (ability.name === greaterName && !isUnlocked) return false;
            if (ability.name === config.basic && isUnlocked) return false;
        }

        // 2. Check Codex unlocks
        if (CODEX_ABILITIES[ability.name]) {
            return !!toggles[CODEX_ABILITIES[ability.name]];
        }

        return true;
    });

    if (FILTER_LOWER) {
      filtered = filtered.filter((ability) => ability.name.toLowerCase().includes(FILTER_LOWER));
    } else {
      let tabLower = activeTab.toLowerCase();
      if (tabLower === 'hitpoints') tabLower = 'constitution';
      if (tabLower === 'defensive') tabLower = 'defence';

      filtered = filtered.filter((ability) => ability.skill.toLowerCase() === tabLower);
    }

    return filtered.sort((a, b) => {
      const A_IS_LESSER = a.name.toLowerCase().includes('lesser');
      const B_IS_LESSER = b.name.toLowerCase().includes('lesser');

      if (A_IS_LESSER && !B_IS_LESSER) return 1;
      if (!A_IS_LESSER && B_IS_LESSER) return -1;
      return 0;
    });
  }
}
