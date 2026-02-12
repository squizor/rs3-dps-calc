import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class Wikiapi {
  constructor(private http: HttpClient) { }

  getPerksData(): Observable<any> {
    const url = 'https://runescape.wiki/api.php?action=query&format=json&prop=revisions&titles=Perks&rvprop=content&rvslots=*';
    return this.http.get(url).pipe(
      map((response: any) => {
        const pages = response.query.pages;
        const pageId = Object.keys(pages)[0];
        return pages[pageId].revisions[0]['*'];
      })
    );
  }
}