import { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import api from "../services/api";

const NAVY = "#1F3A5F";
const BRASS = "#B8863B";
const SUCCESS = "#2F6F4F";
const DANGER = "#A63A3A";
const MUTED = "#5B6472";

function useChart(canvasRef, config) {
  useEffect(() => {
    if (!canvasRef.current || !config) return;
    const chart = new Chart(canvasRef.current, config);
    return () => chart.destroy();
  }, [canvasRef, config]);
}

function SummaryCard({ label, value }) {
  return (
    <div className="card p-5">
      <p className="label-eyebrow">{label}</p>
      <p className="font-display text-3xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card p-5">
      <p className="label-eyebrow text-brass mb-3">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [policiesByStatus, setPoliciesByStatus] = useState([]);
  const [claimsByStatus, setClaimsByStatus] = useState([]);
  const [premiumCollection, setPremiumCollection] = useState([]);
  const [customerGrowth, setCustomerGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  const policiesRef = useRef(null);
  const claimsRef = useRef(null);
  const premiumRef = useRef(null);
  const growthRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, p, c, pc, cg] = await Promise.all([
        api.get("/reports/summary"),
        api.get("/reports/policies-by-status"),
        api.get("/reports/claims-by-status"),
        api.get("/reports/premium-collection"),
        api.get("/reports/customer-growth"),
      ]);
      setSummary(s.data);
      setPoliciesByStatus(p.data);
      setClaimsByStatus(c.data);
      setPremiumCollection(pc.data);
      setCustomerGrowth(cg.data);
      setLoading(false);
    }
    load();
  }, []);

  useChart(
    policiesRef,
    policiesByStatus.length
      ? {
          type: "doughnut",
          data: {
            labels: policiesByStatus.map((r) => r.status),
            datasets: [{ data: policiesByStatus.map((r) => r.count), backgroundColor: [SUCCESS, MUTED, DANGER, NAVY] }],
          },
          options: { plugins: { legend: { position: "bottom" } } },
        }
      : null
  );

  useChart(
    claimsRef,
    claimsByStatus.length
      ? {
          type: "bar",
          data: {
            labels: claimsByStatus.map((r) => r.status),
            datasets: [{ label: "Claims", data: claimsByStatus.map((r) => r.count), backgroundColor: BRASS }],
          },
          options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
        }
      : null
  );

  useChart(
    premiumRef,
    premiumCollection.length
      ? {
          type: "line",
          data: {
            labels: premiumCollection.map((r) => r.month),
            datasets: [{ label: "Premium collected", data: premiumCollection.map((r) => r.total), borderColor: NAVY, backgroundColor: NAVY, tension: 0.3 }],
          },
          options: { plugins: { legend: { display: false } } },
        }
      : null
  );

  useChart(
    growthRef,
    customerGrowth.length
      ? {
          type: "line",
          data: {
            labels: customerGrowth.map((r) => r.month),
            datasets: [{ label: "New customers", data: customerGrowth.map((r) => r.new_customers), borderColor: BRASS, backgroundColor: BRASS, tension: 0.3 }],
          },
          options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
        }
      : null
  );

  return (
    <div>
      <div className="mb-8">
        <p className="label-eyebrow text-brass">Module 06</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Reports Dashboard</h1>
      </div>

      {loading || !summary ? (
        <p className="text-muted">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <SummaryCard label="Active policies" value={summary.active_policies} />
            <SummaryCard label="Pending claims" value={summary.pending_claims} />
            <SummaryCard label="Total customers" value={summary.total_customers} />
            <SummaryCard label="Expired policies" value={summary.expired_policies} />
            <SummaryCard label="Cancelled policies" value={summary.cancelled_policies} />
            <SummaryCard label="Premium collected" value={`₹${summary.total_premium_collected.toLocaleString()}`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Policies by status">
              <canvas ref={policiesRef} />
            </ChartCard>
            <ChartCard title="Claims by status">
              <canvas ref={claimsRef} />
            </ChartCard>
            <ChartCard title="Premium collection (monthly)">
              <canvas ref={premiumRef} />
            </ChartCard>
            <ChartCard title="Customer growth (monthly)">
              <canvas ref={growthRef} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
