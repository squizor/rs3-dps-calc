import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IEnemy, IEnemyMode } from '../playerinput/playerinput.model';

@Component({
  selector: 'app-boss-information',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boss-information.html',
  styleUrls: ['./boss-information.scss'],
})
export class BossInformationComponent implements OnChanges {
  @Input() enemyData: IEnemy | IEnemyMode | null = null;

  public affinities: { style: string; value: number | string }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['enemyData']) {
      this.updateAffinities();
    }
  }

  private updateAffinities(): void {
    this.affinities = [];
    if (!this.enemyData || !this.enemyData.affinity) {
      return;
    }

    const affinityData = this.enemyData.affinity;
    const styles: ('melee' | 'ranged' | 'magic' | 'hybrid')[] = [
      'melee',
      'ranged',
      'magic',
      'hybrid',
    ];

    styles.forEach((style) => {
      const value = affinityData[style] ?? affinityData.hybrid;
      if (value !== undefined && value !== null) {
        if (
          style === 'hybrid' &&
          (affinityData.melee !== undefined ||
            affinityData.ranged !== undefined ||
            affinityData.magic !== undefined)
        ) {
          const isHybridRedundant =
            affinityData.hybrid === affinityData.melee ||
            affinityData.hybrid === affinityData.ranged ||
            affinityData.hybrid === affinityData.magic;
          if (
            isHybridRedundant &&
            ['melee', 'ranged', 'magic'].some(
              (s) => affinityData[s as keyof typeof affinityData] === affinityData.hybrid,
            )
          )
            return;
        }
        this.affinities.push({ style, value });
      }
    });
  }
}
