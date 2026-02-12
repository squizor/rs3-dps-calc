import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
})
export class KpiCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '0';
  @Input() unit: string = '';

  get formattedValue(): string {
    if (typeof this.value === 'number') {
      return this.value.toFixed(1);
    }
    return this.value;
  }
}
