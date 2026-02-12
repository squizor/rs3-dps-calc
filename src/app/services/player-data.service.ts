import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import {
  IArmor,
  IEquipmentSlot,
  IPrayer,
  ISpell,
} from '../components/playerinput/playerinput.model';
import { InputSet } from '../components/dps/dps-display/dps-display.types';

export interface IActivePrayer extends IPrayer {
  isActive: boolean;
  boost: number;
}

export interface IGearPreset {
  name: string;
  equipment: IEquipmentSlot[];
}

@Injectable({
  providedIn: 'root',
})
export class PlayerDataService {
  private equipmentSlots = new BehaviorSubject<IEquipmentSlot[]>([]);
  private prayers = new BehaviorSubject<IPrayer[]>([]);
  private spells = new BehaviorSubject<ISpell[]>([]);
  private activePrayers = new BehaviorSubject<IActivePrayer[]>([]);
  private stats = new BehaviorSubject<any[]>([]);
  private calculatedStats = new BehaviorSubject<{ accuracy: number; hitChance: number }>({
    accuracy: 0,
    hitChance: 0,
  });
  private abilityDamage = new BehaviorSubject<number>(0);
  private weaponStyle = new BehaviorSubject<'dual-wield' | '2h'>('dual-wield');
  private inputSets = new BehaviorSubject<InputSet[]>([]);
  private activePotion = new BehaviorSubject<string>('none');
  private activeFamiliar = new BehaviorSubject<{ name: string } | null>(null);
  private gearPresets = new BehaviorSubject<IGearPreset[]>([]);

  public equipmentSlots$ = this.equipmentSlots.asObservable();
  public prayers$ = this.prayers.asObservable();
  public spells$ = this.spells.asObservable();
  public activePrayers$ = this.activePrayers.asObservable();
  public stats$ = this.stats.asObservable();
  public calculatedStats$ = this.calculatedStats.asObservable();
  public abilityDamage$ = this.abilityDamage.asObservable();
  public weaponStyle$ = this.weaponStyle.asObservable();
  public inputSets$ = this.inputSets.asObservable();
  public activePotion$ = this.activePotion.asObservable();
  public activeFamiliar$ = this.activeFamiliar.asObservable();
  public gearPresets$ = this.gearPresets.asObservable();

  private readonly EQUIPMENT_SLOTS = 'equipment_slots';
  private readonly WEAPON_STYLE = 'weapon_style';
  private readonly INPUT_SETS = 'input_sets';
  private readonly ACTIVE_PRAYERS = 'active_prayers';
  private readonly ACTIVE_POTION = 'active_potion';
  private readonly ACTIVE_FAMILIAR = 'active_familiar';
  private readonly GEAR_PRESETS = 'gear_presets';
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    if (this.isBrowser) {
      this.loadEquipment();
      this.loadWeaponStyle();
      this.loadInputSets();
      this.loadActivePrayers();
      this.loadActivePotion();
      this.loadActiveFamiliar();
      this.loadGearPresets();
    }
  }

  updateEquipment(slots: IEquipmentSlot[]) {
    this.equipmentSlots.next(slots);
    this.saveEquipment(slots);
  }

  private saveEquipment(slots: IEquipmentSlot[]) {
    if (this.isBrowser) {
      localStorage.setItem(this.EQUIPMENT_SLOTS, JSON.stringify(slots));
    }
  }

  private loadEquipment() {
    if (this.isBrowser) {
      const savedSlots = localStorage.getItem(this.EQUIPMENT_SLOTS);
      if (savedSlots) {
        this.equipmentSlots.next(JSON.parse(savedSlots));
      } else {
        const defaultSlots: IEquipmentSlot[] = [
          { name: 'head', selectedArmor: null, isDropdownOpen: false },
          { name: 'body', selectedArmor: null, isDropdownOpen: false },
          { name: 'legs', selectedArmor: null, isDropdownOpen: false },
          { name: 'gloves', selectedArmor: null, isDropdownOpen: false },
          { name: 'boots', selectedArmor: null, isDropdownOpen: false },
          { name: 'cape', selectedArmor: null, isDropdownOpen: false },
          { name: 'necklace', selectedArmor: null, isDropdownOpen: false },
          { name: 'ring', selectedArmor: null, isDropdownOpen: false },
          { name: 'ammo', selectedArmor: null, isDropdownOpen: false },
          { name: 'aura', selectedArmor: null, isDropdownOpen: false },
          { name: 'pocket', selectedArmor: null, isDropdownOpen: false },
          { name: 'mainhand', selectedArmor: null, isDropdownOpen: false },
          { name: 'offhand', selectedArmor: null, isDropdownOpen: false },
          { name: 'twohand', selectedArmor: null, isDropdownOpen: false },
        ];
        this.equipmentSlots.next(defaultSlots);
      }
    }
  }

  updateWeaponStyle(style: 'dual-wield' | '2h') {
    this.weaponStyle.next(style);
    if (this.isBrowser) {
      localStorage.setItem(this.WEAPON_STYLE, style);
    }
  }

  private loadWeaponStyle() {
    if (this.isBrowser) {
      const savedStyle = localStorage.getItem(this.WEAPON_STYLE) as 'dual-wield' | '2h' | null;
      if (savedStyle) {
        this.weaponStyle.next(savedStyle);
      }
    }
  }

  updateInputSets(sets: InputSet[]) {
    this.inputSets.next(sets);
    if (this.isBrowser) {
      localStorage.setItem(this.INPUT_SETS, JSON.stringify(sets));
    }
  }

  private loadInputSets() {
    if (this.isBrowser) {
      const savedInputSets = localStorage.getItem(this.INPUT_SETS);
      if (savedInputSets) {
        this.inputSets.next(JSON.parse(savedInputSets));
      }
    }
  }

  updatePrayers(prayers: IPrayer[]) {
    this.prayers.next(prayers);
  }

  updateSpells(spells: ISpell[]) {
    this.spells.next(spells);
  }

  updateActivePrayers(activePrayers: IActivePrayer[]) {
    this.activePrayers.next(activePrayers);
    if (this.isBrowser) {
      localStorage.setItem(this.ACTIVE_PRAYERS, JSON.stringify(activePrayers));
    }
  }

  private loadActivePrayers() {
    if (this.isBrowser) {
      const savedPrayers = localStorage.getItem(this.ACTIVE_PRAYERS);
      if (savedPrayers) {
        this.activePrayers.next(JSON.parse(savedPrayers));
      }
    }
  }

  updateActivePotion(potion: string) {
    this.activePotion.next(potion);
    if (this.isBrowser) {
      localStorage.setItem(this.ACTIVE_POTION, potion);
    }
  }

  private loadActivePotion() {
    if (this.isBrowser) {
      const savedPotion = localStorage.getItem(this.ACTIVE_POTION);
      if (savedPotion) {
        this.activePotion.next(savedPotion);
      }
    }
  }

  updateActiveFamiliar(familiar: { name: string } | null) {
    this.activeFamiliar.next(familiar);
    if (this.isBrowser) {
      localStorage.setItem(this.ACTIVE_FAMILIAR, JSON.stringify(familiar));
    }
  }

  private loadActiveFamiliar() {
    if (this.isBrowser) {
      const savedFamiliar = localStorage.getItem(this.ACTIVE_FAMILIAR);
      if (savedFamiliar && savedFamiliar !== 'null') {
        this.activeFamiliar.next(JSON.parse(savedFamiliar));
      }
    }
  }

  updateStats(stats: any[]) {
    this.stats.next(stats);
  }

  updateCalculatedStats(stats: { accuracy: number; hitChance: number }) {
    this.calculatedStats.next(stats);
  }

  updateAbilityDamage(damage: number) {
    this.abilityDamage.next(damage);
  }

  updateGearPresets(presets: IGearPreset[]) {
    this.gearPresets.next(presets);
    this.saveGearPresets(presets);
  }

  private saveGearPresets(presets: IGearPreset[]) {
    if (this.isBrowser) {
      localStorage.setItem(this.GEAR_PRESETS, JSON.stringify(presets));
    }
  }

  private loadGearPresets() {
    if (this.isBrowser) {
      const savedPresets = localStorage.getItem(this.GEAR_PRESETS);
      if (savedPresets) {
        this.gearPresets.next(JSON.parse(savedPresets));
      }
    }
  }

  icons: Record<string, string> = {
    stats: 'Statistics',
    equipment: 'Worn_Equipment_icon',
    prayers: 'Prayer',
    spells: 'Magic',
    invention: 'Invention',
    archaeology: 'Archaeology',
    summoning: 'Summoning',
    abilities: 'provoke',
    pause: 'Pause_icon',

    provoke: 'Provoke',

    aura: 'Aura_slot',
    head: 'Head_slot',
    pocket: 'Pocket_slot',
    cape: 'Back_slot',
    necklace: 'Neck_slot',
    ammo: 'Ammo_slot',
    mainhand: 'Main_hand_slot',
    body: 'Torso_slot',
    offhand: 'Off-hand_slot',
    legs: 'Legs_slot',
    gloves: 'Hands_slot',
    boots: 'Feet_slot',
    ring: 'Ring_slot',

    attack: 'Attack',
    strength: 'Strength',
    constitution: 'Constitution',
    defence: 'Defence',
    ranged: 'Ranged',
    prayer: 'Prayer',
    magic: 'Magic',
    necromancy: 'Necromancy_detail',
    herblore: 'Herblore-icon',

    standard: 'Attack_potion_(4)',
    super: 'Super_attack_(4)',
    grand: 'Grand_attack_potion_(6)',
    extreme: 'Extreme_attack_(4)',
    overload: 'Overload_(4)',
    supreme_attack: 'Supreme_attack_potion_(6)',
    supreme_overload: 'Supreme_overload_potion_(6)',
    elder_overload: 'Elder_overload_potion_(6)',

    torment: 'Torment',
    turmoil: 'Turmoil',
    sorrow: 'Sorrow',
    anguish: 'Anguish',
    soulsplit: 'Soul_Split',
    ruination: 'Ruination',
    desolation: 'Desolation',
    malevolence: 'Malevolence',
    affliction: 'Affliction',
    splitsoul: 'Split_Soul_icon',

    ultimatestrength: 'Ultimate_Strength',
    eagleeye: 'Eagle_Eye',
    mysticmight: 'Mystic_Might',
    accelerateddecay: 'Accelerated_Decay',
    eclipsedsoul: 'Eclipsed_Soul',
    piety: 'Piety',
    rigour: 'Rigour',
    augury: 'Augury',
    sanctity: 'Sanctity',
    divinerage: 'Divine_Rage',

    smokebarrage: 'Smoke_Barrage_icon',
    shadowbarrage: 'Shadow_Barrage_icon',
    bloodbarrage: 'Blood_Barrage_icon',
    icebarrage: 'Ice_Barrage_icon',
    exsanguinate: 'Exsanguinate_icon',
    opalaurora: 'Opal_Aurora_icon',
    sapphireaurora: 'Sapphire_Aurora_icon',
    emeraldaurora: 'Emerald_Aurora_icon',
    rubyaurora: 'Ruby_Aurora_icon',
    incitefear: 'Incite_Fear_icon',

    airsurge: 'Air_Surge_icon',
    watersurge: 'Water_Surge_icon',
    earthsurge: 'Earth_Surge_icon',
    firesurge: 'Fire_Surge_icon',
    crumbleundead: 'Crumble_Undead_icon',

    fontoflife: 'Font_of_Life',
    berserkerfury: `Berserker's_Fury`,
    shadowgrace: `Shadow's_Grace`,
    blessingofhet: 'Blessing_of_Het',
    deathward: 'Death_Ward',
    furyofthesmall: 'Fury_of_the_Small',
    persistentrage: 'Persistent_Rage',
    heightenedsenses: 'Heightened_Senses',
    conservationofenergy: 'Conservation_of_Energy',

    bob: 'Pack_yak_pouch',
    tank: 'Binding_contract_(hellhound)',
    bloodnihil: 'Blood_nihil_pouch',
    shadownihil: 'Shadow_nihil_pouch',
    smokenihil: 'Smoke_nihil_pouch',
    icenihil: 'Ice_nihil_pouch',
    steeltitan: 'Steel_titan_pouch',
    bloodreaver: `Binding_contract_(blood_reaver)`,
    critdemon: `Binding_contract_(kal'gerion_demon)`,
    ripperdemon: `Binding_contract_(ripper_demon)`,
  };

  private sanitizeIconValue(iconValue: string): string {
    let filename = iconValue;
    if (filename.includes('thumb/')) {
      filename = filename.replace('thumb/', '');
    }

    if (!filename.endsWith('.png') && !filename.endsWith('.gif') && !filename.endsWith('.jpg')) {
      filename = `${filename}.png`;
    }
    return filename;
  }

  getIconByName(name: string): string {
    if (!name) return '';

    if (name.startsWith('http://') || name.startsWith('https://')) {
      return name;
    }

    const mappedIconValue = this.icons[name.toLowerCase()];

    if (mappedIconValue) {
      if (mappedIconValue.startsWith('http://') || mappedIconValue.startsWith('https://')) {
        return mappedIconValue;
      }
      const sanitizedFilename = this.sanitizeIconValue(mappedIconValue);
      return `assets/icons/${sanitizedFilename}`;
    }

    if (
      name.endsWith('.png') ||
      name.endsWith('.gif') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg')
    ) {
      return `assets/icons/${name}`;
    }

    return '';
  }
}
