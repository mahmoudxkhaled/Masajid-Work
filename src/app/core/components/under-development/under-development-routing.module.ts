import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UnderDevelopmentComponent } from './under-development.component';

@NgModule({
    imports: [RouterModule.forChild([
        { path: '', component: UnderDevelopmentComponent }
    ])],
    exports: [RouterModule]
})
export class UnderDevelopmentRoutingModule { }
