import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { LayoutService } from '../app-services/app.layout.service';
import { Subscription } from 'rxjs';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { ProfilePictureService } from '../../core/services/profile-picture.service';
import { ImageService } from '../../core/services/image.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LogoutComponent } from 'src/app/modules/auth/components/logout/logout.component';
import { DialogService } from 'primeng/dynamicdialog';
import { IAccountDetails, IAccountSettings, IUserDetails } from 'src/app/core/models/account-status.model';
import { switchMap } from 'rxjs';


@Component({
    selector: 'app-menu-profile',
    templateUrl: './app.menuprofile.component.html',
    animations: [
        trigger('menu', [
            transition('void => inline', [
                style({ height: 0 }),
                animate('400ms cubic-bezier(0.86, 0, 0.07, 1)', style({ opacity: 1, height: '*' })),
            ]),
            transition('inline => void', [
                animate('400ms cubic-bezier(0.86, 0, 0.07, 1)', style({ opacity: 0, height: '0' })),
            ]),
            transition('void => overlay', [
                style({ opacity: 0, transform: 'scaleY(0.8)' }),
                animate('.12s cubic-bezier(0, 0, 0.2, 1)'),
            ]),
            transition('overlay => void', [animate('.1s linear', style({ opacity: 0 }))]),
        ]),
    ],
})
export class AppMenuProfileComponent implements OnInit, OnDestroy {
    isAdmin: boolean = false;
    userName: string = 'John Doe';
    imageUrl: string = '';
    subs: Subscription = new Subscription();
    user: IUserDetails;
    account: IAccountDetails;
    currentPages: any;
    showLogoutDialog: boolean = false;
    accountSettings: IAccountSettings;
    gender: boolean = false;
    constructor(
        public layoutService: LayoutService,
        public el: ElementRef,
        private localStorage: LocalStorageService,
        private profilePictureService: ProfilePictureService,
        private imageService: ImageService,
        private translate: TranslationService,
        private dialogService: DialogService
    ) {

    }

    ngOnInit(): void {
        this.loadUserDetails();
        this.subs.add(
            this.profilePictureService.profilePicture$.subscribe((pictureUrl: string | null) => {
                if (pictureUrl) {
                    this.imageUrl = this.convertProfilePictureUrl(pictureUrl);
                } else {
                    this.gender = this.localStorage.getGender() || false;
                    if (this.gender) {
                        this.imageUrl = 'assets/media/avatar.png';
                    } else {
                        this.imageUrl = 'assets/media/female-avatar.png';
                    }
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe();
    }

    loadUserDetails() {
        this.user = this.localStorage.getUserDetails() as IUserDetails;
        this.account = this.localStorage.getAccountDetails() as IAccountDetails;
        this.accountSettings = this.localStorage.getAccountSettings() as IAccountSettings;

        const isRegional = this.accountSettings?.Language !== 'English';

        if (this.user) {
            let regionalName = '';
            if (isRegional) {
                const firstNameRegional = this.user.First_Name_Regional || '';
                const lastNameRegional = this.user.Last_Name_Regional || '';
                regionalName = (firstNameRegional + ' ' + lastNameRegional).trim();
            }

            const firstNameEnglish = this.user.First_Name || '';
            const lastNameEnglish = this.user.Last_Name || '';
            const englishName = (firstNameEnglish + ' ' + lastNameEnglish).trim();

            if (isRegional && regionalName) {
                this.userName = regionalName;
            } else if (englishName) {
                this.userName = englishName;
            } else {
                this.userName = this.account?.Email || 'User';
            }
        }
        if (this.account) {

            this.gender = this.localStorage.getGender() || false;
            if (this.gender) {
                this.imageUrl = this.account.Profile_Picture || 'assets/media/avatar.png';
            } else {
                this.imageUrl = this.account.Profile_Picture || 'assets/media/female-avatar.png';
            }

            this.imageUrl = this.convertProfilePictureUrl(this.imageUrl);

            if (this.imageUrl) {
                this.profilePictureService.updateProfilePicture(this.imageUrl);
            }
        }
    }

    private convertProfilePictureUrl(pictureUrl: string): string {
        if (!pictureUrl) {
            return pictureUrl;
        }
        if (pictureUrl.startsWith('data:image') || pictureUrl.startsWith('assets/')) {
            return pictureUrl;
        }
        return this.imageService.toImageDataUrl(pictureUrl);
    }

    toggleMenu() {
        this.layoutService.onMenuProfileToggle();
    }

    get isHorizontal() {
        return this.layoutService.isHorizontal() && this.layoutService.isDesktop();
    }

    get menuProfileActive(): boolean {
        return this.layoutService.state.menuProfileActive;
    }

    get menuProfilePosition(): string {
        return this.layoutService.config().menuProfilePosition;
    }

    get isTooltipDisabled(): boolean {
        return !this.layoutService.isSlim();
    }

    hassPermession(pageName: string): boolean {
        return this.currentPages.includes(pageName);
    }

    logOut() {
        this.dialogService.open(LogoutComponent, {
            showHeader: true,
            header: this.translate.getInstant('shared.headers.confirmLogout'),
            styleClass: 'custom-dialog',
            maskStyleClass: 'custom-backdrop',
            dismissableMask: true,
            width: '30vw',
            closable: true,
        });
    }
}
