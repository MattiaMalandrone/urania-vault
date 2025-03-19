import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Register PWA Elements when the app starts
defineCustomElements(window);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
