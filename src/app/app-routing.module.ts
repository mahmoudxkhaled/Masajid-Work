import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app-layout/app.layout.component';
import { AuthGuard } from './core/Guards/auth.guard';

const routerOptions: ExtraOptions = {
    anchorScrolling: 'enabled',
    useHash: false,
};

const routes: Routes = [
    {
        path: '',
        component: AppLayoutComponent,
        children: [
            {
                path: '',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'dashboard' },
                loadChildren: () => import('./modules/dashboard/dashboard.module').then((m) => m.DashboardModule),
            },
            {
                path: 'summary',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'summary' },
                loadChildren: () => import('./modules/summary/summary.module').then((m) => m.SummaryModule),
            },
            {
                path: 'system-administration',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'systemAdministration' },
                loadChildren: () => import('./modules/system-administration/system-administration.module').then((m) => m.SystemAdministrationModule),
            },
            {
                path: 'entity-administration',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'companyAdministration' },
                loadChildren: () => import('./modules/entity-administration/entity-administration.module').then((m) => m.EntityAdministrationModule),
            },
            {
                path: 'document-control',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'documentControl' },
                loadChildren: () => import('./modules/document-control/document-control.module').then((m) => m.DocumentControlModule),
            },
            {
                path: 'financials',
                canActivate: [AuthGuard],
                data: { breadcrumb: 'financials' },
                loadChildren: () => import('./modules/finance-accounting/financials.module').then((m) => m.FinancialsModule),
            },

        ],
    },
    {
        path: 'auth',
        data: { breadcrumb: 'auth' },
        loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
    },
    {
        path: 'GetQuote',
        data: { breadcrumb: 'auth' },
        loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
    },
    {
        path: 'notfound',
        loadChildren: () => import('./core/components/notfound/notfound.module').then((m) => m.NotfoundModule),
    },
    {
        path: 'under-development',
        loadChildren: () => import('./core/components/under-development/under-development.module').then((m) => m.UnderDevelopmentModule),
    },
    {
        path: 'landing',
        loadChildren: () => import('./core/components/landing/landing.module').then((m) => m.LandingModule),
    },
    { path: '**', redirectTo: '/notfound' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule],
})
export class AppRoutingModule { }
