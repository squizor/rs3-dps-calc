import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IPotion } from '../playerinput.model';

@Component({
  selector: 'app-potions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './potions.component.html',
  styleUrls: ['./potions.component.scss'],
})
export class PotionsComponent {
  @Input() potions: IPotion[] = [];
  @Input() herbloreLevel: number = 0;
  @Input() activePotion: string = 'none';
  @Input() getIcon: (name: string) => string = () => '';
  @Output() potionChange = new EventEmitter<string>();

  selectPotion(potionName: string): void {
    this.potionChange.emit(potionName);
  }
}
