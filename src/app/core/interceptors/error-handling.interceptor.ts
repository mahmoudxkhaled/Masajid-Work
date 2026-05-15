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
                    this.handleBusinessError(req, event);
                }
            }),
            catchError((error: HttpErrorResponse) => {
                if (!isLogoutRequest) {
                    this.showErrorMessage(req, error);
                }
                return throwError(() => new Error(error.message || 'An unknown error occurred'));
            })
        );
    }

    private getPackedRequestCode(req: HttpRequest<any>): number | null {
        const contents = req.body?.Contents;
        if (!Array.isArray(contents) || contents.length < 4) {
            return null;
        }
        return contents[0] | (contents[1] << 8) | (contents[2] << 16) | (contents[3] << 24);
    }

    private logApiErrorContext(req: HttpRequest<any>, kind: 'business' | 'http', payload: Record<string, unknown>): void {
        const requestCode = this.getPackedRequestCode(req);
        console.error('[ErrorHandlingInterceptor]', kind, {
            url: req.url,
            method: req.method,
            requestCode,
            ...payload,
        });
    }

    private isLogoutRequest(req: HttpRequest<any>): boolean {
        if (req.body && req.body.Contents && Array.isArray(req.body.Contents)) {
            return req.body.Contents[0] === 102;
        }
        return false;
    }

    private handleBusinessError(req: HttpRequest<any>, response: HttpResponse<any>): void {
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

        this.logApiErrorContext(req, 'business', {
            success: body.success,
            errorCode,
        });

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

    private showErrorMessage(req: HttpRequest<any>, error: HttpErrorResponse): void {
        this.logApiErrorContext(req, 'http', {
            status: error.status,
            statusText: error.statusText,
            error: error.error,
        });

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

    private canonicalErrorCode(code: string): string {
        const c = String(code || '').trim();
        const m = c.match(/^ERP(\d+)$/i);
        if (m) {
            return `DAP${m[1]}`;
        }
        return c;
    }

    private isGenericErrorCode(code: string): boolean {
        if (!code || typeof code !== 'string') {
            return false;
        }
        const canon = this.canonicalErrorCode(code);
        let match = canon.match(/^DAP11(\d{3})$/);
        if (!match) {
            match = canon.match(/^11(\d{3})$/);
            if (match) {
                const number = parseInt(match[1], 10);
                return number >= 0 && number <= 99;
            }
            return false;
        }
        const number = parseInt(match[1], 10);
        return number >= 0 && number <= 99;
    }

    private normalizeGenericErrorCode(code: string): string {
        const c = this.canonicalErrorCode(String(code || '').trim());
        if (/^DAP11\d{3}$/.test(c)) {
            return c;
        }
        const m = c.match(/^11(\d{3})$/);
        if (m) {
            return `DAP11${m[1]}`;
        }
        return c;
    }

    private isSessionExpiredCode(code: string): boolean {
        const normalized = this.normalizeGenericErrorCode(code);
        const sessionExpiredCodes = [
            'DAP11040',
            'DAP11041',
            'DAP11042',
            'DAP11062',
            'DAP11063'
        ];
        return sessionExpiredCodes.includes(normalized);
    }

    private getGenericErrorDetail(code: string): string {
        const normalized = this.normalizeGenericErrorCode(code);

        if (normalized.match(/^DAP11(071|072|073|074|075|076|077|078|079|08[0-9]|09[0-9])$/)) {
            const match = normalized.match(/^DAP11(\d{3})$/);
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
