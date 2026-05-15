import { Component } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ChangeDetectorRef } from '@angular/core';
import { TranslationService } from 'src/app/core/services/translation.service';
import { ModuleNavigationService } from 'src/app/core/services/module-navigation.service';

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
        private moduleNavigationService: ModuleNavigationService
    ) {
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(event => {
            const root = this.router.routerState.snapshot.root;
            const breadcrumbs: Breadcrumb[] = [];
            this.addBreadcrumb(root, [], breadcrumbs);

            this._breadcrumbs$.next(breadcrumbs);
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
            this.router.navigate(['/'], {
                queryParams: { moduleUrl: breadcrumbUrl }
            });
        }
        // If not a module, let default routerLink handle navigation
    }
}
