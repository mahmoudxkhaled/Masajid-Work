import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
    ApiEndpointRow,
    ApiOverviewSummary,
    DailyTrendPoint,
    DashboardFilters,
    ErrorPoint,
    GeneralStats,
    HourlyTrafficPoint,
    LatencyPoint,
    RequestDetailMetrics,
    RequestSampleRow,
} from '../models/dashboard.models';

const MOCK_ENDPOINTS: ApiEndpointRow[] = [
    {
        id: 'e1',
        endpoint: '/SystemAPIs/Call',
        totalCalls: 8420,
        avgResponseTimeMs: 118,
        errorCount: 12,
        successRatePercent: 99.86,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e2',
        endpoint: '/api/entities/list',
        totalCalls: 3210,
        avgResponseTimeMs: 245,
        errorCount: 4,
        successRatePercent: 99.88,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e3',
        endpoint: '/api/users/search',
        totalCalls: 2890,
        avgResponseTimeMs: 92,
        errorCount: 2,
        successRatePercent: 99.93,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e4',
        endpoint: '/api/documents/upload',
        totalCalls: 640,
        avgResponseTimeMs: 890,
        errorCount: 18,
        successRatePercent: 97.19,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e5',
        endpoint: '/api/reports/generate',
        totalCalls: 210,
        avgResponseTimeMs: 4200,
        errorCount: 9,
        successRatePercent: 95.71,
        lastCalled: new Date().toISOString(),
    },
];

function hashFilters(filters: DashboardFilters): number {
    const s = filters.dateFrom.getTime() + filters.dateTo.getTime();
    return Math.abs(s % 17);
}

@Injectable({
    providedIn: 'root',
})
export class SystemDashboardMockDataSource {
    getDailyOperationsTrend(filters: DashboardFilters): Observable<DailyTrendPoint[]> {
        const h = hashFilters(filters);
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const points: DailyTrendPoint[] = labels.map((label, i) => ({
            label,
            value: Math.round(4000 + i * 320 + (h % 5) * 100 + Math.sin(i) * 200),
        }));
        return of(points).pipe(delay(280));
    }

    getGeneralStats(filters: DashboardFilters): Observable<GeneralStats> {
        const h = hashFilters(filters);
        const stats: GeneralStats = {
            totalUsers: 1240 + h * 3,
            totalAccounts: 2180 + h * 4,
            totalEntities: 86 + (h % 5),
            totalOperations: 45820 + h * 100,
            usersTrendPercent: 2.4 + (h % 10) * 0.1,
            accountsTrendPercent: 1.9 + (h % 8) * 0.15,
            entitiesTrendPercent: -0.5 + (h % 3) * 0.2,
            operationsTrendPercent: 5.1,
        };
        return of(stats).pipe(delay(350));
    }

    getApiTrafficSeries(filters: DashboardFilters): Observable<HourlyTrafficPoint[]> {
        const h = hashFilters(filters);
        const points: HourlyTrafficPoint[] = [];
        for (let hour = 0; hour < 24; hour++) {
            const base = 120 + Math.sin((hour - 8) / 4) * 80 + (h % 7) * 5;
            const peak = hour >= 9 && hour <= 17 ? 180 : 0;
            const count = Math.max(20, Math.round(base + peak + (hour % 5) * 12));
            points.push({ hour, count });
        }
        return of(points).pipe(delay(400));
    }

    getApiOverviewSummary(filters: DashboardFilters): Observable<ApiOverviewSummary> {
        const h = hashFilters(filters);
        const summary: ApiOverviewSummary = {
            totalCalls: 15200 + h * 50,
            peakHourLabel: '14:00 – 15:00',
            averageResponseTimeMs: 210 + (h % 20),
            errorRatePercent: 0.42 + (h % 10) * 0.02,
        };
        return of(summary).pipe(delay(380));
    }

    getApiEndpointsSummary(_filters: DashboardFilters): Observable<ApiEndpointRow[]> {
        const copy = MOCK_ENDPOINTS.map((row) => ({
            ...row,
            lastCalled: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        }));
        return of(copy).pipe(delay(420));
    }

    getRequestDetailMetrics(endpointId: string, filters: DashboardFilters): Observable<RequestDetailMetrics> {
        const row = MOCK_ENDPOINTS.find((e) => e.id === endpointId);
        const h = hashFilters(filters);
        const base = row
            ? {
                  totalCalls: row.totalCalls,
                  avgLatencyMs: row.avgResponseTimeMs,
                  maxLatencyMs: row.avgResponseTimeMs * 4,
                  minLatencyMs: Math.max(12, Math.round(row.avgResponseTimeMs * 0.3)),
                  errorRatePercent: (row.errorCount / Math.max(1, row.totalCalls)) * 100,
              }
            : {
                  totalCalls: 100 + h,
                  avgLatencyMs: 200,
                  maxLatencyMs: 800,
                  minLatencyMs: 40,
                  errorRatePercent: 1.2,
              };
        return of(base).pipe(delay(360));
    }

    getRequestCountSeries(endpointId: string, filters: DashboardFilters): Observable<HourlyTrafficPoint[]> {
        const h = hashFilters(filters) + endpointId.length;
        const points: HourlyTrafficPoint[] = [];
        for (let hour = 0; hour < 24; hour++) {
            const count = Math.max(5, Math.round(30 + Math.sin((hour - 10) / 3) * 20 + (h % 9) + hour % 4));
            points.push({ hour, count });
        }
        return of(points).pipe(delay(320));
    }

    getLatencySeries(endpointId: string, filters: DashboardFilters): Observable<LatencyPoint[]> {
        const h = hashFilters(filters);
        const points: LatencyPoint[] = [];
        for (let hour = 0; hour < 24; hour++) {
            const avgMs = Math.max(
                40,
                Math.round(150 + Math.sin((hour - 12) / 4) * 60 + (h % 13) * 3 + (endpointId === 'e5' ? 800 : 0))
            );
            points.push({ hour, avgMs });
        }
        return of(points).pipe(delay(330));
    }

    getErrorSeries(endpointId: string, filters: DashboardFilters): Observable<ErrorPoint[]> {
        const h = hashFilters(filters);
        const points: ErrorPoint[] = [];
        for (let hour = 0; hour < 24; hour++) {
            const count = Math.max(0, Math.round((hour % 7) * 0.4 + (h % 3) + (endpointId === 'e4' ? 1 : 0)));
            points.push({ hour, count });
        }
        return of(points).pipe(delay(310));
    }

    getRequestSamples(endpointId: string, filters: DashboardFilters): Observable<RequestSampleRow[]> {
        const h = hashFilters(filters);
        const rows: RequestSampleRow[] = [];
        const baseTime = filters.dateTo.getTime();
        for (let i = 0; i < 12; i++) {
            const err = i % 7 === 0 && endpointId === 'e4';
            rows.push({
                timestamp: new Date(baseTime - i * 120000 - h * 1000).toISOString(),
                responseTimeMs: Math.round(80 + Math.random() * 400 + (endpointId === 'e5' ? 2000 : 0)),
                status: err ? 'error' : 'success',
                statusCode: err ? 500 : 200,
            });
        }
        return of(rows).pipe(delay(340));
    }
}
