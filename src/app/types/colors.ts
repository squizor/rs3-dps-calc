import { Skill } from './abilities';

export const COMBAT_STYLE_COLORS: { [key in Skill]?: string } = {
  attack: '#e74c3c',
  strength: '#e74c3c',
  defence: '#e74c3c',
  ranged: '#2ecc71',
  magic: '#3498db',
  necromancy: '#9b59b6',
};

export const DEFAULT_ARROW_COLOR = 'var(--accent-color)';
