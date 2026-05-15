import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
    ApiEndpointRow,
    ApiOverviewSummary,
    DailyTrendPoint,
    DashboardAlert,
    DashboardFilters,
    EndpointRankings,
    ErrorPoint,
    GeneralStats,
    HealthDependency,
    HourlyTrafficPoint,
    LatencyPoint,
    LogLineRow,
    LogSearchFilters,
    RequestDetailMetrics,
    RequestSampleRow,
    TraceSpanRow,
} from '../models/dashboard-v2.models';

const MOCK_ENDPOINTS: ApiEndpointRow[] = [
    {
        id: 'e1',
        endpoint: '/SystemAPIs/Call',
        totalCalls: 8420,
        avgResponseTimeMs: 118,
        latencyP95Ms: 210,
        latencyP99Ms: 380,
        errorCount: 12,
        successRatePercent: 99.86,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e2',
        endpoint: '/api/entities/list',
        totalCalls: 3210,
        avgResponseTimeMs: 245,
        latencyP95Ms: 410,
        latencyP99Ms: 620,
        errorCount: 4,
        successRatePercent: 99.88,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e3',
        endpoint: '/api/users/search',
        totalCalls: 2890,
        avgResponseTimeMs: 92,
        latencyP95Ms: 160,
        latencyP99Ms: 240,
        errorCount: 2,
        successRatePercent: 99.93,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e4',
        endpoint: '/api/documents/upload',
        totalCalls: 640,
        avgResponseTimeMs: 890,
        latencyP95Ms: 1520,
        latencyP99Ms: 2400,
        errorCount: 18,
        successRatePercent: 97.19,
        lastCalled: new Date().toISOString(),
    },
    {
        id: 'e5',
        endpoint: '/api/reports/generate',
        totalCalls: 210,
        avgResponseTimeMs: 4200,
        latencyP95Ms: 8900,
        latencyP99Ms: 12000,
        errorCount: 9,
        successRatePercent: 95.71,
        lastCalled: new Date().toISOString(),
    },
];

function hashFilters(filters: DashboardFilters): number {
    const s = filters.dateFrom.getTime() + filters.dateTo.getTime();
    return Math.abs(s % 17);
}

function cloneEndpoints(): ApiEndpointRow[] {
    return MOCK_ENDPOINTS.map((row) => ({
        ...row,
        lastCalled: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    }));
}

@Injectable({
    providedIn: 'root',
})
export class SystemDashboardV2MockDataSource {
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
            latencyP50Ms: 95 + (h % 15),
            latencyP95Ms: 480 + (h % 40),
            latencyP99Ms: 920 + (h % 80),
            errorRatePercent: 0.42 + (h % 10) * 0.02,
            requestsPerSecond: Math.round((15200 + h * 50) / 86400 * 100) / 100 + 2.5,
        };
        return of(summary).pipe(delay(380));
    }

    getApiEndpointsSummary(_filters: DashboardFilters): Observable<ApiEndpointRow[]> {
        return of(cloneEndpoints()).pipe(delay(420));
    }

    getActiveAlerts(filters: DashboardFilters): Observable<DashboardAlert[]> {
        const h = hashFilters(filters);
        const alerts: DashboardAlert[] = [
            {
                id: 'a1',
                severity: 'warning',
                title: 'systemAdministration.dashboard.alerts.mock.highLatency',
                message: 'systemAdministration.dashboard.alerts.mock.highLatencyDetail',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                source: 'API Gateway',
            },
            {
                id: 'a2',
                severity: 'info',
                title: 'systemAdministration.dashboard.alerts.mock.deploy',
                message: 'systemAdministration.dashboard.alerts.mock.deployDetail',
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                source: 'CI',
            },
        ];
        if (h % 3 === 0) {
            alerts.unshift({
                id: 'a0',
                severity: 'critical',
                title: 'systemAdministration.dashboard.alerts.mock.errorSpike',
                message: 'systemAdministration.dashboard.alerts.mock.errorSpikeDetail',
                createdAt: new Date(Date.now() - 600000).toISOString(),
                source: 'Monitoring',
            });
        }
        return of(alerts).pipe(delay(200));
    }

    getHealthDependencies(filters: DashboardFilters): Observable<HealthDependency[]> {
        const h = hashFilters(filters);
        const deps: HealthDependency[] = [
            {
                id: 'db',
                nameKey: 'systemAdministration.dashboard.health.database',
                status: h % 5 === 0 ? 'degraded' : 'healthy',
                lastCheckedAt: new Date().toISOString(),
                detail: h % 5 === 0 ? 'connection pool 78%' : undefined,
            },
            {
                id: 'cache',
                nameKey: 'systemAdministration.dashboard.health.cache',
                status: 'healthy',
                lastCheckedAt: new Date().toISOString(),
            },
            {
                id: 'external',
                nameKey: 'systemAdministration.dashboard.health.externalApi',
                status: 'healthy',
                lastCheckedAt: new Date().toISOString(),
            },
        ];
        return of(deps).pipe(delay(220));
    }

    getEndpointRankings(filters: DashboardFilters): Observable<EndpointRankings> {
        const rows = cloneEndpoints();
        const slowest = [...rows].sort((a, b) => b.avgResponseTimeMs - a.avgResponseTimeMs).slice(0, 5);
        const busiest = [...rows].sort((a, b) => b.totalCalls - a.totalCalls).slice(0, 5);
        const mostErrors = [...rows].sort((a, b) => b.errorCount - a.errorCount).slice(0, 5);
        return of({ slowest, busiest, mostErrors }).pipe(delay(300));
    }

    getRequestDetailMetrics(endpointId: string, filters: DashboardFilters): Observable<RequestDetailMetrics> {
        const row = MOCK_ENDPOINTS.find((e) => e.id === endpointId);
        const h = hashFilters(filters);
        const totalSeconds = Math.max(
            1,
            (filters.dateTo.getTime() - filters.dateFrom.getTime()) / 1000
        );
        const base = row
            ? {
                  totalCalls: row.totalCalls,
                  avgLatencyMs: row.avgResponseTimeMs,
                  latencyP50Ms: Math.round(row.avgResponseTimeMs * 0.55),
                  latencyP95Ms: row.latencyP95Ms,
                  latencyP99Ms: row.latencyP99Ms,
                  maxLatencyMs: row.avgResponseTimeMs * 4,
                  minLatencyMs: Math.max(12, Math.round(row.avgResponseTimeMs * 0.3)),
                  errorRatePercent: (row.errorCount / Math.max(1, row.totalCalls)) * 100,
                  requestsPerSecond: Math.round((row.totalCalls / totalSeconds) * 100) / 100,
              }
            : {
                  totalCalls: 100 + h,
                  avgLatencyMs: 200,
                  latencyP50Ms: 110,
                  latencyP95Ms: 380,
                  latencyP99Ms: 720,
                  maxLatencyMs: 800,
                  minLatencyMs: 40,
                  errorRatePercent: 1.2,
                  requestsPerSecond: 0.15,
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
            const traceId = `tr-${endpointId}-${10000 + i * 17 + h}`;
            rows.push({
                timestamp: new Date(baseTime - i * 120000 - h * 1000).toISOString(),
                responseTimeMs: Math.round(80 + Math.random() * 400 + (endpointId === 'e5' ? 2000 : 0)),
                status: err ? 'error' : 'success',
                statusCode: err ? 500 : 200,
                traceId,
                requestId: `req-${20000 + i + h}`,
            });
        }
        return of(rows).pipe(delay(340));
    }

    searchLogs(filters: DashboardFilters, search: LogSearchFilters): Observable<LogLineRow[]> {
        const h = hashFilters(filters);
        const base: LogLineRow[] = [
            {
                id: 'l1',
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Connection timeout after 30s',
                service: 'api-gateway',
                traceId: 'tr-e4-10017',
            },
            {
                id: 'l2',
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'warn',
                message: 'Retry attempt 2 of 3',
                service: 'documents',
                traceId: 'tr-e4-10034',
            },
            {
                id: 'l3',
                timestamp: new Date(Date.now() - 120000).toISOString(),
                level: 'info',
                message: 'Request completed in 118ms',
                service: 'SystemAPIs',
                traceId: 'tr-e1-10000',
            },
        ];
        let result = base;
        if (search.traceId?.trim()) {
            const t = search.traceId.trim().toLowerCase();
            result = result.filter((l) => l.traceId?.toLowerCase().includes(t));
        }
        if (search.query?.trim()) {
            const q = search.query.trim().toLowerCase();
            result = result.filter((l) => l.message.toLowerCase().includes(q) || l.service?.toLowerCase().includes(q));
        }
        if (search.level) {
            result = result.filter((l) => l.level === search.level);
        }
        if (result.length === 0 && !search.traceId && !search.query && !search.level) {
            result = base;
        }
        return of(result).pipe(delay(280));
    }

    getTraceSpans(traceId: string): Observable<TraceSpanRow[]> {
        const id = traceId.trim();
        if (!id) {
            return of([]).pipe(delay(100));
        }
        const spans: TraceSpanRow[] = [
            {
                spanId: 's1',
                operationName: 'HTTP GET',
                serviceName: 'api-gateway',
                durationMs: 12,
                startOffsetMs: 0,
                status: 'ok',
            },
            {
                spanId: 's2',
                parentSpanId: 's1',
                operationName: 'Auth.ValidateToken',
                serviceName: 'auth-service',
                durationMs: 8,
                startOffsetMs: 12,
                status: 'ok',
            },
            {
                spanId: 's3',
                parentSpanId: 's1',
                operationName: 'Handler.Execute',
                serviceName: 'core-api',
                durationMs: 95,
                startOffsetMs: 22,
                status: 'ok',
            },
            {
                spanId: 's4',
                parentSpanId: 's3',
                operationName: 'SQL Query',
                serviceName: 'sql-server',
                durationMs: 42,
                startOffsetMs: 40,
                status: 'ok',
            },
        ];
        return of(spans).pipe(delay(350));
    }
}
