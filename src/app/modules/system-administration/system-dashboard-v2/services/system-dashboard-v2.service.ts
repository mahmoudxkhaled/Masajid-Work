import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SystemDashboardV2MockDataSource } from '../data/system-dashboard-v2-mock.data-source';
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

@Injectable({
    providedIn: 'root',
})
export class SystemDashboardV2Service {
    constructor(private mockDataSource: SystemDashboardV2MockDataSource) {}

    getGeneralStats(filters: DashboardFilters): Observable<GeneralStats> {
        return this.mockDataSource.getGeneralStats(filters);
    }

    getDailyOperationsTrend(filters: DashboardFilters): Observable<DailyTrendPoint[]> {
        return this.mockDataSource.getDailyOperationsTrend(filters);
    }

    getApiTrafficSeries(filters: DashboardFilters): Observable<HourlyTrafficPoint[]> {
        return this.mockDataSource.getApiTrafficSeries(filters);
    }

    getApiOverviewSummary(filters: DashboardFilters): Observable<ApiOverviewSummary> {
        return this.mockDataSource.getApiOverviewSummary(filters);
    }

    getApiEndpointsSummary(filters: DashboardFilters): Observable<ApiEndpointRow[]> {
        return this.mockDataSource.getApiEndpointsSummary(filters);
    }

    getActiveAlerts(filters: DashboardFilters): Observable<DashboardAlert[]> {
        return this.mockDataSource.getActiveAlerts(filters);
    }

    getHealthDependencies(filters: DashboardFilters): Observable<HealthDependency[]> {
        return this.mockDataSource.getHealthDependencies(filters);
    }

    getEndpointRankings(filters: DashboardFilters): Observable<EndpointRankings> {
        return this.mockDataSource.getEndpointRankings(filters);
    }

    getRequestDetailMetrics(endpointId: string, filters: DashboardFilters): Observable<RequestDetailMetrics> {
        return this.mockDataSource.getRequestDetailMetrics(endpointId, filters);
    }

    getRequestCountSeries(endpointId: string, filters: DashboardFilters): Observable<HourlyTrafficPoint[]> {
        return this.mockDataSource.getRequestCountSeries(endpointId, filters);
    }

    getLatencySeries(endpointId: string, filters: DashboardFilters): Observable<LatencyPoint[]> {
        return this.mockDataSource.getLatencySeries(endpointId, filters);
    }

    getErrorSeries(endpointId: string, filters: DashboardFilters): Observable<ErrorPoint[]> {
        return this.mockDataSource.getErrorSeries(endpointId, filters);
    }

    getRequestSamples(endpointId: string, filters: DashboardFilters): Observable<RequestSampleRow[]> {
        return this.mockDataSource.getRequestSamples(endpointId, filters);
    }

    searchLogs(filters: DashboardFilters, search: LogSearchFilters): Observable<LogLineRow[]> {
        return this.mockDataSource.searchLogs(filters, search);
    }

    getTraceSpans(traceId: string): Observable<TraceSpanRow[]> {
        return this.mockDataSource.getTraceSpans(traceId);
    }
}
