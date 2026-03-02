import { Injectable, signal, inject, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DisplayRotationTick, RotationAbility, RotationItem, GearSwap, PrayerSwap, MagicSwap, RotationPause } from '../types/abilities';
import { IActivePrayer, PlayerDataService } from './player-data.service';
import { CalculationInput, DpsCalculationService } from './dps-calculation.service';
import { Boss, Weapon } from '../types/equipment.types';
import { take } from 'rxjs';
import { IEquipmentSlot } from '../components/playerinput/playerinput.model';
import { BuffManagerService } from './buff-manager.service';
import { DamageCalculatorService, AttackerState, DamageResult } from './damage-calculator.service';

export interface DamageTick {
  time: number;
  damage: number;
  name: string;
  // New State Data
  adrenaline: number;
  activeBuffs: string[];
  cooldowns: { name: string; secondsRemaining: number }[];
}

interface RunningState extends AttackerState {
  currentAdrenaline: number;
  cooldowns: Map<string, number>; // name -> expiry tick
  nextAttackTick: number;
  nextGcdTick: number;
  activeSpell?: string;
}

export interface RotationSnapshot {
    tick: number;
    adrenaline: number;
    cooldowns: Map<string, number>; // name -> expiry tick
}

@Injectable({
  providedIn: 'root',
})
export class RotationDpsService {
  private playerDataService = inject(PlayerDataService);
  private dpsCalculationService = inject(DpsCalculationService);
  private buffManager = inject(BuffManagerService);
  private damageCalculator = inject(DamageCalculatorService);

  private rotation = signal<DisplayRotationTick[]>([]);
  public rotation$ = this.rotation.asReadonly();
  public damageOverTime = signal<DamageTick[]>([]);
  public damageOverTime$ = this.damageOverTime.asReadonly();
  
  public simulationErrors = signal<Map<string, string>>(new Map()); // instanceId -> error message
  // Removed old stepStates in favor of snapshots
  
  public cursorTick = signal<number>(0);
  
  public simulationSnapshots = signal<Map<number, RotationSnapshot>>(new Map()); // tick -> snapshot
  public simulationStepTicks = signal<Map<number, number>>(new Map()); // stepIndex -> startTick

  public currentSnapshot$ = computed(() => {
      const targetTick = this.cursorTick();
      const snapshots = this.simulationSnapshots();
      
      // Direct match
      if (snapshots.has(targetTick)) {
          return snapshots.get(targetTick)!;
      }
      
      // Find the closest snapshot occurring BEFORE or AT targetTick
      // Since map is not guaranteed ordered by keys if not inserted in order 
      // (though here they likely are), we should filter/search.
      // Optimization: keys are ints.
      
      // Simple linear backward search (efficient enough for small rotations ~100-200 ticks?)
      // Or just iterate keys.
      let bestTick = -1;
      for (const tick of snapshots.keys()) {
          if (tick <= targetTick && tick > bestTick) {
              bestTick = tick;
          }
      }
      
      if (bestTick !== -1) {
          return snapshots.get(bestTick)!;
      }
      
      return snapshots.get(0); // Fallback to start
  });

  public cooldownsAtCursor$ = computed(() => {
      return this.currentSnapshot$()?.cooldowns || new Map<string, number>();
  });

  public currentAdrenaline$ = computed(() => {
      return this.currentSnapshot$()?.adrenaline || 100;
  });
  
  private _projectedDpm = signal<number>(0);
  public projectedDpm$ = this._projectedDpm.asReadonly();
  
  private _projectedDuration = signal<number>(0);
  public projectedDuration$ = this._projectedDuration.asReadonly();

  private baseHitChance = 0; // Base stats from inputs
  private initialEquipment: IEquipmentSlot[] = [];
  private initialActivePrayers: IActivePrayer[] = [];
  private initialStats: any[] = [];
  private currentBoss: Boss | null = null;

  private initialActivePotion: string = 'none';
  private initialActiveFamiliar: { name: string } | null = null;
  private initialWeaponStyle: 'dual-wield' | '2h' = 'dual-wield';
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
        this.playerDataService.weaponStyle$.subscribe((style) => {
            this.initialWeaponStyle = style;
            if (this.rotation().length > 0) this.simulateRotation();
        });

        this.playerDataService.calculatedStats$.subscribe((stats) => {
          this.baseHitChance = stats.hitChance / 100;
          if (this.rotation().length > 0) this.simulateRotation();
        });

        this.playerDataService.equipmentSlots$.subscribe((equipment) => {
          this.initialEquipment = JSON.parse(JSON.stringify(equipment));
          if (this.rotation().length > 0) this.simulateRotation();
        });

        this.playerDataService.activePrayers$.subscribe((prayers) => {
          this.initialActivePrayers = JSON.parse(JSON.stringify(prayers));
          if (this.rotation().length > 0) this.simulateRotation();
        });

        this.playerDataService.stats$.subscribe((stats) => {
          this.initialStats = stats;
          if (this.rotation().length > 0) this.simulateRotation();
        });

        this.playerDataService.activePotion$.subscribe((potion) => {
            this.initialActivePotion = potion;
            if (this.rotation().length > 0) this.simulateRotation();
        });

        this.playerDataService.activeFamiliar$.subscribe((familiar) => {
            this.initialActiveFamiliar = familiar;
            if (this.rotation().length > 0) this.simulateRotation();
        });
        
        this.playerDataService.boss$.subscribe((boss) => {
            this.currentBoss = boss;
            if (this.rotation().length > 0) this.simulateRotation();
        });
    }
  }

  private updateTimeout: any;

  public updateRotation(rotation: DisplayRotationTick[]) {
    this.rotation.set(rotation);
    if (!this.isBrowser) return;
    
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
        this.simulateRotation();
    }, 50);
  }

  private simulateRotation() {
    const rotationTicks = this.rotation();
    
    // Reset Services
    this.buffManager.reset();

    // 1. Initialize State
    const initialState: RunningState = {
      equipment: JSON.parse(JSON.stringify(this.initialEquipment)),
      activePrayers: JSON.parse(JSON.stringify(this.initialActivePrayers)),
      activePotion: this.initialActivePotion,
      levels: this.initialStats,
      weaponStyle: this.initialWeaponStyle,
      activeSpell: undefined,
      currentAdrenaline: 100, // Default start at 100%
      cooldowns: new Map(),
      nextAttackTick: 0, // Tick when next ability CAN fire (GCD)
      nextGcdTick: 0
    };
    
    if (rotationTicks.length === 0) {
        this.damageOverTime.set([]);
        this._projectedDpm.set(0);
        this._projectedDuration.set(0);
        return;
    }

    const MAX_DURATION_TICKS = 1500; 
    let lastActionTick = 0;

    // --- Queue-Based Simulation ---
    let currentStepIndex = 0;
    
    // Define State Variables
    const damageEvents: DamageTick[] = [];
    let totalDamage = 0;
    const activeSimulationErrors = new Map<string, string>(); // Renamed for safety
    // const stepStatesMap = new Map<string, { cooldownRemaining: number, totalCooldown: number }>(); // Replaced
    const snapshots = new Map<number, RotationSnapshot>();
    
    // Initial Snapshot at tick 0
    snapshots.set(0, {
        tick: 0,
        adrenaline: 100,
        cooldowns: new Map()
    });
    
    // Track step execution times
    const stepTicks = new Map<number, number>();

    
    let activeChannel: { 
        ability: RotationAbility; 
        startTick: number; 
        nextHitTick: number; 
        hitsRemaining: number; 
        interval: number 
    } | null = null;

    // --- Tick Loop ---
    for (let tick = 0; tick < MAX_DURATION_TICKS; tick++) {
        // Break if finished (queue processed + no active channel + buffer time passed)
        if (currentStepIndex >= rotationTicks.length && !activeChannel && tick > lastActionTick + 10) {
            break;
        }

        // Buffs
        this.buffManager.tick(tick);
        
        // Queue
        let actionsProcessedInThisTick = 0;
        let loopSafety = 0; 
        
        while (currentStepIndex < rotationTicks.length) {
             loopSafety++;
             if (loopSafety > 100) {
                 console.warn('[RotationDpsService] Infinite loop detected in step queue!');
                 break;
             }

             const step = rotationTicks[currentStepIndex];
             const items = step.items;
             
             // Check if this step contains a GCD-triggering ability
             const ability = items.find(i => this.isAbility(i)); // Fixed binding
             
             const isPotion = ability && ability.skill === 'constitution';
             let triggersGcd = ability && !isPotion; 

             if (triggersGcd && tick < initialState.nextGcdTick) {
                 // Blocked by GCD. Stop processing queue for this tick.
                 break;
             }
             
             // Capture Snapshot for this step's start time
             snapshots.set(tick, {
                 tick: tick,
                 adrenaline: initialState.currentAdrenaline,
                 cooldowns: new Map(initialState.cooldowns)
             });
             
             stepTicks.set(currentStepIndex, tick);

             // Execution
             for (const item of items) {
                if (this.isGearSwap(item)) this.handleGearSwap(initialState, item);
                else if (this.isPrayerSwap(item)) this.handlePrayerSwap(initialState, item);
                else if (this.isMagicSwap(item)) this.handleMagicSwap(initialState, item);
                else if (this.isPause(item)) {
                    // Extend GCD/Action Lock to simulate pause
                    initialState.nextGcdTick = Math.max(initialState.nextGcdTick, tick + item.duration);
                    triggersGcd = true; // Treat pause as a blocking action
                    lastActionTick = tick;
                }
                else if (this.isAbility(item)) {
                    // (Old StepStates logic removed)

                    lastActionTick = tick; // Track activity
                    
                    // Cooldown Check
                    // Check if ability is on cooldown
                    const cooldownExpiry = initialState.cooldowns.get(item.name);
                    // Debug Log
                    // console.log(`[Check] ${item.name} (Tick ${tick}): Expiry ${cooldownExpiry}`);
                    
                    if (cooldownExpiry && tick < cooldownExpiry) {
                        const remaining = ((cooldownExpiry - tick) * 0.6).toFixed(1);
                        const msg = `Ability on cooldown (${remaining}s remaining)`;
                        console.warn(`[RotationDpsService] Skipped ${item.name} [${item.instanceId}]: ${msg}`);
                        if (item.instanceId) {
                            activeSimulationErrors.set(item.instanceId, msg);
                        } else {
                            console.warn('[RotationDpsService] Item missing instanceId:', item);
                        }
                        triggersGcd = false; // CRITICAL: Invalid ability does not consume time!
                        continue; // Skip execution
                    }

                    // Adrenaline check
                    if (item.type === 'threshold' && initialState.currentAdrenaline < 50) {
                        const msg = `Not enough adrenaline (${initialState.currentAdrenaline}% < 50%)`;
                        console.warn(`[RotationDpsService] Skipped ${item.name}: ${msg}`);
                        if (item.instanceId) activeSimulationErrors.set(item.instanceId, msg);
                        triggersGcd = false;
                        continue; // Skip execution
                    }
                    if (item.type === 'ultimate' && initialState.currentAdrenaline < 100) {
                        const msg = `Not enough adrenaline (${initialState.currentAdrenaline}% < 100%)`;
                        console.warn(`[RotationDpsService] Skipped ${item.name}: ${msg}`);
                        if (item.instanceId) activeSimulationErrors.set(item.instanceId, msg);
                        triggersGcd = false;
                        continue; // Skip execution
                    }
                    if (item.type === 'special') { 
                         const required = item.adrenaline < 0 ? Math.abs(item.adrenaline) : 0; // Cost is negative
                         if (required > 0 && initialState.currentAdrenaline < required) {
                             const msg = `Not enough adrenaline (${initialState.currentAdrenaline}% < ${required}%)`;
                             console.warn(`[RotationDpsService] Skipped ${item.name}: ${msg}`);
                             if (item.instanceId) activeSimulationErrors.set(item.instanceId, msg);
                             triggersGcd = false;
                             continue;
                         }
                    }

                    
                    // a. Cancel existing channel
                    if (activeChannel && triggersGcd) activeChannel = null;
            
                    // b. Pay Cost / Gain Adren
                    const prevAdren = initialState.currentAdrenaline;
                    initialState.currentAdrenaline += item.adrenaline;
                    initialState.currentAdrenaline = Math.min(100, Math.max(0, initialState.currentAdrenaline));
                    
                    console.log(`[Adren Debug] ${item.name}: ${prevAdren} -> ${initialState.currentAdrenaline} (Cost: ${item.adrenaline})`);
                    
                    // c. Start Cooldown
                    initialState.cooldowns.set(item.name, tick + item.cooldown);

                    // d. Calculate Initial Hit (Non-Channeled) or Start Channel
                    if (item.channel && item.channel.interval > 0) {
                        // Start Channel
                        activeChannel = {
                            ability: item,
                            startTick: tick,
                            nextHitTick: tick, 
                            hitsRemaining: Math.floor(item.channel.ticks / item.channel.interval),
                            interval: item.channel.interval
                        };
                    } else if (item.damage.max > 0) { // Only calc damage if max > 0 (skip non-dmg pots)
                        // Instant Hit
                        const result = this.damageCalculator.calculateHit(item, initialState, this.currentBoss);
                        
                        // Add to Log
                        if (result.damage > 0) {
                            totalDamage += result.damage;
                            damageEvents.push({
                                time: tick * 0.6,
                                damage: result.damage,
                                name: item.name,
                                adrenaline: initialState.currentAdrenaline,
                                activeBuffs: this.buffManager.playerBuffs().map(b => b.name),
                                cooldowns: Array.from(initialState.cooldowns.entries())
                                    .filter(([_, expiry]) => expiry > tick)
                                    .map(([name, expiry]) => ({
                                        name,
                                        secondsRemaining: parseFloat(((expiry - tick) * 0.6).toFixed(1))
                                    })) 
                            });
                        }
                        
                        // Handle Buff Effects (e.g. Sunshine)
                        if (item.effects) {
                            item.effects.forEach(eff => {
                                this.buffManager.addBuff(eff, item.name, tick);
                            });
                        }
                    }
                }
             } // End Item Loop
             
             // Advance Queue
             currentStepIndex++;
             actionsProcessedInThisTick++;
             
             // Apply GCD if needed
             if (triggersGcd) {
                 initialState.nextGcdTick = tick + 3; // Standard 3-tick (1.8s) GCD
                 break;
             }
             
             // Process Limit per tick
             if (actionsProcessedInThisTick > 5) break; 
        }
        
        // Channeled hits
        if (activeChannel) {
             if (tick >= activeChannel.nextHitTick) {
                 const result = this.damageCalculator.calculateHit(activeChannel.ability, initialState, this.currentBoss);
                 if (result.damage > 0) {
                    totalDamage += result.damage;
                    damageEvents.push({
                        time: tick * 0.6,
                        damage: result.damage,
                        name: `${activeChannel.ability.name} (Tick)`,
                        adrenaline: initialState.currentAdrenaline,
                        activeBuffs: this.buffManager.playerBuffs().map(b => b.name),
                        cooldowns: Array.from(initialState.cooldowns.entries())
                            .filter(([_, expiry]) => expiry > tick)
                            .map(([name, expiry]) => ({
                                name,
                                secondsRemaining: parseFloat(((expiry - tick) * 0.6).toFixed(1))
                            }))
                    });
                 }
                 activeChannel.hitsRemaining--;
                 activeChannel.nextHitTick += activeChannel.interval;
                 if (activeChannel.hitsRemaining <= 0) activeChannel = null;
             }
        }
    }

    // Update Signals
    this.damageOverTime.set(damageEvents);
    this.simulationErrors.set(activeSimulationErrors);
    this.simulationSnapshots.set(snapshots);
    this.simulationStepTicks.set(stepTicks);
    
    // Calculate Project DPM
    if (damageEvents.length > 0) {
        // We can use the last damage tick time as duration
        const durationSeconds = damageEvents[damageEvents.length - 1].time;
        this._projectedDpm.set((totalDamage / durationSeconds) * 60);
        this._projectedDuration.set(durationSeconds);
    } else {
        this._projectedDpm.set(0);
        this._projectedDuration.set(0);
    }
  }



  private handleGearSwap(state: RunningState, swap: GearSwap) {
    const slotIndex = state.equipment.findIndex(s => s.name === swap.slot);
    if (slotIndex > -1) {
        // We simulate the swap by updating the slot's selectedArmor name.
        if (state.equipment[slotIndex].selectedArmor) {
            state.equipment[slotIndex].selectedArmor!.name = swap.itemName;
            this.hydrateEquipmentSlot(state.equipment[slotIndex], swap.itemName);
        }
    }
  }

  private hydrateEquipmentSlot(slot: IEquipmentSlot, itemName: string) {
       // Try to find the item in the loaded lists in DpsCalculationService
       const dps = this.dpsCalculationService; 
       let found: any;
       
       if (slot.name === 'mainhand') found = dps.mainhands.find(i => i.name === itemName);
       else if (slot.name === 'offhand') found = dps.offhands.find(i => i.name === itemName);
       else if (slot.name === 'twohand') found = dps.twohands.find(i => i.name === itemName);
       // Add other slots if needed...

       if (found) {
           slot.selectedArmor = found;
       }
  }

  private handlePrayerSwap(state: RunningState, swap: PrayerSwap) {
      // Toggle the specific prayer ON.
      const prayer = state.activePrayers.find(p => p.name === swap.prayerName);
      if (prayer) {
          prayer.isActive = true;
          // Deactivate conflicting prayers? (Scope for future polish)
      }
  }

  private handleMagicSwap(state: RunningState, swap: MagicSwap) {
      state.activeSpell = swap.spellName;
  }
  // --- Type Guards ---
  private isGearSwap(item: RotationItem): item is GearSwap { return item.type === 'gear_swap'; }
  private isPrayerSwap(item: RotationItem): item is PrayerSwap { return item.type === 'prayer_swap'; }
  private isMagicSwap(item: RotationItem): item is MagicSwap { return item.type === 'magic_swap'; }
  private isPause(item: RotationItem): item is RotationPause { return item.type === 'pause'; }
  private isAbility(item: RotationItem): item is RotationAbility { return 'skill' in item; }
}
