import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  getRafiTransactions,
  createRafiTransaction,
  deleteRafiTransaction,
  rafiKeys,
} from "../api/rafiTransactions";
import { useToast } from "../context/ToastContext";
import { SkeletonRow, SkeletonCard } from "../components/ui/Skeleton";
import { CreateRafiTransactionSchema } from "@tracksheet/shared";
import type { CreateRafiTransactionInput, RafiTransactionType, RafiExchanger } from "@tracksheet/shared";
import styles from "./RafiPage.module.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const EMPTY_FORM: CreateRafiTransactionInput = {
  date: new Date(),
  type: "Received",
  usdAmount: 0,
  rate: 0,
  bdtAmount: 0,
  person: "",
  exchanger: "Binance",
  notes: "",
};

export default function RafiPage() {
  const qc = useQueryClient();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateRafiTransactionInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  
  // Date Filtering State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: rafiKeys.list(),
    queryFn: getRafiTransactions,
  });

  const createMutation = useMutation({
    mutationFn: createRafiTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rafiKeys.all() });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setErrors({});
      addToast("Transaction added", "success");
    },
    onError: (err: any) => addToast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRafiTransaction,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: rafiKeys.all() });
      addToast("Transaction deleted", "success");
    },
    onError: (err: any) => addToast(err.message, "error"),
  });

  const handleTypeChange = (type: RafiTransactionType) => {
    setForm(prev => ({
      ...prev,
      type,
      // Reset logic-specific fields
      person: type === "Sent" ? prev.person : "",
      usdAmount: (type === "Received" || type === "Conversion" || type === "Sent") ? prev.usdAmount : 0,
      rate: type === "Conversion" ? prev.rate : 0,
    }));
  };

  // Calculate BDT only for display/logic, don't sync back to state via effect
  const displayBdt = form.type === "Conversion" 
    ? (form.usdAmount || 0) * (form.rate || 0) 
    : form.bdtAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare payload: ensure bdtAmount is correct for Conversions
    const payload = {
      ...form,
      bdtAmount: form.type === "Conversion" ? (form.usdAmount * form.rate) : form.bdtAmount
    };

    const result = CreateRafiTransactionSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    createMutation.mutate(result.data);
  };

  // Filtering Logic
  const filteredTransactions = useMemo(() => {
    let result = data?.transactions ?? [];
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(t => new Date(t.date) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.date) <= end);
    }
    
    return result;
  }, [data?.transactions, startDate, endDate]);

  // Recalculate stats based on filtered data (exactly like the JS snippet logic)
  const filteredSummary = useMemo(() => {
    const sum = {
      usdReceived: 0,
      usdConversion: 0,
      bdtConversion: 0,
      usdSent: 0,
      bdtSent: 0,
    };

    filteredTransactions.forEach(t => {
      if (t.type === "Received") sum.usdReceived += t.usdAmount;
      if (t.type === "Conversion") {
        sum.usdConversion += t.usdAmount;
        sum.bdtConversion += t.bdtAmount;
      }
      if (t.type === "Sent") {
        sum.usdSent += t.usdAmount;
        sum.bdtSent += t.bdtAmount;
      }
    });

    return {
      totalUsdReceived: sum.usdReceived,
      totalBdtConversion: sum.bdtConversion,
      remainingUsd: sum.usdReceived - sum.usdConversion - sum.usdSent,
      remainingBdt: sum.bdtConversion - sum.bdtSent,
    };
  }, [filteredTransactions]);

  // Chart Data Preparation (adapted from snippet)
  const conversionChartData = useMemo(() => {
    const convData = filteredTransactions.filter(t => t.type === "Conversion");
    return {
      labels: convData.map(t => new Date(t.date).toLocaleDateString()),
      datasets: [{
        label: "USD Converted",
        data: convData.map(t => t.usdAmount),
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 1,
        // Carry bdtAmount and rate for custom tooltips
        extra: convData.map(t => ({ bdt: t.bdtAmount, rate: t.rate }))
      }]
    };
  }, [filteredTransactions]);

  const personChartData = useMemo(() => {
    const persons: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === "Sent" && t.person) {
        // Approximate BDT value calculation (Sent BDT + Sent USD * 125 as per snippet)
        let val = t.bdtAmount;
        if (t.usdAmount > 0) val += t.usdAmount * 125;
        persons[t.person] = (persons[t.person] || 0) + val;
      }
    });
    
    return {
      labels: Object.keys(persons),
      datasets: [{
        data: Object.values(persons),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
      }]
    };
  }, [filteredTransactions]);

  const flowChartData = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      labels: sorted.map(t => new Date(t.date).toLocaleDateString()),
      datasets: [{
        label: "Transaction Flow (USD Equivalent)",
        data: sorted.map(t => t.usdAmount || (t.bdtAmount / 125)),
        borderColor: "#6366F1",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        tension: 0.3,
        fill: true,
      }]
    };
  }, [filteredTransactions]);

  if (isError) return <div className={styles.error}>Failed to load data.</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Rafi's Tracker</h1>
          <p className={styles.subtitle}>Financial flow monitoring</p>
        </div>
        
        <div className={styles.actions}>
          <div className={styles.dateFilter}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span>to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            <button className={styles.btnReset} onClick={() => { setStartDate(""); setEndDate(""); }}>Reset</button>
          </div>
          <button className={styles.btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Entry"}
          </button>
        </div>
      </header>

      <section className={styles.stats}>
        {isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard label="Total USD Received" value={`$ ${filteredSummary.totalUsdReceived.toLocaleString()}`} accent="green" />
            <StatCard label="Total BDT Conversion" value={`৳ ${filteredSummary.totalBdtConversion.toLocaleString()}`} />
            <StatCard label="Remaining USD Balance" value={`$ ${filteredSummary.remainingUsd.toLocaleString()}`} accent={filteredSummary.remainingUsd < 0 ? "red" : "green"} />
            <StatCard label="Remaining Bank (BDT)" value={`৳ ${filteredSummary.remainingBdt.toLocaleString()}`} accent={filteredSummary.remainingBdt < 0 ? "red" : "green"} />
          </>
        )}
      </section>

      <section className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3>USD to BDT Conversions</h3>
          <div className={styles.chartContainer}>
            <Bar 
              data={conversionChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const val = context.parsed.y;
                        return ` USD: $${val.toLocaleString()}`;
                      },
                      afterLabel: (context) => {
                        const dataItem = (context.dataset as any).extra[context.dataIndex];
                        return ` BDT Received: ৳${dataItem.bdt.toLocaleString()} (Rate: ${dataItem.rate})`;
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3>Person Wise Sent (Approx BDT)</h3>
          <div className={styles.chartContainer}>
            <Doughnut 
              data={personChartData} 
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', boxWidth: 12, padding: 15 }
                  }
                }
              }} 
            />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h3>Daily Flow</h3>
          <div className={styles.chartContainer}>
            <Line 
              data={flowChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                  y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                  x: { grid: { display: false }, ticks: { color: '#64748b' } }
                },
                plugins: {
                  legend: { display: false }
                }
              }} 
            />
          </div>
        </div>
      </section>

      {showForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Date</label>
              <input type="date" value={form.date.toISOString().split("T")[0]} 
                onChange={e => setForm({...form, date: new Date(e.target.value)})} />
            </div>
            <div className={styles.field}>
              <label>Type</label>
              <select value={form.type} onChange={e => handleTypeChange(e.target.value as RafiTransactionType)}>
                <option value="Received">Received (USD)</option>
                <option value="Sent">Sent (USD/BDT)</option>
                <option value="Conversion">Conversion (USD → BDT)</option>
              </select>
            </div>
            
            {(form.type === "Received" || form.type === "Conversion" || form.type === "Sent") && (
              <div className={styles.field}>
                <label>USD Amount</label>
                <input type="number" step="0.01" value={form.usdAmount || ""} 
                  onChange={e => setForm({...form, usdAmount: parseFloat(e.target.value) || 0})} />
              </div>
            )}

            {form.type === "Conversion" && (
              <div className={styles.field}>
                <label>Rate (BDT)</label>
                <input type="number" step="0.01" value={form.rate || ""} 
                  onChange={e => setForm({...form, rate: parseFloat(e.target.value) || 0})} />
              </div>
            )}

            {(form.type === "Sent" || form.type === "Conversion") && (
              <div className={styles.field}>
                <label>BDT Amount {form.type === "Conversion" && "(Auto)"}</label>
                <input type="number" step="0.01" value={displayBdt || ""} 
                  readOnly={form.type === "Conversion"}
                  onChange={e => setForm({...form, bdtAmount: parseFloat(e.target.value) || 0})} />
              </div>
            )}

            {form.type === "Sent" && (
              <div className={styles.field}>
                <label>Person</label>
                <input type="text" value={form.person || ""} 
                  onChange={e => setForm({...form, person: e.target.value})} />
              </div>
            )}

            <div className={styles.field}>
              <label>Exchanger</label>
              <select value={form.exchanger} onChange={e => setForm({...form, exchanger: e.target.value as RafiExchanger})}>
                <option value="Binance">Binance</option>
                <option value="Bitget">Bitget</option>
                <option value="Bybit">Bybit</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.wide}`}>
              <label>Notes</label>
              <input type="text" value={form.notes || ""} 
                onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <button type="submit" className={styles.btnSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add Transaction"}
          </button>
        </form>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>USD</th>
              <th>Rate</th>
              <th>BDT</th>
              <th>Exchanger</th>
              <th>Notes / Person</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : filteredTransactions.length === 0 ? (
              <tr><td colSpan={8} className={styles.empty}>No transactions found in this range.</td></tr>
            ) : (
              filteredTransactions.map(t => (
                <tr key={t._id} className={styles[t.type.toLowerCase()]}>
                  <td>{new Date(t.date).toLocaleDateString()}</td>
                  <td><span className={styles.typeBadge}>{t.type}</span></td>
                  <td>{t.usdAmount > 0 ? `$ ${t.usdAmount.toLocaleString()}` : "—"}</td>
                  <td>{t.rate > 0 ? `৳ ${t.rate.toLocaleString()}` : "—"}</td>
                  <td>{t.bdtAmount > 0 ? `৳ ${t.bdtAmount.toLocaleString()}` : "—"}</td>
                  <td>{t.exchanger ?? "—"}</td>
                  <td>
                    <div className={styles.noteContent}>
                      {t.person && <span className={styles.personTag}>@{t.person}</span>}
                      {t.notes}
                    </div>
                  </td>
                  <td>
                    <button className={styles.btnDelete} onClick={() => {
                      if (confirm("Delete this transaction?")) deleteMutation.mutate(t._id);
                    }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string, value: string, accent?: "green" | "red" }) {
  return (
    <div className={`${styles.card} ${accent ? styles[accent] : ""}`}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardValue}>{value}</span>
    </div>
  );
}
