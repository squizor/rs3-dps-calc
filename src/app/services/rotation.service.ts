import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { DisplayRotationTick, GearSwap, RotationItem } from '../types/abilities';

@Injectable({
  providedIn: 'root',
})
export class RotationService {
  private readonly ROTATION_KEY = 'dps_rotation';
  
  private rotation = new BehaviorSubject<DisplayRotationTick[]>([]);
  public rotation$ = this.rotation.asObservable();
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    if (this.isBrowser) {
      this.loadRotation();
    }
  }

  private loadRotation() {
    if (this.isBrowser) {
      const savedRotation = localStorage.getItem(this.ROTATION_KEY);
      if (savedRotation) {
        this.rotation.next(JSON.parse(savedRotation));
      }
    }
  }

  updateRotation(rotation: DisplayRotationTick[]) {
    this.rotation.next(rotation);
    if (this.isBrowser) {
      localStorage.setItem(this.ROTATION_KEY, JSON.stringify(rotation));
    }
  }

  addGearSwapsToRotation(gearSwaps: GearSwap[]) {
    const currentRotation = this.rotation.getValue();
    const newTick: DisplayRotationTick = {
      id: Date.now(),
      items: gearSwaps.map(gs => ({...gs, instanceId: `item_${crypto.randomUUID()}`})) as RotationItem[],
    };
    const newRotation = [...currentRotation, newTick];
    this.updateRotation(newRotation);
  }

  addAbilityToRotation(ability: RotationItem | RotationItem[]) {
    const currentRotation = this.rotation.getValue();
    const items = Array.isArray(ability) ? ability : [ability];
    
    // Create deep copy to ensure new instance IDs for timeline items
    const processedItems = items.map(item => JSON.parse(JSON.stringify({...item, instanceId: `item_${crypto.randomUUID()}`})));
    
    const newTick: DisplayRotationTick = {
      id: Date.now(),
      items: processedItems,
    };
    
    const newRotation = [...currentRotation, newTick];
    this.updateRotation(newRotation);
  }
}
