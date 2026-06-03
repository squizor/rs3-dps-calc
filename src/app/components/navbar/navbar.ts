import { Component } from '@angular/core';
import { faGithub, IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SettingsModalComponent } from '../settings-modal/settings-modal.component';
import { CommonModule } from '@angular/common';
import { faGear, faTable } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-navbar',
  imports: [FontAwesomeModule, SettingsModalComponent, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  standalone: true,
})
export class Navbar {
  imgPath: string = 'assets/Squirrel-logo.png';
  faGithub: IconDefinition = faGithub;
  faGear: IconDefinition = faGear;
  faTable: IconDefinition = faTable;
  isSettingsModalOpen = false;
}