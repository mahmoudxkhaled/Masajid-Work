import { Component, OnInit } from '@angular/core';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';

@Component({
    selector: 'app-auth-brand',
    templateUrl: './auth-brand.component.html',
    styleUrls: ['./auth-brand.component.scss'],
})
export class AuthBrandComponent implements OnInit {
    isRtl = false;

    constructor(private rtlService: LanguageDirService) {}

    ngOnInit(): void {
        const userLang = this.rtlService.getLanguageFromStorage();
        this.isRtl = userLang === 'ar';
    }
}
