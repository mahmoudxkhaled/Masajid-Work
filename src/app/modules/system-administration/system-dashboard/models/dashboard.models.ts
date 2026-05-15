export interface DashboardFilters {
    dateFrom: Date;
    dateTo: Date;
}

export interface GeneralStats {
    totalUsers: number;
    totalAccounts: number;
    totalEntities: number;
    totalOperations: number;
    usersTrendPercent: number;
    accountsTrendPercent: number;
    entitiesTrendPercent: number;
    operationsTrendPercent: number;
}

export interface ApiOverviewSummary {
    totalCalls: number;
    peakHourLabel: string;
    averageResponseTimeMs: number;
    errorRatePercent: number;
}

export interface HourlyTrafficPoint {
    hour: number;
    count: number;
}

export interface ApiEndpointRow {
    id: string;
    endpoint: string;
    totalCalls: number;
    avgResponseTimeMs: number;
    errorCount: number;
    successRatePercent: number;
    lastCalled: string;
}

export interface RequestDetailMetrics {
    totalCalls: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
    minLatencyMs: number;
    errorRatePercent: number;
}

export interface LatencyPoint {
    hour: number;
    avgMs: number;
}

export interface ErrorPoint {
    hour: number;
    count: number;
}

export interface RequestSampleRow {
    timestamp: string;
    responseTimeMs: number;
    status: 'success' | 'error';
    statusCode: number;
}

export interface DailyTrendPoint {
    label: string;
    value: number;
}
