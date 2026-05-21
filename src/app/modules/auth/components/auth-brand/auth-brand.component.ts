import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';

@Component({
    selector: 'app-auth-brand',
    templateUrl: './auth-brand.component.html',
    styleUrls: ['./auth-brand.component.scss'],
})
export class AuthBrandComponent implements OnInit, OnDestroy {
    isRtl = false;

    private rtlSub?: Subscription;

    constructor(private rtlService: LanguageDirService) {}

    ngOnInit(): void {
        this.isRtl = this.rtlService.getRtlFromStorage();
        this.rtlSub = this.rtlService.isRtl$.subscribe((rtl) => {
            this.isRtl = rtl;
        });
    }

    ngOnDestroy(): void {
        this.rtlSub?.unsubscribe();
    }
}
