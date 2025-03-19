import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { DATABASE_SERVICE_TOKEN } from './services/database.service';

import { Capacitor } from '@capacitor/core';
import { SqlJsDatabaseService } from './services/sqljs-database.service';
import { SqliteDatabaseService } from './services/sqlite-database.service';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    { 
      provide: DATABASE_SERVICE_TOKEN, 
      useFactory: (sqlJs: SqlJsDatabaseService, sqlite: SqliteDatabaseService) => Capacitor.getPlatform() === 'web' ? sqlJs : sqlite,
      deps: [SqlJsDatabaseService, SqliteDatabaseService] 
    },
    provideAppInitializer(() => inject(DATABASE_SERVICE_TOKEN).initDatabase()),
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(),
    provideIonicAngular()
  ]
};
