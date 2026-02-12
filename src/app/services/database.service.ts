import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { IEnemy } from '../components/playerinput/playerinput.model';
import { Ability, Equipment, Weapon, Boss, Perk } from '../types/equipment.types';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private dataUrl = 'assets/data/';

  constructor(private http: HttpClient) {}

  getWeapons(): Observable<Weapon[]> {
    const mainhand$ = this.http.get<Weapon[]>(`${this.dataUrl}equipment/weapons/mainhand.json`);
    const offhand$ = this.http.get<Weapon[]>(`${this.dataUrl}equipment/weapons/offhand.json`);
    const twohand$ = this.http.get<Weapon[]>(`${this.dataUrl}equipment/weapons/twohand.json`);

    return forkJoin([mainhand$, offhand$, twohand$]).pipe(
      map(([mainhands, offhands, twohands]) => [...mainhands, ...offhands, ...twohands])
    );
  }

  getEnemies(): Observable<IEnemy[]> {
    const enemies$ = this.http
      .get<IEnemy[]>('assets/data/enemies.json')
      .pipe(catchError(() => of([])));
    const customEnemies$ = this.http
      .get<IEnemy[]>('assets/data/custom-enemies.json')
      .pipe(catchError(() => of([])));

    return forkJoin([enemies$, customEnemies$]).pipe(
      map(([enemies, customEnemies]) => [...enemies, ...customEnemies])
    );
  }

  getPerks(): Observable<Perk[]> {
    return this.http.get<Perk[]>(`${this.dataUrl}perks.json`);
  }

  getAbilities(): Observable<Ability[]> {
    return this.http.get<Ability[]>(`${this.dataUrl}abilities.json`);
  }

  getEquipment(slot: string): Observable<Equipment[]> {
    return this.http.get<Equipment[]>(`${this.dataUrl}equipment/${slot}.json`);
  }
}
