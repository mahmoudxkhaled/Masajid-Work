import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MegaMenuModule } from 'primeng/megamenu';
import { MenuModule } from 'primeng/menu';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RippleModule } from 'primeng/ripple';
import { SidebarModule } from 'primeng/sidebar';
import { StyleClassModule } from 'primeng/styleclass';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../../Shared/shared/shared.module';
import { AppBreadcrumbComponent } from '../app-breadcrumb/app.breadcrumb.component';
import { AppFooterComponent } from '../app-footer/app.footer.component';
import { AppMenuComponent } from '../app-menu/app.menu.component';
import { AppMenuitemComponent } from '../app-menu/app.menuitem.component';
import { AppMenuProfileComponent } from '../app-menuProfile/app.menuprofile.component';
import { AppRightMenuComponent } from '../app-rightMenu/app.rightmenu.component';
import { AppSidebarComponent } from '../app-sidebar/app.sidebar.component';
import { AppConfigModule } from '../config/app.config.module';
import { NoInternetOverlayComponent } from '../no-internet-overlay/no-internet-overlay.component';
import { AppTopbarComponent } from '../top-bar/app.topbar.component';
import { TransferProgressOverlayComponent } from '../transfer-progress-overlay/transfer-progress-overlay.component';
import { AppLayoutComponent } from './app.layout.component';

@NgModule({
    declarations: [
        AppLayoutComponent,
        AppBreadcrumbComponent,
        AppMenuProfileComponent,
        AppTopbarComponent,
        AppRightMenuComponent,
        AppMenuComponent,
        AppSidebarComponent,
        AppMenuitemComponent,
        AppFooterComponent,
        NoInternetOverlayComponent,
        TransferProgressOverlayComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        StyleClassModule,
        InputTextModule,
        SidebarModule,
        BadgeModule,
        RadioButtonModule,
        InputSwitchModule,
        TooltipModule,
        MegaMenuModule,
        RippleModule,
        RouterModule,
        ButtonModule,
        MenuModule,
        AppConfigModule,
        MenuModule,
        TabViewModule,
        SharedModule,
    ],
})
export class AppLayoutModule { }
