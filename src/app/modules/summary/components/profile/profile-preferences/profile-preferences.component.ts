import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from 'src/app/core/services/translation.service';

@Component({
    selector: 'app-profile-preferences',
    templateUrl: './profile-preferences.component.html',
    styleUrls: ['./profile-preferences.component.scss'],
})
export class ProfilePreferencesComponent {
    constructor(
        public translate: TranslationService,
        private router: Router
    ) { }

    navigateBack(): void {
        this.router.navigate(['/summary/profile']);
    }
}

