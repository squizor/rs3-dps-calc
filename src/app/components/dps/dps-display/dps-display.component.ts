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
  signal,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { forkJoin, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { IEnemy, IAffinity } from '../../playerinput/playerinput.model';
import { ChartOptions, InputSet } from './dps-display.types';

import {
  DpsCalculationService,
  CalculationOutput,
} from '../../../services/dps-calculation.service';
import { DatabaseService } from '../../../services/database.service';
import { PlayerDataService } from '../../../services/player-data.service';
import { DamageTick, RotationDpsService } from '../../../services/rotation-dps.service';
import { SimulationService } from '../../../services/simulation.service';
import { Boss, Weapon } from '../../../types/equipment.types';
import { Ability } from '../../../types/abilities';

import { DamageovertimeComponent } from './damageovertime/damageovertime.component';
import { BossinformationComponent } from './bossinformation/bossinformation.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';

@Component({
  selector: 'app-dps-display',
  standalone: true,
  imports: [
    CommonModule,
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

  public isBrowser: boolean;
  public dotChartOptions: ChartOptions;

  public kpi = {
    avgDpm: '0',
    critChance: 0,
    critDmg: 0,
    hitChance: 0,
  };

  public ttk: number = 0;

  public currentHitChance: number = 0;
  displayEnemy: any | null = null;
  private activeFamiliar: { name: string } | null = null; 

  private readonly chartColors = ['#8cabe6', '#48c9b0', '#a569bd', '#5499c7'];
  private statsSubscription: Subscription;

  public rotationDpsService = inject(RotationDpsService);
  private simulationService = inject(SimulationService);
  
  public selectedTick = signal<DamageTick | null>(null);
  public isKpiExpanded = signal<boolean>(false);

  constructor(
    private calculationService: DpsCalculationService,
    private databaseService: DatabaseService,
    private playerDataService: PlayerDataService,
    private cdRef: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    this.dotChartOptions = this.getEmptyChartOptions();
    
      this.dotChartOptions.chart.events = {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
             const points = config.w.config.series?.[0]?.data;
             const selectedPoint = points?.[config.dataPointIndex];
             if (selectedPoint?.meta?.tickIndex !== undefined) {
                 this.selectTickByIndex(selectedPoint.meta.tickIndex);
             }
        },
        markerClick: (event: any, chartContext: any, config: any) => {
             const points = config.w.config.series?.[0]?.data;
             const selectedPoint = points?.[config.dataPointIndex];
             if (selectedPoint?.meta?.tickIndex !== undefined) {
                 this.selectTickByIndex(selectedPoint.meta.tickIndex);
             }
        }
    };

    this.statsSubscription = new Subscription();

    const bossSignal = toSignal(this.playerDataService.boss$, { initialValue: null });

    effect(() => {
      const damageTicks = this.rotationDpsService.damageOverTime();
      const dpm = this.rotationDpsService.projectedDpm$();
      const rotationDuration = this.rotationDpsService.projectedDuration$();
      const currentBoss = bossSignal();
      const bossHP = currentBoss?.lifePoints ?? 200000;

      let totalDamage = 0;
      if (damageTicks && damageTicks.length > 0) {
        totalDamage = damageTicks.reduce((sum, tick) => sum + tick.damage, 0);
      }

      if (dpm > 0 && totalDamage > 0 && rotationDuration > 0) {
        const timeToKill = (bossHP / totalDamage) * rotationDuration;
        this.ttk = parseFloat(timeToKill.toFixed(1));
      } else {
        this.ttk = 0;
      }

      this.kpi.avgDpm = Math.floor(dpm).toLocaleString();

      if (damageTicks && damageTicks.length > 0) {
        // Transform data for the line graph
        
        let runningTotalDamage = 0;
        // Start at 0,0
        const chartData: any[] = [{ x: 0, y: 0 }];
        
        damageTicks.forEach((tick, index) => {
            const t = tick.time;
            const d = tick.damage;
            runningTotalDamage += d;
            
            // Calculate Cumulative DPM
            // For T=0 (or very close), avoid infinity.
            const currentDpm = t > 0.1 ? (runningTotalDamage / t) * 60 : 0;
            
            // We omit points at T=0 to avoid skewed graph scaling
            if (t > 0.1) {
                chartData.push({
                    x: t,
                    y: Math.floor(currentDpm),
                    meta: {
                        damage: d,
                        tickIndex: index,
                        name: tick.name
                    }
                });
            }
        });

        this.dotChartOptions = {
          ...this.dotChartOptions,
          series: [
            {
              name: 'DPM',
              data: chartData,
            },
          ],
          colors: ['#8cabe6'],
          stroke: {
            curve: 'smooth', // Smooth line for "Line Graph" feel
            width: 3,
            colors: ['#8cabe6'], 
          },
          yaxis: {
            show: true,
            tickAmount: 5,
            labels: {
              style: { colors: '#8cabe6', fontSize: '12px' },
              formatter: (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`),
            },
          },
          tooltip: {
             ...this.dotChartOptions.tooltip,
             y: {
                 formatter: (val: number, opts?: any) => {
                     if (opts && opts.dataPointIndex !== undefined && opts.w?.config?.series?.[0]?.data) {
                         const point = opts.w.config.series[0].data[opts.dataPointIndex];
                         const meta = point.meta;
                         
                         if (meta) {
                             return `${val.toLocaleString()} (Hit: ${meta.damage.toLocaleString()})`;
                         }
                     }
                     return `${val.toLocaleString()}`;
                 },
                 title: { formatter: () => 'DPM: ' }
             }
          }
        };
      } else {
         this.dotChartOptions = {
            ...this.dotChartOptions,
            series: []
         };
      }
    });
  }

  private selectTickByIndex(index: number) {
      const ticks = this.rotationDpsService.damageOverTime();
      if (ticks && ticks[index]) {
          this.selectedTick.set(ticks[index]);
          this.cdRef.detectChanges();
      }
  }

  ngOnInit(): void {
    this.playerDataService.boss$.subscribe((boss) => {
        this.displayEnemy = boss;
        if (this.displayEnemy && this.sets.length > 0) {
           this.sets.forEach(set => set.userInput.boss = this.displayEnemy);
           this.processSets(); 
        }
    });

    this.playerDataService.calculatedStats$.subscribe((stats) => {
      this.currentHitChance = stats.hitChance;
    });

    this.playerDataService.activeFamiliar$.subscribe((familiar) => {
      this.activeFamiliar = familiar;
      this.processSets();
    });

    this.playerDataService.equipmentSlots$.subscribe((slots) => {
        if (this.sets.length > 0 && this.sets[this.selectedSetIndex]) {
             const set = this.sets[this.selectedSetIndex];
             const mainhand = slots.find(s => s.name === 'mainhand')?.selectedArmor;
             const offhand = slots.find(s => s.name === 'offhand')?.selectedArmor;
             const twohand = slots.find(s => s.name === 'twohand')?.selectedArmor;
             
             if (twohand && !mainhand) {
                 set.userInput.weapon = twohand as unknown as Weapon;
                 set.userInput.offhand = null;

             } else if (twohand && mainhand) {
                 const currentStyle = this.playerDataService.getWeaponStyle();
                 if (currentStyle === '2h') {
                      set.userInput.weapon = twohand as unknown as Weapon;
                      set.userInput.offhand = null;
                 } else {
                      set.userInput.weapon = mainhand as unknown as Weapon;
                      set.userInput.offhand = offhand ? (offhand as unknown as Weapon) : null;
                 }
             } else {
                 set.userInput.weapon = null;
                 set.userInput.offhand = null;
             }
             this.processSets();
        }
    });


    this.playerDataService.activePrayers$.subscribe((prayers) => {
        if (this.sets.length > 0 && this.sets[this.selectedSetIndex]) {
             const set = this.sets[this.selectedSetIndex];

             if (this.displayEnemy) set.userInput.boss = this.displayEnemy;
             
             this.processSets();
        }
    });


    this.playerDataService.activePotion$.subscribe((potion) => {
        if (this.sets.length > 0 && this.sets[this.selectedSetIndex]) {
            const set = this.sets[this.selectedSetIndex];
            
            if (this.displayEnemy) set.userInput.boss = this.displayEnemy;

            const level = set.userInput.level || 99;
            let potionBoost = 0;
            const potionName = potion.toLowerCase();

            if (potionName.includes('overload')) {
                if (potionName.includes('elder')) potionBoost = Math.floor(level * 0.17) + 5;
                else if (potionName.includes('supreme')) potionBoost = Math.floor(level * 0.16) + 4;
                else potionBoost = Math.floor(level * 0.15) + 3;
            } else if (potionName.includes('extreme')) {
                 potionBoost = Math.floor(level * 0.15) + 3;
            } else if (potionName.includes('super')) {
                 potionBoost = Math.floor(level * 0.12) + 2;
            } else if (potionName !== 'none') {
                 potionBoost = Math.floor(level * 0.08) + 1;
            }

            set.userInput.potions = potionBoost;
            

            if (!set.userInput.weapon) {
                 const currentSlots = this.playerDataService.getActiveEquipment();
                 const twohand = currentSlots.find(s => s.name === 'twohand')?.selectedArmor;
                 const mainhand = currentSlots.find(s => s.name === 'mainhand')?.selectedArmor;

                 if (twohand) {
                     set.userInput.weapon = twohand as any;
                     set.userInput.offhand = null;
                 } else if (mainhand) {
                     set.userInput.weapon = mainhand as any;
                     set.userInput.offhand = currentSlots.find(s => s.name === 'offhand')?.selectedArmor as any;
                 }
            }

            this.processSets();
        }
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
    if (!this.isBrowser) return;
    
    forkJoin({
      weapons: this.databaseService.getWeapons(),
      enemies: this.databaseService.getEnemies(),
    }).subscribe(({ weapons, enemies }: any) => {
      const defaultWeapon = weapons[0];
      const defaultEnemy = enemies[0];
      const defaultBoss: Boss = {
        name: defaultEnemy.name,
        def: defaultEnemy.armor || 0,
        armor: defaultEnemy.armor || 0,
        defenceLevel: defaultEnemy.defenceLevel,
        affinity: defaultEnemy.affinity || { hybrid: 55, melee: 55, ranged: 55, magic: 55, necromancy: 55 },
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

  onDebuffChange(debuffs: { vuln: boolean; smoke: boolean; gstaff: boolean }) {
    const set = this.sets[this.selectedSetIndex];
    if (set) {
      set.userInput.debuffs = debuffs;
      this.processSets();
    }
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
          armor: displayEnemy.armor || 0,
          defenceLevel: displayEnemy.defenceLevel,
          affinity: displayEnemy.affinity || defaultAffinity,
          phases: [],
          hasEnrage: !!displayEnemy.enrageLevel,
        };
        set.userInput.enrage = displayEnemy.enrageLevel ?? 0;
      }
      
      // Sync prayers
      const activePrayers = this.playerDataService.getActivePrayers();
      if (activePrayers) {
          const prayerBoostPct = activePrayers
              .filter(p => p.isActive)
              .reduce((acc, curr) => {
                  const boostVal = curr.damageBoost || (curr as any).boost || 0;
                  return acc + boostVal;
              }, 0);
          
          set.userInput.prayer = Math.round(prayerBoostPct * 100);
      } else {
          console.warn('[DpsDisplay] No active prayers found in service!');
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
    const prevHitChance = this.currentHitChance;
    this.kpi.avgDpm = result.dpm.toLocaleString();
    this.kpi.critChance = result.critChance ? parseFloat((result.critChance * 100).toFixed(2)) : 0;
    this.kpi.critDmg = result.critDmg ? parseFloat(((result.critDmg - 1) * 100).toFixed(2)) : 0;
    this.currentHitChance = parseFloat(result.hitChance.toFixed(1));
    this.kpi.hitChance = this.currentHitChance;
    
    this.cdRef.markForCheck();
  }

  private configureDotChart(): void {
    const isDark = true;
    
    this.dotChartOptions = {
      ...this.getEmptyChartOptions(),
      chart: {
        height: '100%',
        type: 'area',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        zoom: { enabled: false },
        background: 'transparent',
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: { enabled: true, delay: 150 },
          dynamicAnimation: { enabled: true, speed: 350 }
        }
      },
      theme: { mode: isDark ? 'dark' : 'light' },
      colors: ['#8cabe6'],
      dataLabels: { enabled: false },
      
      stroke: {
        curve: 'stepline',
        width: 3,
        colors: ['#8cabe6'],
      },
      
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.5,
          gradientToColors: ['#172136'],
          inverseColors: true,
          opacityFrom: 0.6,
          opacityTo: 0.1,
          stops: [0, 100]
        },
      },
      
      grid: {
        show: true,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
        padding: { top: 0, right: 20, bottom: 0, left: 10 }
      },

      xaxis: {
        type: 'numeric',
        tooltip: { enabled: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: '#8cabe6', fontSize: '12px' },
          formatter: (val: string) => `${parseFloat(val).toFixed(0)}s`,
        },
      },
      
      yaxis: {
        show: true,
        tickAmount: 5,
        labels: {
          style: { colors: '#8cabe6', fontSize: '12px' },
          formatter: (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`),
        },
      },
      
      tooltip: {
        theme: 'dark',
        style: { fontSize: '13px', fontFamily: 'Rubik, sans-serif' },
        x: { formatter: (val: number) => `Time: ${val.toFixed(1)}s` },
        y: { 
          formatter: (val: number) => `${val.toLocaleString()} dmg`,
          title: { formatter: () => '' } 
        },
        marker: { show: true },
      },
      
      markers: {
        size: 0,
        colors: ['#ffb700'],
        strokeColors: '#fff',
        strokeWidth: 2,
        hover: { size: 5, sizeOffset: 3 }
      },
      
      legend: { show: false },
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
      grid: {},
      theme: { mode: 'dark' },
    };
  }
}
