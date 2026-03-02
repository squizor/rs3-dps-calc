import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DisplayRotationTick } from '../types/abilities';
import { PlayerBuild } from '../types/player-build.types';

@Injectable({
  providedIn: 'root'
})
export class RotationPersistenceService {
  private readonly STORAGE_KEY_PREFIX = 'rs3_dps_build_';
  private readonly INDEX_KEY = 'rs3_dps_build_index';
  private platformId = inject(PLATFORM_ID);

  constructor() { }

  private get isBrowser(): boolean {
      return isPlatformBrowser(this.platformId);
  }

  saveBuild(build: PlayerBuild): void {
      if (!this.isBrowser) return;
      try {
          const key = `${this.STORAGE_KEY_PREFIX}${build.name}`;
          const serialized = JSON.stringify(build);
          localStorage.setItem(key, serialized);
          
          this.addToIndex(build.name);
      } catch (e) {
          console.error('Failed to save build', e);
          alert('Failed to save build. LocalStorage might be full.');
      }
  }

  loadBuild(name: string): PlayerBuild | null {
      if (!this.isBrowser) return null;
      const key = `${this.STORAGE_KEY_PREFIX}${name}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      try {
          return JSON.parse(data) as PlayerBuild;
      } catch (e) {
          console.error('Failed to parse build', e);
          return null;
      }
  }

  getSavedBuilds(): string[] {
      if (!this.isBrowser) return [];
      const indexJson = localStorage.getItem(this.INDEX_KEY);
      if (!indexJson) return [];
      try {
          return JSON.parse(indexJson);
      } catch {
          return [];
      }
  }

  deleteBuild(name: string): void {
      if (!this.isBrowser) return;
      const key = `${this.STORAGE_KEY_PREFIX}${name}`;
      localStorage.removeItem(key);
      this.removeFromIndex(name);
  }

  private addToIndex(name: string) {
      if (!this.isBrowser) return;
      const list = this.getSavedBuilds();
      if (!list.includes(name)) {
          list.push(name);
          list.sort();
          localStorage.setItem(this.INDEX_KEY, JSON.stringify(list));
      }
  }

  private removeFromIndex(name: string) {
      if (!this.isBrowser) return;
      let list = this.getSavedBuilds();
      list = list.filter(n => n !== name);
      localStorage.setItem(this.INDEX_KEY, JSON.stringify(list));
  }
}
