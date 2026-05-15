import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SystemDashboardMockDataSource } from '../data/system-dashboard-mock.data-source';
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

@Injectable({
    providedIn: 'root',
})
export class SystemDashboardService {
    constructor(private mockDataSource: SystemDashboardMockDataSource) {}

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
}
