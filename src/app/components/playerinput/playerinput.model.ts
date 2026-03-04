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
  dpsMod?: number; // Percentage damage increase (e.g. 0.01 for 1%)
  critChanceMod?: number; // Critical strike chance increase (e.g. 0.01 for 1%)
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
  TOGGLES = 'Toggles',
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

export interface IPlayerToggles {
  // Account/Quest
  reaperCrew: boolean;
  kingsRansom: boolean;
  hardDesertAchievements: boolean;
  eliteFremennikAchievements: boolean;
  extinctionRingOfVigour: boolean;
  templeAtSenntisten: boolean;

  // Items/Passives
  anachroniaSkillcapeStand: boolean;
  slayerHelmetStand: boolean;
  slayerHelmet: boolean;
  stoneOfJas: boolean;
  dreadnip: boolean;
  dominionMine: boolean;
  ancientGizmo: boolean;
  ringOfVigour: boolean;
  zorgothsSoulRing: boolean;
  asylumSurgeonsRing: boolean;
  spiritCape: boolean;

  // Abilities/Codexes
  deathsSwiftness: boolean;
  sunshine: boolean;
  everyTendril: boolean;
  praesulCodex: boolean;
  corruptionShot: boolean;
  corruptionBlast: boolean;
  onslaught: boolean;
  stormShards: boolean;
  shatter: boolean;
  greaterBarge: boolean;
  greaterFlurry: boolean;
  greaterFury: boolean;
  greaterRicochet: boolean;
  greaterChain: boolean;
  greaterConcentratedBlast: boolean;
  greaterDazingShot: boolean;
  saltTheWound: boolean;
  bladedDive: boolean;
  limitless: boolean;
  ingenuityOfTheHumans: boolean;
  magmaTempest: boolean;
  greaterSunshine: boolean;
  greaterDeathsSwiftness: boolean;
  chaosRoar: boolean;
  greaterSonicWave: boolean;
  sacrifice: boolean;
  tuskasWrath: boolean;

  // Buffs/Slayer
  nopenopenope: number;
  corbiculaRex: number;
  dragonSlayer: boolean;
  demonSlayer: boolean;
  undeadSlayer: boolean;
}

export const DEFAULT_TOGGLES: IPlayerToggles = {
  reaperCrew: false,
  kingsRansom: false,
  hardDesertAchievements: false,
  eliteFremennikAchievements: false,
  extinctionRingOfVigour: false,
  templeAtSenntisten: false,

  anachroniaSkillcapeStand: false,
  slayerHelmetStand: false,
  slayerHelmet: false,
  stoneOfJas: false,
  dreadnip: false,
  dominionMine: false,
  ancientGizmo: false,
  ringOfVigour: false,
  zorgothsSoulRing: false,
  asylumSurgeonsRing: false,
  spiritCape: false,

  deathsSwiftness: false,
  sunshine: false,
  everyTendril: false,
  praesulCodex: false,
  corruptionShot: false,
  corruptionBlast: false,
  onslaught: false,
  stormShards: false,
  shatter: false,
  greaterBarge: false,
  greaterFlurry: false,
  greaterFury: false,
  greaterRicochet: false,
  greaterChain: false,
  greaterConcentratedBlast: false,
  greaterDazingShot: false,
  saltTheWound: false,
  bladedDive: false,
  limitless: false,
  ingenuityOfTheHumans: false,
  magmaTempest: false,
  greaterSunshine: false,
  greaterDeathsSwiftness: false,
  chaosRoar: false,
  greaterSonicWave: false,
  sacrifice: false,
  tuskasWrath: false,

  nopenopenope: 0,
  corbiculaRex: 0,
  dragonSlayer: false,
  demonSlayer: false,
  undeadSlayer: false,
};
