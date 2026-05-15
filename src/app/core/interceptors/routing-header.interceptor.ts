import { Injectable } from '@angular/core';
import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class RoutingHeaderInterceptor implements HttpInterceptor {
    // Fixed routing value required by ERP SystemAPIs
    private readonly routingValue =
        '05642da1523d47def94966340c594db95e3d4be8fc87fdb45e5b40d4cfef7db8';

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Only apply to SystemAPIs calls
        if (!req.url.includes('/SystemAPIs/')) {
            return next.handle(req);
        }

        // Do not override if header already exists
        if (req.headers.has('Routing')) {
            return next.handle(req);
        }

        // Clone request and add Routing header
        const cloned = req.clone({
            setHeaders: {
                Routing: this.routingValue
            }
        });

        return next.handle(cloned);
    }
}
