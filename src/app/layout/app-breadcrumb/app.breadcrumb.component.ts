import { Component } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TranslationService } from 'src/app/core/services/translation.service';
import { ModuleNavigationService } from 'src/app/core/services/module-navigation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
    EntityProfileLabelType,
    entityTypeIdToProfileLabelType,
    getBreadcrumbAdministrationKey,
    getBreadcrumbEditEntityKey,
    getBreadcrumbEntityDetailsKey,
    masajidUserTypeToProfileLabelType,
} from 'src/app/core/utils/entity-profile-label.util';

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

            this._breadcrumbs$.next(this.applyEntityProfileBreadcrumbLabels(breadcrumbs));
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

    private applyEntityProfileBreadcrumbLabels(breadcrumbs: Breadcrumb[]): Breadcrumb[] {
        const labelType = this.resolveEntityProfileLabelType();
        if (labelType === 'default' || !this.isEntityProfileRoute()) {
            return breadcrumbs;
        }

        return breadcrumbs
            .filter((crumb) => crumb.label !== 'companyDetails')
            .map((crumb) => {
                if (crumb.label === 'companyAdministration') {
                    return { ...crumb, label: getBreadcrumbAdministrationKey(labelType) };
                }
                if (crumb.label === 'entityDetails') {
                    return { ...crumb, label: getBreadcrumbEntityDetailsKey(labelType) };
                }
                if (crumb.label === 'editEntity') {
                    return { ...crumb, label: getBreadcrumbEditEntityKey(labelType) };
                }
                return crumb;
            });
    }

    private resolveEntityProfileLabelType(): EntityProfileLabelType {
        const entityTypeId = this.localStorageService.getEntityTypeId();
        if (entityTypeId !== null) {
            return entityTypeIdToProfileLabelType(entityTypeId);
        }
        return masajidUserTypeToProfileLabelType(this.localStorageService.getMasajidUserType());
    }

    private isEntityProfileRoute(): boolean {
        const path = this.router.url.split('?')[0].split('#')[0];
        return /^\/entity-administration\/entities\/(?!list$|new$)[^/]+/.test(path);
    }
}
