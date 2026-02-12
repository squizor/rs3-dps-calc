export interface Ability {
  name: string;
  [key: string]: any;
}

export interface Equipment {
  name: string;
  defence_requirement?: number;
  ranged_requirement?: number;
  class_type: string;
  damage_bonus?: {
    melee: number;
    ranged: number;
    magic: number;
    necromancy: number;
  };
  accuracy_changes?: {
    melee: number;
    ranged: number;
    magic: number;
    necromancy: number;
  };
  auto_damage?: number;
  ability_damage?: number;
  style?: 'melee' | 'ranged' | 'magic' | 'necromancy';
  icon: string;
  augmentable?: boolean;
}

export interface Weapon {
  name: string;
  icon: string;
  level_requirement: number;
  class_type: string;
  slot: 'mainhand' | 'offhand' | 'twohand';
  auto_damage: number;
  ability_damage: number;
  accuracy: number;
  style: 'melee' | 'ranged' | 'magic' | 'necromancy';
  attack_speed: number;
  augmentable?: boolean;
}

export interface Boss {
  name: string;
  def: number;
  defenceLevel?: number;
  affinity: {
    hybrid: number | null;
    melee: number | null;
    ranged: number | null;
    magic: number | null;
    necromancy: number | null;
  };
  phases: string[];
  hasEnrage: boolean;
}

export interface Perk {
  name: string;
  ranks: number;
  dpsMod?: number;
  critChanceMod?: number;
}