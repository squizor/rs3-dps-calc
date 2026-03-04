import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IPlayerToggles } from '../playerinput.model';

@Component({
  selector: 'app-toggles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toggles.component.html',
  styleUrls: ['./toggles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TogglesComponent {
  toggles = input.required<IPlayerToggles>();
  togglesChange = output<IPlayerToggles>();

  updateToggle(key: keyof IPlayerToggles, value: boolean | number) {
    this.togglesChange.emit({
      ...this.toggles(),
      [key]: value
    });
  }
}
