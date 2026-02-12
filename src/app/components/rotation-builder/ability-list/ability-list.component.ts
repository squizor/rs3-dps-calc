import { Component, inject, Input, OnInit } from '@angular/core';
import { AsyncPipe, CommonModule, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { MatTabsModule } from '@angular/material/tabs';
import { faPause, IconDefinition } from '@fortawesome/free-solid-svg-icons';
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

@Component({
  selector: 'app-ability-list',
  templateUrl: './ability-list.component.html',
  styleUrls: ['./ability-list.component.scss'],
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    AsyncPipe,
    NgFor,
    CommonModule,
    FormsModule,
    MatTabsModule,
    FontAwesomeModule,
  ],
})
export class AbilityListComponent implements OnInit {
  @Input() connectedTo: string[] = [];

  faPause: IconDefinition = faPause;

  activeDropdown: 'gear' | 'prayer' | 'magic' | null = null;
  isSavingPreset = false;
  newPresetName = '';

  availablePrayers$: Observable<IPrayer[]> = new Observable<IPrayer[]>();
  availableSpells$: Observable<ISpell[]> = new Observable<ISpell[]>();

  get listsContainerOverflow(): 'visible' | 'auto' {
    return this.activeDropdown !== null ? 'visible' : 'auto';
  }

  pauseAction: RotationPause = { type: 'pause', duration: 1 };

  private abilityService = inject(AbilityService);
  public playerDataService = inject(PlayerDataService);
  private rotationService = inject(RotationService);
  private allAbilities$: Observable<Ability[]> = this.abilityService.getAbilities();
  public gearPresets$: Observable<IGearPreset[]> = this.playerDataService.gearPresets$;
  abilityTabs: { name: string; icon: string }[] = [];
  activeTab = new BehaviorSubject<string>('');

  filterValue = new BehaviorSubject<string>('');
  filteredAbilities$: Observable<Ability[]> | undefined;

  ngOnInit() {
    this.abilityTabs = [
      { name: 'Attack', icon: this.playerDataService.getIconByName('attack') },
      { name: 'Strength', icon: this.playerDataService.getIconByName('strength') },
      { name: 'Ranged', icon: this.playerDataService.getIconByName('ranged') },
      { name: 'Magic', icon: this.playerDataService.getIconByName('magic') },
      { name: 'Necromancy', icon: this.playerDataService.getIconByName('necromancy') },
      { name: 'Constitution', icon: this.playerDataService.getIconByName('constitution') },
      { name: 'Defensive', icon: this.playerDataService.getIconByName('defence') },
    ];
    this.activeTab.next(this.abilityTabs[0].name);

    this.filteredAbilities$ = combineLatest([
      this.allAbilities$,
      this.filterValue.pipe(debounceTime(200), startWith('')),
      this.activeTab.pipe(startWith(this.abilityTabs[0].name)),
    ]).pipe(
      map(([abilities, filterText, activeTab]) =>
        this.filterAbilities(abilities, filterText, activeTab),
      ),
    );

    this.availablePrayers$ = this.playerDataService.prayers$;

    this.availableSpells$ = this.playerDataService.spells$;
  }

  toggleDropdown(type: 'gear' | 'prayer' | 'magic') {
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
    const GEAR_SWAPS: GearSwap[] = preset.equipment
      .filter((slot: IEquipmentSlot) => slot.selectedArmor)
      .map((slot: IEquipmentSlot) => ({
        type: 'gear_swap',
        slot: slot.name,
        itemName: slot.selectedArmor!.name,
      }));

    this.rotationService.addGearSwapsToRotation(GEAR_SWAPS);
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

  private filterAbilities(abilities: Ability[], filterText: string, activeTab: string): Ability[] {
    const FILTER_LOWER = filterText.toLowerCase();
    let filtered: Ability[];

    if (FILTER_LOWER) {
      filtered = abilities.filter((ability) => ability.name.toLowerCase().includes(FILTER_LOWER));
    } else {
      let tabLower = activeTab.toLowerCase();
      if (tabLower === 'hitpoints') tabLower = 'constitution';
      if (tabLower === 'defensive') tabLower = 'defence';

      filtered = abilities.filter((ability) => ability.skill.toLowerCase() === tabLower);
    }

    return filtered.sort((a, b) => {
      const A_IS_LESSER = a.name.toLowerCase().includes('lesser');
      const B_IS_LESSER = b.name.toLowerCase().includes('lesser');

      if (A_IS_LESSER && !B_IS_LESSER) {
        return 1;
      }
      if (!A_IS_LESSER && B_IS_LESSER) {
        return -1;
      }
      return 0;
    });
  }
}
