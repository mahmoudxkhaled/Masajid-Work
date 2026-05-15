import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { AppMenuProfileComponent } from '../app-menuProfile/app.menuprofile.component';
import { LayoutService } from '../app-services/app.layout.service';

@Component({
    selector: 'app-sidebar',
    templateUrl: './app.sidebar.component.html',
})
export class AppSidebarComponent implements OnDestroy {
    timeout: any = null;

    @ViewChild(AppMenuProfileComponent) menuProfile!: AppMenuProfileComponent;

    @ViewChild('menuContainer') menuContainer!: ElementRef;

    showScrollUp: boolean = false;
    showScrollDown: boolean = false;

    constructor(public layoutService: LayoutService, public el: ElementRef) {}

    resetOverlay() {
        if (this.layoutService.state.overlayMenuActive) {
            this.layoutService.state.overlayMenuActive = false;
        }
    }

    get menuProfilePosition(): string {
        return this.layoutService.config().menuProfilePosition;
    }

    onMouseEnter() {
        if (!this.layoutService.state.anchored) {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            this.layoutService.state.sidebarActive = true;
        }

        // Re-check scrollability when sidebar expands
        this.updateScrollButtons();
    }

    onMouseLeave() {
        if (!this.layoutService.state.anchored) {
            if (!this.timeout) {
                this.timeout = setTimeout(() => (this.layoutService.state.sidebarActive = false), 300);
            }
        }

        // Re-check scrollability when sidebar collapses
        this.updateScrollButtons();
    }

    ngAfterViewInit(): void {
        // Allow view to paint, then calculate scroll buttons visibility
        setTimeout(() => this.updateScrollButtons());
    }

    onMenuScroll(): void {
        this.updateScrollButtons();
    }

    scrollMenu(direction: 'up' | 'down'): void {
        const container = this.menuContainer?.nativeElement as HTMLElement | undefined;
        if (!container) {
            return;
        }

        const step = Math.round(container.clientHeight * 0.6);
        const delta = direction === 'up' ? -step : step;

        container.scrollBy({ top: delta, behavior: 'smooth' });
    }

    @HostListener('window:resize')
    onWindowResize() {
        this.updateScrollButtons();
    }

    private updateScrollButtons(): void {
        const container = this.menuContainer?.nativeElement as HTMLElement | undefined;
        if (!container) {
            this.showScrollUp = false;
            this.showScrollDown = false;
            return;
        }

        const isScrollable = container.scrollHeight > container.clientHeight + 1;
        if (!isScrollable) {
            this.showScrollUp = false;
            this.showScrollDown = false;
            return;
        }

        this.showScrollUp = container.scrollTop > 0;
        this.showScrollDown = container.scrollTop + container.clientHeight < container.scrollHeight - 1;
    }

    anchor() {
        this.layoutService.state.anchored = !this.layoutService.state.anchored;
    }

    ngOnDestroy() {
        this.resetOverlay();
    }
}
