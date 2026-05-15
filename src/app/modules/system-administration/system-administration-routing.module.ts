import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: 'erp-functions',
        loadChildren: () => import('./erp-functions/erp-functions.module').then((m) => m.ErpFunctionsModule),
        data: { breadcrumb: 'erpFunctions' }
    },
    {
        path: 'erp-modules',
        loadChildren: () => import('./erp-modules/erp-modules.module').then((m) => m.ErpModulesModule),
        data: { breadcrumb: 'erpModules' }
    },
    {
        path: 'system-storage-management',
        loadChildren: () => import('./system-storage-management/system-storage-management.module').then((m) => m.SystemStorageManagementModule),
        data: { breadcrumb: 'fileSystemSSM' }
    },
    {
        path: 'system-entities',
        loadChildren: () => import('./system-entities/system-entities.module').then((m) => m.SystemEntitiesModule),
        data: { breadcrumb: 'entitiesList' }
    },
    {
        path: 'user-accounts',
        loadChildren: () => import('./user-accounts/user-accounts.module').then((m) => m.SystemUserAccountsModule),
        data: { breadcrumb: 'userAccounts' }
    },
    {
        path: 'dashboard',
        loadChildren: () => import('./system-dashboard/system-dashboard.module').then((m) => m.SystemDashboardModule),
        data: { breadcrumb: 'systemAdminDashboard' }
    },
    {
        path: 'dashboard-v2',
        loadChildren: () => import('./system-dashboard-v2/system-dashboard-v2.module').then((m) => m.SystemDashboardV2Module),
        data: { breadcrumb: 'systemAdminDashboardV2' }
    },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SystemAdministrationRoutingModule { }

