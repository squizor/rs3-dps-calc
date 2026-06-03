import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash, faCheck, faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-preset-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './preset-manager.component.html',
  styleUrls: ['./preset-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresetManagerComponent {
  title = input<string>('Preset');
  savedNames = input<string[]>([]);
  pendingDeletion = input<string | null>(null);
  buttonClass = input<string>('action-btn');
  alignment = input<'left' | 'right'>('right');

  save = output<string>();
  load = output<string>();
  deleteRequest = output<string>();
  deleteConfirm = output<string>();
  deleteCancel = output<void>();

  showDropdown = signal<boolean>(false);
  newName = signal<string>('');

  faTrash = faTrash;
  faCheck = faCheck;
  faTimes = faTimes;
  faChevronDown = faChevronDown;

  toggleDropdown() {
    this.showDropdown.update(v => !v);
  }

  onSave() {
    const name = this.newName().trim();
    if (name) {
      this.save.emit(name);
      this.newName.set('');
    }
  }

  onLoad(name: string) {
    this.load.emit(name);
  }

  requestDelete(name: string, event: Event) {
    event.stopPropagation();
    this.deleteRequest.emit(name);
  }

  confirmDelete(name: string, event: Event) {
    event.stopPropagation();
    this.deleteConfirm.emit(name);
  }

  cancelDelete(event: Event) {
    event.stopPropagation();
    this.deleteCancel.emit();
  }
}
