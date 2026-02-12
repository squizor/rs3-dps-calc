import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdvancedRotationBuilderComponent } from './advanced-rotation-builder/advanced-rotation-builder.component';

@Component({
  selector: 'app-rotation-builder',
  templateUrl: './rotation-builder.component.html',
  styleUrls: ['./rotation-builder.component.scss'],
  standalone: true,
  imports: [CommonModule, AdvancedRotationBuilderComponent],
})
export class RotationBuilderComponent {}
