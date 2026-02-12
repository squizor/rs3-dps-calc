import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { IEnemy, IAffinity } from '../../playerinput/playerinput.model';
import { ChartOptions, InputSet } from './dps-display.types';

// Services
import {
  DpsCalculationService,
  CalculationOutput,
} from '../../../services/dps-calculation.service';
import { DatabaseService } from '../../../services/database.service';
import { PlayerDataService } from '../../../services/player-data.service';
import { DamageTick, RotationDpsService } from '../../../services/rotation-dps.service';
import { SimulationService } from '../../../services/simulation.service';
import { Boss } from '../../../types/equipment.types';
import { Ability } from '../../../types/abilities';

// Components
import { DamageovertimeComponent } from './damageovertime/damageovertime.component';
import { BossinformationComponent } from './bossinformation/bossinformation.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';

@Component({
  selector: 'app-dps-display',
  standalone: true,
  imports: [
    CommonModule,
    NgApexchartsModule,
    FormsModule,
    DamageovertimeComponent,
    BossinformationComponent,
    KpiCardComponent,
  ],
  templateUrl: './dps-display.component.html',
  styleUrls: ['./dps-display.component.scss'],
})
export class DpsDisplayComponent implements OnChanges, OnInit, OnDestroy {
  @Input() sets: InputSet[] = [];
  @Input() selectedSetIndex: number = 0;

  public dotChartOptions: ChartOptions;

  public kpi = {
    avgDpm: '0',
    critChance: 0,
    critDmg: 0,
  };

  public ttk: number = 0;

  public currentHitChance: number = 0;
  displayEnemy: IEnemy | null = null;
  private activeFamiliar: { name: string } | null = null;

  private readonly chartColors = ['#8cabe6', '#48c9b0', '#a569bd', '#5499c7'];
  private statsSubscription: Subscription;

  private rotationDpsService = inject(RotationDpsService);
  private simulationService = inject(SimulationService);

  constructor(
    private calculationService: DpsCalculationService,
    private databaseService: DatabaseService,
    private playerDataService: PlayerDataService,
  ) {
    this.dotChartOptions = this.getEmptyChartOptions();
    this.statsSubscription = new Subscription();

    effect(() => {
      const damageTicks = this.rotationDpsService.damageOverTime();

      if (damageTicks && damageTicks.length > 0) {
        const totalDamage = damageTicks.reduce((sum, tick) => sum + tick.damage, 0);
        const totalDuration = damageTicks[damageTicks.length - 1].time;

        if (totalDuration > 0) {
          const dps = totalDamage / totalDuration;
          const dpm = dps * 60;
          this.kpi.avgDpm = Math.floor(dpm).toLocaleString();
        } else {
          this.kpi.avgDpm = '0';
        }

        this.dotChartOptions = {
          ...this.dotChartOptions,
          series: [
            {
              name: 'Rotation Damage',
              data: damageTicks.map((tick: DamageTick) => ({
                x: tick.time,
                y: tick.damage,
              })),
            },
          ],
        };
      } else {
        this.kpi.avgDpm = '0';
        this.dotChartOptions = {
          ...this.dotChartOptions,
          series: [],
        };
      }
    });

    effect(() => {
      const rotation = this.rotationDpsService.rotation$();
      const abilities = rotation
        .flatMap((tick) => tick.items)
        .filter((item) => 'skill' in item) as Ability[];
      const bossHp = this.displayEnemy?.lifePoints ?? 0;

      if (abilities.length > 0 && bossHp > 0) {
        this.simulationService.runSimulation(abilities, bossHp).subscribe((result) => {
          this.ttk = result.ttk;
        });
      } else {
        this.ttk = 0;
      }
    });
  }

  ngOnInit(): void {
    this.playerDataService.calculatedStats$.subscribe((stats) => {
      this.currentHitChance = stats.hitChance;
    });

    this.playerDataService.activeFamiliar$.subscribe((familiar) => {
      this.activeFamiliar = familiar;
      this.processSets();
    });

    this.statsSubscription = this.playerDataService.stats$.subscribe((stats) => {
      if (this.sets.length > 0 && this.sets[this.selectedSetIndex]) {
        const set = this.sets[this.selectedSetIndex];
        if (!set.userInput.weapon) return;

        const weaponStyle = set.userInput.weapon.style;
        const styleToSkill: { [key: string]: string } = {
          melee: 'attack',
          ranged: 'ranged',
          magic: 'magic',
          necromancy: 'necromancy',
        };
        const skillName = styleToSkill[weaponStyle] || 'attack';
        const relevantStat = stats.find((s: any) => s.name === skillName);

        if (relevantStat && set.userInput.level !== relevantStat.level) {
          set.userInput.level = relevantStat.level;
          this.playerDataService.updateInputSets(this.sets);
        }
      }
    });

    this.playerDataService.inputSets$.pipe(take(1)).subscribe((sets: InputSet[]) => {
      if (sets && sets.length > 0) {
        this.sets = sets;
        this.processSets();
      } else {
        this.setDefaultSets();
      }
    });
  }

  setDefaultSets() {
    forkJoin({
      weapons: this.databaseService.getWeapons(),
      enemies: this.databaseService.getEnemies(),
    }).subscribe(({ weapons, enemies }: any) => {
      const defaultWeapon = weapons[0];
      const defaultEnemy = enemies[0];
      const defaultBoss: Boss = {
        name: defaultEnemy.name,
        def: defaultEnemy.armor || 0,
        defenceLevel: defaultEnemy.defenceLevel,
        affinity: { hybrid: 55, melee: 55, ranged: 55, magic: 55, necromancy: 55 },
        phases: [],
        hasEnrage: !!defaultEnemy.enrageLevel,
      };
      this.sets = [
        {
          name: 'Default Set',
          color: this.chartColors[0],
          userInput: {
            level: 99,
            potions: 17,
            prayer: 12,
            weapon: defaultWeapon,
            offhand: null,
            perk1: { name: 'Precise', rank: 6 },
            perk2: { name: 'Aftershock', rank: 4 },
            boss: defaultBoss,
            enrage: 0,
            debuffs: { vuln: true, smoke: false, gstaff: true },
          },
        },
      ];
      this.selectedSetIndex = 0;
      this.playerDataService.updateInputSets(this.sets);
      this.processSets();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sets'] || changes['selectedSetIndex']) {
      this.processSets();
    }
  }

  ngOnDestroy(): void {
    this.statsSubscription.unsubscribe();
  }

  onEnemyChange(enemy: IEnemy | null) {
    this.displayEnemy = enemy;
    this.processSets();
    this.playerDataService.updateInputSets(this.sets);
  }

  private processSets(): void {
    if (!this.sets || this.sets.length === 0) {
      return;
    }

    const displayEnemy = this.displayEnemy;
    this.sets.forEach((set) => {
      set.userInput.familiar = this.activeFamiliar ?? undefined;
      if (displayEnemy) {
        const defaultAffinity: IAffinity = {
          hybrid: 55,
          melee: 55,
          ranged: 55,
          magic: 55,
          necromancy: 55,
        };
        set.userInput.boss = {
          name: displayEnemy.name,
          def: displayEnemy.armor || 0,
          defenceLevel: displayEnemy.defenceLevel,
          affinity: displayEnemy.affinity || defaultAffinity,
          phases: [],
          hasEnrage: !!displayEnemy.enrageLevel,
        };
        set.userInput.enrage = displayEnemy.enrageLevel ?? 0;
      }
    });

    const calculationObservables = this.sets.map((set) =>
      this.calculationService.calculate(set.userInput),
    );

    forkJoin(calculationObservables).subscribe((results: any) => {
      this.updateKpiDisplay(results[this.selectedSetIndex]);
      this.configureDotChart();
    });
  }

  private updateKpiDisplay(result: CalculationOutput): void {
    this.kpi.avgDpm = result.dpm.toLocaleString();
    this.kpi.critChance = result.critChance ? parseFloat((result.critChance * 100).toFixed(2)) : 0;
    this.kpi.critDmg = result.critDmg ? parseFloat(((result.critDmg - 1) * 100).toFixed(2)) : 0;
  }

  private configureDotChart(): void {
    this.dotChartOptions = {
      ...this.getEmptyChartOptions(),
      chart: {
        height: 350,
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
      },
      theme: { mode: 'dark' },
      colors: this.chartColors,
      dataLabels: { enabled: false },
      stroke: {
        curve: 'stepline',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          opacityFrom: 0.7,
          opacityTo: 0.2,
        },
      },
      xaxis: {
        type: 'numeric',
        labels: {
          formatter: (val: string) => `${parseFloat(val).toFixed(1)}s`,
          style: { colors: 'rgba(255, 255, 255, 0.7)' },
        },
        axisBorder: { show: false },
      },
      yaxis: {
        min: 0,
        labels: {
          formatter: (val: number) => (val / 1000).toFixed(0) + 'k',
          style: { colors: 'rgba(255, 255, 255, 0.7)' },
        },
      },
      tooltip: {
        theme: 'dark',
        x: { formatter: (val: number) => `Tick at ${val.toFixed(1)}s` },
        y: { formatter: (val: number) => `${val.toLocaleString()} damage` },
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'left',
      },
      title: { text: '' },
      markers: {},
      annotations: {},
      plotOptions: {},
      labels: [],
    };
  }

  private getEmptyChartOptions(): ChartOptions {
    return {
      series: [],
      chart: { type: 'area' },
      xaxis: {},
      yaxis: {},
      title: { text: '' },
      fill: {},
      stroke: {},
      dataLabels: {},
      markers: {},
      tooltip: {},
      annotations: {},
      plotOptions: {},
      legend: {},
      labels: [],
      colors: [],
      theme: { mode: 'dark' },
    };
  }
}
