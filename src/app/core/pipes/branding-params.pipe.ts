import { Pipe, PipeTransform } from '@angular/core';
import { BrandingService } from '../services/branding.service';

@Pipe({
    name: 'brandingParams',
    pure: true,
})
export class BrandingParamsPipe implements PipeTransform {
    constructor(private brandingService: BrandingService) {}

    transform(_value?: unknown): Readonly<Record<string, string>> {
        return this.brandingService.translateParams;
    }
}
