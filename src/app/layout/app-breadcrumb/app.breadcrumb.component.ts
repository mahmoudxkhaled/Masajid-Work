import { Component } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TranslationService } from 'src/app/core/services/translation.service';
import { ModuleNavigationService } from 'src/app/core/services/module-navigation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { MasajidUserType } from 'src/app/core/models/masajid-user-type.model';

interface Breadcrumb {
    label: string;
    url?: string;
}

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './app.breadcrumb.component.html'
})
export class AppBreadcrumbComponent {

    private readonly _breadcrumbs$ = new BehaviorSubject<Breadcrumb[]>([]);

    readonly breadcrumbs$ = this._breadcrumbs$.asObservable();

    constructor(
        private router: Router,
        private translate: TranslationService,
        private moduleNavigationService: ModuleNavigationService,
        private localStorageService: LocalStorageService,
    ) {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            const root = this.router.routerState.snapshot.root;
            const breadcrumbs: Breadcrumb[] = [];
            this.addBreadcrumb(root, [], breadcrumbs);

            this._breadcrumbs$.next(this.applyWorkspaceEntityProfileBreadcrumbLabels(breadcrumbs));
        });
    }

    private addBreadcrumb(route: ActivatedRouteSnapshot, parentUrl: string[], breadcrumbs: Breadcrumb[]) {
        const routeUrl = parentUrl.concat(route.url.map(url => url.path));
        const breadcrumb = route.data['breadcrumb'];
        const parentBreadcrumb = route.parent && route.parent.data ? route.parent.data['breadcrumb'] : null;

        if (breadcrumb && breadcrumb !== parentBreadcrumb) {
            breadcrumbs.push({
                label: route.data['breadcrumb'],
                url: '/' + routeUrl.join('/')
            });
        }

        if (route.firstChild) {
            this.addBreadcrumb(route.firstChild, routeUrl, breadcrumbs);
        }
    }

    getTranslationItem(item: any): string {
        return this.translate.getInstant(`layout.app-breadcrumb.${item}`);
    }

    /**
     * Breadcrumb is plain text (not a link) when it is the current page (last segment)
     * or when index matches legacy disabled slots (1 and 2).
     */
    isBreadcrumbDisabled(index: number, isLast: boolean): boolean {
        if (isLast) {
            return true;
        }
        return index === 1 || index === 2;
    }

    /**
     * Handle breadcrumb item click - check if it's a module and navigate to dashboard
     */
    onBreadcrumbClick(event: Event, breadcrumbUrl: string): void {
        // Check if this URL matches a module URL
        const module = this.moduleNavigationService.findModuleByUrl(breadcrumbUrl);

        if (module) {
            // Prevent default navigation
            event.preventDefault();
            event.stopPropagation();

            // Navigate to dashboard (root path) with module URL as query parameter
            this.router.navigate(['/dashboard'], {
                queryParams: { moduleUrl: breadcrumbUrl }
            });
        }
        // If not a module, let default routerLink handle navigation
    }

    private readonly workspaceEntityProfileBreadcrumbKeys: Partial<
        Record<MasajidUserType, { administration: string; details: string }>
    > = {
        [MasajidUserType.FacilityRepresentative]: {
            administration: 'facilityAdministration',
            details: 'facilityDetails',
        },
        [MasajidUserType.Vendor]: {
            administration: 'vendorAdministration',
            details: 'vendorDetails',
        },
        [MasajidUserType.CharityCenterRepresentative]: {
            administration: 'charityAdministration',
            details: 'charityDetails',
        },
    };

    private applyWorkspaceEntityProfileBreadcrumbLabels(breadcrumbs: Breadcrumb[]): Breadcrumb[] {
        const keys = this.getWorkspaceEntityProfileBreadcrumbKeys();
        if (!keys || !this.isWorkspaceEntityProfileRoute()) {
            return breadcrumbs;
        }

        return breadcrumbs
            .filter((crumb) => crumb.label !== 'companyDetails')
            .map((crumb) => {
                if (crumb.label === 'companyAdministration') {
                    return { ...crumb, label: keys.administration };
                }
                if (crumb.label === 'entityDetails' || crumb.label === 'editEntity') {
                    return { ...crumb, label: keys.details };
                }
                return crumb;
            });
    }

    private getWorkspaceEntityProfileBreadcrumbKeys(): { administration: string; details: string } | null {
        const userType = this.localStorageService.getMasajidUserType();
        if (!userType) {
            return null;
        }
        return this.workspaceEntityProfileBreadcrumbKeys[userType] ?? null;
    }

    private isWorkspaceEntityProfileRoute(): boolean {
        if (!this.getWorkspaceEntityProfileBreadcrumbKeys()) {
            return false;
        }

        const path = this.router.url.split('?')[0].split('#')[0];
        return /^\/entity-administration\/entities\/(?!list$|new$)[^/]+/.test(path);
    }
}
