import 'zone.js';
import {
  bootstrapApplication,
  provideClientHydration,
} from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, {
  ...appConfig,
  providers: [...appConfig.providers, provideClientHydration()],
}).catch((err) => console.error(err));
