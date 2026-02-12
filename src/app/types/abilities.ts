export type Skill = 'attack' | 'strength' | 'magic' | 'ranged' | 'defence' | 'necromancy';

export interface Ability {
  id: number;
  name: string;
  icon?: string;
  type: 'auto' | 'basic' | 'threshold' | 'ultimate' | 'special' | 'other' | 'basic attack';
  skill: Skill;
  gear: 'none' | 'shield' | '2h' | 'dual-wield';
  adrenaline: number; // Positive for generation, negative for cost
  cooldown: number; // In ticks
  damage: {
    min: number;
    max: number;
  };
  bleed?: {
    ticks: number;
  };
}

export interface RotationAbility extends Ability {
  instanceId?: string; // A unique identifier for this specific instance in a rotation
  timestamp: number; // in ticks
  icon?: string;
}

export interface RotationPause {
  type: 'pause';
  duration: number; // in ticks
}

export interface GearSwap {
  type: 'gear_swap';
  slot: string; // e.g. 'mainhand', 'cape'
  itemName: string;
}

export interface PrayerSwap {
  type: 'prayer_swap';
  prayerName: string;
  icon: string;
}

export interface MagicSwap {
  type: 'magic_swap';
  spellName: string;
  icon: string;
}

export interface PreloadAction {
  type: 'preload';
}

export type PhaseBreakItem = { type: 'phase-break'; id: number; text: string };

export type RotationItem =
  | RotationAbility
  | RotationPause
  | GearSwap
  | PrayerSwap
  | MagicSwap
  | PhaseBreakItem
  | PreloadAction;

export type DisplayRotationItem = RotationItem & {
  isActive?: boolean;
  cooldownTimer?: number;
};

export type RotationTick = {
  id: number;
  items: RotationItem[];
};

export type DisplayRotationTick = {
  id: number;
  items: DisplayRotationItem[];
};

export interface RotationStep {
  id: string;
  items: RotationItem[];
}

export interface Rotation {
  id: number;
  name: string;
  items: RotationTick[];
  totalTime: number; // in ticks
}
