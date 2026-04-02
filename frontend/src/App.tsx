import { DashboardProvider, useDashboard } from './store/dashboardStore';
import { useFinancials } from './hooks/useFinancials';
import { useAuth, useLists } from './hooks/useLists';
import Header from './components/layout/Header';
import Sidebar from './components/sidebar/Sidebar';
import StatCard from './components/ui/StatCard';
import TabBar from './components/ui/TabBar';
import PeriodToggle from './components/ui/PeriodToggle';
import LoadingSpinner from './components/ui/LoadingSpinner';
import FinancialsTable from './components/financials/FinancialsTable';
import KeyRatios from './components/financials/KeyRatios';
import RevenueChart from './components/charts/RevenueChart';
import NetIncomeChart from './components/charts/NetIncomeChart';
import EPSChart from './components/charts/EPSChart';
import FreeCashFlowChart from './components/charts/FreeCashFlowChart';
import { formatValue } from './components/financials/FinancialsTable';
import EarningsChart from './components/financials/EarningsChart';
import EarningsTable from './components/financials/EarningsTable';

function formatPct(v: number | null): string {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(2)}%`;
}

function Dashboard() {
  useFinancials();
  useAuth();
  useLists();
  const { state } = useDashboard();
  const { symbol, info, financials, charts, ratios, earnings, loading, error, activeTab } = state;

  if (!symbol) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-20">
        <div className="text-5xl mb-6">📊</div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Financial Dashboard</h1>
        <p className="text-text-secondary text-sm max-w-xs">
          Enter a stock ticker in the search bar above to view financial statements, key ratios, and charts.
        </p>
        <div className="mt-6 flex gap-2 flex-wrap justify-center">
          {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'].map((t) => (
            <span key={t} className="bg-bg-surface border border-border text-text-secondary text-xs font-numbers px-3 py-1 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <div className="bg-bg-surface border border-red-900/50 rounded p-6 max-w-sm text-center">
          <div className="text-negative text-sm font-medium mb-1">Error</div>
          <div className="text-text-secondary text-sm">{error}</div>
        </div>
      </div>
    );
  }

  const priceChangePct = info?.price_change_pct ?? null;

  return (
    <main className="flex-1 overflow-auto">
      {info && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-text-primary">{info.symbol}</h2>
                <span className="text-text-secondary text-sm">{info.name}</span>
              </div>
              <div className="text-text-muted text-xs mt-0.5">
                {info.exchange} · {info.sector} · {info.industry}
              </div>
            </div>
            <PeriodToggle />
          </div>
          <div className="flex gap-3 flex-wrap">
            <StatCard
              label="Price"
              value={info.current_price != null ? `$${info.current_price.toFixed(2)}` : '—'}
              sub={priceChangePct != null ? formatPct(priceChangePct) : undefined}
              positive={priceChangePct != null && priceChangePct >= 0}
              negative={priceChangePct != null && priceChangePct < 0}
            />
            <StatCard label="Market Cap" value={formatValue(info.market_cap, 'currency')} />
            {ratios && (() => {
              const byKey = Object.fromEntries(ratios.ratios.map((r) => [r.key, r]));
              return (
                <>
                  <StatCard label="P/E (TTM)"  value={byKey['trailingPE']          ? formatValue(byKey['trailingPE'].value,          'ratio')   : '—'} />
                  <StatCard label="EV/EBITDA"  value={byKey['enterpriseToEbitda']  ? formatValue(byKey['enterpriseToEbitda'].value,  'ratio')   : '—'} />
                  <StatCard label="Net Margin" value={byKey['profitMargins']       ? formatValue(byKey['profitMargins'].value,       'percent') : '—'} />
                  <StatCard label="ROE"        value={byKey['returnOnEquity']      ? formatValue(byKey['returnOnEquity'].value,      'percent') : '—'} />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {charts && (
        <div className="px-6 py-4 grid grid-cols-2 xl:grid-cols-4 gap-4 border-b border-border">
          <RevenueChart charts={charts} />
          <NetIncomeChart charts={charts} />
          <EPSChart charts={charts} />
          <FreeCashFlowChart charts={charts} />
        </div>
      )}

      <div className="px-6 pt-4 pb-2">
        <TabBar />
      </div>
      <div className="pb-8">
        {activeTab === 'income'   && financials.income   && <FinancialsTable dates={financials.income.dates}   rows={financials.income.rows} />}
        {activeTab === 'balance'  && financials.balance  && <FinancialsTable dates={financials.balance.dates}  rows={financials.balance.rows} />}
        {activeTab === 'cashflow' && financials.cashflow && <FinancialsTable dates={financials.cashflow.dates} rows={financials.cashflow.rows} />}
        {activeTab === 'ratios'   && ratios              && <KeyRatios ratios={ratios.ratios} />}
        {activeTab === 'earnings' && earnings            && (
          <div className="px-6 pt-4">
            <EarningsChart earnings={earnings} />
            <EarningsTable earnings={earnings} />
          </div>
        )}
      </div>
    </main>
  );
}

function InnerApp() {
  const { state } = useDashboard();
  return (
    <>
      {state.user && <Sidebar />}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <Dashboard />
      </div>
    </>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <div className="flex h-screen bg-bg-base text-text-primary overflow-hidden">
        <InnerApp />
      </div>
    </DashboardProvider>
  );
}
