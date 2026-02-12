import {
  ApexChart,
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexFill,
  ApexYAxis,
  ApexXAxis,
  ApexTooltip,
  ApexMarkers,
  ApexAnnotations,
  ApexStroke,
  ApexPlotOptions,
  ApexLegend,
  ApexNonAxisChartSeries,
} from 'ng-apexcharts';
import { CalculationInput } from '../../../services/dps-calculation.service';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  title: ApexTitleSubtitle;
  fill: ApexFill;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  tooltip: ApexTooltip;
  annotations: ApexAnnotations;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  labels: string[];
  colors: string[];
  theme: { mode: 'dark' | 'light' };
};

export interface InputSet {
  name: string;
  color: string;
  userInput: CalculationInput;
}
