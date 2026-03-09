import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import {
  IArmor,
  IEquipmentSlot,
  IPrayer,
  ISpell,
  IPlayerToggles,
  DEFAULT_TOGGLES,
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
  private boss = new BehaviorSubject<any>(null);
  private toggles = new BehaviorSubject<IPlayerToggles>({ ...DEFAULT_TOGGLES });
  
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
  public boss$ = this.boss.asObservable();
  public toggles$ = this.toggles.asObservable();

  private readonly EQUIPMENT_SLOTS = 'equipment_slots';
  private readonly WEAPON_STYLE = 'weapon_style';
  private readonly INPUT_SETS = 'input_sets';
  private readonly ACTIVE_PRAYERS = 'active_prayers';
  private readonly ACTIVE_POTION = 'active_potion';
  private readonly ACTIVE_FAMILIAR = 'active_familiar';
  private readonly GEAR_PRESETS = 'gear_presets';
  private readonly BOSS = 'boss';
  private readonly TOGGLES = 'toggles';
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
      this.loadBoss();
      this.loadToggles();
    }
  }

  updateBoss(boss: any) {
    this.boss.next(boss);
    if (this.isBrowser) {
      localStorage.setItem(this.BOSS, JSON.stringify(boss));
    }
  }

  private loadBoss() {
    if (this.isBrowser) {
      const savedBoss = localStorage.getItem(this.BOSS);
      if (savedBoss && savedBoss !== 'null' && savedBoss !== 'undefined') {
        try {
           this.boss.next(JSON.parse(savedBoss));
        } catch (e) {
           console.error('Failed to parse saved boss', e);
        }
      }
    }
  }

  updateToggles(toggles: IPlayerToggles) {
    this.toggles.next(toggles);
    if (this.isBrowser) {
      localStorage.setItem(this.TOGGLES, JSON.stringify(toggles));
    }
  }

  private loadToggles() {
    if (this.isBrowser) {
      const savedToggles = localStorage.getItem(this.TOGGLES);
      if (savedToggles) {
        try {
          this.toggles.next({ ...DEFAULT_TOGGLES, ...JSON.parse(savedToggles) });
        } catch (e) {
          console.error('Failed to parse toggles', e);
        }
      }
    }
  }

  updateEquipment(slots: IEquipmentSlot[]) {
    this.equipmentSlots.next(slots);
    this.saveEquipment(slots);
  }

  public getActiveEquipment() {
      return this.equipmentSlots.getValue();
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
        const slots: IEquipmentSlot[] = JSON.parse(savedSlots);
        this.equipmentSlots.next(slots.filter(s => s.name !== 'aura'));
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

  public getWeaponStyle() {
      return this.weaponStyle.getValue();
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

  public getActivePrayers(): IActivePrayer[] {
      return this.activePrayers.getValue();
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
    stats: 'statistics',
    equipment: 'worn_equipment_icon',
    prayers: 'prayer',
    spells: 'magic',
    invention: 'invention',
    archaeology: 'archaeology',
    summoning: 'summoning',
    abilities: 'provoke',
    pause: 'pause_icon',
    toggles: "drakan's_medallion",

    provoke: 'provoke',
    head: 'head_slot',
    'jaws of the abyss': 'jaws_of_the_abyss',
    pocket: 'pocket_slot',
    cape: 'back_slot',
    necklace: 'neck_slot',
    ammo: 'ammo_slot',
    mainhand: 'main_hand_slot',
    body: 'torso_slot',
    offhand: 'off-hand_slot',
    legs: 'legs_slot',
    gloves: 'hands_slot',
    boots: 'feet_slot',
    ring: 'ring_slot',

    attack: 'attack',
    strength: 'strength',
    constitution: 'constitution',
    defence: 'defence',
    ranged: 'ranged',
    magic: 'magic',
    necromancy: 'necromancy_detail',
    prayer: 'prayer',
    herblore: 'herblore-icon',

    tab_attack: 'attack',
    tab_ranged: 'ranged',
    tab_magic: 'magic',
    tab_necromancy: 'necromancy_detail',
    tab_prayer: 'prayer',

    standard: 'attack_potion_(4)',
    super: 'super_attack_(4)',
    grand: 'grand_attack_potion_(6)',
    extreme: 'extreme_attack_(4)',
    overload: 'overload_(4)',
    supreme_attack: 'supreme_attack_potion_(6)',
    supreme_overload: 'supreme_overload_potion_(6)',
    elder_overload: 'elder_overload_potion_(6)',

    torment: 'torment',
    turmoil: 'turmoil',
    sorrow: 'sorrow',
    anguish: 'anguish',
    soulsplit: 'soul_split',
    ruination: 'ruination',
    desolation: 'desolation',
    malevolence: 'malevolence',
    affliction: 'affliction',
    splitsoul: 'split_soul_icon',

    ultimatestrength: 'ultimate_strength',
    eagleeye: 'eagle_eye',
    mysticmight: 'mystic_might',
    accelerateddecay: 'accelerated_decay',
    eclipsedsoul: 'eclipsed_soul',
    piety: 'piety',
    rigour: 'rigour',
    augury: 'augury',
    sanctity: 'sanctity',
    divinerage: 'divine_rage',

    smokebarrage: 'smoke_barrage_icon',
    shadowbarrage: 'shadow_barrage_icon',
    bloodbarrage: 'blood_barrage_icon',
    icebarrage: 'ice_barrage_icon',
    exsanguinate: 'exsanguinate_icon',
    opalaurora: 'opal_aurora_icon',
    sapphireaurora: 'sapphire_aurora_icon',
    emeraldaurora: 'emerald_aurora_icon',
    rubyaurora: 'ruby_aurora_icon',
    incitefear: 'incite_fear_icon',

    airsurge: 'air_surge_icon',
    watersurge: 'water_surge_icon',
    earthsurge: 'earth_surge_icon',
    firesurge: 'fire_surge_icon',
    crumbleundead: 'crumble_undead_icon',

    fontoflife: 'font_of_life',
    berserkerfury: `berserker's_fury`,
    shadowgrace: `shadow's_grace`,
    blessingofhet: 'blessing_of_het',
    deathward: 'death_ward',
    furyofthesmall: 'fury_of_the_small',
    persistentrage: 'persistent_rage',
    heightenedsenses: 'heightened_senses',
    conservationofenergy: 'conservation_of_energy',

    bob: 'pack_yak_pouch',
    tank: 'binding_contract_(hellhound)',
    bloodnihil: 'blood_nihil_pouch',
    shadownihil: 'shadow_nihil_pouch',
    smokenihil: 'smoke_nihil_pouch',
    icenihil: 'ice_nihil_pouch',
    steeltitan: 'steel_titan_pouch',
    bloodreaver: `binding_contract_(blood_reaver)`,
    critdemon: `binding_contract_(kal'gerion_demon)`,
    ripperdemon: `binding_contract_(ripper_demon)`,
  };

  private sanitizeIconValue(iconValue: string): string {
    let filename = iconValue.toLowerCase();
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

    let mappedIconValue = this.icons[name.toLowerCase()];
    
    // Fallback: try stripping spaces (e.g. "Smoke Barrage" -> "smokebarrage")
    if (!mappedIconValue) {
        mappedIconValue = this.icons[name.toLowerCase().replace(/ /g, '')];
    }

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
      return `assets/icons/${name.toLowerCase()}`;
    }

    return '';
  }

  // --- Full Loadout Persistence Helpers ---

  public snapshotState() {
    return {
        equipment: this.equipmentSlots.getValue(),
        activePrayers: this.activePrayers.getValue(),
        activePotion: this.activePotion.getValue(),
        activeFamiliar: this.activeFamiliar.getValue(),
        weaponStyle: this.weaponStyle.getValue(),
        inputSets: this.inputSets.getValue(),
        stats: this.stats.getValue(),
        boss: this.boss.getValue(),
        toggles: this.toggles.getValue(),
    };
  }

  public restoreState(state: any) {
    if (!state) return;

    if (state.equipment) this.updateEquipment(state.equipment);
    if (state.activePrayers) this.updateActivePrayers(state.activePrayers);
    if (state.activePotion) this.updateActivePotion(state.activePotion);
    if (state.activeFamiliar) this.updateActiveFamiliar(state.activeFamiliar);
    if (state.weaponStyle) this.updateWeaponStyle(state.weaponStyle);
    if (state.inputSets) this.updateInputSets(state.inputSets);
    if (state.stats) this.updateStats(state.stats);
    if (state.boss) this.updateBoss(state.boss);
    
    if (state.toggles) {
      this.updateToggles({ ...DEFAULT_TOGGLES, ...state.toggles });
    } else {
      this.updateToggles({ ...DEFAULT_TOGGLES });
    }
  }
}
