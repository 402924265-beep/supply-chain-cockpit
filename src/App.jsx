import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  CaretRight,
  CheckCircle,
  ClipboardText,
  Factory,
  FileArrowUp,
  Gauge,
  MagnifyingGlass,
  Package,
  ShieldWarning,
  Table,
  Target,
  TrendUp,
  WarningCircle,
} from "@phosphor-icons/react";
import rawLedgers from "./workbook-ledgers.json";
import dashboardData from "./dashboard-data.json";

const dates = dashboardData.dates;

const iconByKey = { Target, CheckCircle, Gauge, CalendarCheck, Package, WarningCircle, ShieldWarning };
const summaryKpis = dashboardData.summaryKpis.map((item) => ({ ...item, icon: iconByKey[item.icon] || Target }));

const lineRows = dashboardData.lineRows;

const weeklyPreview = dashboardData.weeklyPreview;

const delayPreview = dashboardData.delayPreview;

const moduleTabs = [
  { key: "overview", label: "总驾驶舱", ledgerKey: "production", headline: "风险作战室", value: "闭环5步", tone: "blue" },
  { key: "daily", label: "日绩效跟踪", ledgerKey: "daily", headline: "目标差异", value: "2.96万", tone: "red" },
  { key: "weekly", label: "周排产总结", ledgerKey: "weekly", headline: "W26排产", value: "7.5万", tone: "blue" },
  { key: "package", label: "包销结构", ledgerKey: "package", headline: "包销结余", value: "18.8万", tone: "amber" },
  { key: "delay", label: "延单未排", ledgerKey: "delay", headline: "未排合计", value: "4380台", tone: "red" },
  { key: "capacity", label: "T+3产能", ledgerKey: "capacity", headline: "爬坡任务", value: "505万", tone: "green" },
  { key: "domestic", label: "国内需求", ledgerKey: "domestic", headline: "需求协同", value: "49条", tone: "blue" },
  { key: "dishwasher", label: "洗碗机分析", ledgerKey: "dishwasher", headline: "清单率", value: "62%", tone: "red" },
  { key: "tasks", label: "中长期任务", ledgerKey: "tasks", headline: "任务清单", value: "68条", tone: "amber" },
  { key: "materials", label: "物料风险", ledgerKey: "materials", headline: "供货风险", value: "13条", tone: "red" },
  { key: "buyout", label: "买单机制", ledgerKey: "buyout", headline: "累计执行", value: "6603台", tone: "green" },
  { key: "clearance", label: "清尾影响", ledgerKey: "clearance", headline: "清尾明细", value: "198条", tone: "amber" },
  { key: "weekMaterial", label: "周物料影响", ledgerKey: "weekMaterial", headline: "物料影响", value: "15条", tone: "red" },
  { key: "meeting", label: "会议决议", ledgerKey: "meeting", headline: "闭环事项", value: "6条", tone: "blue" },
];

const actionItems = [
  { title: "拓邦供货确认", detail: "锁定327台本周交付，4624台下周风险降级", owner: "张伟 / 采购", due: "6.30 12:00", tone: "danger" },
  { title: "洗碗机尾单清欠", detail: "64个型号、2508台前期尾单清欠", owner: "程亚杰", due: "6.30 夜班", tone: "danger" },
  { title: "烤箱物料保障", detail: "拓邦电源板到货400，其余交期锁定", owner: "尹军委", due: "7.16", tone: "warn" },
  { title: "日产能爬坡", detail: "洗碗机高效率出提升至3900台/日", owner: "李振", due: "7.01", tone: "warn" },
];

const reportNarratives = [
  "全球产能：以最优成本下的全球产地布局为主线，国内与海外产能协同承接订单节奏。",
  "生产绩效：围绕清单、时序、负荷率和日清差异，形成从结果到责任闭环的管理视图。",
  "网能保障：物料保障按日、周、月、年拉通，交付提效结合数字化和VMI模式推进。",
  "降费逻辑：通过订单均衡生产，抑制人员分流损失和加班费，支撑成本改善。",
];

const factoryPerformance = dashboardData.factoryPerformance;

const factoryImages = new Map([
  [factoryPerformance[0]?.name, "casarte-ai-dishwasher.jpg"],
  [factoryPerformance[1]?.name, "casarte-ai-hood.jpg"],
  [factoryPerformance[2]?.name, "casarte-ai-oven.jpg"],
  [factoryPerformance[3]?.name, "casarte-ai-stove.jpg"],
  [factoryPerformance[4]?.name, "haier-countertop-dishwasher.jpg"],
  [factoryPerformance[5]?.name, "pending-global.jpg"],
  [factoryPerformance[6]?.name, "pending-global.jpg"],
  [factoryPerformance[7]?.name, "pending-global.jpg"],
]);

function factoryImageSrc(factory) {
  return `${import.meta.env.BASE_URL}product-images/${factoryImages.get(factory.name) || "pending-global.jpg"}`;
}

const dailyPerformanceRows = dashboardData.dailyPerformanceRows;

const factoryOrder = new Map(factoryPerformance.map((factory, index) => [factory.name, index]));

function sortDailyRows(rows) {
  return [...rows].sort((a, b) => {
    if (a.subtotal !== b.subtotal) return a.subtotal ? -1 : 1;
    const factoryDelta = (factoryOrder.get(a.factory) ?? 99) - (factoryOrder.get(b.factory) ?? 99);
    if (factoryDelta !== 0) return factoryDelta;
    return Math.abs(b.gap || 0) - Math.abs(a.gap || 0);
  });
}

function varianceTone(value) {
  if (value > 100) return "danger";
  if (value > 0) return "warn";
  if (value < 0) return "good";
  return "neutral";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.name} style={{ color: item.color }}>{item.name}: {item.value}</span>
      ))}
    </div>
  );
}

function AppHeader({ activeTab, setActiveTab, uploadInfo, onUploadClick, fileInputRef, onFileChange }) {
  return (
    <header className="workspace-header cockpit-header">
      <BrandShowcase />
      <div className="header-main">
        <div className="upload-zone">
          <button className="upload-button" onClick={onUploadClick}>
            <FileArrowUp weight="bold" />
            上传标准模板
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={onFileChange} />
          <div className="upload-status">
            <strong>{uploadInfo.file}</strong>
            <span>{uploadInfo.status}</span>
          </div>
        </div>
      </div>
      <nav className="module-nav" aria-label="驾驶舱模块">
        {moduleTabs.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function BrandShowcase() {
  return (
    <section className="brand-showcase single-brand" aria-label="Casarte 品牌">
      <div className="casarte-lockup">
        <div className="logo-line">
          <img src={`${import.meta.env.BASE_URL}brand/casarte-logo.svg`} alt="Casarte" />
          <b>供应链生产日清驾驶舱</b>
        </div>
        <span>高端厨电制造驾驶舱</span>
      </div>
      <div className="brand-statement">
        <strong>日清 · 排产 · 物料 · 产能 · 任务闭环</strong>
        <span>以 Casarte 高端制造为核心的供应链生产汇报驾驶舱</span>
      </div>
    </section>
  );
}

function KpiStrip() {
  return (
    <section className="kpi-strip">
      {summaryKpis.map((item) => {
        const Icon = item.icon;
        return (
          <article className={`summary-kpi ${item.tone}`} key={item.label}>
            <Icon weight="duotone" />
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.sub}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function OverviewPage({ setActiveTab, selectedLine, setSelectedLine }) {
  return (
    <section className="overview-page">
      <KpiStrip />
      <div className="overview-grid">
        <div className="main-stack">
          <section className="panel command-flow-panel">
            <div className="panel-head">
              <div>
                <h2>从日清到闭环的主线逻辑</h2>
                <p>先看结果，再拆差异，最后沉到责任人、期限、动作和台账。</p>
              </div>
              <TrendUp weight="duotone" />
            </div>
            <div className="flow-rail">
              {[
                ["01", "日清结果", "目标 vs 实际，欠产识别", "2.96万差异"],
                ["02", "差异归因", "工厂 / 线体 / 物料 / 延单", "502台欠产"],
                ["03", "排产 / 包销", "W26排产与库存结构", "7.5万 / 18.8万"],
                ["04", "产能规划", "7-9月供需缺口与爬坡", "419万→505万"],
                ["05", "任务闭环", "责任人、期限、会议决议", "高风险3项"],
              ].map((step) => (
                <button key={step[0]} className="flow-step" onClick={() => setActiveTab(step[0] === "01" ? "daily" : step[0] === "03" ? "weekly" : step[0] === "04" ? "capacity" : "tasks")}>
                  <span>{step[0]}</span>
                  <strong>{step[1]}</strong>
                  <p>{step[2]}</p>
                  <b>{step[3]}</b>
                </button>
              ))}
            </div>
          </section>

          <div className="overview-split">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>日绩效只是其中一块</h2>
                  <p>外层先按工厂看，黄岛、烟台、重庆全部露出；点击进入日报线体明细。</p>
                </div>
                <button className="ghost-link" onClick={() => setActiveTab("daily")}>进入日绩效 <CaretRight /></button>
              </div>
              <FactorySummaryStrip setActiveTab={setActiveTab} />
              <VarianceMatrix selected={selectedLine} onSelect={setSelectedLine} compact />
            </section>
            <ActionBoard />
          </div>

          <ReportNarrativePanel />

          <ModuleCards setActiveTab={setActiveTab} />
        </div>
        <DetailDrawer activeTab="overview" setActiveTab={setActiveTab} selectedLine={selectedLine} />
      </div>
    </section>
  );
}

function ReportNarrativePanel() {
  return (
    <section className="panel narrative-panel">
      <div className="panel-head">
        <div>
          <h2>PPT汇报结论沉淀</h2>
          <p>来自《制造生产周总结-W25-V3.0》的总结性话术，作为驾驶舱汇报口径。</p>
        </div>
        <ClipboardText weight="duotone" />
      </div>
      <div className="narrative-grid">
        {reportNarratives.map((item, index) => (
          <article key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModuleCards({ setActiveTab }) {
  return (
    <section className="module-card-grid">
      {moduleTabs.filter((tab) => tab.key !== "overview" && tab.key !== "daily").map((tab) => (
        <button key={tab.key} className={`module-card ${tab.tone}`} onClick={() => setActiveTab(tab.key)}>
          <span>{tab.label}</span>
          <strong>{tab.value}</strong>
          <p>{tab.headline}</p>
          <CaretRight weight="bold" />
        </button>
      ))}
    </section>
  );
}

function FactorySummaryStrip({ setActiveTab }) {
  return (
    <div className="factory-summary-strip">
      {factoryPerformance.slice(0, 5).map((factory) => (
        <button key={factory.name} className={`factory-summary-pill ${factory.tone}`} onClick={() => setActiveTab("daily")}>
          <span>{factory.name}</span>
          <strong>{factory.actualWan.toFixed(2)}万</strong>
          <i>差异 {factory.gapWan.toFixed(2)}万 / 日差 {factory.dayGap}台</i>
        </button>
      ))}
    </div>
  );
}

function ActionBoard() {
  return (
    <aside className="panel action-board">
      <div className="panel-head">
        <div>
          <h2>下一步作战板</h2>
          <p>负责人、期限、目标、状态四件事一次讲清。</p>
        </div>
        <ClipboardText weight="duotone" />
      </div>
      <div className="action-list">
        {actionItems.map((item, index) => (
          <article key={item.title} className={item.tone}>
            <span>{index + 1}</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <small>{item.owner} · 截止 {item.due}</small>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function RankingPanel({ selected, onSelect }) {
  const sorted = [...dailyPerformanceRows].filter((row) => !row.subtotal).sort((a, b) => b.gap - a.gap);
  const maxGap = Math.max(...sorted.map((row) => Math.abs(row.gap)));
  return (
    <section className="panel ranking-panel">
      <div className="panel-head">
        <div>
          <h2>线体差异排名</h2>
          <p>按日产能差异排序，点击切换右侧明细</p>
        </div>
        <MagnifyingGlass weight="duotone" />
      </div>
      <div className="ranking-list">
        {sorted.map((row, index) => (
          <button className={`rank-row ${selected.line === row.line ? "active" : ""}`} key={`${row.factory}-${row.line}`} onClick={() => onSelect(row)}>
            <span>{index + 1}</span>
            <div>
              <strong>{row.line}</strong>
              <small>{row.factory}</small>
            </div>
            <div className="rank-bar">
              <i className={varianceTone(row.gap)} style={{ width: `${Math.max(12, (Math.abs(row.gap) / maxGap) * 100)}%` }} />
            </div>
            <b className={varianceTone(row.gap)}>{row.gap > 0 ? "+" : ""}{row.gap}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function VarianceMatrix({ selected, onSelect, compact = false }) {
  const [filter, setFilter] = useState("all");
  const visibleRows = sortDailyRows(dailyPerformanceRows.filter((row) => {
    if (filter === "variance") return Math.abs(row.gap) > 0 || Math.abs(row.orderGap || 0) > 0;
    if (filter === "shortage") return row.shortageToday || row.shortageTotal;
    return true;
  }));

  return (
    <section className={compact ? "matrix-embed" : "panel matrix-panel"}>
      {!compact && (
        <div className="panel-head matrix-head">
          <div>
            <h2>工厂 / 线体差异矩阵</h2>
            <p>目标、累计实际、差异、欠产、清单率和近10日产量直接展开</p>
          </div>
          <MatrixFilters filter={filter} setFilter={setFilter} />
        </div>
      )}
      {compact && <MatrixFilters filter={filter} setFilter={setFilter} />}
      <div className="matrix-scroll">
        <table className="variance-table">
          <thead>
            <tr>
              <th>工厂</th><th>线体</th><th>6月目标</th><th>累计实际</th><th>订单差异</th><th>日产目标</th><th>日产实际</th><th>日产差异</th><th>当日欠产</th><th>累计欠产</th><th>清单率</th>
              {dates.map((date) => <th key={date}>{date}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr className={`${row.subtotal ? "subtotal" : ""} ${selected.line === row.line ? "selected" : ""}`} key={`${row.factory}-${row.line}`} onClick={() => onSelect(row)}>
                <td>{row.factory}</td>
                <td><strong>{row.line}</strong></td>
                <td>{row.orderTarget ? formatNumber(row.orderTarget) : "-"}</td>
                <td>{row.orderActual ? formatNumber(row.orderActual) : "-"}</td>
                <td className={varianceTone(row.orderGap)}>{row.orderGap ? formatNumber(row.orderGap) : "-"}</td>
                <td>{formatNumber(row.target)}</td>
                <td>{formatNumber(row.actual)}</td>
                <td className={varianceTone(row.gap)}>{row.gap > 0 ? "+" : ""}{row.gap}</td>
                <td className={row.shortageToday ? "danger" : ""}>{row.shortageToday || "-"}</td>
                <td className={row.shortageTotal ? "warn" : ""}>{row.shortageTotal || "-"}</td>
                <td>{row.planRate}</td>
                {row.outputs.map((value, index) => (
                  <td key={`${row.line}-${dates[index]}`} className={value < row.target * 0.7 && value > 0 ? "warn" : value >= row.target ? "good" : ""}>
                    {value || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <MatrixInsights rows={visibleRows} />
    </section>
  );
}

function MatrixFilters({ filter, setFilter }) {
  return (
    <div className="filter-chips">
      <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部线体</button>
      <button className={filter === "variance" ? "active" : ""} onClick={() => setFilter("variance")}>只看差异</button>
      <button className={filter === "shortage" ? "active" : ""} onClick={() => setFilter("shortage")}>只看欠产</button>
    </div>
  );
}

function MatrixInsights({ rows }) {
  const shortageTotal = rows.reduce((sum, row) => sum + (row.shortageTotal || 0), 0);
  const positiveGaps = rows.filter((row) => row.gap > 0);
  const maxGap = Math.max(...rows.map((row) => Math.abs(row.gap)), 1);
  return (
    <div className="matrix-insights">
      <div className="insight-summary">
        <span>差异热力雷达</span>
        <strong>{positiveGaps.length}条线体需跟进</strong>
        <p>累计欠产 {formatNumber(shortageTotal)} 台，优先锁定红色线体与物料齐套。</p>
      </div>
      <div className="heat-stack">
        {rows.slice(0, 6).map((row) => (
          <div key={`heat-${row.factory}-${row.line}`}>
            <span>{row.line}</span>
            <i className={varianceTone(row.gap)} style={{ width: `${Math.max(8, (Math.abs(row.gap) / maxGap) * 100)}%` }} />
            <b className={varianceTone(row.gap)}>{row.gap > 0 ? "+" : ""}{row.gap}</b>
          </div>
        ))}
      </div>
      <div className="insight-actions">
        <span>下一步</span>
        <strong>先处理累计欠产与订单差异双高项</strong>
      </div>
    </div>
  );
}

function TrendWall({ selected }) {
  const data = selected.outputs.map((value, index) => ({ date: dates[index], actual: value, target: selected.target }));
  return (
    <section className="panel trend-panel">
      <div className="panel-head">
        <div>
          <h2>{selected.line} 到日产量趋势</h2>
          <p>上传新模板后此趋势同步替换</p>
        </div>
        <TrendUp weight="duotone" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="rgba(112, 175, 240, .12)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "#8aa9ca", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#8aa9ca", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="actual" name="实际" radius={[5, 5, 0, 0]}>
            <LabelList dataKey="actual" position="top" fill="#dff5ff" fontSize={11} />
            {data.map((item) => <Cell key={item.date} fill={item.actual >= item.target ? "#43e39d" : "#3aa8ff"} />)}
          </Bar>
          <Line dataKey="target" name="目标" stroke="#ffbd45" strokeWidth={3} dot={{ r: 3, fill: "#ffbd45" }}>
            <LabelList dataKey="target" position="top" fill="#ffbd45" fontSize={10} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
}

function DailyPage({ selectedLine, setSelectedLine, setActiveTab }) {
  const [selectedFactory, setSelectedFactory] = useState(factoryPerformance[0]);
  return (
    <section className="workspace-grid">
      <div className="main-stack">
        <KpiStrip />
        <section className="panel conclusion-panel">
          <div>
            <h2>日绩效跟踪是总驾驶舱的结果层</h2>
            <p>目标43万，已下线40.2万，完成率93%；T-1计划15109台，实际14670台，累计欠产502台。</p>
          </div>
          <div className="summary-badges">
            {[...dailyPerformanceRows].filter((row) => !row.subtotal).sort((a, b) => b.gap - a.gap).slice(0, 4).map((row) => (
              <span key={row.line}>{row.line} {row.gap > 0 ? "+" : ""}{row.gap}</span>
            ))}
          </div>
        </section>
        <FactoryPerformanceDock selectedFactory={selectedFactory} onSelectFactory={setSelectedFactory} />
        <FactoryDetailStage factory={selectedFactory} selectedLine={selectedLine} setSelectedLine={setSelectedLine} />
        <div className="lower-grid">
          <TrendWall selected={selectedLine} />
          <DrilldownCards setActiveTab={setActiveTab} />
        </div>
        <DailyLedger selectedLine={selectedLine} />
      </div>
      <DetailDrawer activeTab="daily" setActiveTab={setActiveTab} selectedLine={selectedLine} />
    </section>
  );
}

function FactoryPerformanceDock({ selectedFactory, onSelectFactory }) {
  return (
    <section className="panel factory-dock">
      <div className="panel-head">
        <div>
          <h2>日绩效 · 工厂能量舱</h2>
          <p>先按工厂看总体结果，点击工厂后动态展开线体与欠产明细。</p>
        </div>
        <Factory weight="duotone" />
      </div>
      <div className="factory-grid">
        {factoryPerformance.map((factory) => (
          <button
            key={factory.name}
            className={`factory-card ${factory.tone} ${selectedFactory.name === factory.name ? "active" : ""}`}
            onClick={() => onSelectFactory(factory)}
          >
            <img className="factory-product-thumb" src={factoryImageSrc(factory)} alt={factory.name} />
            <div className="factory-card-copy">
              <span>{factory.status}</span>
              <strong>{factory.name}</strong>
              {factory.pending ? (
                <p>待接入 · 预留产能接口</p>
              ) : (
                <>
                  <div className="factory-main-number">{factory.actualWan.toFixed(2)}万</div>
                  <p>目标 {factory.targetWan.toFixed(2)}万 · 差异 {factory.gapWan.toFixed(2)}万</p>
                  <i style={{ "--complete": `${factory.complete}%` }} />
                </>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function FactoryDetailStage({ factory, selectedLine, setSelectedLine }) {
  const relatedLines = dailyPerformanceRows.filter((row) => row.factory === factory.name || factory.lines.includes(row.line));
  const lines = relatedLines.length ? relatedLines : dailyPerformanceRows.slice(0, 4);
  return (
    <section className={`panel factory-stage ${factory.pending ? "pending" : ""}`} key={factory.name}>
      <div className="stage-header">
        <img className="stage-product-thumb" src={factoryImageSrc(factory)} alt={factory.name} />
        <div>
          <span>动态展示区</span>
          <h2>{factory.name}</h2>
          <p>{factory.pending ? "海外工厂预留位，标准模板接入后自动补数。" : `完成率 ${factory.complete}% · 当日产出 ${formatNumber(factory.dayActual)} 台 · 日差异 ${formatNumber(factory.dayGap)} 台`}</p>
        </div>
        <div className="stage-orbit">
          <b>{factory.pending ? "--" : `${factory.complete}%`}</b>
        </div>
      </div>
      {factory.pending ? (
        <div className="pending-stage">
          <strong>待接入数据接口</strong>
          <p>保留土耳其 / 印度 / 巴基斯坦工厂入口，后续上传标准模板后可直接替换为真实数据。</p>
        </div>
      ) : (
        <>
          <div className="factory-stat-row">
            <div><span>月目标</span><strong>{factory.targetWan.toFixed(2)}万</strong></div>
            <div><span>累计实际</span><strong>{factory.actualWan.toFixed(2)}万</strong></div>
            <div><span>目标差异</span><strong>{factory.gapWan.toFixed(2)}万</strong></div>
            <div><span>累计欠产</span><strong>{formatNumber(factory.shortage)}台</strong></div>
          </div>
          <div className="factory-line-cloud">
            {lines.map((row) => (
              <button key={`${row.factory}-${row.line}`} className={selectedLine.line === row.line ? "active" : ""} onClick={() => setSelectedLine(row)}>
                <span>{row.line}</span>
                <strong>{row.gap > 0 ? "+" : ""}{row.gap}台</strong>
                <i className={varianceTone(row.gap)} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DrilldownCards({ setActiveTab }) {
  return (
    <section className="drill-grid">
      <article className="panel drill-card">
        <div>
          <h2>周排产明细</h2>
          <p>按工厂、产品/线体、日期、合计、月度排产、包销结余查看。</p>
        </div>
        <strong>W26 7.5万 / 包销18.8万</strong>
        <button onClick={() => setActiveTab("weekly")}>查看明细 <CaretRight /></button>
      </article>
      <article className="panel drill-card">
        <div>
          <h2>延单未排明细</h2>
          <p>物料号、物料描述、T周未排、未排原因、供应商和关差进度。</p>
        </div>
        <strong>4380台 / 物料1638 / 小单2210</strong>
        <button onClick={() => setActiveTab("delay")}>查看明细 <CaretRight /></button>
      </article>
    </section>
  );
}

function DetailDrawer({ activeTab, setActiveTab, selectedLine }) {
  const tabs = [
    { key: "daily", label: "日绩效明细" },
    { key: "weekly", label: "周排产明细" },
    { key: "delay", label: "延单未排明细" },
  ];
  const detailMode = activeTab === "overview" ? "daily" : activeTab;
  return (
    <aside className="detail-drawer">
      <div className="drawer-head">
        <div>
          <h2>明细台账</h2>
          <p>所有汇总模块均可下钻到明细</p>
        </div>
        <Table weight="duotone" />
      </div>
      <div className="drawer-tabs">
        {tabs.map((tab) => (
          <button key={tab.key} className={detailMode === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      {detailMode === "weekly" ? <WeeklyDetail /> : detailMode === "delay" ? <DelayDetail /> : <DailyDetail selectedLine={selectedLine} />}
    </aside>
  );
}

function DailyDetail({ selectedLine }) {
  return (
    <div className="drawer-content">
      <div className="selected-card">
        <span>{selectedLine.factory}</span>
        <strong>{selectedLine.line}</strong>
        <p>差异 {selectedLine.gap > 0 ? "+" : ""}{selectedLine.gap} 台 · 累计欠产 {selectedLine.shortageTotal || 0} 台</p>
      </div>
      <div className="field-grid">
        <div><span>日产目标</span><strong>{selectedLine.target}</strong></div>
        <div><span>累计实际</span><strong>{selectedLine.actual}</strong></div>
        <div><span>差异率</span><strong>{Math.abs((selectedLine.gap / selectedLine.target) * 100).toFixed(1)}%</strong></div>
        <div><span>清单率</span><strong>{selectedLine.planRate}</strong></div>
        <div><span>当日欠产</span><strong>{selectedLine.shortageToday || 0}</strong></div>
        <div><span>累计欠产</span><strong>{selectedLine.shortageTotal || 0}</strong></div>
      </div>
      <div className="action-hint">
        <strong>下一步动作</strong>
        <p>锁定瓶颈工序与物料齐套，今日班后复盘差异。</p>
      </div>
    </div>
  );
}

function WeeklyDetail() {
  return (
    <div className="drawer-content">
      <div className="selected-card">
        <span>周排产总结</span>
        <strong>W26合计排产 7.5万</strong>
        <p>包销结余18.8万，同期17万；洗碗机&烤箱无安全库存。</p>
      </div>
      <div className="mini-table">
        {weeklyPreview.map((row) => (
          <div key={row.line}>
            <strong>{row.factory} · {row.line}</strong>
            <span>合计 {formatNumber(row.total)} / 月度 {formatNumber(row.month)} / 包销 {formatNumber(row.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DelayDetail() {
  return (
    <div className="drawer-content">
      <div className="selected-card">
        <span>延单未排分析</span>
        <strong>合计 4380 台</strong>
        <p>物料原因1638台，小单集中2210台，技改原因435台。</p>
      </div>
      <div className="mini-table">
        {delayPreview.map((row) => (
          <div key={`${row.code}-${row.total}`}>
            <strong>{row.factory} · {row.code}</strong>
            <span>{row.total}台 / {row.reason} / {row.material}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyLedger({ selectedLine }) {
  return (
    <section className="panel ledger-panel">
      <div className="panel-head">
        <div>
          <h2>日绩效线体明细台账</h2>
          <p>当前选中：{selectedLine.factory} / {selectedLine.line}，每条线体差异用颜色直接标识。</p>
        </div>
        <Table weight="duotone" />
      </div>
      <div className="ledger-scroll">
        <table>
          <thead>
            <tr><th>工厂</th><th>线体</th><th>订单目标</th><th>累计实际</th><th>订单差异</th><th>日产目标</th><th>日产实际</th><th>日产差异</th><th>当日欠产</th><th>累计欠产</th><th>清单率</th></tr>
          </thead>
          <tbody>
            {sortDailyRows(dailyPerformanceRows).map((row) => (
              <tr key={`${row.factory}-${row.line}`}>
                <td>{row.factory}</td><td>{row.line}</td><td>{row.orderTarget || "-"}</td><td>{row.orderActual || "-"}</td><td className={varianceTone(row.orderGap)}>{row.orderGap || "-"}</td><td>{row.target}</td><td>{row.actual}</td><td className={varianceTone(row.gap)}>{row.gap > 0 ? "+" : ""}{row.gap}</td><td>{row.shortageToday || "-"}</td><td>{row.shortageTotal || "-"}</td><td>{row.planRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SheetPage({ tab, setActiveTab }) {
  const ledger = rawLedgers[tab.ledgerKey];
  const previewData = tab.key === "weekly" ? weeklyPreview : tab.key === "delay" ? delayPreview : null;
  return (
    <section className="sheet-page">
      <div className="sheet-return-bar">
        <button onClick={() => setActiveTab("overview")}>返回总驾驶舱</button>
        <span>{tab.label} / 明细台账</span>
      </div>
      <div className="sheet-hero panel">
        <div>
          <span>{tab.label}</span>
          <h2>{tab.headline}</h2>
          <p>这里是总驾驶舱里的专题页：上面看结论，中间看差异，下方保留原表明细台账。</p>
        </div>
        <strong>{tab.value}</strong>
      </div>
      {previewData ? <SpecialPreview tab={tab} /> : <GenericSheetSummary tab={tab} ledger={ledger} />}
      <RawLedgerTable title={`${tab.label} · 原表明细台账`} ledger={ledger} />
    </section>
  );
}

function GenericSheetSummary({ tab, ledger }) {
  const rowCount = ledger?.rows?.length || 0;
  const colCount = ledger?.columns?.length || 0;
  return (
    <section className="panel generic-summary">
      <div className="panel-head">
        <div>
          <h2>{tab.label}概览</h2>
          <p>保留原 sheet 的字段和行数据，后续上传同模板会替换这里的数据。</p>
        </div>
        <Package weight="duotone" />
      </div>
      <div className="metric-row">
        <div><span>明细行数</span><strong>{rowCount}</strong></div>
        <div><span>字段数量</span><strong>{colCount}</strong></div>
        <div><span>状态</span><strong>已接入</strong></div>
      </div>
    </section>
  );
}

function SpecialPreview({ tab }) {
  if (tab.key === "delay") {
    return (
      <section className="panel ledger-panel">
        <div className="panel-head"><div><h2>延单未排重点明细</h2><p>按物料号、原因、供应商与进度下钻。</p></div><ClipboardText weight="duotone" /></div>
        <div className="ledger-scroll">
          <table>
            <thead><tr><th>工厂</th><th>品类</th><th>物料号</th><th>物料描述</th><th>T周</th><th>合计</th><th>未排原因</th><th>短缺物料&供应商</th><th>关差进度</th></tr></thead>
            <tbody>{delayPreview.map((row) => <tr key={row.code}><td>{row.factory}</td><td>{row.category}</td><td>{row.code}</td><td>{row.desc}</td><td>{row.week}</td><td>{row.total}</td><td>{row.reason}</td><td>{row.material}</td><td>{row.progress}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    );
  }
  return (
    <section className="panel ledger-panel">
      <div className="panel-head"><div><h2>周排产重点明细</h2><p>按工厂、线体、日期、合计、月度排产、包销结余查看。</p></div><Package weight="duotone" /></div>
      <div className="ledger-scroll">
        <table>
          <thead><tr><th>工厂</th><th>线体</th><th>6/29</th><th>6/30</th><th>7/1</th><th>7/2</th><th>7/3</th><th>7/4</th><th>7/5</th><th>合计</th><th>月度累计排产</th><th>当周包销结余</th></tr></thead>
          <tbody>{weeklyPreview.map((row) => <tr key={row.line}><td>{row.factory}</td><td>{row.line}</td><td>{row.d1}</td><td>{row.d2}</td><td>{row.d3}</td><td>{row.d4}</td><td>{row.d5}</td><td>{row.d6}</td><td>{row.d7}</td><td>{row.total}</td><td>{row.month}</td><td>{row.balance}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function getColumnMeta(columns, rows) {
  const widePattern = /措施|进度|原因|描述|评估|风险|需求|影响|进展|问题|备注|会议|决议|策略|内容|清欠|供应商|计划|总结|行动|目标|现状/;
  const tightPattern = /序号|编号|日期|期限|状态|差异|目标|现状|负荷率|责任人|工厂|品类|系列|数量|合计|当日|累计|T周|周/;

  return columns.map((column, index) => {
    const header = String(column || `字段${index + 1}`);
    const samples = rows.slice(0, 16).map((row) => String(row?.[index] ?? ""));
    const maxLen = Math.max(header.length, ...samples.map((sample) => sample.length));
    const text = `${header} ${samples.join(" ")}`;

    if (index === 0 || (tightPattern.test(header) && maxLen <= 18)) {
      return { kind: "tight", label: header };
    }
    if (widePattern.test(text) || maxLen > 44) {
      return { kind: maxLen > 90 ? "xl" : "wide", label: header };
    }
    if (maxLen > 18) {
      return { kind: "medium", label: header };
    }
    return { kind: "tight", label: header };
  });
}

function renderCell(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function RawLedgerTable({ title, ledger }) {
  const columns = ledger?.columns?.length ? ledger.columns : ["字段1", "字段2", "字段3"];
  const rows = ledger?.rows?.length ? ledger.rows : [];
  const columnMeta = getColumnMeta(columns, rows);
  return (
    <section className="panel ledger-panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p>{ledger?.sheet || "sheet"} · {rows.length}行 · {columns.length}列 · 长文本列已加宽，横向滚动查看完整台账</p>
        </div>
        <Table weight="duotone" />
      </div>
      <div className="ledger-scroll raw-ledger-scroll">
        <table className="raw-ledger-table">
          <colgroup>
            {columnMeta.map((meta, index) => <col key={`${meta.kind}-${index}`} className={`col-${meta.kind}`} />)}
          </colgroup>
          <thead>
            <tr>{columnMeta.map((meta, index) => <th className={`col-${meta.kind}`} key={`${meta.label}-${index}`}>{meta.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columnMeta.map((meta, colIndex) => <td className={`col-${meta.kind}`} key={colIndex}>{renderCell(row?.[colIndex])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedLine, setSelectedLine] = useState(dailyPerformanceRows[1]);
  const [uploadInfo, setUploadInfo] = useState({
    file: "最近上传：生产日清-6.30.xlsx",
    status: "已接入全部Sheet · 上传同模板后替换全驾驶舱数据",
  });
  const fileInputRef = useRef(null);

  const activeModule = useMemo(() => moduleTabs.find((tab) => tab.key === activeTab) || moduleTabs[0], [activeTab]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadInfo({
      file: `已上传：${file.name}`,
      status: "前端已接收 · 下一步可接入Excel解析替换全部Sheet",
    });
  };

  return (
    <main className="daily-workspace">
      <AppHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        uploadInfo={uploadInfo}
        fileInputRef={fileInputRef}
        onUploadClick={() => fileInputRef.current?.click()}
        onFileChange={handleFileChange}
      />
      {activeTab === "overview" ? (
        <OverviewPage setActiveTab={setActiveTab} selectedLine={selectedLine} setSelectedLine={setSelectedLine} />
      ) : activeTab === "daily" ? (
        <DailyPage selectedLine={selectedLine} setSelectedLine={setSelectedLine} setActiveTab={setActiveTab} />
      ) : (
        <SheetPage tab={activeModule} setActiveTab={setActiveTab} />
      )}
    </main>
  );
}
