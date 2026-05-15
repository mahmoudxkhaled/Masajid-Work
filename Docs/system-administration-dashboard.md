# System Administration Dashboard

This document describes the **default** System Administration dashboard (`system-dashboard` module). For the **observability-rich** UI (logs, traces, health, alerts, percentiles, etc.), use the **v2** module: route `/system-administration/dashboard-v2` — see [`system-administration-dashboard-v2.md`](./system-administration-dashboard-v2.md).

## Purpose

Give system administrators a single place to see:

- High-level usage statistics (users, entities, operations).
- API traffic and endpoint-level summaries for a selected date range.
- Per-endpoint request analysis (metrics, hourly series, sample calls).

Data is currently **mocked** so the UI, charts, loading states, and navigation can be finished before backend contracts are finalized.

## Route and navigation

| Item               | Value                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **URL**            | `/system-administration/dashboard`                                                                      |
| **Parent**         | `/system-administration` — the default child route redirects to `dashboard` (`path: ''` → `dashboard`). |
| **Lazy module**    | `system-dashboard.module.ts`                                                                            |
| **Breadcrumb key** | `layout.app-breadcrumb.systemAdminDashboard` (route `data.breadcrumb`: `systemAdminDashboard`)          |

The shell menu is often **backend-driven**. If the dashboard should appear in the sidebar, ensure the backend menu configuration includes this URL (see project notes such as `MODULE_URLS_DATABASE.md` if applicable).

## User-facing behavior

### Global filters

- **Date range** (`p-calendar`, range mode): defaults to roughly the last 7 days.
- **Apply** runs a full reload of overview data (general + API tabs) and then request-detail data for the selected endpoint.

Invalid or incomplete date ranges show a translated warning toast; failed loads show a translated error toast.

### Tabs

1. **General** — Stat cards (users, entities, operations with trend vs previous period), daily operations trend chart.
2. **API overview** — Summary cards (total calls, peak hour, average response time, error rate), hourly API traffic chart, sortable table of endpoints.
3. **Request analysis** — Depends on a **selected endpoint**: summary metrics, request count / latency / error charts over 24 hours, and a samples table.

### Cross-tab interaction

- Selecting a row in the **API overview** endpoint table switches to tab **Request analysis**, sets the selected endpoint, and updates the URL query parameter **`endpoint=<id>`** (merged with existing query params).
- Changing the endpoint dropdown on the Request analysis tab updates the same query param.
- Loading `/system-administration/dashboard?endpoint=<id>` opens **Request analysis** with that endpoint pre-selected.

## Architecture (frontend)

```
SystemDashboardComponent
        │
        ▼
SystemDashboardService  (facade, `providedIn: 'root'`)
        │
        ▼
SystemDashboardMockDataSource   ← replace with HTTP / ApiService calls
```

- **Models:** `src/app/modules/system-administration/system-dashboard/models/dashboard.models.ts`  
  Defines `DashboardFilters`, `GeneralStats`, `ApiOverviewSummary`, `HourlyTrafficPoint`, `ApiEndpointRow`, `RequestDetailMetrics`, `LatencyPoint`, `ErrorPoint`, `RequestSampleRow`, `DailyTrendPoint`.
- **Service:** `services/system-dashboard.service.ts` — one method per dataset; all return `Observable<…>`.
- **Mock:** `data/system-dashboard-mock.data-source.ts` — deterministic-ish fake data with optional `delay` to simulate latency.

### Loading data

- **Overview:** `forkJoin` loads general stats, daily trend, API summary, traffic series, and endpoint list. On success, `lastUpdated` is set and charts are rebuilt; then `loadRequestDetailData()` runs if filters and `selectedEndpointId` allow.
- **Request detail:** `forkJoin` loads metrics, series, and samples for `selectedEndpointId`.

### Charts

- **PrimeNG `p-chart`** (Chart.js). Dataset colors use **resolved CSS** values: `--primary-color` is read in TypeScript (`getComputedStyle`) because Chart.js on canvas does not reliably resolve `var(--primary-color)` in all cases. Grid/text colors follow `--text-color` and `--surface-border` where used.
- Charts rebuild when data loads and on **language change** (`translate.onLangChange`) so labels stay translated.

### UI conventions

- Loading placeholders use **PrimeNG Skeleton** (`p-skeleton`), not extra boolean flags beyond existing `loadingStats`, `loadingApi`, `loadingRequest`.
- User-visible strings use **`systemAdministration.dashboard.*`** keys in `src/assets/i18n/en.json` and `ar.json`; toasts use `translate.instant(...)`.

## Key files

| Area                          | Path                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Component (template + styles) | `system-dashboard/components/system-dashboard/system-dashboard.component.html` / `.scss` / `.ts` |
| Routing (child)               | `system-dashboard-routing.module.ts`                                                             |
| Module                        | `system-dashboard.module.ts`                                                                     |
| Parent system-admin routes    | `system-administration-routing.module.ts` (`dashboard` lazy child)                               |

## What to do next (backend integration)

1. **Confirm API contracts** with the backend team: request/response shapes should map to the interfaces in `dashboard.models.ts` (adjust models and mappers if the API differs).

2. **Replace the mock data source**
    - Inject the project’s **`ApiService`** (or equivalent HTTP layer) into `SystemDashboardService` **or** implement a new `SystemDashboardApiDataSource` and swap the implementation used by the service.
    - Keep **`SystemDashboardService`** as the single entry point the component uses so the component template and chart logic change as little as possible.

3. **Map filters**
    - `DashboardFilters` uses `dateFrom` / `dateTo` (`Date`). Serialize them in the format the API expects (ISO date, UTC, etc.).

4. **Error handling**
    - The component already shows a generic load failure toast. Extend if the API returns structured errors or specific codes worth surfacing.

5. **Menu / permissions**
    - Ensure the dashboard URL is exposed in the dynamic menu if required.
    - Add or reuse a permission check on the route or menu item if system-admin features are gated.

6. **QA**
    - Verify charts in **light and dark** themes.
    - Verify deep link `?endpoint=` and row navigation from API overview to Request analysis.
    - After switching to real APIs, re-test skeleton layout and loading flags under slow network conditions.

---

_Last aligned with the lazy module under `src/app/modules/system-administration/system-dashboard/`._

أكيد — دي صياغة مرتبة ومنظمة لكل اللي اتقال، بشكل واضح ومفصل، بحيث ينفع يبقى بداية محترمة للديسكاشن أو يتكتب في ورقة شغل / ملف تجميعي للأفكار الخاصة بالـ **System Administration Dashboard**.

---

# تصور مبدئي لـ System Administration Dashboard

الفكرة الأساسية من الـ **System Administration Dashboard** إنها تكون شاشة Monitoring وAnalysis شاملة للنظام، تساعد الأدمن أو الشخص المسؤول عن متابعة السيستم إنه يفهم:

- حالة النظام العامة
- حجم الاستخدام
- شكل الترافيك
- أكثر الـ API Calls استخدامًا
- أنواع الـ Requests المؤثرة
- أماكن الاختناق أو البطء
- أي مؤشرات ممكن تساعد في اكتشاف مشاكل أو تحسين الأداء

الهدف مش مجرد عرض أرقام، لكن إن الشاشة تكون أداة تحليل ومتابعة حقيقية.

---

# الفكرة العامة للدashboard

الداشبورد ممكن تتقسم إلى **3 Tabs رئيسية**، بحيث كل Tab تخدم زاوية مختلفة من التحليل:

## 1) Tab خاصة بالإحصائيات العامة للنظام

الجزء ده يكون مسؤول عن عرض أرقام وإحصائيات عامة مرتبطة بالبيانات الموجودة في النظام أو قاعدة البيانات.

### أمثلة على البيانات اللي تظهر فيها:

- عدد المستخدمين
- عدد الحسابات أو الكيانات الموجودة في النظام
- عدد الـ records أو العناصر الأساسية في قاعدة البيانات
- عدد العمليات المنفذة
- أي counters أو summary metrics مهمة للإدارة

### الهدف منها:

إن الشخص أول ما يفتح الداشبورد ياخد نظرة سريعة جدًا عن حجم النظام الحالي ووضعه العام.

### شكل العرض المقترح:

- Cards أو Statistic Widgets في أعلى الصفحة
- كل Card فيها رقم + عنوان + ممكن نسبة زيادة/نقصان مقارنة بفترة سابقة
- ممكن كمان إضافة mini charts صغيرة لو محتاجين Trends سريعة

### أمثلة للأسئلة اللي التاب دي تجاوب عليها:

- عندنا كام User حاليًا؟
- حجم البيانات عامل إزاي؟
- هل في نمو ملحوظ؟
- هل في أي رقم شاذ أو محتاج متابعة؟

---

## 2) Tab خاصة بالـ API Calls بشكل عام

الـ Tab دي تكون مسؤولة عن عرض صورة عامة لحركة الـ API Calls داخل السيستم.

### الفكرة:

مش بنبص هنا على Call معينة، لكن بنبص على **كل الـ API Calls ككل**:

- حجم الترافيك
- أوقات الذروة
- أوقات الهدوء
- توزيع الـ Calls على مدار اليوم
- إجمالي الاستخدام

### العناصر المقترحة داخل التاب:

#### أ) Table لكل الـ API Calls

جدول يعرض:

- اسم الـ API أو الـ Endpoint
- عدد مرات الاستدعاء
- متوسط وقت التنفيذ
- عدد الأخطاء إن وجد
- آخر وقت حصل فيه Call
- ممكن كمان status أو success rate

#### ب) Chart لإجمالي الـ Calls خلال اليوم

يفضل يكون:

- Line Chart أو Area Chart
- يعرض عدد الـ Calls على مدار ساعات اليوم
- بحيث يوضح:
    - إمتى الترافيك بيكون عالي
    - إمتى الترافيك بيكون منخفض
    - الفترات اللي فيها ضغط
    - الفترات اللي ممكن يبقى فيها مشاكل

### الهدف من التاب دي:

إننا نعرف شكل الاستخدام العام للنظام من منظور الـ API Traffic.

### أمثلة للأسئلة اللي التاب دي تجاوب عليها:

- الترافيك بيزيد في أي وقت من اليوم؟
- هل في ساعات Peak واضحة؟
- هل في ضغط غير طبيعي في فترة معينة؟
- هل النظام بيستقبل Calls بشكل متوازن ولا في تقلبات كبيرة؟

---

## 3) Tab خاصة بتحليل كل Request Type أو Call Type بشكل تفصيلي

الـ Tab الثالثة تكون أكثر عمقًا، وتركز على تحليل نوع معين من الـ API Calls أو Request Types.

### الفكرة:

لو الشخص بص على التاب الثانية ولاحظ إن الترافيك عالي في وقت معين، أو لقى إن Call معينة هي السبب الأساسي في الضغط، فهنا يروح للتاب الثالثة عشان يعمل **Drill-down Analysis** على النوع ده بالتحديد.

### الوظيفة الأساسية:

عرض تفاصيل دقيقة لكل Request Type أو لكل Call Type على حدة.

### أمثلة على البيانات اللي تظهر هنا:

- اسم الـ Request Type
- عدد مرات التكرار في اليوم
- توزيعها على مدار اليوم
- متوسط الـ Latency
- أعلى Latency
- أقل Latency
- متوسط وقت الاستجابة لكل فترة زمنية
- عدد الأخطاء المرتبطة بالنوع ده
- نسبة نجاح/فشل الطلبات
- هل فيه وقت معين الكول دي بتبقى أبطأ فيه؟
- هل فيه علاقة بين زيادة العدد وزيادة الـ Latency؟

### الهدف من التاب دي:

التحليل العميق لمشكلة أو سلوك نوع Request معين.

### أمثلة للأسئلة اللي تجاوب عليها:

- الكول دي بتتكرر قد إيه؟
- هل هي السبب في Peak معين في الترافيك؟
- هل وقت تنفيذها طبيعي ولا عالي؟
- هل بطؤها ثابت ولا مرتبط بأوقات معينة؟
- هل عندها Error Rate مرتفع؟
- هل محتاجة Optimization أو مراجعة على مستوى Service أو Query أو Infrastructure؟

---

# زاوية مهمة جدًا: Latency Monitoring

من النقاط المهمة اللي ظهرت أثناء التفكير إن الداشبورد ما تكونش بس لعرض counts، لكن كمان تكون أداة **Monitoring حقيقية للأداء**، وده يخلّي الـ **Latency** عنصر أساسي فيها.

## ليه الـ Latency مهمة؟

لأن بعض الـ Calls ممكن يكون عددها قليل نسبيًا، لكن تأثيرها كبير جدًا بسبب إنها:

- بطيئة
- بتستهلك Resources أعلى
- بتسبب bottleneck
- ممكن تشير لمشكلة في Service معينة
- أو لمشكلة في Query / Integration / Network / Infrastructure

## بناءً عليه، ممكن نضيف:

- قائمة بأبطأ الـ API Calls
- متوسط التنفيذ لكل Call
- Percentiles زي P95 / P99 لو متاح
- Latency trend على مدار اليوم
- مقارنة بين الـ Calls السريعة والبطيئة
- Alerts أو Indicators توضح إن في Call معينة خرجت عن الطبيعي

---

# هل التاب الثالثة منفصلة فعلًا أم جزء من الثانية؟

دي نقطة مهمة جدًا وتحتاج مناقشة أثناء التصميم.

## احتمال 1:

تبقى التاب الثالثة منفصلة تمامًا
وده معناه:

- التاب الثانية = نظرة عامة لكل الترافيك
- التاب الثالثة = تحليل تفصيلي لكل نوع Call

وده مفيد لو عايزين فصل واضح بين:

- Monitoring عام
- Deep Analysis

## احتمال 2:

التحليل التفصيلي يبقى جزء داخل التاب الثانية
بحيث:

- التاب الثانية تعرض Overview
- ولما تختار API معينة أو Request Type معين يظهر Panel أو Section بالتفاصيل

وده مفيد لو عايزين تجربة استخدام أكثر سلاسة وأقل Tabs.

## القرار النهائي هنا:

محتاج Discussion أثناء الـ Wireframing:

- هل الأفضل الفصل؟
- ولا الأفضل الدمج؟
- ولا نعمل Hybrid Approach: Overview + Drill-down داخلي؟

---

# الداشبورد كأداة Monitoring وليست مجرد Dashboard

الفكرة بوضوح بتتجه إلى إن الشاشة دي تكون أقرب إلى:

- System Monitoring Dashboard
- Operational Analytics Dashboard
- API Performance Dashboard

يعني الهدف مش مجرد “نعرض أرقام”، لكن:

- نراقب
- نحلل
- نكتشف المشاكل
- نفهم سلوك السيستم
- نساعد في اتخاذ قرارات تقنية أسرع

وده يفتح الباب لإضافات قوية جدًا لاحقًا.

---

# اقتراحات Features إضافية ممكن تتضاف

أثناء الشغل على الداشبورد، أي فكرة جديدة تيجي ينفع تتحط في الملف لحد ما الصورة تستقر. ومن الإضافات المحتملة:

## على مستوى الإحصائيات العامة:

- Active users
- New users خلال فترة معينة
- معدل النمو
- عدد العمليات اليومية / الأسبوعية / الشهرية
- توزيع الاستخدام حسب بيئات مختلفة إن وجدت

## على مستوى الـ API Monitoring:

- Success vs Failure Rate
- عدد الـ 4xx / 5xx Errors
- Top called endpoints
- Least used endpoints
- Peak traffic windows
- Traffic comparison بين اليوم وأمس أو آخر 7 أيام

## على مستوى الأداء:

- Slowest endpoints
- Average response time
- Peak latency times
- Timeout monitoring
- Retries count لو موجودة
- Dependency impact لو فيه external services

## على مستوى التحليل:

- Filters حسب:
    - التاريخ
    - الوقت
    - نوع الـ API
    - Status Code
    - Service
    - User / Client / Consumer إن كان منطقي

- Search داخل الـ API list
- Drill-down عند الضغط على أي row أو chart point

## على مستوى الـ UX:

- Summary cards فوق
- Tabs واضحة
- Charts سهلة القراءة
- استخدام ألوان للتنبيه على الحالات الحرجة
- Tooltips فيها تفاصيل
- Empty states وloading states
- Export أو download للتقارير مستقبلًا

---

# تصور مبدئي للـ Layout

ممكن الشكل العام يكون كالتالي:

## أعلى الصفحة:

- عنوان الداشبورد
- تاريخ / وقت آخر تحديث
- Filters عامة:
    - Date range
    - Environment
    - Service
    - API type

## ثم المحتوى حسب التاب المختارة

### Tab 1: General Statistics

- صف Cards للإحصائيات
- Charts صغيرة للنمو أو التوزيع
- Quick summary

### Tab 2: API Calls Overview

- Chart كبير لحركة الترافيك أثناء اليوم
- Table للـ API Calls
- مؤشرات سريعة:
    - Total calls
    - Peak hour
    - Avg response time
    - Error rate

### Tab 3: Request Type / Call Analysis

- Dropdown أو Search لاختيار Request Type
- Charts خاصة بها
- Latency graph
- Count trend
- Error trend
- Detailed metrics table

---

# رحلة الاستخدام المتوقعة

مثال عملي لكيفية استخدام الشخص للداشبورد:

1. يدخل على الـ Dashboard
2. يشوف الإحصائيات العامة ويفهم حالة النظام
3. يروح على Tab الـ API Overview
4. يلاحظ إن في فترة معينة الترافيك فيها عالي
5. يحدد إن سبب الترافيك غالبًا Call معينة أو Request Type معينة
6. يفتح Tab التحليل التفصيلي
7. يراجع:
    - عدد مرات التكرار
    - زمن التنفيذ
    - هل في Errors
    - هل في Peak latency

8. بناءً على ده يبدأ التحقيق التقني في المشكلة

---

# المطلوب في المرحلة الحالية

المرحلة الحالية مش مرحلة قرار نهائي، لكنها مرحلة:

- تجميع أفكار
- ترتيب تصور
- مناقشة الاحتمالات
- اقتراح Features
- تحديد شكل التابز
- تجهيز Wireframes مبدئية
- وبعدها نبدأ ندخل في نقاش تفصيلي لكل جزء

---

# خطة العمل المقترحة

## المرحلة 1: Brainstorming

تجميع كل الأفكار بدون تقييد، وكل فكرة جديدة تتحط

## المرحلة 2: Structuring

ترتيب الأفكار تحت أقسام واضحة:

- General stats
- API overview
- Request-level analysis
- Performance monitoring

## المرحلة 3: Wireframing

رسم وايرفريمز مبدئية للشاشة:

- Layout
- Tabs
- Cards
- Charts
- Tables
- Filters

## المرحلة 4: Discussion & Refinement

مراجعة:

- هل التوزيع منطقي؟
- هل التابز كافية؟
- هل في أجزاء مكررة؟
- هل في Features ناقصة؟
- هل تجربة الاستخدام واضحة؟

## المرحلة 5: Final Definition

تثبيت:

- الـ Scope
- الـ UI structure
- العناصر الأساسية
- الأولويات
- الـ MVP vs Future enhancements

---

# خلاصة الفكرة

الـ **System Administration Dashboard** المقترحة هي شاشة إدارية/رقابية هدفها متابعة النظام من 3 مستويات:

### المستوى الأول:

إحصائيات عامة عن النظام والبيانات

### المستوى الثاني:

رؤية عامة لحركة الـ API Calls والترافيك على مدار اليوم

### المستوى الثالث:

تحليل تفصيلي لكل Request Type أو Call Type لمعرفة:

- التكرار
- الأداء
- الـ Latency
- المشاكل
- أسباب الضغط

والهدف النهائي إن الداشبورد تكون أداة تساعد على:

- الفهم السريع
- اكتشاف المشاكل
- تحليل الأداء
- مراقبة الترافيك
- اتخاذ قرارات تحسين للنظام

---

# نسخة مختصرة جدًا للتثبيت

**الدashboard فيها 3 Tabs رئيسية:**

1. **General Statistics**
    - عدد users
    - عدد records
    - أي counters مهمة من قاعدة البيانات

2. **API Calls Overview**
    - جدول بكل الـ API calls وعدد مرات استخدامها
    - Chart يوضح إجمالي الترافيك أثناء اليوم
    - معرفة فترات الذروة والانخفاض

3. **Request Type Detailed Analysis**
    - تحليل نوع request معين
    - عدد التكرار
    - latency
    - response times
    - error indicators
    - معرفة إذا كان هذا النوع هو سبب الضغط أو البطء

**والداشبورد بشكل عام تكون Monitoring tool للسيستم، مش مجرد شاشة أرقام.**

---

أقدر كمان أحول الكلام ده في الرسالة الجاية إلى **Product/Feature document بصياغة بروفيشنال** أو **نسخة Wireframe notes جاهزة للتصميم**.
\*/**********\*\*\*\***********
تمام 👌 — خلّينا ندخل على المستوى التقني بقى ونبني **Technical Architecture للبيانات** بشكل واضح وقابل للتنفيذ.

هقسمها لك بشكل عملي جدًا:

---

# 🏗 Technical Data Architecture

## System Administration Dashboard

---

## 1. الهدف من الـ Architecture

إننا نقدر:

- نجمع بيانات من النظام (APIs / DB / Services)
- نخزنها بشكل منظم
- نعمل عليها Aggregation وAnalysis
- نعرضها بسرعة في الداشبورد
- نقدر نوسّعها مستقبلًا (Scalable)

---

# 2. High-Level Architecture

## Data Flow:

```
Client Requests → Backend Services → Logging Layer → Data Pipeline → Storage → Dashboard API → UI
```

---

## المكونات الأساسية:

### 1) Data Sources

- API Gateway / Backend Services
- Database (لـ General Stats)
- Application Logs

---

### 2) Data Collection Layer

#### Options:

- Middleware في الـ Backend
- API Gateway Logging
- Sidecar logging (advanced)

#### بنجمع:

- API Name
- Timestamp
- Response Time
- Status Code
- User / Client ID (optional)

---

### 3) Data Pipeline

#### ممكن يكون:

- Kafka (لو النظام كبير)
- RabbitMQ
- أو حتى Async queue بسيطة

#### الهدف:

- Decouple بين الـ runtime والـ analytics
- منع التأثير على performance

---

### 4) Processing Layer

#### نوعين Processing:

### A) Real-time / Near Real-time

- حساب counters
- تحديث metrics

### B) Batch Processing

- Aggregations (daily / hourly)
- تنظيف البيانات

---

### 5) Storage Layer

## نقسمها لنوعين:

---

## 🟦 A) Raw Data Storage (Logs)

### Database:

- NoSQL (MongoDB / Elasticsearch)

### Schema:

```json
{
    "timestamp": "2026-03-22T10:00:00Z",
    "api_name": "/users/login",
    "method": "POST",
    "response_time_ms": 120,
    "status_code": 200,
    "user_id": "123",
    "service": "auth-service"
}
```

---

## 🟩 B) Aggregated Data Storage (Analytics DB)

### Database:

- PostgreSQL / ClickHouse (أفضل للأداء العالي)

---

### Tables:

## 1. api_metrics_hourly

| column      | type     |
| ----------- | -------- |
| api_name    | string   |
| hour        | datetime |
| total_calls | int      |
| avg_latency | float    |
| max_latency | float    |
| min_latency | float    |
| error_count | int      |

---

## 2. api_metrics_daily

| column      | type   |
| ----------- | ------ |
| api_name    | string |
| date        | date   |
| total_calls | int    |
| avg_latency | float  |
| error_rate  | float  |

---

## 3. system_stats

| column        | type |
| ------------- | ---- |
| date          | date |
| total_users   | int  |
| total_records | int  |
| active_users  | int  |

---

## 4. latency_percentiles (optional advanced)

| column   | type   |
| -------- | ------ |
| api_name | string |
| p95      | float  |
| p99      | float  |

---

# 6. Dashboard Backend (API Layer)

## مسؤول عن:

- Query البيانات
- تجميعها حسب request
- تجهيز response للـ UI

---

## Endpoints:

### 🔹 General Stats

```
GET /dashboard/stats
```

Response:

```json
{
    "total_users": 10000,
    "total_records": 500000,
    "active_users": 1200
}
```

---

### 🔹 API Overview

```
GET /dashboard/api-overview
```

Response:

```json
{
    "total_calls": 200000,
    "peak_hour": "14:00",
    "avg_latency": 180,
    "error_rate": 0.02
}
```

---

### 🔹 Traffic Chart

```
GET /dashboard/api-traffic?date=2026-03-22
```

Response:

```json
[
    { "hour": "00:00", "calls": 1200 },
    { "hour": "01:00", "calls": 900 }
]
```

---

### 🔹 API Table

```
GET /dashboard/apis
```

---

### 🔹 Request Analysis

```
GET /dashboard/api-details?api=/users/login
```

Response:

```json
{
    "total_calls": 50000,
    "avg_latency": 150,
    "max_latency": 900,
    "error_rate": 0.01,
    "latency_over_time": []
}
```

---

# 7. Aggregation Strategy

## ليه مهم؟

عشان:

- نقلل الضغط على الداتابيز
- نخلي الداشبورد سريع

---

## إزاي نعملها:

### 🔹 Real-time counters (optional)

- Redis:
    - counters لكل API
    - counters لكل ساعة

---

### 🔹 Scheduled Jobs

#### كل ساعة:

- تجميع logs → api_metrics_hourly

#### كل يوم:

- تجميع hourly → daily

---

# 8. Caching Layer

## باستخدام:

- Redis

## نخزن:

- General stats
- API overview
- Top APIs

## TTL:

- 1 - 5 دقائق

---

# 9. Performance Considerations

- استخدام Indexes على:
    - api_name
    - timestamp

- Partitioning حسب التاريخ
- استخدام ClickHouse لو الترافيك عالي جدًا
- Pagination في الـ tables

---

# 10. Scalability

## لما النظام يكبر:

- Logging → Kafka
- Processing → Stream processing (Flink / Spark)
- Storage → Data warehouse
- Dashboard → يعتمد على Aggregates فقط

---

# 11. Security

- إخفاء user data الحساسة
- Role-based access
- Audit logs

---

# 12. Monitoring للـ Monitoring 😄

- Track:
    - pipeline delays
    - data loss
    - ingestion rate

---

# 🔥 خلاصة المعمارية

### عندك 3 Layers أساسية:

## 1. Collection

تجمع كل API Calls وmetrics

## 2. Processing

تحولها لـ useful insights

## 3. Storage + API

تخزنها وتعرضها بسرعة

---

# 👇 الشكل الأبسط (MVP Architecture)

لو عايزين نبدأ بسرعة بدون تعقيد:

- Logs → DB (Mongo)
- Cron Jobs → Aggregation
- PostgreSQL → Metrics
- Backend API → Dashboard

---

# الخطوة الجاية 👇

لو حابب نكمل عملي أكتر، أقدر أعملك:

### 1. 🧩 Database Schema SQL جاهز

### 2. ⚙️ Backend Code Structure (Node / Java / .NET)

### 3. 🔌 Logging Middleware Implementation

### 4. 📊 مثال Data حقيقي + Queries

قولّي عايز ننزل على أي مستوى 👍
