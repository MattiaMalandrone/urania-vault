import { Injectable } from '@angular/core';

declare var cv: any;

@Injectable({
  providedIn: 'root'
})
export class OpencvService {

  private cvReady = false;
  private cvPromise: Promise<void>;

  constructor() {
    this.cvPromise = new Promise((resolve) => {
      if (cv != null && cv.getBuildInformation()) {
        this.cvReady = true;
        resolve();
      } else {
        cv['onRuntimeInitialized'] = () => {
          this.cvReady = true;
          resolve();
        };
      }
    });
  }

  async isReady(): Promise<void> {
    return this.cvPromise;
  }
}
