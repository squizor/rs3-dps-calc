import { Component, Input, OnChanges, SimpleChanges, ViewChild, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ChartComponent } from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTitleSubtitle,
  ApexStroke,
  ApexGrid,
  ApexYAxis,
  ApexTooltip,
  ApexTheme
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  yaxis: ApexYAxis;
  tooltip: ApexTooltip;
  theme: ApexTheme;
  colors: string[];
};

@Component({
  selector: 'app-damageovertime',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  templateUrl: './damageovertime.component.html',
  styleUrl: './damageovertime.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DamageovertimeComponent implements OnChanges {
  @Input() chartOptions: Partial<ChartOptions> | any;
  @ViewChild('chart') chart: ChartComponent | any;
  
  public isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
      this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
      // React to input changes
  }
}
