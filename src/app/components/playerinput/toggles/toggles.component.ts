import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IPlayerToggles, ITogglePreset, DEFAULT_TOGGLES } from '../playerinput.model';
import { PlayerDataService } from '../../../services/player-data.service';
import { signal, inject, computed } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PresetManagerComponent } from '../../shared/preset-manager/preset-manager.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';

@Component({
  selector: 'app-toggles',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, PresetManagerComponent],
  templateUrl: './toggles.component.html',
  styleUrls: ['./toggles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TogglesComponent {
  private playerDataService = inject(PlayerDataService);
  
  toggles = input.required<IPlayerToggles>();
  togglesChange = output<IPlayerToggles>();

  public togglePresets = toSignal(this.playerDataService.togglePresets$, { initialValue: [] });
  public presetNames = computed(() => this.togglePresets().map(p => p.name));
  public presetPendingDeletion = signal<string | null>(null);

  updateToggle(key: keyof IPlayerToggles, value: boolean | number) {
    this.togglesChange.emit({
      ...this.toggles(),
      [key]: value
    });
  }

  savePreset(name: string) {
    this.playerDataService.togglePresets$.pipe(take(1)).subscribe(presets => {
      const newPreset: ITogglePreset = {
        name,
        toggles: { ...this.toggles() }
      };

      const existingIndex = presets.findIndex(p => p.name === name);
      const updatedPresets = [...presets];

      if (existingIndex >= 0) {
        updatedPresets[existingIndex] = newPreset;
      } else {
        updatedPresets.push(newPreset);
      }

      this.playerDataService.updateTogglePresets(updatedPresets);
    });
  }

  loadPreset(name: string) {
    const preset = this.togglePresets().find(p => p.name === name);
    if (preset) {
      this.togglesChange.emit({ ...preset.toggles });
    }
  }

  requestDeletePreset(name: string) {
    this.presetPendingDeletion.set(name);
  }

  confirmDeletePreset(name: string) {
    this.playerDataService.togglePresets$.pipe(take(1)).subscribe(presets => {
      const updatedPresets = presets.filter(p => p.name !== name);
      this.playerDataService.updateTogglePresets(updatedPresets);
      this.presetPendingDeletion.set(null);
    });
  }

  cancelDeletePreset() {
    this.presetPendingDeletion.set(null);
  }

  unlockAll() {
    const updated = { ...this.toggles() };
    const excludedKeys: Set<keyof IPlayerToggles> = new Set([
      'dragonSlayer',
      'demonSlayer',
      'undeadSlayer',
      'nopenopenope',
      'corbiculaRex',
      'isWalking',
      'flankingRank',
      'lungingRank'
    ]);

    for (const key of Object.keys(updated) as Array<keyof IPlayerToggles>) {
      if (excludedKeys.has(key)) {
        continue;
      }
      if (typeof updated[key] === 'boolean') {
        (updated as any)[key] = true;
      }
    }
    this.togglesChange.emit(updated);
  }

  resetAll() {
    this.togglesChange.emit({ ...DEFAULT_TOGGLES });
  }
}
