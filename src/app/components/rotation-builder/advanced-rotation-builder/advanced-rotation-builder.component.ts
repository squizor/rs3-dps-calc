import { DisplayRotationTick, Ability } from '../../../types/abilities';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RotationTimelineFlowComponent } from './rotation-timeline-flow.component';
import { SimulationService } from '../../../services/simulation.service';
import { RotationService } from '../../../services/rotation.service';

@Component({
  selector: 'app-advanced-rotation-builder',
  standalone: true,
  imports: [CommonModule, RotationTimelineFlowComponent],
  templateUrl: './advanced-rotation-builder.component.html',
  styleUrls: ['./advanced-rotation-builder.component.scss'],
})
export class AdvancedRotationBuilderComponent implements OnInit {
  rotation: DisplayRotationTick[] = [];
  public isMerging = false;

  constructor(
    private simulationService: SimulationService,
    private rotationService: RotationService,
  ) {}

  ngOnInit(): void {
    this.rotationService.rotation$.subscribe((rotation: DisplayRotationTick[]) => {
      this.rotation = rotation;
      this.onRotationUpdated(this.rotation, false); //Don't trigger a save
    });
  }

  onMergingModeChange(isMerging: boolean) {
    this.isMerging = isMerging;
  }

  onRotationUpdated(updatedRotation: DisplayRotationTick[], triggerSave: boolean = true) {
    this.rotation = updatedRotation;
    if (triggerSave) {
      this.rotationService.updateRotation(this.rotation);
    }

    const flatRotation = this.rotation.flatMap((tick) =>
      tick.items.filter((item) => item.type !== 'phase-break' && item.type !== 'pause'),
    ) as Ability[];

    this.simulationService.runSimulation(flatRotation, 1_000_000).subscribe();
  }
}
