import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ChartOptions } from '../dps-display.types';

@Component({
  selector: 'app-damageovertime',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './damageovertime.component.html',
  styleUrls: ['./damageovertime.component.scss'],
})
export class DamageovertimeComponent {
  @Input() chartOptions: ChartOptions | undefined;
}
