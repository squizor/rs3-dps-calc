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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropListGroup, DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { RotationAbility, DisplayRotationTick, RotationItem } from '../../../types/abilities';
import { COMBAT_STYLE_COLORS, DEFAULT_ARROW_COLOR } from '../../../types/colors';
import { RotationDpsService } from '../../../services/rotation-dps.service';

// The internal representation of an item, guaranteed to have a unique instanceId for tracking.
type TrackedRotationItem = RotationItem & { instanceId: string };

// A step in the timeline, containing an array of trackable items. This is a local
// view model for this component and does not need to be in the global types.
interface LocalRotationStep {
  id: number;
  items: TrackedRotationItem[];
}

@Component({
  selector: 'app-rotation-timeline-flow',

  standalone: true,

  imports: [CommonModule, DragDropModule, CdkDropListGroup],

  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './rotation-timeline-flow.component.html',
  styleUrls: ['./rotation-timeline-flow.component.scss'],
})
export class RotationTimelineFlowComponent implements OnChanges {
  @Input({ required: true }) rotation: DisplayRotationTick[] = [];
  @Input() connectedTo: string[] = [];
  @Output() rotationUpdated = new EventEmitter<DisplayRotationTick[]>();
  @Output() mergingModeChange = new EventEmitter<boolean>();

  private rotationDpsService = inject(RotationDpsService);

  rotationInternal = signal<LocalRotationStep[]>([]);
  mergingStepIndex = signal<number | null>(null);
  private internalUpdate = false;

  constructor() {
    effect(() => {
      const currentRotation = this.rotationInternal();
      const displayTicks = this.mapRotationToDisplayTicks(currentRotation);
      this.internalUpdate = true; // Set flag to ignore the incoming echo from the parent
      this.rotationUpdated.emit(displayTicks);
      this.rotationDpsService.updateRotation(displayTicks);
    });
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
        const { instanceId, ...rest } = itemWithId;
        return rest;
      }),
    }));
  }

  // --- Instance & Utility ---
  private createItemInstance(template: RotationItem): TrackedRotationItem {
    return { ...template, instanceId: `item_${crypto.randomUUID()}` };
  }

  toggleMergeMode(index: number) {
    this.mergingStepIndex.set(this.mergingStepIndex() === index ? null : index);
    this.mergingModeChange.emit(this.mergingStepIndex() !== null);
  }

  // --- Drag & Drop Handlers ---
  dropToTimeline(event: CdkDragDrop<LocalRotationStep[]>) {
    if (this.mergingStepIndex() !== null) return;

    if (event.previousContainer === event.container) {
      // Re-ordering steps
      moveItemInArray(this.rotationInternal(), event.previousIndex, event.currentIndex);
      this.rotationInternal.set([...this.rotationInternal()]);
    } else {
      // Adding a new item as a new step
      const itemTemplate = event.item.data as RotationItem;
      if (!itemTemplate) return;

      const newItem = this.createItemInstance(itemTemplate);
      const newStep: LocalRotationStep = {
        id: Date.now(),
        items: [newItem],
      };

      const newRotation = [...this.rotationInternal()];
      newRotation.push(newStep);
      this.rotationInternal.set(newRotation);
    }
  }

  dropToMergeSlot(event: CdkDragDrop<TrackedRotationItem[]>) {
    const activeIndex = this.mergingStepIndex();
    if (activeIndex === null) return;

    if (event.previousContainer === event.container) {
      return;
    }

    const itemTemplate = event.item.data as RotationItem;
    if (!itemTemplate) return;

    const newItem = this.createItemInstance(itemTemplate);

    this.rotationInternal.update((currentRotation) => {
      const newRotation = currentRotation.map((step, index) => {
        if (index === activeIndex) {
          return {
            ...step,
            items: [...step.items, newItem],
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
}
