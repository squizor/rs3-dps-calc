import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';

import { IEnemy, IEnemyMode } from '../../../playerinput/playerinput.model';
import { BestiaryService } from '../../../../services/bestiary.service';

@Component({
  selector: 'app-bossinformation',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './bossinformation.component.html',
  styleUrls: ['./bossinformation.component.scss'],
})
export class BossinformationComponent implements OnInit, OnDestroy {
  @Output() enemyChange = new EventEmitter<IEnemy | null>();

  faChevronDown = faChevronDown;
  faSpinner = faSpinner;

  allEnemies: IEnemy[] = [];
  filteredEnemies: IEnemy[] = [];
  selectedEnemy: IEnemy | null = null;
  selectedPhase: IEnemyMode | null = null;
  public filteredPhases: IEnemyMode[] = [];
  displayEnemy: IEnemy | null = null;
  searchQuery: string = '';
  isDropdownOpen: boolean = false;
  isLoading: boolean = false;
  isHardMode: boolean = false;
  enrageValue: number = 0;
  private hasDataBeenLoaded: boolean = false;
  private bestiarySubscription: Subscription | undefined;

  public affinities: { style: string; value: number | string; color: string }[] = [];
  public susceptibilityIcons: { name: string; url: string }[] = [];

  constructor(
    private bestiaryService: BestiaryService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.bestiarySubscription?.unsubscribe();
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.loadInitialData();
    }
  }

  selectEnemy(enemy: IEnemy) {
    this.selectedEnemy = enemy;
    this.searchQuery = enemy.name;
    this.isDropdownOpen = false;
    this.isHardMode = false;

    this.filterPhases();
    this.selectedPhase = this.filteredPhases.length ? this.filteredPhases[0] : null;

    this.updateDisplayEnemy();
    this.filterEnemies();
    this.enemyChange.emit(this.displayEnemy);
  }

  selectPhase(phase: IEnemyMode) {
    this.selectedPhase = phase;
    this.updateDisplayEnemy();
    this.enemyChange.emit(this.displayEnemy);
  }

  onHardModeToggle() {
    this.filterPhases();
    if (!this.filteredPhases.some((p: IEnemyMode) => p.name === this.selectedPhase?.name)) {
      this.selectedPhase = this.filteredPhases.length ? this.filteredPhases[0] : null;
    }
    this.updateDisplayEnemy();
    this.enemyChange.emit(this.displayEnemy);
  }

  onEnrageChange() {
    this.updateDisplayEnemy();
    this.enemyChange.emit(this.displayEnemy);
  }

  private filterPhases() {
    if (!this.selectedEnemy || !this.selectedEnemy.phases) {
      this.filteredPhases = [];
      return;
    }

    if (this.isHardMode) {
      this.filteredPhases = this.selectedEnemy.phases;
    } else {
      this.filteredPhases = this.selectedEnemy.phases.filter(
        (p: IEnemyMode) => !p.name.toLowerCase().includes('hard'),
      );
    }
  }

  private updateDisplayEnemy() {
    if (!this.selectedEnemy) {
      this.displayEnemy = null;
      this.updateTemplateProperties();
      return;
    }

    let displayEnemyCandidate: IEnemy = { ...this.selectedEnemy };

    if (this.selectedPhase) {
      displayEnemyCandidate = { ...displayEnemyCandidate, ...this.selectedPhase };
      displayEnemyCandidate.name = `${this.selectedEnemy.name} (${this.selectedPhase.name})`;
    } else if (this.isHardMode && this.selectedEnemy.hardModeStats) {
      displayEnemyCandidate = { ...displayEnemyCandidate, ...this.selectedEnemy.hardModeStats };
    }

    if (this.enrageValue > 0 && displayEnemyCandidate.enrageLevel !== undefined) {
      displayEnemyCandidate.enrageLevel = this.enrageValue;
    }

    this.displayEnemy = displayEnemyCandidate;
    this.updateTemplateProperties();
  }

  private updateTemplateProperties() {
    if (!this.displayEnemy) {
      this.affinities = [];
      this.susceptibilityIcons = [];
      return;
    }

    const newAffinities = [];
    if (this.displayEnemy.affinity) {
      const affinityData = this.displayEnemy.affinity;
      const hybridValue = affinityData.hybrid;
      const styles: ('melee' | 'ranged' | 'magic')[] = ['melee', 'ranged', 'magic'];

      for (const style of styles) {
        const value = affinityData[style];
        if (value !== undefined && value !== null) {
          let color = 'var(--white)';
          if (hybridValue) {
            if (value > hybridValue) color = 'var(--success-color)';
            else if (value < hybridValue) color = 'var(--danger-color)';
          }
          newAffinities.push({ style, value, color });
        }
      }
    }
    this.affinities = newAffinities;

    if (this.displayEnemy.susceptibleTo) {
      const susceptibilities = Array.isArray(this.displayEnemy.susceptibleTo)
        ? this.displayEnemy.susceptibleTo
        : [this.displayEnemy.susceptibleTo];
      this.susceptibilityIcons = susceptibilities
        .map((susc: string) => {
          const url = this.susceptibilityIconMap[susc.toLowerCase()];
          return url ? { name: susc, url: url } : null;
        })
        .filter((icon): icon is { name: string; url: string } => icon !== null);
    } else {
      this.susceptibilityIcons = [];
    }
  }

  onSearchInput() {
    this.isDropdownOpen = true;
    this.loadInitialData();
    this.filterEnemies();
  }

  private loadInitialData() {
    if (!this.hasDataBeenLoaded && !this.isLoading && isPlatformBrowser(this.platformId)) {
      this.isLoading = true;
      this.bestiarySubscription = this.bestiaryService.getBestiaryData().subscribe({
        next: (allEnemies: IEnemy[]) => {
          this.allEnemies = allEnemies;
          this.filteredEnemies = allEnemies;
          const defaultEnemy = this.allEnemies.find((e) => e.name === 'Combat Dummy');
          if (defaultEnemy) {
            this.selectEnemy(defaultEnemy);
          }
        },
        error: (err: any) => console.error('Error fetching bestiary data:', err),
        complete: () => {
          this.isLoading = false;
          this.hasDataBeenLoaded = true;
        },
      });
    }
  }

  filterEnemies() {
    if (this.searchQuery) {
      this.filteredEnemies = this.allEnemies.filter((enemy) =>
        enemy.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
      );
    } else {
      this.filteredEnemies = this.allEnemies;
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterEnemies();
  }

  susceptibilityIconMap: { [key: string]: string } = {
    hexhunter: 'https://runescape.wiki/images/Hexhunter_bow.png',
    inqstaff: 'https://runescape.wiki/images/Inquisitor_staff.png',
    dragonbane: 'https://runescape.wiki/images/Jas_Dragonbane_Arrow_5.png',
    kerapac: 'https://runescape.wiki/images/Kerapac%27s_wrist_wraps.png',
    undead: 'https://runescape.wiki/images/Undead_Slayer.png',
    ghosthunter: 'https://runescape.wiki/images/Ghost_hunter_backpack.png',
    salve: 'https://runescape.wiki/images/Salve_amulet.png',
    terrasaur: 'https://runescape.wiki/images/Terrasaur_maul.png',
    keris: 'https://runescape.wiki/images/Keris.png',
    demonslayer: 'https://runescape.wiki/images/Demon_Slayer_%28perk%29.png',
    dragonslayer: 'https://runescape.wiki/images/Dragon_Slayer_%28perk%29.png',
    balmung: 'https://runescape.wiki/images/Balmung.png',
    spear: 'https://runescape.wiki/images/Dragon_spear.png',
    salamancy: 'https://runescape.wiki/images/Necklace_of_Salamancy.png',
    nope: 'https://runescape.wiki/images/NopeNopeNope_perk.png',
    conckeris: 'https://runescape.wiki/images/Consecrated_keris.png',
  };

  weaknessIconMap: { [key: string]: string } = {
    melee: 'https://runescape.wiki/images/Melee_weakness_icon.png',
    ranged: 'https://runescape.wiki/images/Ranged_weakness_icon.png',
    magic: 'https://runescape.wiki/images/Magic_weakness_icon.png',
    fire: 'https://runescape.wiki/images/Fire_weakness_icon.png',
    water: 'https://runescape.wiki/images/Water_weakness_icon.png',
    air: 'https://runescape.wiki/images/Air_weakness_icon.png',
    earth: 'https://runescape.wiki/images/Earth_weakness_icon.png',
    stab: 'https://runescape.wiki/images/Stab_weakness_icon.png',
    slash: 'https://runescape.wiki/images/Slash_weakness_icon.png',
    crush: 'https://runescape.wiki/images/Crush_weakness_icon.png',
    arrows: 'https://runescape.wiki/images/Arrow_weakness_icon.png',
    bolts: 'https://runescape.wiki/images/Bolt_weakness_icon.png',
    thrown: 'https://runescape.wiki/images/Thrown_weakness_icon.png',
    necromancy: 'https://runescape.wiki/images/Necromancy_weakness_icon.png',
  };

  getWeaknessIcon(weakness: string): string {
    return this.weaknessIconMap[weakness.toLowerCase()] || '';
  }

  isLargeNumber(value: number | undefined): boolean {
    if (value === undefined) {
      return false;
    }
    return value.toString().length > 6;
  }
}
