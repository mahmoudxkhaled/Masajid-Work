import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { LocalStorageService } from '../services/local-storage.service';

@Injectable()
export class ErrorHandlingInterceptor implements HttpInterceptor {
    private sessionExpiredRedirectScheduled = false;

    constructor(
        private router: Router,
        private localStorageService: LocalStorageService,
        private messageService: MessageService,
        private translate: TranslateService
    ) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const isLogoutRequest = this.isLogoutRequest(req);

        return next.handle(req).pipe(
            tap((event: HttpEvent<any>) => {
                if (event instanceof HttpResponse && !isLogoutRequest) {
                    this.handleBusinessError(event);
                }
            }),
            catchError((error: HttpErrorResponse) => {
                if (!isLogoutRequest) {
                    this.showErrorMessage(error);
                }
                return throwError(() => new Error(error.message || 'An unknown error occurred'));
            })
        );
    }

    private isLogoutRequest(req: HttpRequest<any>): boolean {
        if (req.body && req.body.Contents && Array.isArray(req.body.Contents)) {
            return req.body.Contents[0] === 102;
        }
        return false;
    }

    private handleBusinessError(response: HttpResponse<any>): void {
        if (!response || !response.body) {
            return;
        }

        const body = response.body;
        let errorCode: string | null = null;

        if (body.message && !body.success) {
            errorCode = body.message.toString();
        }

        if (!errorCode) {
            return;
        }

        if (this.isGenericErrorCode(errorCode)) {
            if (this.isSessionExpiredCode(errorCode)) {
                this.redirectToLoginForExpiredSession();
                return;
            }

            const detail = this.getGenericErrorDetail(errorCode);
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail,
                life: 6000
            });
        }
    }

    private showErrorMessage(error: HttpErrorResponse): void {
        let errorMessage = this.translate.instant('errorHandling.httpTryAgain');
        let errorCode: string | null = null;

        if (error.error) {
            if (typeof error.error === 'string') {
                try {
                    const parsed = JSON.parse(error.error);
                    errorMessage = parsed.message || errorMessage;
                    errorCode = parsed.errorCode || parsed.message || null;
                } catch {
                    errorMessage = error.error;
                    errorCode = error.error;
                }
            } else if (error.error.message) {
                errorMessage = error.error.message;
                errorCode = error.error.errorCode || error.error.message;
            } else if (error.error.errorList && Array.isArray(error.error.errorList)) {
                errorMessage = error.error.errorList.map((e: any) => e.message).join(', ');
                errorCode = error.error.errorList[0].errorCode || null;
            }
        }

        if (errorCode && this.isGenericErrorCode(errorCode)) {
            if (this.isSessionExpiredCode(errorCode)) {
                this.redirectToLoginForExpiredSession();
                return;
            }

            const genericErrorDetail = this.getGenericErrorDetail(errorCode);
            this.messageService.add({
                severity: 'error',
                summary: this.translate.instant('common.error'),
                detail: genericErrorDetail,
                life: 6000
            });
            return;
        }

        this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('errorHandling.httpErrorSummary', { status: String(error.status) }),
            detail: this.translate.instant('errorHandling.httpErrorDetail', { message: errorMessage }),
            life: 6000
        });
    }

    private redirectToLoginForExpiredSession(): void {
        if (this.sessionExpiredRedirectScheduled) {
            return;
        }
        this.sessionExpiredRedirectScheduled = true;
        this.localStorageService.clearLoginDataPackage();
        const urlTree = this.router.createUrlTree(['/auth'], { queryParams: { sessionExpired: '1' } });
        const url = this.router.serializeUrl(urlTree);
        window.location.assign(`${window.location.origin}${url}`);
    }

    private isGenericErrorCode(code: string): boolean {
        if (!code || typeof code !== 'string') {
            return false;
        }
        let match = code.match(/^ERP11(\d{3})$/);
        if (!match) {
            match = code.match(/^11(\d{3})$/);
        }
        if (!match) {
            return false;
        }
        const number = parseInt(match[1], 10);
        return number >= 0 && number <= 99;
    }

    private normalizeGenericErpCode(code: string): string {
        const c = String(code || '').trim();
        if (/^ERP11\d{3}$/.test(c)) {
            return c;
        }
        const m = c.match(/^11(\d{3})$/);
        if (m) {
            return `ERP11${m[1]}`;
        }
        return c;
    }

    private isSessionExpiredCode(code: string): boolean {
        const normalized = this.normalizeGenericErpCode(code);
        const sessionExpiredCodes = [
            'ERP11040',
            'ERP11041',
            'ERP11042',
            'ERP11062',
            'ERP11063'
        ];
        return sessionExpiredCodes.includes(normalized);
    }

    private getGenericErrorDetail(code: string): string {
        const normalized = this.normalizeGenericErpCode(code);

        if (normalized.match(/^ERP11(071|072|073|074|075|076|077|078|079|08[0-9]|09[0-9])$/)) {
            const match = normalized.match(/^ERP11(\d{3})$/);
            if (match) {
                const paramNumber = parseInt(match[1], 10) - 70;
                return this.translate.instant('errorHandling.genericErrors.paramInvalidType', { n: String(paramNumber) });
            }
        }

        const key = `errorHandling.genericErrors.${normalized}`;
        const translated = this.translate.instant(key);
        if (translated !== key) {
            return translated;
        }
        return this.translate.instant('errorHandling.genericErrors.unknownWithCode', { code: normalized });
    }
}
