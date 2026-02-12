import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true,
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], filter: Record<string, any>): any[] {
    if (!items || !filter) {
      return items;
    }

    const filterKey = Object.keys(filter)[0];
    const filterValue = filter[filterKey];

    if (!filterKey || filterValue === undefined) {
      return items;
    }

    return items.filter((item) => item[filterKey] === filterValue);
  }
}
