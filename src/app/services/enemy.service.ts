import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

export interface Beast {
  label: string;
  value: number;
}

@Injectable({
  providedIn: 'root',
})
export class EnemyService {
  private http = inject(HttpClient);
  private beasts = new BehaviorSubject<Beast[]>([]);
  public beasts$ = this.beasts.asObservable();

  private readonly API_URL = 'https://secure.runescape.com/m=itemdb_rs/api/beasts/beasts.json?letter=';

  constructor() {
    this.fetchAllBeasts().subscribe();
  }

  private fetchAllBeasts(): Observable<Beast[]> {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const requests: Observable<Beast[]>[] = alphabet.map(letter =>
      this.http.get<Beast[]>(`${this.API_URL}${letter}`)
    );

    return forkJoin(requests).pipe(
      map(results => results.flat()),
      tap(beasts => this.beasts.next(beasts))
    );
  }
}
