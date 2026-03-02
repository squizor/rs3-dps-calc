import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PlayerinputComponent } from '../playerinput/playerinput';
import { DpsDisplayComponent } from '../dps/dps-display/dps-display.component'; 
import { AdvancedRotationBuilderComponent } from '../rotation-builder/advanced-rotation-builder/advanced-rotation-builder.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DamageovertimeComponent } from '../dps/dps-display/damageovertime/damageovertime.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [PlayerinputComponent, DpsDisplayComponent, AdvancedRotationBuilderComponent, DragDropModule, DamageovertimeComponent],
  templateUrl: './main-content.html',
  styleUrl: './main-content.scss',
})
export class MainContent {
    public isBrowser: boolean;
    public isChartVisible = signal<boolean>(false);

    constructor() {
        this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    }
}
