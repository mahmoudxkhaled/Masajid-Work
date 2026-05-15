import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// For now, no routes - components are used as child components in entities
// Future routes can be added here when needed

const routes: Routes = [
    // Placeholder for future routes
    // { path: '', component: EntityAccountListComponent, data: { breadcrumb: 'entityAccounts' } }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntityAccountsRoutingModule { }
