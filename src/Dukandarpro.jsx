import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// Import Google Sheets API
import {
  syncAllData,
  addProduct,
  updateProduct,
  patchProductStock,
  addOrder,
  updateOrderStatus,
  addCustomer,
  updateCustomer,
  addCustomerCreditPayment,
  addExpense,
  addStaff,
  isOnline as checkOnlineStatus,
  queueOfflineOperation,
  processOfflineQueue,
  getPendingSyncCount,
  testConnection,
  getProducts,
  getCustomers,
  getOrders,
  getExpenses,
  getStaff
} from "./api/googleSheet";

/* ═══════════════════════════════════════════════════════════════
   🏪 DUKANDARPRO v4.0 — COMPLETE SHOP MANAGEMENT SYSTEM
   WITH GOOGLE SHEETS CLOUD SYNC
   ═══════════════════════════════════════════════════════════════ */

/* ─── UTILITIES ─── */
const rs = (n) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;
const fmtDate = (s) => { try { return new Date(s).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }); } catch { return s; } };
const fmtTime = (s) => { try { return new Date(s).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const fmtDT = (s) => `${fmtDate(s)} ${fmtTime(s)}`;
const today = () => new Date().toISOString();
const daysDiff = (date) => { const d = new Date(date); const n = new Date(); return Math.ceil((d - n) / (1000 * 60 * 60 * 24)); };

const loadFromStorage = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
const saveToStorage = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const CATEGORIES = ["All", "Grocery", "Beverages", "Household", "Snacks", "Cosmetics", "Pharmacy"];

/* ═══════════════════ SYNC STATUS INDICATOR ═══════════════════ */
const SyncStatusIndicator = ({ pendingCount, isNetworkOnline, onSync, syncing }) => {
  const [showPopup, setShowPopup] = useState(false);
  
  if (pendingCount === 0 && isNetworkOnline) return null;
  
  return (
    <div className="fixed bottom-24 right-4 z-50">
      <button
        onClick={() => setShowPopup(!showPopup)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl transition-all ${
          pendingCount > 0 ? 'bg-amber-500 hover:bg-amber-600' : isNetworkOnline ? 'bg-emerald-500' : 'bg-red-500'
        } text-white`}
      >
        {syncing ? '⏳' : pendingCount > 0 ? '📤' : isNetworkOnline ? '☁️' : '📡'}
      </button>
      
      {showPopup && (
        <div className="absolute bottom-14 right-0 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 w-64 border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-bold mb-2 text-slate-900 dark:text-white">Sync Status</div>
          <div className="text-xs text-slate-500 mb-3">
            {isNetworkOnline ? '✅ Online' : '⚠️ Offline - Using Local Storage'}
          </div>
          {pendingCount > 0 && (
            <div className="text-xs text-amber-600 mb-3">
              {pendingCount} pending {pendingCount === 1 ? 'operation' : 'operations'}
            </div>
          )}
          <button
            onClick={onSync}
            disabled={syncing || !isNetworkOnline}
            className="w-full px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════ REUSABLE UI COMPONENTS ═══════════════════ */
const Badge = ({ color, children, size = "sm" }) => {
  const s = size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  const c = { green:"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", red:"bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", amber:"bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", blue:"bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", violet:"bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", gray:"bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", orange:"bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
  return <span className={`inline-flex items-center ${s} rounded-full font-semibold ${c[color] || c.gray}`}>{children}</span>;
};

const Card = ({ children, className = "", onClick, selected = false }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 transition-all ${selected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-slate-200 dark:border-slate-700"} ${className} ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : ""}`}>{children}</div>
);

const StatCard = ({ icon, label, value, sub, subColor = "text-emerald-500", onClick }) => (
  <Card onClick={onClick} className="p-4">
    <div className="flex items-start justify-between mb-2">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-slate-50 dark:bg-slate-700">{icon}</div>
      {sub && <span className={`text-xs font-semibold ${subColor}`}>{sub}</span>}
    </div>
    <div className="text-xl font-black text-slate-900 dark:text-white">{value}</div>
    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
  </Card>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = { success:"bg-emerald-500", error:"bg-red-500", info:"bg-sky-500", warning:"bg-amber-500" };
  const icons = { success:"✅", error:"❌", warning:"⚠️", info:"ℹ️" };
  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[300] ${colors[type]} text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2 animate-toast`}>
      {icons[type]} {msg}
    </div>
  );
};

const Modal = ({ open, onClose, title, children, size = "md" }) => {
  if (!open) return null;
  const sizes = { sm:"max-w-sm", md:"max-w-lg", lg:"max-w-2xl", xl:"max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl w-full ${sizes[size]} max-h-[92vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger = false, confirmText = "Confirm" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full">
        <div className="text-3xl mb-3 text-center">{danger ? "⚠️" : "❓"}</div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 text-center">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 text-center">{message}</p>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onCancel} full>Cancel</Btn>
          <Btn variant={danger ? "danger" : "primary"} onClick={onConfirm} full>{confirmText}</Btn>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false, helpText = "", min, max }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} min={min} max={max}
      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors text-sm font-medium" />
    {helpText && <p className="text-xs text-slate-500 mt-1">💡 {helpText}</p>}
  </div>
);

const Select = ({ label, value, onChange, options, helpText = "" }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>}
    <select value={value} onChange={onChange}
      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors text-sm font-medium">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {helpText && <p className="text-xs text-slate-500 mt-1">💡 {helpText}</p>}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", className = "", disabled = false, full = false, type = "button" }) => {
  const v = { primary:"bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm", secondary:"bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300", danger:"bg-red-500 hover:bg-red-600 text-white", ghost:"hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400", violet:"bg-violet-500 hover:bg-violet-600 text-white", amber:"bg-amber-500 hover:bg-amber-600 text-white" };
  const s = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2.5 text-sm", lg:"px-6 py-3.5 text-base" };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${v[variant]} ${s[size]} font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${full ? "w-full" : ""} flex items-center justify-center gap-2 ${className}`}>{children}</button>;
};

const EmptyState = ({ icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{desc}</p>
    {action}
  </div>
);

const KPIGrid = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {items.map((item, i) => (
      <Card key={i} className="p-4 text-center" onClick={item.onClick}>
        <div className="text-2xl mb-1">{item.icon}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{item.label}</div>
        <div className="text-base font-black text-slate-900 dark:text-white leading-tight">{item.value}</div>
        {item.change && <div className={`text-xs font-semibold mt-1 ${String(item.change).includes("+") ? "text-emerald-500" : item.change.toString().startsWith("-") ? "text-red-500" : "text-slate-400"}`}>{item.change}</div>}
      </Card>
    ))}
  </div>
);

const TimelineItem = ({ icon, title, sub, time, color = "green" }) => {
  const lineColor = { green:"bg-emerald-500", red:"bg-red-500", blue:"bg-sky-500", amber:"bg-amber-500", violet:"bg-violet-500" };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${lineColor[color] || lineColor.green} flex items-center justify-center text-white text-sm flex-shrink-0`}>{icon}</div>
        <div className="w-0.5 bg-slate-200 dark:bg-slate-700 flex-1 mt-1 min-h-[16px]" />
      </div>
      <div className="pb-4 flex-1">
        <div className="font-semibold text-slate-900 dark:text-white text-sm">{title}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        <div className="text-xs text-slate-400 mt-0.5">{time}</div>
      </div>
    </div>
  );
};

/* ═══════════════════ DASHBOARD ═══════════════════ */
const Dashboard = ({ products, orders, customers, expenses, lang, setPage, creditReminderTriggered, setCreditReminderTriggered, setExternalCustomer, setExternalCreditModal }) => {
  const L = lang === "ur";
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
  const todaySales = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const todayProfit = todayOrders.reduce((s, o) => s + (o.profit || 0), 0);
  const thisMonthSales = orders.filter(o => o.createdAt && o.createdAt.startsWith("2026-05")).reduce((s, o) => s + (o.total || 0), 0);
  const pendingUdhaar = customers.reduce((s, c) => s + (c.udhaar || 0), 0);
  const lowStock = products.filter(p => (p.stock || 0) <= (p.minStock || 0));
  const upcomingCredits = customers.filter(c => (c.udhaar || 0) > 0 && c.creditDueDate && daysDiff(c.creditDueDate) <= 7);

  const kpis = [
    { icon:"💰", label:L?"آج کی فروخت":"Today Sales", value:rs(todaySales), change:"+12%", onClick:()=>setPage("orders") },
    { icon:"📈", label:L?"مہینے کی فروخت":"Month Sales", value:rs(thisMonthSales), change:"+18%", onClick:()=>setPage("analytics") },
    { icon:"🏦", label:L?"آج کا منافع":"Today Profit", value:rs(todayProfit), change:"+8%", onClick:()=>setPage("analytics") },
    { icon:"🤝", label:L?"باقی ادھار":"Pending Credit", value:rs(pendingUdhaar), change:`${upcomingCredits.length} due`, onClick:()=>setPage("customers") },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-emerald-100 text-sm font-medium">{L ? "خوش آمدید" : "Welcome Back"} · {fmtDate(new Date().toISOString())}</p>
        <h2 className="text-2xl font-black mt-1">{L ? "علی جنرل اسٹور" : "My Store"}</h2>
        <div className="flex gap-6 mt-4 text-sm">
          <div><div className="text-emerald-100 text-xs">{L?"آج کے آرڈر":"Today Orders"}</div><div className="text-2xl font-black">{todayOrders.length}</div></div>
          <div><div className="text-emerald-100 text-xs">{L?"اسٹاک قدر":"Stock Value"}</div><div className="text-2xl font-black">{rs(products.reduce((s,p)=>s+(p.stock||0)*(p.buy||0),0))}</div></div>
          <div><div className="text-emerald-100 text-xs">{L?"ادھار واجب":"Credit Due"}</div><div className="text-2xl font-black">{upcomingCredits.length}</div></div>
        </div>
      </div>

      <KPIGrid items={kpis} />

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{L?"فوری عمل":"Quick Actions"}</h3>
        <div className="grid grid-cols-4 gap-2">
          {[["🛒",L?"نئی بلنگ":"New Sale","pos"],["📦",L?"اسٹاک":"Stock","inventory"],["👥",L?"گاہک":"Customers","customers"],["📊",L?"رپورٹ":"Reports","analytics"]].map(([ico,lbl,pg]) => (
            <button key={pg} onClick={()=>setPage(pg)} className="flex flex-col items-center p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 transition-all active:scale-95 gap-1">
              <span className="text-2xl">{ico}</span>
              <span className="text-xs font-bold text-center leading-tight">{lbl}</span>
            </button>
          ))}
        </div>
      </div>

      {upcomingCredits.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-xl p-4">
          <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">🔔 {L?"قرض یاددہانی":"Credit Reminders"}</h3>
          <div className="space-y-2">
            {upcomingCredits.slice(0,3).map(c => {
              const diff = daysDiff(c.creditDueDate);
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">{c.name}</span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 ml-2">{diff < 0 ? `${Math.abs(diff)}d overdue` : `Due in ${diff}d`}</span>
                  </div>
                  <Badge color={diff < 0 ? "red" : "amber"}>{rs(c.udhaar)}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl p-4">
          <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">⚠️ {L?"کم اسٹاک الرٹ":"Low Stock Alert"}</h3>
          <div className="space-y-1">
            {lowStock.slice(0,4).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-red-900 dark:text-red-100">{p.name}</span>
                <Badge color="red">{p.stock} left</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{L?"حالیہ فروخت":"Recent Sales"}</h3>
          <button onClick={()=>setPage("orders")} className="text-emerald-500 text-xs font-semibold">View All →</button>
        </div>
        <div className="space-y-2">
          {orders.slice(0,4).map(o => (
            <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">🧾</div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{o.customerName}</div>
                  <div className="text-xs text-slate-500">{o.id} · {fmtTime(o.createdAt)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 dark:text-white text-sm">{rs(o.total)}</div>
                <Badge color={o.status==="paid"?"green":o.status==="credit"?"red":"amber"}>{o.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ POS ═══════════════════ */
const POS = ({ products, customers, setOrders, setProducts, setCustomers, showToast, lang }) => {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const L = lang === "ur";

  const filtered = products.filter(p => (activeCat === "All" || p.cat === activeCat) && (p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))));
  
  const addToCart = (p) => {
    if (p.stock <= 0) { showToast("Out of stock!", "error"); return; }
    setCart(c => { const ex = c.find(i => i.pid === p.id); return ex ? c.map(i => i.pid === p.id ? {...i,qty:i.qty+1} : i) : [...c,{pid:p.id,name:p.name,buy:p.buy,sell:p.sell,qty:1,disc:0}]; });
  };
  
  const subtotal = cart.reduce((s,i) => s+i.qty*i.sell, 0);
  const totalDisc = cart.reduce((s,i) => s+i.disc*i.qty, 0) + +discount;
  const total = subtotal - totalDisc;
  const profit = cart.reduce((s,i) => s+i.qty*(i.sell-i.buy-(i.disc||0)), 0) - +discount;

  const doCheckout = () => {
    if (cart.length === 0) { showToast("Cart is empty!", "error"); return; }
    if (!selectedCustomer) { showToast("Please select a customer", "error"); return; }
    setShowCart(false); setShowConfirm(true);
  };

  const confirmCheckout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const inv = `INV-${String(Date.now()).slice(-6)}-${String(Math.floor(Math.random()*1000))}`;
    const order = { 
      id: inv, 
      customerId: selectedCustomer.id, 
      customerName: selectedCustomer.name, 
      cashier: "Ali", 
      items: cart.map(i => ({pid: i.pid, name: i.name, qty: i.qty, buy: i.buy, sell: i.sell, disc: i.disc})), 
      subtotal, 
      disc: totalDisc, 
      total, 
      profit, 
      status: payMethod === "udhaar" ? "credit" : "paid", 
      method: payMethod, 
      udhaarAmt: payMethod === "udhaar" ? total : 0, 
      createdAt: today(), 
      notes: "", 
      timeline: [{time: today(), evt: "Order created"}], 
      refunds: [], 
      returnHistory: [] 
    };
    
    const stockUpdates = cart.map(item => ({
      id: item.pid,
      delta: -item.qty,
      reason: `Sale ${inv}`,
      by: "Ali"
    }));
    
    try {
      console.log('Processing checkout...');
      const result = await addOrder(order, stockUpdates);
      
      if (result.success) {
        console.log('Order added successfully');
        
        // Update local state
        setOrders(prev => [order, ...prev]);
        setProducts(prev => prev.map(p => {
          const ci = cart.find(i => i.pid === p.id);
          return ci ? {...p, stock: Math.max(0, (p.stock || 0) - ci.qty), stockHistory: [...(p.stockHistory || []), {date: today(), change: -ci.qty, reason: `Sale ${inv}`, by: "Ali"}]} : p;
        }));
        
        if (payMethod === "udhaar") {
          try {
            const paymentResult = await addCustomerCreditPayment(selectedCustomer.id, total, creditDueDate || selectedCustomer.creditDueDate, inv);
            if (paymentResult.success) {
              setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? 
                {...c, udhaar: (c.udhaar || 0) + total, creditDueDate: creditDueDate || c.creditDueDate, 
                 creditHistory: [...(c.creditHistory || []), {date: today(), amount: total, type: "credit", orderId: inv, cashier: "Ali", remaining: (c.udhaar || 0) + total}],
                 activityLog: [...(c.activityLog || []), {date: today(), type: "credit", desc: `Credit of ${rs(total)} for ${inv}`, amount: total}]} : c));
            }
          } catch (creditError) {
            console.error('Credit payment error:', creditError);
            showToast("Order saved but credit update may be delayed", "warning");
          }
        }
        
        showToast(`✅ ${inv} — ${rs(total)} (Synced to cloud)`, "success");
      } else if (result.queued) {
        // Offline mode - saved locally
        setOrders(prev => [order, ...prev]);
        setProducts(prev => prev.map(p => {
          const ci = cart.find(i => i.pid === p.id);
          return ci ? {...p, stock: Math.max(0, (p.stock || 0) - ci.qty)} : p;
        }));
        if (payMethod === "udhaar") {
          setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? 
            {...c, udhaar: (c.udhaar || 0) + total, creditDueDate: creditDueDate || c.creditDueDate} : c));
        }
        showToast(`⚠️ Offline mode: Order saved locally. Will sync when online.`, "warning");
      } else {
        throw new Error(result.error || 'Failed to save order');
      }
    } catch (error) {
      console.error("Checkout error:", error);
      showToast("Error processing order: " + error.message, "error");
      
      // Still save locally as fallback
      setOrders(prev => [order, ...prev]);
      setProducts(prev => prev.map(p => {
        const ci = cart.find(i => i.pid === p.id);
        return ci ? {...p, stock: Math.max(0, (p.stock || 0) - ci.qty)} : p;
      }));
    } finally {
      setCart([]); 
      setSelectedCustomer(null); 
      setDiscount(0); 
      setShowConfirm(false); 
      setCreditDueDate("");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col pb-24">
      <div className="space-y-3 mb-4">
        <button onClick={()=>setShowCustomerSearch(true)} className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-400 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <div className="text-left">
              <div className={`text-sm font-semibold ${selectedCustomer?"text-slate-900 dark:text-white":"text-slate-400"}`}>{selectedCustomer?selectedCustomer.name:(L?"گاہک منتخب کریں":"Select Customer")}</div>
              {selectedCustomer&&<div className="text-xs text-slate-500">{selectedCustomer.phone}</div>}
            </div>
          </div>
          {selectedCustomer?.udhaar>0&&<Badge color="red">Owes {rs(selectedCustomer.udhaar)}</Badge>}
        </button>
        <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={L?"پروڈکٹ تلاش کریں...":"Search products..."} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none text-sm" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
        {CATEGORIES.map(cat=><button key={cat} onClick={()=>setActiveCat(cat)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCat===cat?"bg-emerald-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>{cat}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {filtered.map(p => {
          const inCart = cart.find(i=>i.pid===p.id); const out = p.stock<=0;
          return (
            <button key={p.id} onClick={()=>!out&&addToCart(p)} disabled={out} className={`relative p-4 rounded-2xl text-left border-2 transition-all ${inCart?"border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20":"border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"} ${out?"opacity-40":""}`}>
              {inCart&&<div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">{inCart.qty}</div>}
              <div className="text-2xl mb-2">📦</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight mb-1 line-clamp-2">{p.name}</div>
              <div className="text-emerald-600 font-black text-sm">{rs(p.sell)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{out?"Out of stock":`${p.stock} ${p.unit || 'pcs'}`}</div>
            </button>
          );
        })}
      </div>

      {cart.length>0&&(
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <button onClick={()=>setShowCart(true)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-base shadow-2xl flex items-center justify-between px-5 active:scale-98 transition-all">
            <div className="flex items-center gap-3"><span className="bg-white text-emerald-600 w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm">{cart.reduce((s,i)=>s+i.qty,0)}</span><span>{L?"کارٹ":"Cart"}</span></div>
            <span>{rs(total)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      <Modal open={showCart} onClose={()=>setShowCart(false)} title={`🛒 Cart (${cart.reduce((s,i)=>s+i.qty,0)} items)`} size="lg">
        <div className="space-y-3 mb-4">
          {cart.map(item=>(
            <div key={item.pid} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="flex items-start justify-between mb-2">
                <div><div className="font-bold text-sm">{item.name}</div><div className="text-xs text-slate-500">{rs(item.sell)} each</div></div>
                <button onClick={()=>setCart(c=>c.filter(i=>i.pid!==item.pid))} className="text-red-400">✕</button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-600 rounded-lg p-1">
                  <button onClick={()=>{ if(item.qty<=1) setCart(c=>c.filter(i=>i.pid!==item.pid)); else setCart(c=>c.map(i=>i.pid===item.pid?{...i,qty:i.qty-1}:i)); }} className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-500 flex items-center justify-center font-bold">−</button>
                  <span className="w-8 text-center font-black text-sm">{item.qty}</span>
                  <button onClick={()=>setCart(c=>c.map(i=>i.pid===item.pid?{...i,qty:i.qty+1}:i))} className="w-7 h-7 rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold">+</button>
                </div>
                <div className="text-right flex-1"><div className="font-black text-sm">{rs(item.qty*item.sell)}</div><div className="text-xs text-emerald-500">+{rs(item.qty*(item.sell-item.buy))}</div></div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 space-y-2 border border-slate-200 dark:border-slate-600">
          <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Subtotal</span><span className="font-semibold">{rs(subtotal)}</span></div>
          <div className="flex justify-between items-center text-sm"><span className="text-slate-600 dark:text-slate-400">Discount</span><input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} className="w-24 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"/></div>
          <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between"><span className="font-bold">Total</span><span className="font-black text-xl text-emerald-600">{rs(total)}</span></div>
        </div>
        <div className="mb-4">
          <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">Payment Method</div>
          <div className="grid grid-cols-3 gap-2">
            {[["cash","💵","Cash"],["online","📱","Online"],["udhaar","📒","Credit"]].map(([v,ico,lbl])=>(
              <button key={v} onClick={()=>setPayMethod(v)} className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${payMethod===v?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30":"border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                <span className="text-xl mb-1">{ico}</span><span className="text-xs font-bold">{lbl}</span>
              </button>
            ))}
          </div>
          {payMethod==="udhaar"&&(
            <div className="mt-3">
              <Input label="Credit Due Date (optional)" type="date" value={creditDueDate} onChange={e=>setCreditDueDate(e.target.value)} helpText="Remind the owner when this credit is due" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={()=>setShowCart(false)} full>Cancel</Btn>
          <Btn variant="primary" onClick={doCheckout} full disabled={isProcessing}>{isProcessing ? "Processing..." : "✅ Complete"}</Btn>
        </div>
      </Modal>

      {/* Customer Search Modal */}
      <Modal open={showCustomerSearch} onClose={()=>setShowCustomerSearch(false)} title={L?"گاہک منتخب کریں":"Select Customer"}>
        <Input placeholder={L?"نام یا نمبر...":"Name or phone..."} value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {customers.filter(c=>c.name.toLowerCase().includes(customerSearch.toLowerCase())||c.phone.includes(customerSearch)).map(c=>(
            <button key={c.id} onClick={()=>{setSelectedCustomer(c);setShowCustomerSearch(false);setCustomerSearch("");}} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <div><div className="font-bold text-sm">{c.name}</div><div className="text-xs text-slate-500">{c.phone}</div></div>
              {c.udhaar>0&&<Badge color="red">{rs(c.udhaar)}</Badge>}
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog open={showConfirm} title="Confirm Sale" message={`Complete sale for ${selectedCustomer?.name}? Total: ${rs(total)} via ${payMethod}`} onConfirm={confirmCheckout} onCancel={()=>setShowConfirm(false)} confirmText="Complete Sale" />
    </div>
  );
};

/* ═══════════════════ INVENTORY ═══════════════════ */
const Inventory = ({ products, setProducts, showToast, lang }) => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showStockHistory, setShowStockHistory] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({ name:"", nameUr:"", sku:"", cat:"Grocery", buy:"", sell:"", stock:"", minStock:"5", unit:"pcs", expiry:"", supplier:"", barcode:"" });
  const L = lang === "ur";

  const filtered = products.filter(p => (activeCat==="All"||p.cat===activeCat) && (p.name.toLowerCase().includes(search.toLowerCase())||(p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))));

  const openEdit = (p) => { setEditProduct(p.id); setForm({...p, buy:String(p.buy), sell:String(p.sell), stock:String(p.stock), minStock:String(p.minStock)}); setShowAdd(true); };

  const saveProduct = async () => {
    if (!form.name||!form.sell) { showToast("Name & sell price required","error"); return; }
    if (isProcessing) return;
    setIsProcessing(true);
    
    const updated = {...form, buy:+form.buy, sell:+form.sell, stock:+form.stock, minStock:+form.minStock};
    
    if (editProduct) {
      const old = products.find(p=>p.id===editProduct);
      const changes = [];
      if (old.name!==updated.name) changes.push(`Name: ${old.name} → ${updated.name}`);
      if (old.sell!==updated.sell) changes.push(`Price: ${rs(old.sell)} → ${rs(updated.sell)}`);
      if (old.stock!==updated.stock) changes.push(`Stock: ${old.stock} → ${updated.stock}`);
      
      const finalProduct = {...updated, id: editProduct, stockHistory: old.stockHistory||[], editHistory: [...(old.editHistory||[]), {date: today(), changes, by: "Owner"}]};
      
      try {
        const result = await updateProduct(editProduct, finalProduct);
        if (result.success) {
          setProducts(prev=>prev.map(p=>p.id===editProduct?finalProduct:p));
          showToast("✅ Product updated and synced to cloud!","success");
        } else {
          await queueOfflineOperation('updateProduct', { id: editProduct, product: finalProduct });
          setProducts(prev=>prev.map(p=>p.id===editProduct?finalProduct:p));
          showToast("⚠️ Product saved locally. Will sync when online.","warning");
        }
      } catch (error) {
        showToast("Error saving product: " + error.message,"error");
      }
    } else {
      const newProduct = {...updated, id: Date.now(), stockHistory: [], editHistory: []};
      try {
        const result = await addProduct(newProduct);
        if (result.success) {
          setProducts(prev=>[...prev, newProduct]);
          showToast("✅ Product added and synced to cloud!","success");
        } else {
          await queueOfflineOperation('addProduct', { product: newProduct });
          setProducts(prev=>[...prev, newProduct]);
          showToast("⚠️ Product saved locally. Will sync when online.","warning");
        }
      } catch (error) {
        showToast("Error adding product: " + error.message,"error");
      }
    }
    setShowAdd(false);
    setIsProcessing(false);
  };

  const adjustStock = async (productId, delta, reason) => {
    const product = products.find(p => p.id === productId);
    const newStock = Math.max(0, (product.stock || 0) + delta);
    
    try {
      const result = await patchProductStock(productId, delta, reason, "Owner");
      if (result.success) {
        setProducts(prev=>prev.map(p=>p.id===productId?{...p, stock: newStock, stockHistory: [...(p.stockHistory||[]), {date: today(), change: delta, reason: reason || "Manual adjustment", by: "Owner"}]}:p));
        showToast(`✅ Stock updated and synced!`,"success");
      } else {
        await queueOfflineOperation('adjustStock', { productId, delta, reason, by: "Owner" });
        setProducts(prev=>prev.map(p=>p.id===productId?{...p, stock: newStock, stockHistory: [...(p.stockHistory||[]), {date: today(), change: delta, reason: reason || "Manual adjustment", by: "Owner"}]}:p));
        showToast(`⚠️ Stock updated locally. Will sync when online.`,"warning");
      }
    } catch (error) {
      showToast("Error updating stock: " + error.message,"error");
    }
  };

  const stockValue = products.reduce((s,p)=>s+((p.stock || 0)*(p.buy || 0)),0);
  const lowCount = products.filter(p=>(p.stock || 0) <= (p.minStock || 0)).length;

  return (
    <div className="space-y-4 pb-8">
      <KPIGrid items={[
        {icon:"📦",label:"Total SKUs",value:products.length,change:`${lowCount} low`},
        {icon:"⚠️",label:"Low Stock",value:lowCount,change:"Check now"},
        {icon:"💼",label:"Stock Value",value:rs(stockValue),change:null},
        {icon:"📊",label:"Avg Margin",value:products.length > 0 ? `${Math.round(products.reduce((s,p)=>s+((p.sell-p.buy)/p.sell*100),0)/products.length)}%` : "0%",change:null},
      ]}/>

      <div className="flex gap-3">
        <div className="flex-1 relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={L?"تلاش کریں...":"Search..."} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:border-emerald-500 focus:outline-none"/>
        </div>
        <Btn variant="primary" onClick={()=>{setForm({name:"",nameUr:"",sku:"",cat:"Grocery",buy:"",sell:"",stock:"",minStock:"5",unit:"pcs",expiry:"",supplier:"",barcode:""});setEditProduct(null);setShowAdd(true);}}>+ Add</Btn>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat=><button key={cat} onClick={()=>setActiveCat(cat)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCat===cat?"bg-emerald-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>{cat}</button>)}
      </div>

      <div className="space-y-3">
        {filtered.map(p => {
          const isLow = (p.stock || 0) <= (p.minStock || 0);
          const stockPct = Math.min(100, ((p.stock || 0) / ((p.minStock || 5) * 3)) * 100);
          return (
            <Card key={p.id} className={`p-4 ${isLow?"border-amber-300 dark:border-amber-700":""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                    {p.nameUr&&<span className="text-xs text-slate-500">{p.nameUr}</span>}
                    {isLow&&<Badge color="amber">Low</Badge>}
                    {p.stock===0&&<Badge color="red">Out</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{p.sku} · {p.cat} · {p.supplier}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={()=>setShowStockHistory(p)} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold hover:bg-slate-200">📜</button>
                  <button onClick={()=>openEdit(p)} className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-200">✏️ Edit</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[{l:"Buy",v:rs(p.buy),c:""},{l:"Sell",v:rs(p.sell),c:"text-emerald-600 font-bold"},{l:"Stock",v:`${p.stock} ${p.unit || 'pcs'}`,c:isLow?"text-amber-500 font-bold":""},{l:"Margin",v:`${Math.round(((p.sell-p.buy)/p.sell)*100)}%`,c:"text-violet-600"}].map(({l,v,c})=>(
                  <div key={l} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center text-xs">
                    <div className="text-slate-400 text-[10px]">{l}</div>
                    <div className={`font-bold mt-0.5 text-xs ${c}`}>{v}</div>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>Stock level</span><span>{p.stock || 0}/{Math.max((p.minStock || 5) * 3, 1)} {p.unit || 'pcs'}</span></div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isLow?"bg-amber-500":p.stock===0?"bg-red-500":"bg-emerald-500"}`} style={{width:`${stockPct}%`}} />
                </div>
              </div>

              <div className="flex gap-2">
                <Btn variant="secondary" size="sm" onClick={()=>adjustStock(p.id,-1,"Manual -1")}>−1</Btn>
                <Btn variant="primary" size="sm" onClick={()=>adjustStock(p.id,1,"Manual +1")}>+1</Btn>
                <Btn variant="secondary" size="sm" onClick={()=>{ const qty=prompt("Add stock quantity:"); if(qty&&+qty>0) adjustStock(p.id,+qty,`Stock added`); }}>+ Add</Btn>
                <Btn variant="secondary" size="sm" onClick={()=>{ const qty=prompt("Reduce stock by:"); if(qty&&+qty>0) adjustStock(p.id,-qty,`Stock reduced`); }}>− Reduce</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Product Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title={editProduct?"✏️ Edit Product":"➕ Add Product"} size="lg">
        <div className="grid grid-cols-2 gap-x-4">
          <div className="col-span-2"><Input label="Product Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g., Basmati Rice 5kg" required/></div>
          <div className="col-span-2"><Input label="Urdu Name" value={form.nameUr||""} onChange={e=>setForm({...form,nameUr:e.target.value})} placeholder="اردو نام"/></div>
          <Input label="SKU" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="GR001"/>
          <Input label="Barcode" value={form.barcode||""} onChange={e=>setForm({...form,barcode:e.target.value})} placeholder="123456789"/>
          <div className="col-span-2"><Select label="Category" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} options={CATEGORIES.slice(1).map(c=>({value:c,label:c}))}/></div>
          <Input label="Cost Price *" type="number" value={form.buy} onChange={e=>setForm({...form,buy:e.target.value})} placeholder="0"/>
          <Input label="Sell Price *" type="number" value={form.sell} onChange={e=>setForm({...form,sell:e.target.value})} placeholder="0"/>
          <Input label="Stock Qty" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} placeholder="0"/>
          <Input label="Min Stock" type="number" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})} placeholder="5"/>
          <Select label="Unit" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} options={["pcs","kg","l","bag","box","pkt","btl","tin","strip"].map(u=>({value:u,label:u}))}/>
          <Input label="Expiry" type="month" value={form.expiry||""} onChange={e=>setForm({...form,expiry:e.target.value})}/>
          <div className="col-span-2"><Input label="Supplier" value={form.supplier||""} onChange={e=>setForm({...form,supplier:e.target.value})} placeholder="Supplier name"/></div>
        </div>
        {form.buy&&form.sell&&<div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm"><span className="text-slate-600 dark:text-slate-400">Profit per unit: </span><span className="font-black text-emerald-600">{rs(+form.sell-+form.buy)} ({Math.round((+form.sell-+form.buy)/+form.sell*100)}%)</span></div>}
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={()=>setShowAdd(false)} full>Cancel</Btn>
          <Btn variant="primary" onClick={saveProduct} full disabled={isProcessing}>{isProcessing ? "Saving..." : "💾 Save Product"}</Btn>
        </div>
      </Modal>

      {/* Stock History Modal */}
      <Modal open={!!showStockHistory} onClose={()=>setShowStockHistory(null)} title={`📜 ${showStockHistory?.name} History`} size="md">
        {showStockHistory&&(
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(!showStockHistory.stockHistory || showStockHistory.stockHistory.length===0)?<EmptyState icon="📊" title="No history" desc="Stock changes will appear here"/>:
            [...showStockHistory.stockHistory].reverse().map((h,i)=>(
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm">
                <div><div className="font-semibold">{h.reason}</div><div className="text-xs text-slate-500">{fmtDT(h.date)} · by {h.by}</div></div>
                <Badge color={h.change>0?"green":"red"}>{h.change>0?"+":""}{h.change}</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ═══════════════════ ORDER HISTORY ═══════════════════ */
const OrdersHistory = ({ orders, products, setOrders, setProducts, setCustomers, customers, showToast, lang }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(null);
  const [returnQty, setReturnQty] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const L = lang === "ur";

  const filtered = orders.filter(o => {
    const ms = o.id.toLowerCase().includes(search.toLowerCase())||o.customerName.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus==="all"||o.status===filterStatus||(filterStatus==="returned"&&o.returnHistory?.length>0);
    const mdf = !dateFrom||o.createdAt>=dateFrom;
    const mdt = !dateTo||o.createdAt<=dateTo+"T23:59";
    return ms&&mst&&mdf&&mdt;
  });

  const initReturn = (order) => {
    const init = {};
    order.items.forEach(item=>{ init[`${order.id}-${item.pid}`]=item.qty; });
    setReturnQty(init);
    setReturnReason("");
    setShowReturnModal(order.id);
  };

  const doReturn = async () => {
    const order = orders.find(o=>o.id===showReturnModal);
    if (!order) return;
    const returnedItems = order.items.map(item=>({...item, returnedQty:returnQty[`${order.id}-${item.pid}`]||0})).filter(i=>i.returnedQty>0);
    const refundAmt = returnedItems.reduce((s,i)=>s+i.returnedQty*i.sell,0);
    const allReturned = returnedItems.every((ri,_,arr)=>{ const orig = order.items.find(i=>i.pid===ri.pid); return ri.returnedQty>=orig.qty; }) && returnedItems.length===order.items.length;

    const returnRecord = { date:today(), items:returnedItems, reason:returnReason, refundAmount:refundAmt, by:"Owner" };

    try {
      const result = await updateOrderStatus(order.id, allReturned ? "returned" : order.status, { returnRecord });
      if (result.success) {
        setOrders(prev=>prev.map(o=>o.id===showReturnModal?{...o, status:allReturned?"returned":o.status, returnHistory:[...(o.returnHistory||[]),returnRecord], timeline:[...(o.timeline||[]),{time:today(),evt:`Return: ${returnReason} — ${rs(refundAmt)}`}]} : o));
        setProducts(prev=>prev.map(p=>{ const ri = returnedItems.find(i=>i.pid===p.id); return ri?{...p,stock:(p.stock||0)+ri.returnedQty,stockHistory:[...(p.stockHistory||[]),{date:today(),change:+ri.returnedQty,reason:`Return from ${showReturnModal}`,by:"Owner"}]}:p; }));
        if (order.method==="udhaar") {
          setCustomers(prev=>prev.map(c=>c.id===order.customerId?{...c,activityLog:[...(c.activityLog||[]),{date:today(),type:"return",desc:`Return for ${showReturnModal}: ${rs(refundAmt)}`,amount:refundAmt}]}:c));
        }
        showToast(`✅ Return recorded! ${rs(refundAmt)} refunded`,"success");
      } else {
        await queueOfflineOperation('processReturn', { orderId: showReturnModal, returnedItems, reason: returnReason, refundAmount: refundAmt });
        showToast(`⚠️ Return saved locally. Will sync when online.`,"warning");
        setOrders(prev=>prev.map(o=>o.id===showReturnModal?{...o, status:allReturned?"returned":o.status, returnHistory:[...(o.returnHistory||[]),returnRecord], timeline:[...(o.timeline||[]),{time:today(),evt:`Return: ${returnReason} — ${rs(refundAmt)}`}]} : o));
        setProducts(prev=>prev.map(p=>{ const ri = returnedItems.find(i=>i.pid===p.id); return ri?{...p,stock:(p.stock||0)+ri.returnedQty}:p; }));
      }
    } catch (error) {
      showToast("Error processing return: " + error.message,"error");
    }
    
    setShowReturnModal(null); setShowConfirm(false); setReturnQty({}); setReturnReason("");
  };

  const statusBadge = (o) => {
    if (o.returnHistory?.length>0&&o.status!=="returned") return <Badge color="orange">Partial Return</Badge>;
    const c = {paid:"green",credit:"red",returned:"amber"};
    return <Badge color={c[o.status]||"gray"}>{o.status}</Badge>;
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={L?"آرڈر تلاش کریں...":"Search orders..."} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:border-emerald-500 focus:outline-none"/>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[["all","All"],["paid","✅ Paid"],["credit","📒 Credit"],["returned","🔄 Returned"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilterStatus(v)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus===v?"bg-emerald-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>{l}</button>
        ))}
      </div>

      <div className="flex gap-2">
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"/>
        <span className="text-slate-400 self-center">→</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="flex-1 px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-xs"/>
      </div>

      <div className="text-xs text-slate-500">{filtered.length} orders · Total: {rs(filtered.reduce((s,o)=>s+(o.total||0),0))} · Profit: {rs(filtered.reduce((s,o)=>s+(o.profit||0),0))}</div>

      <div className="space-y-3">
        {filtered.length===0?<EmptyState icon="🧾" title="No orders found" desc="Try adjusting your filters"/>:filtered.map(o=>(
          <Card key={o.id} className="p-4">
            <div className="flex items-start justify-between mb-2 cursor-pointer" onClick={()=>setExpandedId(expandedId===o.id?null:o.id)}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{o.id}</span>
                  {statusBadge(o)}
                  <Badge color="gray">{o.method}</Badge>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">{o.customerName}</div>
                <div className="text-xs text-slate-500">{o.cashier} · {fmtDT(o.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 dark:text-white">{rs(o.total)}</div>
                <div className="text-xs text-emerald-500">+{rs(o.profit)}</div>
                <span className="text-slate-400 text-xs" style={{transform:expandedId===o.id?"rotate(180deg)":"",display:"inline-block"}}>▾</span>
              </div>
            </div>

            {expandedId===o.id&&(
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase">Items</div>
                {o.items.map((item,i)=>(
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <div><span className="font-semibold">{item.name}</span><span className="text-slate-400"> ×{item.qty}</span></div>
                    <div className="text-right"><div className="font-bold">{rs(item.qty*item.sell)}</div><div className="text-xs text-emerald-500">+{rs(item.qty*(item.sell-item.buy))}</div></div>
                  </div>
                ))}

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{rs(o.subtotal)}</span></div>
                  {o.disc>0&&<div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-red-500">-{rs(o.disc)}</span></div>}
                  <div className="flex justify-between font-bold border-t border-slate-200 dark:border-slate-600 pt-1 mt-1"><span>Total</span><span>{rs(o.total)}</span></div>
                  {o.udhaarAmt>0&&<div className="flex justify-between text-red-500 text-xs"><span>Credit Amount</span><span>{rs(o.udhaarAmt)}</span></div>}
                </div>

                {o.returnHistory?.length>0&&(
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-orange-700 dark:text-orange-300 mb-2">🔄 Return History</div>
                    {o.returnHistory.map((r,i)=>(
                      <div key={i} className="text-xs space-y-1">
                        <div className="flex justify-between"><span className="text-slate-600">{fmtDate(r.date)}</span><span className="font-bold text-red-500">-{rs(r.refundAmount)}</span></div>
                        <div className="text-slate-500">Reason: {r.reason}</div>
                        {r.items.map((ri,j)=><div key={j} className="text-slate-400">{ri.name} ×{ri.returnedQty}</div>)}
                      </div>
                    ))}
                  </div>
                )}

                {o.notes&&<div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">📝 {o.notes}</div>}

                {o.status!=="returned"&&(
                  <Btn variant="danger" onClick={()=>initReturn(o)} size="sm" full>🔄 Return Items</Btn>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Return Modal */}
      <Modal open={!!showReturnModal} onClose={()=>setShowReturnModal(null)} title="🔄 Return Order Items" size="md">
        {showReturnModal&&(
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-300">⚠️ Returned items will be added back to inventory automatically.</div>
            {orders.find(o=>o.id===showReturnModal)?.items.map(item=>{
              const alreadyReturned = orders.find(o=>o.id===showReturnModal)?.returnHistory?.reduce((s,r)=>{ const ri=r.items.find(i=>i.pid===item.pid); return s+(ri?.returnedQty||0); },0)||0;
              const maxReturn = item.qty - alreadyReturned;
              return (
                <div key={item.pid} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{item.name}</span>
                    <div className="text-right text-xs text-slate-500"><div>Ordered: {item.qty}</div>{alreadyReturned>0&&<div className="text-orange-500">Already returned: {alreadyReturned}</div>}</div>
                  </div>
                  {maxReturn<=0?<div className="text-xs text-slate-400">Fully returned</div>:(
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Return qty:</span>
                      <input type="number" min="0" max={maxReturn} value={returnQty[`${showReturnModal}-${item.pid}`]??item.qty} onChange={e=>setReturnQty(q=>({...q,[`${showReturnModal}-${item.pid}`]:Math.min(maxReturn,Math.max(0,+e.target.value))}))} className="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 text-sm"/>
                      <span className="text-xs text-emerald-600">= {rs((returnQty[`${showReturnModal}-${item.pid}`]??item.qty)*item.sell)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <Input label="Return Reason *" value={returnReason} onChange={e=>setReturnReason(e.target.value)} placeholder="e.g., Damaged, Wrong item" required/>
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between font-bold"><span>Refund Amount</span><span className="text-red-500">{rs(orders.find(o=>o.id===showReturnModal)?.items.reduce((s,i)=>s+(returnQty[`${showReturnModal}-${i.pid}`]??i.qty)*i.sell,0)||0)}</span></div>
            </div>
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={()=>setShowReturnModal(null)} full>Cancel</Btn>
              <Btn variant="danger" onClick={()=>{if(!returnReason){showToast("Return reason required","error");return;}setShowConfirm(true);}} full disabled={!returnReason}>✅ Confirm Return</Btn>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={showConfirm} title="Confirm Return?" message={`This will update stock automatically. Reason: ${returnReason}`} onConfirm={doReturn} onCancel={()=>setShowConfirm(false)} danger confirmText="Process Return"/>
    </div>
  );
};

/* ═══════════════════ CUSTOMERS ═══════════════════ */
const Customers = ({ customers, setCustomers, orders, showToast, lang, externalSelected, externalCreditModal, clearExternal }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(externalSelected||null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(externalCreditModal||null);
  const [creditPayment, setCreditPayment] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({name:"",nameUr:"",phone:"",email:"",addr:"",notes:""});
  const [activeTab, setActiveTab] = useState("overview");
  const L = lang === "ur";

  useEffect(()=>{ if(externalSelected) setSelected(externalSelected); },[externalSelected]);
  useEffect(()=>{ if(externalCreditModal) setShowCreditModal(externalCreditModal); },[externalCreditModal]);

  const filtered = customers.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search));

  const handleCreditPayment = async (customerId) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const payment = +creditPayment;
    const customer = customers.find(c=>c.id===customerId);
    if (payment<=0||payment>customer.udhaar) { showToast("Invalid amount","error"); setIsProcessing(false); return; }
    
    const newUdhaar = Math.max(0, (customer.udhaar || 0)-payment);
    
    try {
      const result = await addCustomerCreditPayment(customerId, payment, newDueDate || customer.creditDueDate, "");
      if (result.success) {
        setCustomers(prev=>prev.map(c=>c.id===customerId ? 
          {...c, udhaar: newUdhaar, creditDueDate: newDueDate || c.creditDueDate,
           creditHistory: [...(c.creditHistory||[]), {date: today(), amount: payment, type: "payment", cashier: "Owner", remaining: newUdhaar, orderId: ""}],
           activityLog: [...(c.activityLog||[]), {date: today(), type: "payment", desc: `Payment received: ${rs(payment)}, Remaining: ${rs(newUdhaar)}`, amount: payment}]} : c));
        showToast(`✅ ${rs(payment)} received and synced! Remaining: ${rs(newUdhaar)}`,"success");
      } else {
        await queueOfflineOperation('addCustomerCreditPayment', { customerId, amount: payment, dueDate: newDueDate, orderId: "" });
        setCustomers(prev=>prev.map(c=>c.id===customerId ? 
          {...c, udhaar: newUdhaar, creditDueDate: newDueDate || c.creditDueDate} : c));
        showToast(`⚠️ Payment saved locally. Will sync when online.`,"warning");
      }
    } catch (error) {
      showToast("Error recording payment: " + error.message,"error");
    }
    
    setShowCreditModal(null); setCreditPayment(""); setNewDueDate(""); setShowConfirm(false);
    setSelected(customers.find(c=>c.id===customerId));
    if (clearExternal) clearExternal();
    setIsProcessing(false);
  };

  const saveCustomer = async () => {
    if (!form.name||!form.phone) { showToast("Name & phone required","error"); return; }
    if (isProcessing) return;
    setIsProcessing(true);
    
    const newCustomer = {...form, id: Date.now(), udhaar: 0, totalOrders: 0, totalSpent: 0, points: 0, joined: new Date().toISOString().split("T")[0], creditDueDate: null, creditHistory: [], activityLog: [], editHistory: []};
    
    try {
      console.log('Saving customer:', newCustomer);
      const result = await addCustomer(newCustomer);
      console.log('Save customer result:', result);
      
      if (result.success) {
        setCustomers(prev=>[...prev, newCustomer]);
        showToast(`✅ ${form.name} added and synced to cloud!`,"success");
      } else {
        await queueOfflineOperation('addCustomer', { customer: newCustomer });
        setCustomers(prev=>[...prev, newCustomer]);
        showToast(`⚠️ Customer saved locally. Will sync when online.`,"warning");
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      showToast("Error adding customer: " + error.message,"error");
    }
    
    setShowAdd(false); setForm({name:"",nameUr:"",phone:"",email:"",addr:"",notes:""});
    setIsProcessing(false);
  };

  const updateCustomer = async () => {
    const old = customers.find(c=>c.id===selected.id);
    const changes = [];
    if(old.name!==form.name) changes.push(`Name: ${old.name} → ${form.name}`);
    if(old.phone!==form.phone) changes.push(`Phone: ${old.phone} → ${form.phone}`);
    if(old.addr!==form.addr) changes.push(`Address: ${old.addr} → ${form.addr}`);
    
    const updatedCustomer = {...selected, ...form, editHistory: [...(selected.editHistory||[]), {date: today(), changes, by: "Owner"}]};
    
    try {
      const result = await updateCustomer(selected.id, updatedCustomer);
      if (result.success) {
        setCustomers(prev=>prev.map(c=>c.id===selected.id?updatedCustomer:c));
        showToast("✅ Customer updated and synced to cloud!","success");
      } else {
        await queueOfflineOperation('updateCustomer', { id: selected.id, customer: updatedCustomer });
        setCustomers(prev=>prev.map(c=>c.id===selected.id?updatedCustomer:c));
        showToast("⚠️ Customer saved locally. Will sync when online.","warning");
      }
    } catch (error) {
      showToast("Error updating customer: " + error.message,"error");
    }
    
    setShowEdit(false); setShowEditConfirm(false);
    setSelected(updatedCustomer);
  };

  const totalUdhaar = customers.reduce((s,c)=>s+(c.udhaar || 0),0);

  // Customer Detail View
  if (selected) {
    const cust = customers.find(c=>c.id===selected.id)||selected;
    const customerOrders = orders.filter(o=>o.customerId===cust.id);
    const profitFromCustomer = customerOrders.reduce((s,o)=>s+(o.profit||0),0);
    const returnedOrders = customerOrders.filter(o=>o.returnHistory?.length>0);
    const lastPurchase = customerOrders.length>0?customerOrders.reduce((a,b)=>a.createdAt>b.createdAt?a:b).createdAt:null;
    const creditDays = cust.creditDueDate?daysDiff(cust.creditDueDate):null;

    const activities = [
      ...(cust.activityLog||[]).map(a=>({...a,time:a.date})),
      ...customerOrders.map(o=>({time:o.createdAt,type:"order",desc:`${o.id} — ${rs(o.total)}`,amount:o.total})),
    ].sort((a,b)=>new Date(b.time)-new Date(a.time));

    return (
      <div className="space-y-4 pb-8">
        <button onClick={()=>setSelected(null)} className="flex items-center gap-2 text-emerald-500 font-bold text-sm">← {L?"واپس":"Back"}</button>

        <Card className="p-5 bg-gradient-to-br from-violet-50 dark:from-violet-900/20 to-purple-50 dark:to-purple-900/20">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-black text-2xl flex-shrink-0">{cust.name[0]}</div>
            <div className="flex-1">
              <h2 className="font-black text-xl text-slate-900 dark:text-white">{cust.name}</h2>
              {cust.nameUr&&<div className="text-sm text-slate-500">{cust.nameUr}</div>}
              <div className="text-sm text-slate-600 dark:text-slate-400">📞 {cust.phone}</div>
              {cust.email&&<div className="text-xs text-slate-500">✉️ {cust.email}</div>}
              {cust.addr&&<div className="text-xs text-slate-500">📍 {cust.addr}</div>}
              <div className="text-xs text-slate-400 mt-1">Joined: {fmtDate(cust.joined)}</div>
            </div>
            <button onClick={()=>{setForm({name:cust.name,nameUr:cust.nameUr||"",phone:cust.phone,email:cust.email||"",addr:cust.addr||"",notes:cust.notes||""});setShowEdit(true);}} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold">✏️ Edit</button>
          </div>

          <KPIGrid items={[
            {icon:"🧾",label:"Orders",value:cust.totalOrders},
            {icon:"💰",label:"Spent",value:rs(cust.totalSpent)},
            {icon:"📈",label:"Profit",value:rs(profitFromCustomer)},
            {icon:"🔄",label:"Returns",value:returnedOrders.length},
          ]}/>

          {(cust.udhaar || 0) > 0 ? (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-red-600 dark:text-red-400 font-semibold">OUTSTANDING CREDIT</div>
                  <div className="text-2xl font-black text-red-600 dark:text-red-400">{rs(cust.udhaar)}</div>
                </div>
                <div className="text-right">
                  {cust.creditDueDate&&<div className={`text-xs font-bold ${creditDays!=null&&creditDays<0?"text-red-600":"text-amber-600"}`}>{creditDays!=null&&creditDays<0?`${Math.abs(creditDays)}d OVERDUE`:`Due in ${creditDays}d`}</div>}
                  {cust.creditDueDate&&<div className="text-xs text-slate-500">{fmtDate(cust.creditDueDate)}</div>}
                </div>
              </div>
              <Btn variant="danger" size="sm" onClick={()=>setShowCreditModal(cust.id)} full>💸 Receive Payment</Btn>
            </div>
          ):<div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700 flex items-center justify-between"><span className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✅ No Outstanding Credit</span><Badge color="green">Paid Up</Badge></div>}

          {cust.notes&&<div className="mt-3 text-xs text-slate-500 bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">📝 {cust.notes}</div>}
        </Card>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[["overview","📊 Overview"],["orders","🧾 Orders"],["credit","💸 Credit"],["timeline","📅 Timeline"]].map(([k,l])=>(
            <button key={k} onClick={()=>setActiveTab(k)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab===k?"bg-emerald-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>{l}</button>
          ))}
        </div>

        {activeTab==="overview"&&(
          <div className="space-y-4">
            <KPIGrid items={[
              {icon:"📅",label:"Last Purchase",value:lastPurchase?fmtDate(lastPurchase):"Never"},
              {icon:"💰",label:"Avg Order",value:rs(cust.totalOrders>0?(cust.totalSpent||0)/cust.totalOrders:0)},
              {icon:"🏆",label:"Loyalty Pts",value:cust.points||0},
              {icon:"💸",label:"Credit Taken",value:cust.creditHistory?.filter(h=>h.type==="credit").length||0},
            ]}/>
            {cust.editHistory?.length>0&&(
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Edit History</div>
                {cust.editHistory.map((e,i)=>(
                  <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 mb-2 text-xs">
                    <div className="text-slate-500 mb-1">{fmtDT(e.date)} · by {e.by}</div>
                    {e.changes.map((c,j)=><div key={j} className="text-slate-700 dark:text-slate-300">{c}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab==="orders"&&(
          <div className="space-y-2">
            {customerOrders.length===0?<EmptyState icon="🧾" title="No orders" desc="No purchase history"/>:
            customerOrders.map(o=>(
              <Card key={o.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div><span className="font-bold text-emerald-600 text-sm">{o.id}</span><span className="text-xs text-slate-500 ml-2">{fmtDate(o.createdAt)}</span></div>
                  <div className="text-right"><div className="font-black text-sm">{rs(o.total)}</div><Badge color={o.status==="paid"?"green":o.status==="credit"?"red":"amber"}>{o.status}</Badge></div>
                </div>
                {o.items.map((i,j)=><div key={j} className="text-xs text-slate-500">{i.name} ×{i.qty}</div>)}
                {o.returnHistory?.length>0&&<div className="mt-1 text-xs text-orange-500">🔄 {o.returnHistory.length} return(s)</div>}
              </Card>
            ))}
          </div>
        )}

        {activeTab==="credit"&&(
          <div className="space-y-2">
            {(!cust.creditHistory||cust.creditHistory.length===0)?<EmptyState icon="💸" title="No credit history" desc="Credit transactions will appear here"/>:
            [...cust.creditHistory].reverse().map((h,i)=>(
              <Card key={i} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{h.type==="payment"?"💸 Payment Received":"📒 Credit Taken"}</div>
                    <div className="text-xs text-slate-500">{fmtDT(h.date)}{h.cashier?` · ${h.cashier}`:""}{h.orderId?` · ${h.orderId}`:""}</div>
                    {h.remaining!=null&&<div className="text-xs text-slate-400">Remaining: {rs(h.remaining)}</div>}
                  </div>
                  <Badge color={h.type==="payment"?"green":"red"}>{h.type==="payment"?"+":"-"}{rs(h.amount)}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab==="timeline"&&(
          <div className="space-y-0">
            {activities.length===0?<EmptyState icon="📅" title="No activity" desc="Customer activity will appear here"/>:
            activities.slice(0,20).map((a,i)=>{
              const icons = {order:"🧾",credit:"📒",payment:"💸",return:"🔄",edit:"✏️"};
              const colors = {order:"green",credit:"red",payment:"green",return:"amber",edit:"blue"};
              return <TimelineItem key={i} icon={icons[a.type]||"📌"} title={a.desc||a.evt||"Activity"} sub={a.type} time={fmtDT(a.time||a.date)} color={colors[a.type]||"blue"}/>;
            })}
          </div>
        )}

        {/* Credit Payment Modal */}
        <Modal open={showCreditModal!==null} onClose={()=>setShowCreditModal(null)} title="💸 Receive Credit Payment" size="sm">
          {showCreditModal&&(
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-700">
                <div className="text-xs text-red-600 dark:text-red-400 mb-1">Total Outstanding</div>
                <div className="text-3xl font-black text-red-600 dark:text-red-400">{rs(cust.udhaar)}</div>
              </div>
              <Input label="Amount Receiving *" type="number" value={creditPayment} onChange={e=>setCreditPayment(e.target.value)} placeholder="Enter amount" required min="1" max={String(cust.udhaar)} helpText={`Max: ${rs(cust.udhaar)}`}/>
              {creditPayment&&+creditPayment>0&&(
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Remaining balance:</span>
                    <span className="font-black text-emerald-600">{rs(Math.max(0,(cust.udhaar||0)-(+creditPayment)))}</span>
                  </div>
                  {+creditPayment>=(cust.udhaar||0)&&<div className="mt-1 text-xs text-emerald-600 font-bold">✅ Full payment — account will be cleared</div>}
                </div>
              )}
              <Input label="New Due Date (optional)" type="date" value={newDueDate} onChange={e=>setNewDueDate(e.target.value)} helpText="Update the credit due date"/>
              <div className="flex gap-2">
                <Btn variant="secondary" onClick={()=>setShowCreditModal(null)} full>Cancel</Btn>
                <Btn variant="primary" onClick={()=>{if(!creditPayment||+creditPayment<=0){showToast("Enter valid amount","error");return;}setShowConfirm(true);}} full disabled={!creditPayment||+creditPayment<=0||isProcessing}>✅ Record Payment</Btn>
              </div>
            </div>
          )}
        </Modal>

        <ConfirmDialog open={showConfirm} title="Confirm Payment?" message={`Record payment of ${rs(+creditPayment||0)} from ${cust.name}?`} onConfirm={()=>handleCreditPayment(showCreditModal)} onCancel={()=>setShowConfirm(false)} confirmText="Confirm"/>

        {/* Edit Customer Modal */}
        <Modal open={showEdit} onClose={()=>setShowEdit(false)} title="✏️ Edit Customer">
          <Input label="Full Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
          <Input label="Urdu Name" value={form.nameUr||""} onChange={e=>setForm({...form,nameUr:e.target.value})} placeholder="اردو نام"/>
          <Input label="Phone *" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} type="tel" required/>
          <Input label="Email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} type="email"/>
          <Input label="Address" value={form.addr||""} onChange={e=>setForm({...form,addr:e.target.value})}/>
          <Input label="Notes" value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={()=>setShowEdit(false)} full>Cancel</Btn>
            <Btn variant="primary" onClick={()=>setShowEditConfirm(true)} full>💾 Save Changes</Btn>
          </div>
        </Modal>
        <ConfirmDialog open={showEditConfirm} title="Save Changes?" message="Customer details will be updated and changes will be logged." onConfirm={updateCustomer} onCancel={()=>setShowEditConfirm(false)} confirmText="Save"/>
      </div>
    );
  }

  // Customer List View
  return (
    <div className="space-y-4 pb-8">
      <KPIGrid items={[
        {icon:"👥",label:"Customers",value:customers.length},
        {icon:"🤝",label:"Total Credit",value:rs(totalUdhaar)},
        {icon:"💰",label:"Avg Spent",value:rs(customers.length>0?customers.reduce((s,c)=>s+(c.totalSpent||0),0)/customers.length:0)},
        {icon:"⚠️",label:"Credit Due",value:customers.filter(c=>(c.udhaar||0)>0&&c.creditDueDate&&daysDiff(c.creditDueDate)<=3).length},
      ]}/>

      <div className="flex gap-3">
        <div className="flex-1 relative"><span className="absolute left-4 top-1/2 -translate-y-1/2">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={L?"تلاش کریں...":"Search..."} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:border-emerald-500 focus:outline-none"/>
        </div>
        <Btn variant="primary" onClick={()=>{setForm({name:"",nameUr:"",phone:"",email:"",addr:"",notes:""});setShowAdd(true);}}>+ Add</Btn>
      </div>

      <div className="space-y-3">
        {filtered.map(c=>{
          const ddays = c.creditDueDate?daysDiff(c.creditDueDate):null;
          return (
            <Card key={c.id} className="p-4" onClick={()=>setSelected(c)}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">{c.name[0]}</div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.phone} · {c.totalOrders} orders</div>
                  {(c.udhaar||0)>0&&c.creditDueDate&&<div className={`text-xs font-semibold ${ddays!=null&&ddays<0?"text-red-500":"text-amber-500"}`}>{ddays!=null&&ddays<0?`${Math.abs(ddays)}d overdue`:`Due in ${ddays}d`}</div>}
                </div>
                <div className="text-right">
                  {(c.udhaar||0)>0?<Badge color={ddays!=null&&ddays<0?"red":"amber"}>{rs(c.udhaar)}</Badge>:<Badge color="green">✅ Clear</Badge>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Customer Modal */}
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add Customer">
        <Input label="Full Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required helpText="Customer's full name"/>
        <Input label="Urdu Name" value={form.nameUr||""} onChange={e=>setForm({...form,nameUr:e.target.value})} placeholder="اردو نام"/>
        <Input label="Phone *" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} type="tel" required helpText="Mobile number"/>
        <Input label="Email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} type="email"/>
        <Input label="Address" value={form.addr||""} onChange={e=>setForm({...form,addr:e.target.value})}/>
        <Input label="Notes" value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/>
        <Btn variant="primary" onClick={saveCustomer} full disabled={isProcessing}>{isProcessing ? "Saving..." : "✅ Save Customer"}</Btn>
      </Modal>
    </div>
  );
};

/* ═══════════════════ MERCHANDISE ═══════════════════ */
const Merchandise = ({ products, orders, lang }) => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [sortBy, setSortBy] = useState("revenue");
  const [expandedId, setExpandedId] = useState(null);
  const L = lang === "ur";

  const merchData = useMemo(()=>products.map(p=>{
    let totalSold=0,totalRevenue=0,totalCost=0,lastSold=null;
    orders.forEach(o=>o.items.forEach(i=>{ if(i.pid===p.id){totalSold+=i.qty;totalRevenue+=i.qty*i.sell;totalCost+=i.qty*i.buy;if(!lastSold||o.createdAt>lastSold)lastSold=o.createdAt;} }));
    const profitAmt = totalRevenue-totalCost;
    const margin = totalRevenue>0?Math.round(profitAmt/totalRevenue*100):Math.round(((p.sell-p.buy)/p.sell)*100);
    return {...p,totalSold,totalRevenue,totalCost,profitAmt,margin,lastSold,createdAt:p.createdAt||"2024-01-01"};
  }),[products,orders]);

  const filtered = merchData.filter(m=>(activeCat==="All"||m.cat===activeCat)&&(m.name.toLowerCase().includes(search.toLowerCase())||(m.sku && m.sku.toLowerCase().includes(search.toLowerCase()))));
  const sorted = [...filtered].sort((a,b)=>{ if(sortBy==="revenue")return b.totalRevenue-a.totalRevenue; if(sortBy==="margin")return b.margin-a.margin; if(sortBy==="sold")return b.totalSold-a.totalSold; return a.name.localeCompare(b.name); });

  const totalRevAll = merchData.reduce((s,m)=>s+m.totalRevenue,0);
  const totalProfAll = merchData.reduce((s,m)=>s+m.profitAmt,0);

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 text-white">
        <h2 className="text-lg font-black mb-1">📊 {L?"سامان":"Merchandise"}</h2>
        <p className="text-violet-200 text-xs mb-3">Auto-synced from product catalog</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div><div className="text-violet-200 text-xs">Total Items</div><div className="font-black text-lg">{products.length}</div></div>
          <div><div className="text-violet-200 text-xs">Revenue</div><div className="font-black text-lg">{rs(totalRevAll)}</div></div>
          <div><div className="text-violet-200 text-xs">Profit</div><div className="font-black text-lg">{rs(totalProfAll)}</div></div>
        </div>
      </div>

      <KPIGrid items={[
        {icon:"📦",label:"Items Sold",value:merchData.reduce((s,m)=>s+m.totalSold,0)},
        {icon:"💰",label:"Revenue",value:rs(totalRevAll)},
        {icon:"📈",label:"Profit",value:rs(totalProfAll)},
        {icon:"📊",label:"Avg Margin",value:`${Math.round(totalRevAll>0?totalProfAll/totalRevAll*100:0)}%`},
      ]}/>

      <div className="flex gap-2">
        <div className="flex-1 relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={L?"تلاش کریں...":"Search..."} className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:border-emerald-500 focus:outline-none"/>
        </div>
        <Select value={sortBy} onChange={e=>setSortBy(e.target.value)} options={[{value:"revenue",label:"Revenue"},{value:"margin",label:"Margin"},{value:"sold",label:"Sold"},{value:"name",label:"A-Z"}]}/>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat=><button key={cat} onClick={()=>setActiveCat(cat)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCat===cat?"bg-violet-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>{cat}</button>)}
      </div>

      <div className="space-y-3">
        {sorted.length===0?<EmptyState icon="📊" title="No merchandise data" desc="Make some sales to see merchandise analytics"/>:sorted.map(m=>(
          <Card key={m.id} className="p-4" onClick={()=>setExpandedId(expandedId===m.id?null:m.id)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                <div className="text-xs text-slate-500">{m.sku} · {m.cat} · {m.supplier}</div>
                {m.nameUr&&<div className="text-xs text-slate-400">{m.nameUr}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge color={m.margin>=20?"green":m.margin>=10?"amber":"red"}>{m.margin}% margin</Badge>
                <span className="text-slate-400 text-xs" style={{transform:expandedId===m.id?"rotate(180deg)":"",display:"inline-block"}}>▾</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[{l:"Cost",v:rs(m.buy),c:"text-slate-600"},{l:"Sell",v:rs(m.sell),c:"text-emerald-600 font-bold"},{l:"Sold",v:String(m.totalSold),c:""},{l:"Revenue",v:rs(m.totalRevenue),c:"text-violet-600 font-bold"}].map(({l,v,c})=>(
                <div key={l} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center text-xs">
                  <div className="text-slate-400 text-[10px]">{l}</div>
                  <div className={`font-bold mt-0.5 ${c}`}>{v}</div>
                </div>
              ))}
            </div>

            {expandedId===m.id&&(
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Profit per unit</span><span className="font-bold text-emerald-500">{rs(m.sell-m.buy)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total profit</span><span className="font-bold text-emerald-500">{rs(m.profitAmt)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Current stock</span><span className="font-bold">{m.stock} {m.unit}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Min stock</span><span className={(m.stock||0)<=(m.minStock||0)?"font-bold text-amber-500":"font-bold"}>{m.minStock} {m.unit}</span></div>
                {m.expiry&&<div className="flex justify-between"><span className="text-slate-500">Expiry</span><span className="font-bold">{m.expiry}</span></div>}
                {m.lastSold&&<div className="flex justify-between text-xs"><span className="text-slate-400">Last sold</span><span>{fmtDate(m.lastSold)}</span></div>}
                <div className="flex justify-between text-xs"><span className="text-slate-400">Linked product</span><span className="font-medium text-violet-500">{m.sku}</span></div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════ EXPENSES ═══════════════════ */
const Expenses = ({ expenses, setExpenses, showToast, lang }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({cat:"Rent",desc:"",amt:"",date:new Date().toISOString().slice(0,10),by:"Owner"});
  const L = lang === "ur";
  const totalExp = expenses.reduce((s,e)=>s+(e.amt || 0),0);

  const save = async () => {
    if(!form.desc||!form.amt){showToast("Fill all fields","error");return;}
    if (isProcessing) return;
    setIsProcessing(true);
    
    const newExpense = {...form, id: Date.now(), amt: +form.amt};
    
    try {
      const result = await addExpense(newExpense);
      if (result.success) {
        setExpenses(prev=>[...prev, newExpense]);
        showToast("✅ Expense added and synced to cloud!","success");
      } else {
        await queueOfflineOperation('addExpense', { expense: newExpense });
        setExpenses(prev=>[...prev, newExpense]);
        showToast("⚠️ Expense saved locally. Will sync when online.","warning");
      }
    } catch (error) {
      showToast("Error adding expense: " + error.message,"error");
    }
    
    setShowAdd(false); 
    setForm({cat:"Rent",desc:"",amt:"",date:new Date().toISOString().slice(0,10),by:"Owner"});
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4 pb-8">
      <Card className="p-5 bg-gradient-to-br from-red-50 dark:from-red-900/20 to-orange-50 dark:to-orange-900/20">
        <div className="text-3xl mb-2">💸</div>
        <div className="text-3xl font-black text-red-600 dark:text-red-400">{rs(totalExp)}</div>
        <div className="text-sm text-slate-500">Total Expenses</div>
      </Card>

      <Btn variant="danger" onClick={()=>setShowAdd(true)} full>➕ {L?"خرچ شامل کریں":"Add Expense"}</Btn>

      <div className="space-y-3">
        {expenses.map(e=>(
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{e.desc}</div>
                <div className="text-xs text-slate-500">{e.cat} · {e.date} · by {e.by}</div>
              </div>
              <div className="font-black text-red-500">{rs(e.amt)}</div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add Expense">
        <Select label="Category" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} options={["Rent","Electricity","Staff","Transport","Maintenance","Misc"].map(c=>({value:c,label:c}))}/>
        <Input label="Description *" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="e.g., Monthly rent" required/>
        <Input label="Amount *" type="number" value={form.amt} onChange={e=>setForm({...form,amt:e.target.value})} placeholder="0" required/>
        <Input label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <Input label="Paid By" value={form.by} onChange={e=>setForm({...form,by:e.target.value})} placeholder="Owner"/>
        <Btn variant="danger" onClick={save} full disabled={isProcessing}>{isProcessing ? "Saving..." : "💾 Save"}</Btn>
      </Modal>
    </div>
  );
};

/* ═══════════════════ STAFF ═══════════════════ */
const Staff = ({ staff, setStaff, showToast, lang }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({name:"",role:"Cashier",phone:"",shift:"9am-5pm",salary:"",status:"active"});
  const L = lang === "ur";

  const save = async () => {
    if(!form.name||!form.salary){showToast("Name and salary required","error");return;}
    if (isProcessing) return;
    setIsProcessing(true);
    
    const newStaff = {...form, id: Date.now(), joined: new Date().toISOString().slice(0,10), salary: +form.salary};
    
    try {
      const result = await addStaff(newStaff);
      if (result.success) {
        setStaff(prev=>[...prev, newStaff]);
        showToast(`✅ ${form.name} added and synced to cloud!`,"success");
      } else {
        await queueOfflineOperation('addStaff', { staff: newStaff });
        setStaff(prev=>[...prev, newStaff]);
        showToast(`⚠️ Staff saved locally. Will sync when online.`,"warning");
      }
    } catch (error) {
      showToast("Error adding staff: " + error.message,"error");
    }
    
    setShowAdd(false); 
    setForm({name:"",role:"Cashier",phone:"",shift:"9am-5pm",salary:"",status:"active"});
    setIsProcessing(false);
  };
  
  const totalSalaries = staff.reduce((s,s_)=>s+(s_.salary || 0),0);

  return (
    <div className="space-y-4 pb-8">
      <KPIGrid items={[{icon:"👔",label:"Staff",value:staff.length},{icon:"💰",label:"Salaries",value:rs(totalSalaries)},{icon:"✅",label:"Active",value:staff.filter(s=>s.status==="active").length},{icon:"📊",label:"Avg Salary",value:rs(staff.length>0?totalSalaries/staff.length:0)}]}/>
      <Btn variant="violet" onClick={()=>{setForm({name:"",role:"Cashier",phone:"",shift:"9am-5pm",salary:"",status:"active"});setShowAdd(true);}} full>➕ {L?"سٹاف شامل":"Add Staff"}</Btn>
      <div className="space-y-3">
        {staff.map(s=>(
          <Card key={s.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-black text-lg">{s.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
              <div className="flex-1"><div className="font-black text-slate-900 dark:text-white">{s.name}</div><div className="text-sm text-slate-500">{s.role}</div></div>
              <Badge color={s.status==="active"?"green":"gray"}>{s.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{l:"Salary",v:rs(s.salary)},{l:"Shift",v:s.shift},{l:"Joined",v:fmtDate(s.joined)}].map(({l,v})=>(
                <div key={l} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center text-xs"><div className="text-slate-400 text-[10px]">{l}</div><div className="font-bold text-xs mt-0.5 truncate">{v}</div></div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={showAdd} onClose={()=>setShowAdd(false)} title="➕ Add Staff">
        <Input label="Full Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
        <Select label="Role" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} options={["Cashier","Stock Manager","Manager","Delivery"].map(r=>({value:r,label:r}))}/>
        <Input label="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} type="tel"/>
        <Input label="Shift" value={form.shift} onChange={e=>setForm({...form,shift:e.target.value})} placeholder="9am-5pm"/>
        <Input label="Monthly Salary *" type="number" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} required/>
        <Btn variant="violet" onClick={save} full disabled={isProcessing}>{isProcessing ? "Adding..." : "💾 Add Employee"}</Btn>
      </Modal>
    </div>
  );
};

/* ═══════════════════ ANALYTICS ═══════════════════ */
const Analytics = ({ orders, products, customers, expenses, lang }) => {
  const L = lang === "ur";
  const totalRevenue = orders.reduce((s,o)=>s+(o.total || 0),0);
  const totalProfit = orders.reduce((s,o)=>s+(o.profit || 0),0);
  const totalExpenses = expenses.reduce((s,e)=>s+(e.amt || 0),0);
  const netProfit = totalProfit-totalExpenses;
  const profitMargin = totalRevenue>0?Math.round(totalProfit/totalRevenue*100):0;

  const topProducts = products.map(p=>{
    let sold=0,rev=0;
    orders.forEach(o=>o.items.forEach(i=>{ if(i.pid===p.id){sold+=i.qty;rev+=i.qty*i.sell;} }));
    return {...p,sold,rev};
  }).filter(p=>p.sold>0).sort((a,b)=>b.rev-a.rev).slice(0,5);

  const catData = CATEGORIES.slice(1).map(cat=>{
    let rev=0; products.filter(p=>p.cat===cat).forEach(p=>orders.forEach(o=>o.items.forEach(i=>{ if(i.pid===p.id) rev+=i.qty*i.sell; })));
    return {name:cat,value:rev};
  }).filter(d=>d.value>0);

  const COLORS=["#10b981","#8b5cf6","#f59e0b","#ef4444","#0ea5e9","#ec4899"];

  return (
    <div className="space-y-5 pb-8">
      <KPIGrid items={[
        {icon:"💰",label:"Revenue",value:rs(totalRevenue),change:`${orders.length} orders`},
        {icon:"📈",label:"Profit",value:rs(totalProfit),change:`${profitMargin}% margin`},
        {icon:"💸",label:"Expenses",value:rs(totalExpenses),change:"This month"},
        {icon:"🏦",label:"Net Profit",value:rs(netProfit),change:netProfit>0?"✅ Positive":"⚠️ Negative"},
      ]}/>

      <Card className="p-4">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">🏆 Top 5 Products</h3>
        <div className="space-y-3">
          {topProducts.map((p,i)=>(
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm">{i+1}</div>
                <div><div className="font-bold text-sm">{p.name}</div><div className="text-xs text-slate-500">{p.sold} units</div></div>
              </div>
              <div className="text-right"><div className="font-black text-emerald-600">{rs(p.rev)}</div></div>
            </div>
          ))}
        </div>
      </Card>

      {catData.length>0&&(
        <Card className="p-4">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">📊 Sales by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
              {catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie><Tooltip formatter={v=>rs(v)}/></PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">👥 Top Customers</h3>
        <div className="space-y-2">
          {customers.sort((a,b)=>b.totalSpent-a.totalSpent).slice(0,4).map((c,i)=>(
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500 text-white flex items-center justify-center font-bold text-xs">{i+1}</div>
                <div><div className="font-semibold text-sm">{c.name}</div><div className="text-xs text-slate-500">{c.totalOrders} orders</div></div>
              </div>
              <div className="text-right"><div className="font-black text-violet-600">{rs(c.totalSpent)}</div>{(c.udhaar||0)>0&&<div className="text-xs text-red-500">Owes {rs(c.udhaar)}</div>}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════ SETTINGS ═══════════════════ */
const Settings = ({ lang, setLang, dark, setDark, showToast }) => {
  const L = lang === "ur";
  const [shop, setShop] = useState({name:"My Store",owner:"",phone:"",address:""});
  const [syncPending, setSyncPending] = useState(0);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const pending = await getPendingSyncCount();
      setSyncPending(pending);
      setOnlineStatus(await checkOnlineStatus());
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await processOfflineQueue();
    if (result.success) {
      showToast(`✅ Synced ${result.processed} items successfully!`, "success");
      setSyncPending(0);
    } else {
      showToast(`⚠️ Synced ${result.processed} items, ${result.failed} failed`, "warning");
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-5 pb-8">
      <Card className="p-5 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-cyan-50 dark:to-cyan-900/20">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">☁️ Cloud Sync</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Connection Status</span>
              <span className={`text-sm font-bold ${onlineStatus ? "text-emerald-500" : "text-red-500"}`}>
                {onlineStatus ? "✅ Online" : "❌ Offline"}
              </span>
            </div>
            {syncPending > 0 && (
              <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg px-3 py-1">
                <span className="text-amber-700 dark:text-amber-300 text-xs font-bold">{syncPending} pending</span>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              const result = await testConnection();
              showToast(result.success ? result.message : result.error, result.success ? "success" : "error");
            }}
            className="w-full px-4 py-2 bg-sky-500 text-white font-bold rounded-xl mb-2"
          >
            🔍 Test Connection
          </button>
          <button
            onClick={handleSync}
            disabled={!onlineStatus || isSyncing}
            className="w-full px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
          >
            {isSyncing ? "🔄 Syncing..." : syncPending > 0 ? "📤 Sync Now" : "🔄 Sync All Data"}
          </button>
          {!onlineStatus && (
            <p className="text-xs text-amber-600 mt-2">⚠️ You are offline. Changes will be saved locally and synced when you reconnect.</p>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">{L?"دکان کی معلومات":"Shop Information"}</h3>
        <Input label="Shop Name" value={shop.name} onChange={e=>setShop({...shop,name:e.target.value})}/>
        <Input label="Owner Name" value={shop.owner} onChange={e=>setShop({...shop,owner:e.target.value})}/>
        <Input label="Contact Number" value={shop.phone} onChange={e=>setShop({...shop,phone:e.target.value})} type="tel"/>
        <Input label="Shop Address" value={shop.address} onChange={e=>setShop({...shop,address:e.target.value})}/>
      </Card>
      
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">{L?"ترجیحات":"App Preferences"}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Language</span><span className="text-xs text-slate-500">اردو / English</span></div>
            <div className="flex gap-2">
              {[["en","EN"],["ur","اردو"]].map(([k,l])=>(
                <button key={k} onClick={()=>setLang(k)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${lang===k?"bg-emerald-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div><span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">{L?"ڈارک موڈ":"Dark Mode"}</span><span className="text-xs text-slate-500">Night-friendly display</span></div>
            <button onClick={()=>setDark(!dark)} className={`w-14 h-7 rounded-full transition-colors relative ${dark?"bg-emerald-500":"bg-slate-300"}`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${dark?"left-8":"left-1"}`}/>
            </button>
          </div>
        </div>
      </Card>
      
      <div className="text-center py-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl">
        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-1">🏪 DukanDar Pro</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">Complete Shop Management System</div>
        <div className="text-xs text-slate-500 mt-1">v4.0 · Cloud Sync Enabled</div>
        <div className="text-xs text-slate-400 mt-2 px-4">✨ Cloud Backup · Offline Mode · Auto Sync</div>
      </div>
    </div>
  );
};

// Credit Reminder Popup component
const CreditReminderPopup = ({ customers, setPage, setSelectedCustomer, showCreditModal, onDismiss }) => {
  const overdue = customers.filter(c => (c.udhaar || 0) > 0 && c.creditDueDate && daysDiff(c.creditDueDate) <= 3);
  const [dismissed, setDismissed] = useState([]);
  const visible = overdue.filter(c => !dismissed.includes(c.id));

  if (visible.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-amber-50 dark:bg-amber-900/20 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔔</span>
            <div>
              <h2 className="text-lg font-black text-amber-900 dark:text-amber-100">Credit Reminders</h2>
              <p className="text-xs text-amber-700 dark:text-amber-300">{visible.length} payment{visible.length > 1 ? "s" : ""} due soon</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {visible.map(c => {
            const diff = daysDiff(c.creditDueDate);
            const isOverdue = diff < 0;
            return (
              <div key={c.id} className={`p-4 rounded-xl border-2 ${isOverdue ? "border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800" : "border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800"}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.phone}</div>
                  </div>
                  <Badge color={isOverdue ? "red" : "amber"}>{isOverdue ? `${Math.abs(diff)}d overdue` : `Due in ${diff}d`}</Badge>
                </div>
                <div className="text-lg font-black text-red-600 dark:text-red-400 mb-3">{rs(c.udhaar)}</div>
                <div className="text-xs text-slate-500 mb-3">Due: {fmtDate(c.creditDueDate)}</div>
                <div className="flex gap-2">
                  <Btn size="sm" variant="secondary" onClick={() => { setDismissed(d => [...d, c.id]); }} full>Dismiss</Btn>
                  <Btn size="sm" variant="primary" onClick={() => { setSelectedCustomer(c); showCreditModal(c.id); setDismissed(d => [...d, c.id]); }} full>💸 Receive</Btn>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
          <Btn variant="secondary" onClick={onDismiss} full>Close All</Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ ROOT APP ═══════════════════ */
export default function DukanDarPro() {
  const [page, setPage] = useState("home");
  const [lang, setLang] = useState("en");
  const [dark, setDark] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [toast, setToast] = useState(null);
  const [showReminders, setShowReminders] = useState(true);
  const [externalCustomer, setExternalCustomer] = useState(null);
  const [externalCreditModal, setExternalCreditModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncPending, setSyncPending] = useState(0);
  const [isNetworkOnline, setIsNetworkOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial sync from cloud on mount
  useEffect(() => {
    const initializeSync = async () => {
      setIsLoading(true);
      try {
        const connectionStatus = await checkOnlineStatus();
        setIsNetworkOnline(connectionStatus);
        
        // Load from localStorage first for instant display
        const localProducts = loadFromStorage("dp_products_v4", []);
        const localCustomers = loadFromStorage("dp_customers_v4", []);
        const localOrders = loadFromStorage("dp_orders_v4", []);
        const localExpenses = loadFromStorage("dp_expenses_v4", []);
        const localStaff = loadFromStorage("dp_staff_v4", []);
        
        setProducts(localProducts);
        setCustomers(localCustomers);
        setOrders(localOrders);
        setExpenses(localExpenses);
        setStaff(localStaff);
        
        if (connectionStatus) {
          const pendingCount = await getPendingSyncCount();
          setSyncPending(pendingCount);
          
          // Try to sync from cloud
          console.log('Online - syncing from cloud...');
          await syncAllData(setProducts, setCustomers, setOrders, setExpenses, setStaff);
        } else {
          console.log('Offline - using local data');
        }
      } catch (error) {
        console.error("Initial sync error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initializeSync();
    
    // Listen for online/offline events
    const handleOnline = async () => {
      setIsNetworkOnline(true);
      setToast({ msg: "🟢 Back online! Syncing data...", type: "success" });
      setTimeout(() => setToast(null), 3000);
      await processOfflineQueue();
      await syncAllData(setProducts, setCustomers, setOrders, setExpenses, setStaff);
      setSyncPending(0);
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
      setToast({ msg: "🔴 You are offline. Changes will be saved locally.", type: "warning" });
      setTimeout(() => setToast(null), 3000);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to localStorage on every state change
  useEffect(()=>{ saveToStorage("dp_products_v4",products); },[products]);
  useEffect(()=>{ saveToStorage("dp_customers_v4",customers); },[customers]);
  useEffect(()=>{ saveToStorage("dp_orders_v4",orders); },[orders]);
  useEffect(()=>{ saveToStorage("dp_expenses_v4",expenses); },[expenses]);
  useEffect(()=>{ saveToStorage("dp_staff_v4",staff); },[staff]);

  const showToast = useCallback((msg,type="success")=>setToast({msg,type}),[]);
  const L = lang === "ur";
  const lowCount = products.filter(p=>(p.stock || 0) <= (p.minStock || 0)).length;

  const navItems = [
    {key:"home",icon:"🏠",label:L?"ہوم":"Home"},
    {key:"pos",icon:"🛒",label:L?"بلنگ":"POS"},
    {key:"orders",icon:"🧾",label:L?"آرڈر":"Orders"},
    {key:"inventory",icon:"📦",label:L?"اسٹاک":"Stock",badge:lowCount},
    {key:"customers",icon:"👥",label:L?"گاہک":"People"},
  ];

  const moreItems = [
    {key:"merchandise",icon:"📊",label:L?"سامان":"Merch"},
    {key:"expenses",icon:"💸",label:L?"اخراجات":"Costs"},
    {key:"staff",icon:"👔",label:L?"سٹاف":"Staff"},
    {key:"analytics",icon:"📈",label:L?"رپورٹ":"Reports"},
    {key:"settings",icon:"⚙️",label:L?"سیٹنگ":"Settings"},
  ];

  const pageTitles = {home:"Dashboard",pos:"New Sale",orders:"Orders",inventory:"Inventory",customers:"Customers",merchandise:"Merchandise",expenses:"Expenses",staff:"Staff",analytics:"Analytics",settings:"Settings"};

  const renderPage = () => {
    const props = {showToast,lang};
    switch(page){
      case "home": return <Dashboard products={products} orders={orders} customers={customers} expenses={expenses} {...props} setPage={setPage} setExternalCustomer={setExternalCustomer} setExternalCreditModal={setExternalCreditModal}/>;
      case "pos": return <POS products={products} customers={customers} setOrders={setOrders} setProducts={setProducts} setCustomers={setCustomers} {...props}/>;
      case "orders": return <OrdersHistory orders={orders} products={products} setOrders={setOrders} setProducts={setProducts} setCustomers={setCustomers} customers={customers} {...props}/>;
      case "inventory": return <Inventory products={products} setProducts={setProducts} {...props}/>;
      case "customers": return <Customers customers={customers} setCustomers={setCustomers} orders={orders} {...props} externalSelected={externalCustomer} externalCreditModal={externalCreditModal} clearExternal={()=>{setExternalCustomer(null);setExternalCreditModal(null);}}/>;
      case "merchandise": return <Merchandise products={products} orders={orders} {...props}/>;
      case "expenses": return <Expenses expenses={expenses} setExpenses={setExpenses} {...props}/>;
      case "staff": return <Staff staff={staff} setStaff={setStaff} {...props}/>;
      case "analytics": return <Analytics orders={orders} products={products} customers={customers} expenses={expenses} {...props}/>;
      case "settings": return <Settings lang={lang} setLang={setLang} dark={dark} setDark={setDark} showToast={showToast}/>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-emerald-600 font-bold">Syncing with cloud...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={dark?"dark":""} dir={L?"rtl":"ltr"}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-24">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap');
          .no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
          @keyframes toast-in{0%{transform:translate(-50%,-16px);opacity:0}60%{transform:translate(-50%,3px)}100%{transform:translate(-50%,0);opacity:1}}
          .animate-toast{animation:toast-in .35s cubic-bezier(.34,1.56,.64,1) forwards}
          *{font-family:${L?"'Noto Nastaliq Urdu',serif":"'Outfit',sans-serif"}}
          .line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        `}</style>

        {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

        <SyncStatusIndicator 
          pendingCount={syncPending} 
          isNetworkOnline={isNetworkOnline} 
          onSync={async () => {
            setIsSyncing(true);
            await processOfflineQueue();
            await syncAllData(setProducts, setCustomers, setOrders, setExpenses, setStaff);
            setSyncPending(0);
            setIsSyncing(false);
            showToast("✅ Sync completed!", "success");
          }} 
          syncing={isSyncing}
        />

        {showReminders&&page==="home"&&(
          <CreditReminderPopup customers={customers} setPage={setPage} setSelectedCustomer={setExternalCustomer} showCreditModal={(id)=>{setExternalCreditModal(id);setPage("customers");}} onDismiss={()=>setShowReminders(false)}/>
        )}

        <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-md">د</div>
              <div><div className="font-black text-slate-900 dark:text-white text-lg">{L?"دکانDار":"DukanDar"} <span className="text-emerald-500 text-sm">Pro</span></div><div className="text-xs text-slate-500">{pageTitles[page]}</div></div>
            </div>
            <div className="flex items-center gap-2">
              {!isNetworkOnline && (
                <div className="bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded-lg">
                  <span className="text-amber-700 dark:text-amber-300 text-[10px] font-bold">OFFLINE</span>
                </div>
              )}
              {lowCount>0&&(
                <button onClick={()=>setPage("inventory")} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors">⚠️ {lowCount}</button>
              )}
              <button onClick={()=>setDark(!dark)} className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg hover:bg-slate-200 transition-colors">{dark?"☀️":"🌙"}</button>
            </div>
          </div>
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
            {moreItems.map(n=>(
              <button key={n.key} onClick={()=>setPage(n.key)} className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${page===n.key?"bg-emerald-500 text-white":"bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"}`}>{n.icon} {n.label}</button>
            ))}
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 pt-5">{renderPage()}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-2xl">
          <div className="flex items-center justify-around px-2 py-3 max-w-2xl mx-auto">
            {navItems.map(n=>(
              <button key={n.key} onClick={()=>setPage(n.key)} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${page===n.key?"bg-emerald-50 dark:bg-emerald-900/20":""}`}>
                <div className="relative">
                  <span className="text-xl">{n.icon}</span>
                  {(n.badge||0)>0&&<span className="absolute -top-2 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">{n.badge}</span>}
                </div>
                <span className={`text-[10px] font-bold ${page===n.key?"text-emerald-600 dark:text-emerald-400":"text-slate-400"}`}>{n.label}</span>
                {page===n.key&&<div className="w-1 h-1 rounded-full bg-emerald-500"/>}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}