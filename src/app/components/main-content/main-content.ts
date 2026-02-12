import { Component } from '@angular/core';
import { PlayerinputComponent } from '../playerinput/playerinput';
import { DpsDisplayComponent } from '../dps/dps-display/dps-display.component'; // Assuming this component exists and is correctly located
import { AdvancedRotationBuilderComponent } from '../rotation-builder/advanced-rotation-builder/advanced-rotation-builder.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [PlayerinputComponent, DpsDisplayComponent, AdvancedRotationBuilderComponent, DragDropModule],
  templateUrl: './main-content.html',
  styleUrl: './main-content.scss',
})
export class MainContent {}
