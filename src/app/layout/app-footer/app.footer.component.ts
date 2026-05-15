import { Component } from '@angular/core';
import { LayoutService } from '../app-services/app.layout.service';

@Component({
    selector: 'app-footer',
    templateUrl: './app.footer.component.html',
})
export class AppFooterComponent {
    companyLogo: string = '../../assets/images/companyDefaultLogo.png';
    constructor(public layoutService: LayoutService) {
        // this.layoutService.getCompanyLogo().subscribe({
        //     next: (logo) => {
        //         this.companyLogo = logo.data ?? this.companyLogo;
        //     }
        // });

        // this.companyProfileImageService.companyPhoto$.subscribe((newPhotoUrl) => {
        //     this.companyLogo = newPhotoUrl ?? this.companyLogo;
        // });
    }
    yearNow = new Date().getFullYear();
}
