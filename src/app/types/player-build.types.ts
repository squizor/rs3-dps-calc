import { DisplayRotationTick } from './abilities';
import { IEquipmentSlot, IPrayer } from '../components/playerinput/playerinput.model';
import { IActivePrayer } from '../services/player-data.service';
import { InputSet } from '../components/dps/dps-display/dps-display.types';
import { Boss } from './equipment.types';

export interface PlayerBuild {
  id: string;
  name: string;
  lastModified: number;
  rotation: DisplayRotationTick[];
  playerState: {
    equipment: IEquipmentSlot[];
    activePrayers: IActivePrayer[];
    activePotion: string;
    activeFamiliar: { name: string } | null;
    weaponStyle: 'dual-wield' | '2h';
    inputSets: InputSet[];
    stats: any[];
    boss: Boss | null;
  };
}
