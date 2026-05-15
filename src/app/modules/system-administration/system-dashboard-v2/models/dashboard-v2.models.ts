export type DashboardEnvironment = 'dev' | 'staging' | 'prod';

export interface DashboardFilters {
    dateFrom: Date;
    dateTo: Date;
    environment?: DashboardEnvironment;
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
    latencyP50Ms: number;
    latencyP95Ms: number;
    latencyP99Ms: number;
    errorRatePercent: number;
    requestsPerSecond: number;
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
    latencyP95Ms: number;
    latencyP99Ms: number;
    errorCount: number;
    successRatePercent: number;
    lastCalled: string;
}

export interface RequestDetailMetrics {
    totalCalls: number;
    avgLatencyMs: number;
    latencyP50Ms: number;
    latencyP95Ms: number;
    latencyP99Ms: number;
    maxLatencyMs: number;
    minLatencyMs: number;
    errorRatePercent: number;
    requestsPerSecond: number;
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
    traceId?: string;
    requestId?: string;
}

export interface DailyTrendPoint {
    label: string;
    value: number;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface DashboardAlert {
    id: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    createdAt: string;
    source?: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface HealthDependency {
    id: string;
    nameKey: string;
    status: HealthStatus;
    lastCheckedAt: string;
    detail?: string;
}

export interface EndpointRankings {
    slowest: ApiEndpointRow[];
    busiest: ApiEndpointRow[];
    mostErrors: ApiEndpointRow[];
}

export interface LogSearchFilters {
    query?: string;
    traceId?: string;
    level?: string;
}

export interface LogLineRow {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    service?: string;
    traceId?: string;
}

export interface TraceSpanRow {
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    serviceName: string;
    durationMs: number;
    startOffsetMs: number;
    status: 'ok' | 'error';
}
