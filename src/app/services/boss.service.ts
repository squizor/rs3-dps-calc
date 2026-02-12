import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay, catchError } from 'rxjs/operators';

export interface IBoss {
  id: number;
  name: string;
  defence: number;
  health: number;
}

@Injectable({
  providedIn: 'root',
})
export class BossService {
  private http = inject(HttpClient);
  private bosses$: Observable<IBoss[]> | undefined;

  getBosses(): Observable<IBoss[]> {
    if (!this.bosses$) {
      this.bosses$ = this.http.get<IBoss[]>('assets/data/bosses.json').pipe(
        shareReplay(1),
        catchError((error) => {
          console.error('Error loading bosses:', error);
          return of([]);
        }),
      );
    }
    return this.bosses$;
  }
}
