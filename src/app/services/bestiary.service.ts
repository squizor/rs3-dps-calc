import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IEnemy } from '../components/playerinput/playerinput.model';

@Injectable({
  providedIn: 'root',
})
export class BestiaryService {
  private dataUrl = 'assets/data/custom-enemies.json';

  constructor(private http: HttpClient) {}

  getBestiaryData(): Observable<IEnemy[]> {
    return this.http.get<IEnemy[]>(this.dataUrl);
  }
}
