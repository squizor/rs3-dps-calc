import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay, catchError, map } from 'rxjs/operators';
import { Ability, Skill } from '../types/abilities';

@Injectable({
  providedIn: 'root',
})
export class AbilityService {
  private http = inject(HttpClient);
  private abilities$: Observable<Ability[]> | undefined;

  getAbilities(): Observable<Ability[]> {
    if (!this.abilities$) {
      this.abilities$ = this.http
        .get<{ [key: string]: Ability[] }>('assets/data/abilities.json')
        .pipe(
          map((abilitiesBySkill) => {
            return Object.keys(abilitiesBySkill).reduce((acc, skill) => {
              const abilities = abilitiesBySkill[skill].map((ability) => ({
                ...ability,
                skill: skill.toLowerCase() as Skill,
              }));
              return acc.concat(abilities);
            }, [] as Ability[]);
          }),
          shareReplay(1),
          catchError((error) => {
            console.error('Error loading abilities:', error);
            return of([]);
          }),
        );
    }
    return this.abilities$;
  }
}
