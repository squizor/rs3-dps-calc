import {
  Component,
  effect,
  signal,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  ViewChild,
  ElementRef,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { RotationAbility, DisplayRotationTick, RotationItem } from '../../../types/abilities';
import { COMBAT_STYLE_COLORS, DEFAULT_ARROW_COLOR } from '../../../types/colors';
import { RotationDpsService } from '../../../services/rotation-dps.service';
import { RotationPersistenceService } from '../../../services/rotation-persistence.service';
import { PlayerDataService } from '../../../services/player-data.service';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

// The internal representation of an item, guaranteed to have a unique instanceId for tracking.
type TrackedRotationItem = RotationItem & { instanceId: string };

// A step in the timeline, containing an array of trackable items. This is a local
// view model for this component and does not need to be in the global types.
interface LocalRotationStep {
  id: number;
  items: TrackedRotationItem[];
}

import { AbilityListComponent } from '../ability-list/ability-list.component';

@Component({
  selector: 'app-rotation-timeline-flow',

  standalone: true,

  imports: [CommonModule, DragDropModule, FormsModule, FontAwesomeModule, AbilityListComponent],

  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './rotation-timeline-flow.component.html',
  styleUrls: ['./rotation-timeline-flow.component.scss'],
})
export class RotationTimelineFlowComponent implements OnChanges {
  @Input({ required: true }) rotation: DisplayRotationTick[] = [];
  @Input() connectedTo: string[] = [];
  @Output() rotationUpdated = new EventEmitter<DisplayRotationTick[]>();
  @Output() mergingModeChange = new EventEmitter<boolean>();

  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;

  public rotationDpsService = inject(RotationDpsService);
  private persistenceService = inject(RotationPersistenceService);
  private playerDataService = inject(PlayerDataService);
  
  // --- UI State ---
  public savedRotations = signal<string[]>([]);
  public rotationNameInput = signal<string>('');
  public showSaveLoad = signal<boolean>(false);
  public showMobileAbilities = signal<boolean>(false);
  
  public faPlus = faPlus;

  rotationInternal = signal<LocalRotationStep[]>([]);
  mergingStepIndex = signal<number | null>(null);
  private internalUpdate = false;
  
  // Track start tick for each step to map clicks correctly
  public stepStartTicks = computed(() => {
      const steps = this.rotationInternal();
      const tickMap = new Map<number, number>(); // stepIndex -> startTick
      let currentTick = 0;
      
      steps.forEach((step, index) => {
          tickMap.set(index, currentTick);
          
          // Calculate duration of this step
          let stepDuration = 0;
          step.items.forEach(item => {
              if (this.isAbility(item)) {
                  // Standard ability takes 3 ticks (GCD) unless channeled? 
                  // In simulation we assume 3 ticks for GCD-triggering abilities usually.
                  // But here we might just want to map loosely or specific durations.
                  // For now, let's assume 3 ticks per step if it has an ability, or sum of pauses?
                  // Actually, strictly speaking, the start tick is best derived from the *simulation* results if possible.
                  // But for UI feedback, a rough estimate or simply using the service's snapshots might be better.
                  stepDuration = Math.max(stepDuration, 3);
              } else if (this.isPause(item)) {
                  stepDuration = Math.max(stepDuration, item.duration);
              }
          });
          if (stepDuration === 0 && step.items.length > 0) stepDuration = 0; // Instant items?
          
          currentTick += stepDuration;
      });
      return tickMap;
  });

  public selectedStepIndex = signal<number | null>(null);

  constructor() {
    effect(() => {
      const currentRotation = this.rotationInternal();
      const displayTicks = this.mapRotationToDisplayTicks(currentRotation);
      this.internalUpdate = true; // Set flag to ignore the incoming echo from the parent
      this.rotationUpdated.emit(displayTicks);
      this.rotationDpsService.updateRotation(displayTicks);
    });
  }

  // Helper for template to access instanceId safely
  public asTracked(item: RotationItem): TrackedRotationItem {
      return item as TrackedRotationItem;
  }

  public cursorInStepPercent = signal<number>(0);

  selectStep(index: number, event: MouseEvent) {
      this.selectedStepIndex.set(index);
      
      // Calculate precise click position within the element
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const width = rect.width;
      
      // Calculate ratio (0.0 to 1.0)
      const ratio = Math.max(0, Math.min(1, clickX / width));
      this.cursorInStepPercent.set(ratio * 100);
      
      // Get base tick from SIMULATION if available, otherwise fallback to estimate
      const realStartTick = this.rotationDpsService.simulationStepTicks().get(index);
      const startTick = realStartTick !== undefined ? realStartTick : (this.stepStartTicks().get(index) || 0);
      
      // Determine step duration
      // Ideally we get this from a map, but recalling logic from computed:
      let stepDuration = 0;
      const step = this.rotationInternal()[index];
      if (step) {
           step.items.forEach(item => {
              if (this.isAbility(item)) {
                  // If it's an error item, duration is effectively 0 in simulation
                  // But visually it has width?
                  const tracked = this.asTracked(item);
                  if (this.rotationDpsService.simulationErrors().has(tracked.instanceId)) {
                      stepDuration = 0;
                  } else {
                      stepDuration = Math.max(stepDuration, 3);
                  }
              } else if (this.isPause(item)) {
                  stepDuration = Math.max(stepDuration, item.duration);
              }
          });
          // If 0 duration (e.g. error), tickOffset should be 0.
          if (stepDuration === 0 && step.items.length > 0) stepDuration = 0;
      }
      
      // Calculate precise tick offset
      // e.g. 3 ticks duration * 0.5 ratio = 1.5 ticks -> round to nearest integer?
      // Simulation ticks are integers. We should probably round.
      const tickOffset = Math.round(stepDuration * ratio);
      
      this.rotationDpsService.cursorTick.set(startTick + tickOffset);
  }


  ngOnChanges(changes: SimpleChanges) {
    if (changes['rotation']) {
      // If the flag is set, it means the change originated from this component.
      // Reset the flag and ignore the update to prevent an infinite loop.
      if (this.internalUpdate) {
        this.internalUpdate = false;
        return;
      }
      // Otherwise, it's a true external change, so update the internal state.
      this.rotationInternal.set(this.mapInputToInternal(this.rotation));
    }
  }

  // --- Type Guards for Template ---
  isAbility(item: RotationItem): item is RotationAbility {
    return 'skill' in item;
  }
  isGearSwap(item: RotationItem): item is import('../../../types/abilities').GearSwap { return item.type === 'gear_swap'; }
  isPrayerSwap(item: RotationItem): item is import('../../../types/abilities').PrayerSwap { return item.type === 'prayer_swap'; }
  isMagicSwap(item: RotationItem): item is import('../../../types/abilities').MagicSwap { return item.type === 'magic_swap'; }
  isPause(item: RotationItem): item is import('../../../types/abilities').RotationPause { return item.type === 'pause'; }

  /**
   * Determines the color for the step connector arrow based on the combat style of the item.
   * @param item The rotation item from which the arrow originates.
   * @returns A CSS color string (hex code or CSS variable).
   */
  public getArrowColorForItem(item: RotationItem): string {
    if (this.isAbility(item)) {
      return COMBAT_STYLE_COLORS[item.skill] || DEFAULT_ARROW_COLOR;
    }
    return DEFAULT_ARROW_COLOR;
  }

  public getError(item: RotationItem): string | null {
      if (this.isAbility(item) && item.instanceId) {
          const errors = this.rotationDpsService.simulationErrors();
          return errors.get(item.instanceId) || null;
      }
      return null;
  }

  // --- Data Mapping Functions ---
  private mapInputToInternal(ticks: DisplayRotationTick[]): LocalRotationStep[] {
    if (!ticks) return [];
    return ticks.map((tick) => ({
      id: tick.id,
      items: tick.items.map((item) => this.createItemInstance(item)),
    }));
  }

  private mapRotationToDisplayTicks(rotation: LocalRotationStep[]): DisplayRotationTick[] {
    return rotation.map((step) => ({
      id: step.id,
      items: step.items.map((itemWithId) => {
        // We MUST preserve instanceId so the service can report errors back to specific items
        return itemWithId;
      }),
    }));
  }

  // --- Instance & Utility ---
  public getCooldownProgress(item: RotationItem): number {
    if (!this.isAbility(item)) return 0;
    
    // Get state from service based on CURSOR position
    const cooldowns = this.rotationDpsService.cooldownsAtCursor$();
    const expiry = cooldowns.get(item.name);
    
    if (!expiry) return 100;
    
    const currentTick = this.rotationDpsService.cursorTick();
    if (expiry <= currentTick) return 100;

    const remaining = expiry - currentTick;
    // Calculate percentage ELAPSED (0 to 100)
    const elapsed = item.cooldown - remaining;
    return (elapsed / item.cooldown) * 100;
  }

  public isOverlayVisible(item: RotationItem): boolean {
    if (!this.isAbility(item)) return false;
    
    // Check error first
    const tracked = this.asTracked(item);
    if (this.rotationDpsService.simulationErrors().get(tracked.instanceId)) {
        return false; // Hide overlay if error
    }
    // Check cooldown
    return this.getCooldownProgress(item) > 0;
  }

  private createItemInstance(template: RotationItem): TrackedRotationItem {
    // Ability icons from 'abilities.json' are usually just filenames (e.g. 'impact.png').
    // Swaps from 'PlayerDataService' might be full paths (e.g. 'assets/icons/magic_icon.png').
    // The template currently adds 'assets/' prefix.
    
    // Check if instanceId already exists to preserve it (CRITICAL for simulation continuity)
    const existingId = (template as any).instanceId;
    const instanceId = existingId ? existingId : `item_${crypto.randomUUID()}`;

    // We create a shallow copy first to avoid mutating the input if it's used elsewhere
    // and to safely add the instanceId.
    const newItem: TrackedRotationItem = { ...template, instanceId: instanceId } as TrackedRotationItem;

    // Check if the item actually HAS an icon property before trying to manipulate it.
    // 'icon' is present in RotationAbility, PrayerSwap, MagicSwap.
    // It is NOT present in RotationPause, GearSwap, etc.
    if ('icon' in newItem) {
        let iconValue = (newItem as any).icon;
        if (typeof iconValue === 'string' && iconValue.startsWith('assets/')) {
            (newItem as any).icon = iconValue.replace('assets/', '');
        }
    }

    return newItem;
  }

  toggleMergeMode(index: number) {
    this.mergingStepIndex.set(this.mergingStepIndex() === index ? null : index);
    this.mergingModeChange.emit(this.mergingStepIndex() !== null);
  }

  // --- Persistence ---
  
  toggleSaveLoad() {
      this.showSaveLoad.update(v => !v);
      if (this.showSaveLoad()) {
          this.refreshSavedList();
      }
  }

  refreshSavedList() {
      this.savedRotations.set(this.persistenceService.getSavedBuilds());
  }

  saveRotation() {
      const name = this.rotationNameInput().trim();
      if (!name) return;
      
      const currentRotation = this.mapRotationToDisplayTicks(this.rotationInternal());
      const playerState = this.playerDataService.snapshotState();

      const build: import('../../../types/player-build.types').PlayerBuild = {
          id: crypto.randomUUID(),
          name: name,
          lastModified: Date.now(),
          rotation: currentRotation,
          playerState: playerState
      };
      
      this.persistenceService.saveBuild(build);
      this.refreshSavedList();
      alert(`Saved build: ${name}`);
  }

  loadRotation(name: string) {
      if (!name) return;
      
      const loadedBuild = this.persistenceService.loadBuild(name);
      
      if (loadedBuild) {
          // Restore Player State (Gear, Buffs, etc)
          this.playerDataService.restoreState(loadedBuild.playerState);

          // Restore Rotation
          this.rotationUpdated.emit(loadedBuild.rotation);
          this.rotationInternal.set(this.mapInputToInternal(loadedBuild.rotation));
          
          this.showSaveLoad.set(false);
          alert(`Loaded build: ${name}`);
      }
  }

  deleteRotation(name: string) {
      if(confirm(`Delete build '${name}'?`)) {
          this.persistenceService.deleteBuild(name);
          this.refreshSavedList();
          if (this.rotationNameInput() === name) this.rotationNameInput.set('');
      }
  }

  // --- Drag & Drop Handlers ---
  
  /**
   * Predicate to determine if an item can be dropped into the main timeline list.
   * We block drops to the main timeline if we are in "Merge Mode" (mergingStepIndex !== null).
   * This forces the drag system to look for other valid drop targets, i.e., the active merge slot.
   */
  allowDropPredicate = (drag: any, drop: any) => {
     return this.mergingStepIndex() === null;
  };

  dropToTimeline(event: CdkDragDrop<LocalRotationStep[]>) {
    if (this.mergingStepIndex() !== null) return;

    if (event.previousContainer === event.container) {
      // Re-ordering steps
      moveItemInArray(this.rotationInternal(), event.previousIndex, event.currentIndex);
      this.rotationInternal.set([...this.rotationInternal()]);
    } else {
      // Adding a new item or items as a new step
      const data = event.item.data;
      if (!data) return;

      let newItems: TrackedRotationItem[] = [];

      if (Array.isArray(data)) {
         // Handle array of items (e.g. Gear Preset)
         const templates = data as RotationItem[];
         newItems = templates.map(t => this.createItemInstance(t));
      } else {
         // Handle single item
         const itemTemplate = data as RotationItem;
         newItems = [this.createItemInstance(itemTemplate)];
      }

      if (newItems.length === 0) return;

      const newStep: LocalRotationStep = {
        id: Date.now(),
        items: newItems,
      };

      const newRotation = [...this.rotationInternal()];
      // Insert at the specific index where the user dropped the item
      newRotation.splice(event.currentIndex, 0, newStep);
      this.rotationInternal.set(newRotation);
    }
  }

  dropToMergeSlot(event: CdkDragDrop<TrackedRotationItem[]>) {
    const activeIndex = this.mergingStepIndex();
    if (activeIndex === null) return;

    if (event.previousContainer === event.container) {
      return;
    }

    // Handle both single items and arrays (presets)
    const data = event.item.data;
    if (!data) return;

    let newItems: TrackedRotationItem[] = [];

    if (Array.isArray(data)) {
       newItems = (data as RotationItem[]).map(t => this.createItemInstance(t));
    } else {
       newItems = [this.createItemInstance(data as RotationItem)];
    }

    if (newItems.length === 0) return;

    this.rotationInternal.update((currentRotation) => {
      const newRotation = currentRotation.map((step, index) => {
        if (index === activeIndex) {
          return {
            ...step,
            items: [...step.items, ...newItems],
          };
        }
        return step;
      });
      return newRotation;
    });

    this.mergingStepIndex.set(null);
    this.mergingModeChange.emit(false);
  }

  clearRotation() {
    this.rotationInternal.set([]);
  }


  // --- Item Removal Handlers ---
  removeItem(stepIndex: number, itemIndex: number) {
    this.rotationInternal.update((currentRotation) => {
      const newRotation = [...currentRotation];
      const step = newRotation[stepIndex];
      step.items.splice(itemIndex, 1);
      if (step.items.length === 0) {
        newRotation.splice(stepIndex, 1);
      }
      return newRotation;
    });
  }

  removeStep(index: number) {
    this.rotationInternal.update((currentRotation) => {
      const newRotation = [...currentRotation];
      newRotation.splice(index, 1);
      return newRotation;
    });
  }

  // --- Pause Duration Handler ---
  updatePauseDuration(stepIndex: number, itemIndex: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const newDuration = parseInt(input.value, 10);

    if (isNaN(newDuration) || newDuration < 1) return;

    this.rotationInternal.update((currentRotation) => {
      const newRotation = [...currentRotation];
      // We need to shallow copy the step and items array to trigger CD if needed
      // deeply, but for now just replacing the specific item object is enough if we copy the array.
      
      const step = { ...newRotation[stepIndex] }; 
      const newItems = [...step.items];
      
      // We know it's a pause because the input is only shown for pauses,
      // but good to keep type safety if possible. 
      // For now we cast or reconstruct.
      const oldItem = newItems[itemIndex];
      // We can use the type guard here if we want, or just assume since valid logic invokes this.
      if (this.isPause(oldItem)) {
         newItems[itemIndex] = { ...oldItem, duration: newDuration };
         step.items = newItems;
         newRotation[stepIndex] = step;
      }
      
      return newRotation;
    });
  }
}
