import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UnderDevelopmentRoutingModule } from './under-development-routing.module';
import { UnderDevelopmentComponent } from './under-development.component';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        UnderDevelopmentRoutingModule,
        ButtonModule,
        RippleModule
    ],
    declarations: [UnderDevelopmentComponent]
})
export class UnderDevelopmentModule { }
