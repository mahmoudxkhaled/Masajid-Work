import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { forkJoin, Subscription } from 'rxjs';
import {
    ApiEndpointRow,
    ApiOverviewSummary,
    DailyTrendPoint,
    DashboardAlert,
    DashboardEnvironment,
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
} from '../../models/dashboard-v2.models';
import { SystemDashboardV2Service } from '../../services/system-dashboard-v2.service';

@Component({
    selector: 'app-system-dashboard-v2',
    templateUrl: './system-dashboard-v2.component.html',
    styleUrls: ['./system-dashboard-v2.component.scss'],
})
export class SystemDashboardV2Component implements OnInit, OnDestroy {
    readonly chartHeightMain = '320px';
    readonly chartHeightCompact = '220px';

    readonly environmentOptions: { labelKey: string; value: DashboardEnvironment }[] = [
        { labelKey: 'systemAdministration.dashboard.filters.environmentProd', value: 'prod' },
        { labelKey: 'systemAdministration.dashboard.filters.environmentStaging', value: 'staging' },
        { labelKey: 'systemAdministration.dashboard.filters.environmentDev', value: 'dev' },
    ];

    readonly autoRefreshIntervalOptions: { labelKey: string; value: number }[] = [
        { labelKey: 'systemAdministration.dashboard.autoRefresh.off', value: 0 },
        { labelKey: 'systemAdministration.dashboard.autoRefresh.seconds10', value: 10 },
        { labelKey: 'systemAdministration.dashboard.autoRefresh.seconds30', value: 30 },
        { labelKey: 'systemAdministration.dashboard.autoRefresh.seconds60', value: 60 },
    ];

    rangeDates: Date[] | null = null;
    activeTabIndex = 0;
    selectedEnvironment: DashboardEnvironment = 'prod';
    autoRefreshSeconds = 0;
    loadingStats = false;
    loadingApi = false;
    loadingRequest = false;
    loadingLogs = false;
    loadingTrace = false;
    lastUpdated: Date | null = null;

    generalStats: GeneralStats | null = null;
    apiOverviewSummary: ApiOverviewSummary | null = null;
    trafficSeries: HourlyTrafficPoint[] = [];
    endpoints: ApiEndpointRow[] = [];
    selectedEndpointId: string | null = null;
    operationsTrend: DailyTrendPoint[] = [];

    activeAlerts: DashboardAlert[] = [];
    healthDependencies: HealthDependency[] = [];
    endpointRankings: EndpointRankings | null = null;

    requestMetrics: RequestDetailMetrics | null = null;
    requestCountSeries: HourlyTrafficPoint[] = [];
    latencySeries: LatencyPoint[] = [];
    errorSeries: ErrorPoint[] = [];
    requestSamples: RequestSampleRow[] = [];

    logSearchQuery = '';
    logTraceFilter = '';
    logLevelFilter = '';
    logLevelOptions: { labelKey: string; value: string }[] = [
        { labelKey: 'systemAdministration.dashboard.logs.levelAll', value: '' },
        { labelKey: 'systemAdministration.dashboard.logs.levelError', value: 'error' },
        { labelKey: 'systemAdministration.dashboard.logs.levelWarn', value: 'warn' },
        { labelKey: 'systemAdministration.dashboard.logs.levelInfo', value: 'info' },
        { labelKey: 'systemAdministration.dashboard.logs.levelDebug', value: 'debug' },
    ];
    logLines: LogLineRow[] = [];

    traceLookupId = '';
    traceSpans: TraceSpanRow[] = [];

    trafficChartData: unknown;
    trafficChartOptions: unknown;
    operationsTrendChartData: unknown;
    operationsTrendChartOptions: unknown;
    requestCountChartData: unknown;
    requestCountChartOptions: unknown;
    latencyChartData: unknown;
    latencyChartOptions: unknown;
    errorChartData: unknown;
    errorChartOptions: unknown;

    private chartTextColor = '#495057';
    private chartGridColor = '#ebedef';
    private querySub?: Subscription;
    private langSub?: Subscription;
    private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

    constructor(
        private dashboardService: SystemDashboardV2Service,
        private messageService: MessageService,
        private translate: TranslateService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.initChartTheme();
        this.initDateRange();
        const epFromUrl = this.route.snapshot.queryParams['endpoint'];
        const envFromUrl = this.route.snapshot.queryParams['env'];
        const traceFromUrl = this.route.snapshot.queryParams['trace'];
        if (envFromUrl === 'dev' || envFromUrl === 'staging' || envFromUrl === 'prod') {
            this.selectedEnvironment = envFromUrl;
        }
        if (epFromUrl) {
            this.selectedEndpointId = epFromUrl;
            this.activeTabIndex = 2;
        }
        if (traceFromUrl) {
            this.traceLookupId = traceFromUrl;
            this.activeTabIndex = 4;
            queueMicrotask(() => this.loadTraceSpans());
        }
        this.querySub = this.route.queryParams.subscribe((params) => {
            const trace = params['trace'];
            const ep = params['endpoint'];
            if (trace) {
                this.traceLookupId = trace;
                this.activeTabIndex = 4;
            } else if (ep) {
                this.selectedEndpointId = ep;
                this.activeTabIndex = 2;
            }
            const env = params['env'];
            if (env === 'dev' || env === 'staging' || env === 'prod') {
                this.selectedEnvironment = env;
            }
            if (this.lastUpdated) {
                this.loadRequestDetailData();
            }
        });
        this.langSub = this.translate.onLangChange.subscribe(() => {
            this.rebuildAllCharts();
        });
        this.loadOverviewData();
        this.applyAutoRefreshTimer();
    }

    ngOnDestroy(): void {
        this.clearRefreshInterval();
        this.querySub?.unsubscribe();
        this.langSub?.unsubscribe();
    }

    applyFilters(): void {
        this.loadOverviewData();
    }

    onEnvironmentChange(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { env: this.selectedEnvironment },
            queryParamsHandling: 'merge',
        });
        this.loadOverviewData();
    }

    onAutoRefreshChange(): void {
        this.applyAutoRefreshTimer();
    }

    onTabChange(index: number): void {
        if (index === 3) {
            this.searchLogs();
        }
        if (index === 4 && this.traceLookupId.trim() && this.traceSpans.length === 0) {
            this.loadTraceSpans();
        }
    }

    searchLogs(): void {
        const filters = this.buildFilters();
        if (!filters) {
            return;
        }
        const search: LogSearchFilters = {
            query: this.logSearchQuery.trim() || undefined,
            traceId: this.logTraceFilter.trim() || undefined,
            level: this.logLevelFilter.trim() || undefined,
        };
        this.loadingLogs = true;
        this.dashboardService.searchLogs(filters, search).subscribe({
            next: (rows) => {
                this.logLines = rows;
                this.loadingLogs = false;
            },
            error: () => {
                this.loadingLogs = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('common.error'),
                    detail: this.translate.instant('systemAdministration.dashboard.messages.loadFailed'),
                });
            },
        });
    }

    loadTraceSpans(): void {
        const id = this.traceLookupId.trim();
        if (!id) {
            this.traceSpans = [];
            return;
        }
        this.loadingTrace = true;
        this.dashboardService.getTraceSpans(id).subscribe({
            next: (spans) => {
                this.traceSpans = spans;
                this.loadingTrace = false;
                this.router.navigate([], {
                    relativeTo: this.route,
                    queryParams: { trace: id },
                    queryParamsHandling: 'merge',
                });
            },
            error: () => {
                this.loadingTrace = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('common.error'),
                    detail: this.translate.instant('systemAdministration.dashboard.messages.loadFailed'),
                });
            },
        });
    }

    openTraceFromSample(traceId: string): void {
        this.traceLookupId = traceId;
        this.activeTabIndex = 4;
        this.loadTraceSpans();
    }

    openLogsWithTrace(traceId: string): void {
        this.logTraceFilter = traceId;
        this.activeTabIndex = 3;
        this.searchLogs();
    }

    onEndpointRowSelect(row: ApiEndpointRow): void {
        this.selectedEndpointId = row.id;
        this.activeTabIndex = 2;
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { endpoint: row.id },
            queryParamsHandling: 'merge',
        });
    }

    onEndpointDropdownChange(): void {
        if (!this.selectedEndpointId) {
            return;
        }
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { endpoint: this.selectedEndpointId },
            queryParamsHandling: 'merge',
        });
    }

    private initDateRange(): void {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        this.rangeDates = [start, end];
    }

    private initChartTheme(): void {
        const documentStyle = getComputedStyle(document.documentElement);
        const text = documentStyle.getPropertyValue('--text-color');
        const border = documentStyle.getPropertyValue('--surface-border');
        if (text?.trim()) {
            this.chartTextColor = text.trim();
        }
        if (border?.trim()) {
            this.chartGridColor = border.trim();
        }
    }

    private resolvePrimaryColor(): string {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        if (raw) {
            return raw;
        }
        return '#3b82f6';
    }

    private primaryColorFill(alpha: number): string {
        const c = this.resolvePrimaryColor();
        if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
            const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }
        const rgbMatch = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (rgbMatch) {
            return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${alpha})`;
        }
        return `rgba(59, 130, 246, ${alpha})`;
    }

    private lineDatasetStyle() {
        const border = this.resolvePrimaryColor();
        return {
            borderColor: border,
            backgroundColor: this.primaryColorFill(0.18),
            fill: true,
            tension: 0.35,
            pointBackgroundColor: border,
            pointBorderColor: border,
            pointHoverBackgroundColor: border,
            pointHoverBorderColor: border,
        };
    }

    private buildFilters(): DashboardFilters | null {
        if (!this.rangeDates || this.rangeDates.length < 2 || !this.rangeDates[0] || !this.rangeDates[1]) {
            return null;
        }
        return {
            dateFrom: this.rangeDates[0],
            dateTo: this.rangeDates[1],
            environment: this.selectedEnvironment,
        };
    }

    private clearRefreshInterval(): void {
        if (this.refreshIntervalId !== null) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
        }
    }

    private applyAutoRefreshTimer(): void {
        this.clearRefreshInterval();
        if (this.autoRefreshSeconds <= 0) {
            return;
        }
        this.refreshIntervalId = setInterval(() => {
            if (!this.loadingStats && !this.loadingApi) {
                this.loadOverviewData();
            }
        }, this.autoRefreshSeconds * 1000);
    }

    loadOverviewData(): void {
        const filters = this.buildFilters();
        if (!filters) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.instant('systemAdministration.dashboard.messages.warnTitle'),
                detail: this.translate.instant('systemAdministration.dashboard.messages.invalidDateRange'),
            });
            return;
        }
        this.loadingStats = true;
        this.loadingApi = true;
        forkJoin({
            stats: this.dashboardService.getGeneralStats(filters),
            trend: this.dashboardService.getDailyOperationsTrend(filters),
            summary: this.dashboardService.getApiOverviewSummary(filters),
            traffic: this.dashboardService.getApiTrafficSeries(filters),
            endpoints: this.dashboardService.getApiEndpointsSummary(filters),
            alerts: this.dashboardService.getActiveAlerts(filters),
            health: this.dashboardService.getHealthDependencies(filters),
            rankings: this.dashboardService.getEndpointRankings(filters),
        }).subscribe({
            next: (r) => {
                this.generalStats = r.stats;
                this.operationsTrend = r.trend;
                this.apiOverviewSummary = r.summary;
                this.trafficSeries = r.traffic;
                this.endpoints = r.endpoints;
                this.activeAlerts = r.alerts;
                this.healthDependencies = r.health;
                this.endpointRankings = r.rankings;
                if (!this.selectedEndpointId && r.endpoints.length > 0) {
                    this.selectedEndpointId = r.endpoints[0].id;
                }
                this.lastUpdated = new Date();
                this.rebuildAllCharts();
                this.loadingStats = false;
                this.loadingApi = false;
                this.loadRequestDetailData();
            },
            error: () => {
                this.loadingStats = false;
                this.loadingApi = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('common.error'),
                    detail: this.translate.instant('systemAdministration.dashboard.messages.loadFailed'),
                });
            },
        });
    }

    loadRequestDetailData(): void {
        const filters = this.buildFilters();
        if (!filters || !this.selectedEndpointId) {
            return;
        }
        this.loadingRequest = true;
        forkJoin({
            metrics: this.dashboardService.getRequestDetailMetrics(this.selectedEndpointId, filters),
            countSeries: this.dashboardService.getRequestCountSeries(this.selectedEndpointId, filters),
            latencySeries: this.dashboardService.getLatencySeries(this.selectedEndpointId, filters),
            errorSeries: this.dashboardService.getErrorSeries(this.selectedEndpointId, filters),
            samples: this.dashboardService.getRequestSamples(this.selectedEndpointId, filters),
        }).subscribe({
            next: (r) => {
                this.requestMetrics = r.metrics;
                this.requestCountSeries = r.countSeries;
                this.latencySeries = r.latencySeries;
                this.errorSeries = r.errorSeries;
                this.requestSamples = r.samples;
                this.rebuildRequestCharts();
                this.loadingRequest = false;
            },
            error: () => {
                this.loadingRequest = false;
                this.messageService.add({
                    severity: 'error',
                    summary: this.translate.instant('common.error'),
                    detail: this.translate.instant('systemAdministration.dashboard.messages.loadFailed'),
                });
            },
        });
    }

    private hourLabels(): string[] {
        const labels: string[] = [];
        for (let h = 0; h < 24; h++) {
            labels.push(`${h.toString().padStart(2, '0')}:00`);
        }
        return labels;
    }

    private rebuildAllCharts(): void {
        this.rebuildTrafficChart();
        this.rebuildOperationsTrendChart();
        this.rebuildRequestCharts();
    }

    private rebuildTrafficChart(): void {
        const labels = this.hourLabels();
        const data = this.trafficSeries.map((p) => p.count);
        const style = this.lineDatasetStyle();
        this.trafficChartData = {
            labels,
            datasets: [
                {
                    label: this.translate.instant('systemAdministration.dashboard.charts.trafficSeries'),
                    data,
                    ...style,
                },
            ],
        };
        this.trafficChartOptions = this.lineChartOptions(this.translate.instant('systemAdministration.dashboard.charts.callsPerHour'));
    }

    private rebuildOperationsTrendChart(): void {
        const labels = this.operationsTrend.map((p) => p.label);
        const data = this.operationsTrend.map((p) => p.value);
        this.operationsTrendChartData = {
            labels,
            datasets: [
                {
                    label: this.translate.instant('systemAdministration.dashboard.charts.operationsTrend'),
                    data,
                    ...this.lineDatasetStyle(),
                    tension: 0.3,
                },
            ],
        };
        this.operationsTrendChartOptions = this.lineChartOptions(this.translate.instant('systemAdministration.dashboard.charts.operationsTrend'));
    }

    private rebuildRequestCharts(): void {
        this.rebuildRequestCountChart();
        this.rebuildLatencyChart();
        this.rebuildErrorChart();
    }

    private rebuildRequestCountChart(): void {
        const labels = this.hourLabels();
        const data = this.requestCountSeries.map((p) => p.count);
        this.requestCountChartData = {
            labels,
            datasets: [
                {
                    label: this.translate.instant('systemAdministration.dashboard.charts.requestCount'),
                    data,
                    ...this.lineDatasetStyle(),
                },
            ],
        };
        this.requestCountChartOptions = this.hourlyLineChartOptions(
            this.translate.instant('systemAdministration.dashboard.charts.requestCount')
        );
    }

    private rebuildLatencyChart(): void {
        const labels = this.hourLabels();
        const data = this.latencySeries.map((p) => p.avgMs);
        this.latencyChartData = {
            labels,
            datasets: [
                {
                    label: this.translate.instant('systemAdministration.dashboard.charts.avgLatencyMs'),
                    data,
                    ...this.lineDatasetStyle(),
                },
            ],
        };
        this.latencyChartOptions = this.hourlyLineChartOptions(
            this.translate.instant('systemAdministration.dashboard.charts.avgLatencyMs')
        );
    }

    private rebuildErrorChart(): void {
        const labels = this.hourLabels();
        const data = this.errorSeries.map((p) => p.count);
        this.errorChartData = {
            labels,
            datasets: [
                {
                    label: this.translate.instant('systemAdministration.dashboard.charts.errorCount'),
                    data,
                    ...this.lineDatasetStyle(),
                },
            ],
        };
        this.errorChartOptions = this.hourlyLineChartOptions(
            this.translate.instant('systemAdministration.dashboard.charts.errorCount')
        );
    }

    private hourlyLineChartOptions(yAxisTitle: string): Record<string, unknown> {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: this.chartTextColor },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: this.chartTextColor,
                        autoSkip: true,
                        autoSkipPadding: 12,
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        minRotation: 0,
                        font: { size: 10 },
                        callback: function (
                            this: unknown,
                            tickValue: string | number,
                            index: number
                        ): string | undefined {
                            const scale = this as { getLabelForValue: (v: string | number) => string };
                            if (index % 3 !== 0) {
                                return undefined;
                            }
                            return scale.getLabelForValue(tickValue);
                        },
                    },
                    grid: { color: this.chartGridColor },
                },
                y: {
                    title: { display: true, text: yAxisTitle, color: this.chartTextColor },
                    ticks: { color: this.chartTextColor },
                    grid: { color: this.chartGridColor },
                },
            },
        };
    }

    private lineChartOptions(yAxisTitle: string): Record<string, unknown> {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: this.chartTextColor },
                },
            },
            scales: {
                x: {
                    ticks: { color: this.chartTextColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
                    grid: { color: this.chartGridColor },
                },
                y: {
                    title: { display: true, text: yAxisTitle, color: this.chartTextColor },
                    ticks: { color: this.chartTextColor },
                    grid: { color: this.chartGridColor },
                },
            },
        };
    }
}
