export interface IAffinity {
  hybrid: number | null;
  melee: number | null;
  ranged: number | null;
  magic: number | null;
  necromancy: number | null;
}

export interface IDamageBonus {
  melee?: number;
  ranged?: number;
  magic?: number;
  necromancy?: number;
}

export interface IArmor {
  name: string;
  type: string; // e.g., 'mainhand', 'helmet'
  icon?: string;
  augmentable?: boolean;
  class_type?: string; // e.g., 'Melee', 'Ranged'
  style?: string; // e.g., 'stab', 'slash', 'crush', 'arrows', 'bolts', 'thrown'
  attack_speed?: number; // e.g. x ticks
  level_requirement?: number;
  tier?: number; // Item tier
  ability_damage?: number;
  accuracy?: number;
  damage_bonus?: IDamageBonus;
}

export interface IEquipmentSlot {
  name: string; // e.g., 'mainhand', 'helmet'
  selectedArmor: IArmor | null;
  isDropdownOpen: boolean;
}

export interface IPerk {
  name: string; // e.g., 'Precise 6', 'Aftershock 4'
  baseName?: string; // e.g., 'Precise', 'Aftershock'
  rank?: number; // e.g., 6, 4
  slotsConsumed: number; // e.g., 1, 2
  type?: string; // e.g., 'weapon', 'armor'
  maxRank?: number; // Max rank for this perk definition
}

export interface IInventionPerkSlot {
  name: string; // e.g., 'Perk 1', 'Perk 2'
  selectedPerk: IPerk | null;
  options: IPerk[];
  occupiedByAdjacent: boolean;
}

export interface IInventionAugment {
  icon: string; // Icon name or URL
  name: string; // e.g., 'Mainhand Weapon', 'Body Armour'
  perkSlots: IInventionPerkSlot[];
  longPartOptions: string[];
  activeLongPart: string;
  isCustom?: boolean;
}

export interface IArchQuest {
  name: string;
  limit: number;
  unlocked: boolean;
}

export interface IRelic {
  name: string;
  cost: number;
  equipped: boolean;
  icon: string;
}

export interface IArchPreset {
  name: string;
  relics: (string | null)[];
}

export interface IGearPreset {
  name: string;
  equipment: IEquipmentSlot[];
}

export interface ISummoningFamiliar {
  name: string;
  icon: string;
  specialAttackCost: number;
}

export interface IEnemyMode {
  name: string;
  lifePoints?: number;
  weakness?: string;
  icon?: string;
  susceptibleTo?: string[] | string;
  affinity?: IAffinity;
  armor?: number;
  defenceLevel?: number;
}

export interface IEnemy {
  name: string;
  combatLevel: number;
  lifePoints: number;
  slayerHelmable: boolean;
  weakness: string;
  poisonable: boolean;
  reflectable: boolean;
  stunnable: boolean;
  statdrainable: boolean;
  defenceLevel: number;
  armor: number;
  susceptibleTo: string[] | string;
  enrageLevel?: number;
  icon?: string;
  hardModeStats?: IEnemyHardModeStats;
  affinity?: IAffinity;
  phases?: IEnemyMode[];
}

export interface IEnemyHardModeStats {
  lifePoints?: number;
  slayerHelmable?: boolean;
  defenceLevel?: number;
  armor?: number;
  affinity?: IAffinity;
}

export enum ETabs {
  EQUIPMENT = 'Equipment',
  STATS = 'Stats',
  PRAYERS = 'Prayers',
  SPELLS = 'Spells',
  INVENTION = 'Invention',
  ARCHAEOLOGY = 'Archaeology',
  SUMMONING = 'Summoning',
  ABILITIES = 'Abilities',
}
export enum EPrayerBook {
  STANDARD = 'Standard',
  CURSES = 'Curses',
}
export enum ESpellBook {
  STANDARD = 'Standard',
  ANCIENT = 'Ancient',
}
export interface IPrayer {
  name: string;
  type: 'dmg' | 'overhead';
  prayerBook: EPrayerBook;
  style: 'melee' | 'ranged' | 'magic' | 'necromancy' | 'all';
  level: number;
  accuracyBoost: number;
  damageBoost: number;
}

export interface IPotion {
  name: string;
  minLevel: number;
  staticBonus: number;
  scalingBonus: number;
}

export interface ISpell {
  name: string;
  spellBook: ESpellBook;
}
