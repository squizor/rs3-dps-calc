import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface PlayerStats {
  attack: number;
  defence: number;
  strength: number;
  constitution: number;
  ranged: number;
  prayer: number;
  magic: number;
  necromancy: number;
  herblore: number;
  summoning: number;
  invention: number;
  archaeology: number;
}

@Injectable({
  providedIn: 'root'
})
export class HiscoresService {
  private hiscoresUrl = '/hiscore/index_lite.ws?player=';

  constructor(private http: HttpClient) { }

  getPlayerStats(rsn: string): Observable<PlayerStats | null> {
    return this.http.get(`${this.hiscoresUrl}${rsn}`, { responseType: 'text' }).pipe(
      map(data => {
        const lines = data.split('\n');
        const skillOrder = [
          'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer', 'magic',
          'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting', 'smithing',
          'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming', 'runecrafting',
          'hunter', 'construction', 'summoning', 'dungeoneering', 'divination', 'invention',
          'archaeology', 'necromancy'
        ];

        const stats: Partial<PlayerStats> = {};
        skillOrder.forEach((skill, index) => {
          if (lines[index]) {
            const [rank, level, experience] = lines[index].split(',');
            if (skill === 'attack' || skill === 'defence' || skill === 'strength' ||
                skill === 'constitution' || skill === 'ranged' || skill === 'prayer' ||
                skill === 'magic' || skill === 'necromancy' || skill === 'herblore' ||
                skill === 'summoning' || skill === 'invention' || skill === 'archaeology') {
              stats[skill as keyof PlayerStats] = parseInt(level, 10);
            }
          }
        });
        return stats as PlayerStats;
      }),
      catchError(error => {
        console.error('Error fetching hiscores:', error);
        return of(null);
      })
    );
  }
}
