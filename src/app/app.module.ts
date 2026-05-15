import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { ErrorHandlingInterceptor } from './core/interceptors/error-handling.interceptor';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { RoutingHeaderInterceptor } from './core/interceptors/routing-header.interceptor';
import { SafePipe } from './core/pipes/safe.pipe';
import { AppLayoutModule } from './layout/app-layout/app.layout.module';
import { AppTranslateModule } from './Shared/shared/app-translate.module';
import { SharedModule } from './Shared/shared/shared.module';

export function initRuntimeConfig(config: RuntimeConfigService) {
    return () => config.load();
}
@NgModule({
    declarations: [AppComponent, SafePipe],
    imports: [
        CommonModule,
        HttpClientModule,
        AppRoutingModule,
        AppLayoutModule,
        DialogModule,
        // DynamicDialogModule,
        TranslateModule,
        AppTranslateModule.forRoot(),
        SharedModule,
    ],
    providers: [
        DialogService,
        MessageService,
        {
            provide: APP_INITIALIZER,
            useFactory: initRuntimeConfig,
            deps: [RuntimeConfigService],
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: RoutingHeaderInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: ErrorHandlingInterceptor,
            multi: true,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: LoadingInterceptor,
            multi: true,
        },
    ],
    bootstrap: [AppComponent],
    exports: [SafePipe]

})
export class AppModule { }
