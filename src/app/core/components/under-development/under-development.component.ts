import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Component({
    templateUrl: './under-development.component.html',
    styleUrls: ['./under-development.component.scss']
})
export class UnderDevelopmentComponent {

    constructor(
        private location: Location,
        public translate: TranslateService
    ) { }

    get isRtl(): boolean {
        return this.translate.currentLang === 'ar';
    }

    goBack(): void {
        this.location.back();
    }
}
