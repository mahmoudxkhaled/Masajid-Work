import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AppBranding } from '../config/app-branding.config';

@Injectable({
    providedIn: 'root',
})
export class BrandingService {
    readonly branding: AppBranding = environment.branding;

    get platformName(): string {
        return this.branding.platformName;
    }

    get technicalName(): string {
        return this.branding.technicalName;
    }

    get displayName(): string {
        return this.branding.displayName;
    }

    get translateParams(): Readonly<Record<string, string>> {
        return {
            platformName: this.platformName,
            technicalName: this.technicalName,
            displayName: this.displayName,
        };
    }
}
