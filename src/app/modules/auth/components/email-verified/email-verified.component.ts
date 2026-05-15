import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-email-verified',
    templateUrl: './email-verified.component.html',
    styleUrls: ['./email-verified.component.scss'],
})
export class EmailVerifiedComponent implements OnInit, OnDestroy {
    private unsubscribe: Subscription[] = [];
    userEmail: string = '';
    yearNow = new Date().getFullYear();
    constructor(
        private route: ActivatedRoute,
        private router: Router
    ) { }

    ngOnInit(): void {
        const queryParamsSub = this.route.queryParams.subscribe((queryParams) => {
            this.userEmail = queryParams['email'] || '';
        });
        this.unsubscribe.push(queryParamsSub);
    }

    backToLogin(): void {
        this.router.navigate(['/auth']);
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((u) => u.unsubscribe());
    }
}
