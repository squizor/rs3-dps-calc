import {
  ApplicationConfig,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { userAgentInterceptor } from './services/user-agent.interceptor';
import { DpsCalculationService } from './services/dps-calculation.service';
import { DatabaseService } from './services/database.service';
import { AbilityService } from './services/ability.service';
import { RotationService } from './services/rotation.service';
import { SimulationService } from './services/simulation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([userAgentInterceptor]), withFetch()),
    DpsCalculationService,
    DatabaseService,
    AbilityService,
    RotationService,
    SimulationService,
  ],
};
