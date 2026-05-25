import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

/*
  Dukaandaar.jsx
  Complete single-file React frontend for DukanDarPro ERP + POS + Accounting dashboard.

  Required packages:
    npm install react react-dom recharts

  Required styling:
    Tailwind CSS must be configured in your React project.

  Backend:
    Paste Code.gs into Google Apps Script, deploy as a Web App, then add the Web App URL
    inside Settings > Google Sheets Backend.
*/

const DPApi = (() => {
  const URL_KEY = 'dukandarpro_apps_script_url';
  const QUEUE_KEY = 'dukandarpro_offline_queue_v1';

  const isBrowser = () => typeof window !== 'undefined';
  const storage = () => (isBrowser() ? window.localStorage : null);
  const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);
  const getScriptUrl = () => storage()?.getItem(URL_KEY) || '';
  const setScriptUrl = (url) => storage()?.setItem(URL_KEY, String(url || '').trim());

  const loadQueue = () => {
    try { return JSON.parse(storage()?.getItem(QUEUE_KEY) || '[]') || []; } catch { return []; }
  };

  const saveQueue = (queue) => storage()?.setItem(QUEUE_KEY, JSON.stringify(queue));

  const queueOperation = (action, payload) => {
    const queue = loadQueue();
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      action,
      payload,
      date: new Date().toISOString(),
      retries: 0,
    });
    saveQueue(queue);
    return { success: true, queued: true, pending: queue.length };
  };

  async function request(action, payload, method) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) throw new Error('Apps Script URL is missing. Add it in Settings.');

    const isWrite = payload !== undefined && payload !== null;
    if (!isOnline() && isWrite) return queueOperation(action, payload);

    const options = isWrite
      ? {
          method: method || 'POST',
          body: JSON.stringify({ action, payload }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        }
      : { method: 'GET' };

    const url = isWrite ? scriptUrl : `${scriptUrl}?action=${encodeURIComponent(action)}`;

    try {
      const res = await fetch(url, options);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      if (text.trim().startsWith('<')) throw new Error('Apps Script returned HTML. Deploy Web App as: Execute as Me, access Anyone.');
      const json = JSON.parse(text || '{}');
      if (!json.success) throw new Error(json.error || 'API error');
      return json;
    } catch (error) {
      if (isWrite && (error.message.includes('Failed to fetch') || !isOnline())) return queueOperation(action, payload);
      return { success: false, error: error.message };
    }
  }

  async function processQueue() {
    const queue = loadQueue();
    if (!queue.length) return { success: true, processed: 0, failed: 0, remaining: 0 };
    if (!isOnline()) return { success: false, error: 'Offline', processed: 0, remaining: queue.length };

    const next = [];
    let processed = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        const res = await request(item.action, item.payload);
        if (res.success && !res.queued) processed += 1;
        else throw new Error(res.error || 'Queued again');
      } catch {
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 3) next.push(item);
        else failed += 1;
      }
    }

    saveQueue(next);
    return { success: failed === 0, processed, failed, remaining: next.length };
  }

  return {
    isOnline,
    getScriptUrl,
    setScriptUrl,
    loadQueue,
    queueOperation,
    processQueue,
    request,
    setupSheets: () => request('setup', {}),
    fetchAll: () => request('syncAll'),
    syncAll: async (state) => {
      await processQueue();
      return request('syncAll', state);
    },
    list: (sheet) => request('list', { sheet }),
    create: (sheet, record) => request('create', { sheet, record }),
    update: (sheet, id, patch) => request('update', { sheet, id, patch }),
    remove: (sheet, id) => request('remove', { sheet, id }),
    batchUpsert: (sheet, records) => request('batchUpsert', { sheet, records }),
    addOrder: (order, orderItems, payment) => request('addOrder', { order, orderItems, payment }),
    addPurchase: (purchase, purchaseItems, payment) => request('addPurchase', { purchase, purchaseItems, payment }),
    getFinancials: () => request('getFinancials'),
    generateInvoicePdf: (orderId) => request('generateInvoicePdf', { orderId }),
    testConnection: async () => {
      try {
        const res = await request('ping');
        return res.success ? { success: true, message: 'Connected to Google Sheets backend.' } : res;
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  };
})();


const APP_VERSION = '3-file-v1.0';
const shopId = new URLSearchParams(window.location.search).get('shop') || 'demo-shop';
const STORE_KEY = `dukandarpro_${shopId}_state_v1`;

const nav = [
  ['dashboard','Dashboard','ڈیش بورڈ','📊'],['pos','POS Billing','بلنگ','🧾'],['sales','Sales','سیلز','🛒'],['customers','Customers','کسٹمرز','👥'],
  ['products','Products','پروڈکٹس','📦'],['inventory','Inventory','اسٹاک','🏬'],['salesmen','Salesmen','سیلزمین','🧑‍💼'],['expenses','Expenses','اخراجات','💸'],
  ['suppliers','Suppliers','سپلائرز','🚚'],['purchases','Purchases','خریداری','📥'],['payments','Bank & Payments','بینک/ادائیگی','💳'],
  ['accounting','Accounting','اکاؤنٹنگ','📚'],['reports','Reports','رپورٹس','📈'],['notifications','Alerts','الرٹس','🔔'],['settings','Settings','سیٹنگز','⚙️']
];

const uid = (prefix='ID') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`.toUpperCase();
const today = () => new Date().toISOString().slice(0,10);
const nowISO = () => new Date().toISOString();
const n = (v) => Number(v || 0);
const money = (v) => `Rs. ${Math.round(n(v)).toLocaleString('en-PK')}`;
const sum = (arr, fn) => arr.reduce((a,x) => a + n(fn(x)), 0);
const byId = (arr,id) => arr.find(x => x.id === id) || {};
const safe = (v,fallback='') => v ?? fallback;

const seedData = () => ({
  version: APP_VERSION,
  business: { name:'DukanDarPro Demo Store', owner:'Owner', phone:'0300-0000000', city:'Lahore', language:'en', currency:'PKR', taxRate:0, lowStockDefault:5 },
  products: [
    {id:'P-001',name:'Sugar 1kg',sku:'SUG-1KG',barcode:'111',category:'Grocery',variant:'1kg',unit:'kg',cost:145,price:170,stock:48,lowStock:10,expiry:'2026-12-31',supplierId:'SUP-001',taxable:false,active:true},
    {id:'P-002',name:'Cooking Oil 1L',sku:'OIL-1L',barcode:'222',category:'Grocery',variant:'1L',unit:'ltr',cost:510,price:560,stock:16,lowStock:8,expiry:'2026-10-10',supplierId:'SUP-001',taxable:false,active:true},
    {id:'P-003',name:'Tea Pack',sku:'TEA-250',barcode:'333',category:'Grocery',variant:'250g',unit:'pc',cost:820,price:920,stock:5,lowStock:8,expiry:'2026-09-01',supplierId:'SUP-002',taxable:false,active:true},
    {id:'P-004',name:'Men Shirt',sku:'SHIRT-M',barcode:'444',category:'Clothing',variant:'M',unit:'pc',cost:1050,price:1599,stock:24,lowStock:5,expiry:'',supplierId:'SUP-003',taxable:false,active:true}
  ],
  customers: [
    {id:'C-001',name:'Walk-in Customer',phone:'',address:'',cnic:'',photo:'',notes:'Default customer',category:'Normal',firstVisit:today(),lastVisit:today(),visits:0,lifetimeSpend:0,pendingDues:0,loyaltyEnabled:false,points:0,discountType:'none',discountValue:0,minOrder:0,expiry:'',birthday:''},
    {id:'C-002',name:'Ali Raza',phone:'03001234567',address:'Lahore',cnic:'',photo:'',notes:'Regular udhaar customer',category:'Regular',firstVisit:'2026-01-10',lastVisit:today(),visits:8,lifetimeSpend:42000,pendingDues:4500,loyaltyEnabled:true,points:210,discountType:'percent',discountValue:5,minOrder:1000,expiry:'2026-12-31',birthday:'1995-05-20'}
  ],
  salesmen:[
    {id:'SM-001',name:'Admin Counter',phone:'',salary:0,commissionRate:0,target:0,attendance:0,totalSales:0,active:true},
    {id:'SM-002',name:'Usman',phone:'03001112222',salary:35000,commissionRate:2,target:300000,attendance:24,totalSales:56000,active:true}
  ],
  suppliers:[
    {id:'SUP-001',name:'Lahore Wholesale Market',phone:'042-000000',address:'Shah Alam',balance:25000,category:'Grocery'},
    {id:'SUP-002',name:'Tea Distributor',phone:'03009998888',address:'Market',balance:8000,category:'Beverage'},
    {id:'SUP-003',name:'Textile Supplier',phone:'03007776666',address:'Faisalabad',balance:0,category:'Clothing'}
  ],
  bankAccounts:[
    {id:'BA-CASH',name:'Cash in Hand',type:'Cash',balance:75000,accountNo:'',active:true},
    {id:'BA-EASY',name:'Easypaisa',type:'Easypaisa',balance:18000,accountNo:'03000000000',active:true},
    {id:'BA-JAZZ',name:'JazzCash',type:'JazzCash',balance:12000,accountNo:'03000000000',active:true},
    {id:'BA-BANK',name:'Meezan Bank',type:'Bank',balance:140000,accountNo:'0000-0000',active:true}
  ],
  orders:[], orderItems:[], payments:[], transactions:[], expenses:[], purchases:[], purchaseItems:[], ledgerEntries:[], vouchers:[], attendance:[], notifications:[], activityLogs:[], loyaltyDiscounts:[], categories:['Grocery','Clothing','Cosmetics','Pharmacy','Hardware','Bakery','Restaurant','Optical','Wholesale']
});

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || seedData(); }
  catch { return seedData(); }
}
function saveState(next){ localStorage.setItem(STORE_KEY, JSON.stringify(next)); }

function exportCSV(name, rows){
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return alert('No data to export');
  const headers = Object.keys(list[0]);
  const csv = [headers.join(','), ...list.map(r => headers.map(h => `"${String(r[h] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  const a = document.createElement('a'); a.href=url; a.download=`${name}-${today()}.csv`; a.click(); URL.revokeObjectURL(url);
}

function compute(state){
  const completed = state.orders.filter(o => !['Cancelled','Draft','Hold'].includes(o.status));
  const grossSales = sum(completed, o => o.subtotal);
  const discounts = sum(completed, o => o.discountAmount);
  const taxes = sum(completed, o => o.taxAmount);
  const netSales = sum(completed, o => o.total);
  const cogs = sum(state.orderItems, item => n(item.cost) * n(item.qty));
  const grossProfit = netSales - cogs;
  const expenses = sum(state.expenses, e => e.amount);
  const refundLoss = sum(state.orders.filter(o => o.status === 'Returned'), o => o.refundAmount || 0);
  const netProfit = grossProfit - expenses - refundLoss;
  const inventoryValue = sum(state.products, p => n(p.stock) * n(p.cost));
  const receivables = sum(state.customers, c => c.pendingDues);
  const bankBalances = sum(state.bankAccounts, b => b.balance);
  const supplierDues = sum(state.suppliers, s => Math.max(0,n(s.balance)));
  const salariesPayable = sum(state.salesmen, s => s.salary);
  const assets = bankBalances + inventoryValue + receivables;
  const liabilities = supplierDues + salariesPayable;
  const equity = assets - liabilities;
  const lowStock = state.products.filter(p => n(p.stock) <= n(p.lowStock || state.business.lowStockDefault));
  const expired = state.products.filter(p => p.expiry && p.expiry < today());
  const pendingDues = state.customers.filter(c => n(c.pendingDues) > 0);
  const topProducts = Object.values(state.orderItems.reduce((m,it)=>{ const k=it.productId; m[k]=m[k]||{productId:k,name:it.name,qty:0,total:0}; m[k].qty+=n(it.qty); m[k].total+=n(it.total); return m; },{})).sort((a,b)=>b.total-a.total).slice(0,5);
  const salesmanPerf = state.salesmen.map(s => ({...s, totalSales: sum(completed.filter(o=>o.salesmanId===s.id), o=>o.total)})).sort((a,b)=>b.totalSales-a.totalSales);
  const daily = Array.from({length:12}).map((_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-11+i); const key=d.toISOString().slice(0,10);
    return {date:key.slice(5), sales:sum(completed.filter(o=>String(o.date).slice(0,10)===key),o=>o.total), expenses:sum(state.expenses.filter(e=>String(e.date).slice(0,10)===key),e=>e.amount)};
  });
  const trial = [
    {account:'Cash & Bank', debit:bankBalances, credit:0}, {account:'Inventory', debit:inventoryValue, credit:0}, {account:'Receivables', debit:receivables, credit:0},
    {account:'Sales Revenue', debit:0, credit:netSales}, {account:'COGS', debit:cogs, credit:0}, {account:'Expenses', debit:expenses, credit:0},
    {account:'Supplier Payables', debit:0, credit:supplierDues}, {account:'Owner Equity / Retained Earnings', debit:0, credit:Math.max(0,equity)}
  ];
  return {grossSales,discounts,taxes,netSales,cogs,grossProfit,expenses,refundLoss,netProfit,inventoryValue,receivables,bankBalances,supplierDues,salariesPayable,assets,liabilities,equity,lowStock,expired,pendingDues,topProducts,salesmanPerf,daily,trial};
}

function Card({children,className=''}){ return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</div>; }
function Button({children,onClick,type='button',variant='primary',className='',disabled=false}){
  const styles = variant==='ghost' ? 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800' : variant==='danger' ? 'bg-rose-600 text-white hover:bg-rose-700' : variant==='soft' ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100' : 'bg-slate-900 text-white hover:bg-black dark:bg-emerald-500 dark:text-slate-950';
  return <button type={type} disabled={disabled} onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}>{children}</button>;
}
function Input({label,value,onChange,type='text',placeholder='',className=''}){ return <label className={`block text-sm ${className}`}><span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">{label}</span><input type={type} value={value ?? ''} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 dark:border-slate-700 dark:bg-slate-950" /></label>; }
function Select({label,value,onChange,options,className=''}){ return <label className={`block text-sm ${className}`}><span className="mb-1 block font-medium text-slate-600 dark:text-slate-300">{label}</span><select value={value ?? ''} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 dark:border-slate-700 dark:bg-slate-950">{options.map(o=><option key={Array.isArray(o)?o[0]:o} value={Array.isArray(o)?o[0]:o}>{Array.isArray(o)?o[1]:o}</option>)}</select></label>; }
function KPI({title,value,sub,icon}){ return <Card><div className="flex items-start justify-between"><div><p className="text-sm text-slate-500 dark:text-slate-400">{title}</p><h3 className="mt-2 text-2xl font-bold">{value}</h3><p className="mt-1 text-xs text-slate-500">{sub}</p></div><div className="rounded-2xl bg-slate-100 p-3 text-2xl dark:bg-slate-800">{icon}</div></div></Card>; }
function Table({rows,columns,empty='No records'}){ return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">{columns.map(c=><th key={c.key} className="whitespace-nowrap px-3 py-3">{c.label}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={r.id||i} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">{columns.map(c=><td key={c.key} className="whitespace-nowrap px-3 py-3">{c.render?c.render(r):safe(r[c.key])}</td>)}</tr>):<tr><td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">{empty}</td></tr>}</tbody></table></div>; }

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .glass { backdrop-filter: blur(14px); }
      @media print {
        .no-print { display: none !important; }
        .print-card { box-shadow: none !important; border: 0 !important; }
        .print-area { display: block !important; }
      }
    `}</style>
  );
}

function App(){
  const [state,setState] = useState(loadState);
  const [page,setPage] = useState('dashboard');
  const [query,setQuery] = useState('');
  const [dark,setDark] = useState(localStorage.getItem('dp_dark')==='1');
  const [mobile,setMobile] = useState(false);
  const [toast,setToast] = useState('');
  const metrics = useMemo(()=>compute(state),[state]);
  const lang = state.business.language || 'en';
  const t = (en,ur) => lang === 'ur' ? ur : en;

  useEffect(()=>{ saveState(state); },[state]);
  useEffect(()=>{ document.documentElement.classList.toggle('dark',dark); localStorage.setItem('dp_dark',dark?'1':'0'); },[dark]);
  const update = (fn) => setState(prev => typeof fn === 'function' ? fn(structuredClone(prev)) : fn);
  const log = (type,message) => update(s=>{ s.activityLogs.unshift({id:uid('LOG'),type,message,date:nowISO()}); return s; });
  const notify = (message,type='info') => { setToast(message); setTimeout(()=>setToast(''),2600); update(s=>{ s.notifications.unshift({id:uid('N'),message,type,read:false,date:nowISO()}); return s; }); };

  async function syncToSheet(){
    if(!DPApi?.getScriptUrl()) return alert('Add your Apps Script URL in Settings first.');
    const res = await DPApi.syncAll(state);
    if(res.success) notify('Synced with Google Sheets','success'); else alert(res.error || 'Sync failed');
  }
  async function pullFromSheet(){
    if(!DPApi?.getScriptUrl()) return alert('Add your Apps Script URL in Settings first.');
    const res = await DPApi.fetchAll();
    if(res.success && res.data){ setState({...state,...res.data}); notify('Loaded from Google Sheets','success'); } else alert(res.error || 'Load failed');
  }

  const filteredNav = nav;
  const title = nav.find(x=>x[0]===page)?.[1] || 'Dashboard';
  const pageProps = {state,update,metrics,notify,query,setPage,syncToSheet,pullFromSheet,t,log};

  return <div className="min-h-screen">
    <GlobalStyles />
    {toast && <div className="fixed right-4 top-4 z-50 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl dark:bg-emerald-500 dark:text-slate-950">{toast}</div>}
    <aside className={`no-print fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${mobile?'translate-x-0':'-translate-x-full'}`}>
      <div className="mb-6 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-xl font-black text-slate-950">D</div><div><h1 className="font-black">DukanDarPro</h1><p className="text-xs text-slate-500">ERP + POS + Accounting</p></div></div>
      <div className="mb-4 rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800"><p className="font-semibold">{state.business.name}</p><p className="text-xs text-slate-500">Shop: {shopId}</p></div>
      <nav className="h-[calc(100vh-170px)] space-y-1 overflow-y-auto pb-6 scrollbar-hide">{filteredNav.map(([key,en,ur,icon])=><button key={key} onClick={()=>{setPage(key);setMobile(false)}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${page===key?'bg-slate-950 text-white dark:bg-emerald-500 dark:text-slate-950':'hover:bg-slate-100 dark:hover:bg-slate-800'}`}><span>{icon}</span><span>{t(en,ur)}</span></button>)}</nav>
    </aside>
    {mobile && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={()=>setMobile(false)} />}
    <main className="lg:pl-72">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-3 glass dark:border-slate-800 dark:bg-slate-950/85">
        <div className="flex flex-wrap items-center gap-3"><Button variant="soft" className="lg:hidden" onClick={()=>setMobile(true)}>☰</Button><div className="mr-auto"><h2 className="text-xl font-black">{title}</h2><p className="text-xs text-slate-500">QuickBooks-style local business dashboard for Pakistan</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customers, products, orders..." className="hidden min-w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 dark:border-slate-700 dark:bg-slate-900 md:block" /><Button variant="soft" onClick={()=>setDark(!dark)}>{dark?'☀️':'🌙'}</Button><Button variant="soft" onClick={()=>update(s=>{s.business.language=s.business.language==='ur'?'en':'ur'; return s;})}>{lang==='ur'?'English':'اردو'}</Button><Button onClick={()=>setPage('pos')}>New Sale</Button></div>
      </header>
      <section className="p-4 lg:p-6">
        {page==='dashboard' && <Dashboard {...pageProps}/>} {page==='pos' && <POS {...pageProps}/>} {page==='sales' && <Sales {...pageProps}/>} {page==='customers' && <Customers {...pageProps}/>} {page==='products' && <Products {...pageProps}/>} {page==='inventory' && <Inventory {...pageProps}/>} {page==='salesmen' && <Salesmen {...pageProps}/>} {page==='expenses' && <Expenses {...pageProps}/>} {page==='suppliers' && <Suppliers {...pageProps}/>} {page==='purchases' && <Purchases {...pageProps}/>} {page==='payments' && <Payments {...pageProps}/>} {page==='accounting' && <Accounting {...pageProps}/>} {page==='reports' && <Reports {...pageProps}/>} {page==='notifications' && <Notifications {...pageProps}/>} {page==='settings' && <Settings {...pageProps}/>} 
      </section>
    </main>
  </div>;
}

function Dashboard({state,metrics,t,setPage}){
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KPI title={t('Today Sales','آج کی سیلز')} value={money(sum(state.orders.filter(o=>String(o.date).slice(0,10)===today()),o=>o.total))} sub="Net completed orders" icon="💰"/><KPI title="Net Profit" value={money(metrics.netProfit)} sub="Sales - COGS - expenses" icon="📈"/><KPI title="Inventory Value" value={money(metrics.inventoryValue)} sub={`${state.products.length} products`} icon="📦"/><KPI title="Pending Dues" value={money(metrics.receivables)} sub={`${metrics.pendingDues.length} customers`} icon="⏳"/></div>
    <div className="grid gap-4 xl:grid-cols-3"><Card className="xl:col-span-2"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Sales vs Expenses</h3><Button variant="soft" onClick={()=>setPage('reports')}>Open Reports</Button></div><div className="h-80"><ResponsiveContainer><AreaChart data={metrics.daily}><defs><linearGradient id="sales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Area type="monotone" dataKey="sales" stroke="#10b981" fill="url(#sales)"/><Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={0.12}/></AreaChart></ResponsiveContainer></div></Card><Card><h3 className="mb-4 font-bold">Financial Snapshot</h3><div className="space-y-3 text-sm"><Row label="Assets" value={money(metrics.assets)}/><Row label="Liabilities" value={money(metrics.liabilities)}/><Row label="Equity / Worth" value={money(metrics.equity)}/><Row label="Cash & Bank" value={money(metrics.bankBalances)}/><Row label="Supplier Dues" value={money(metrics.supplierDues)}/></div></Card></div>
    <div className="grid gap-4 xl:grid-cols-3"><Card><h3 className="mb-3 font-bold">Low Stock Alerts</h3><Table rows={metrics.lowStock} columns={[{key:'name',label:'Product'},{key:'stock',label:'Stock'},{key:'lowStock',label:'Min'}]}/></Card><Card><h3 className="mb-3 font-bold">Top Products</h3><Table rows={metrics.topProducts} columns={[{key:'name',label:'Product'},{key:'qty',label:'Qty'},{key:'total',label:'Sales',render:r=>money(r.total)}]}/></Card><Card><h3 className="mb-3 font-bold">Pending Dues</h3><Table rows={metrics.pendingDues} columns={[{key:'name',label:'Customer'},{key:'phone',label:'Phone'},{key:'pendingDues',label:'Due',render:r=>money(r.pendingDues)}]}/></Card></div>
    <Card><h3 className="mb-3 font-bold">Recent Orders</h3><Table rows={state.orders.slice(0,8)} columns={[{key:'id',label:'Order'},{key:'customerName',label:'Customer'},{key:'salesmanName',label:'Salesman'},{key:'paymentMethod',label:'Payment'},{key:'total',label:'Total',render:r=>money(r.total)},{key:'status',label:'Status'}]}/></Card>
  </div>;
}
function Row({label,value}){ return <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800"><span className="text-slate-500">{label}</span><b>{value}</b></div>; }

function POS({state,update,notify,log}){
  const [customerId,setCustomerId]=useState(state.customers[0]?.id||''); const [salesmanId,setSalesmanId]=useState(state.salesmen[0]?.id||''); const [cart,setCart]=useState([]); const [discount,setDiscount]=useState(0); const [tax,setTax]=useState(state.business.taxRate||0); const [paymentMethod,setPaymentMethod]=useState('Cash'); const [bankId,setBankId]=useState(state.bankAccounts[0]?.id||'BA-CASH'); const [paid,setPaid]=useState(''); const [note,setNote]=useState(''); const [hold,setHold]=useState(false);
  const add = p => setCart(c=>{ const ex=c.find(x=>x.productId===p.id); if(ex) return c.map(x=>x.productId===p.id?{...x,qty:x.qty+1}:x); return [...c,{productId:p.id,name:p.name,qty:1,price:n(p.price),cost:n(p.cost),stock:n(p.stock)}]; });
  const subtotal=sum(cart,i=>i.qty*i.price); const discAmt = discount > 0 && discount < 100 ? subtotal*discount/100 : n(discount); const taxAmt=(subtotal-discAmt)*n(tax)/100; const total=Math.max(0,subtotal-discAmt+taxAmt); const paidAmt = paid==='' ? total : n(paid); const due=Math.max(0,total-paidAmt);
  function checkout(status='Completed'){
    if(!cart.length) return alert('Cart is empty');
    const c=byId(state.customers,customerId); const sm=byId(state.salesmen,salesmanId); const orderId=uid('ORD');
    update(s=>{
      const order={id:orderId,date:nowISO(),customerId,customerName:c.name||'Walk-in',salesmanId,salesmanName:sm.name||'',subtotal,discountAmount:discAmt,taxAmount:taxAmt,total,paid:paidAmt,due,paymentMethod,bankAccountId:bankId,status:status,notes:note,profit:sum(cart,i=>(i.price-i.cost)*i.qty)-discAmt};
      s.orders.unshift(order);
      cart.forEach(i=>{ s.orderItems.unshift({id:uid('OI'),orderId,...i,total:i.qty*i.price}); const p=s.products.find(x=>x.id===i.productId); if(p && status==='Completed') p.stock=n(p.stock)-n(i.qty); });
      if(status==='Completed'){
        const b=s.bankAccounts.find(x=>x.id===bankId); if(b) b.balance=n(b.balance)+paidAmt;
        s.payments.unshift({id:uid('PAY'),orderId,customerId,amount:paidAmt,method:paymentMethod,bankAccountId:bankId,status:due>0?'Partial':'Paid',receivedBy:sm.name,date:nowISO(),transactionId:''});
        s.transactions.unshift({id:uid('TXN'),type:'inflow',accountId:bankId,method:paymentMethod,amount:paidAmt,description:`Sale ${orderId}`,date:nowISO()});
        s.ledgerEntries.unshift({id:uid('LED'),accountType:'sales',accountId:orderId,debit:0,credit:total,balance:0,description:'Sales invoice',date:nowISO()});
        if(due>0){ const cust=s.customers.find(x=>x.id===customerId); if(cust) cust.pendingDues=n(cust.pendingDues)+due; s.ledgerEntries.unshift({id:uid('LED'),accountType:'customer',accountId:customerId,debit:due,credit:0,balance:due,description:`Udhaar ${orderId}`,date:nowISO()}); }
        const cust=s.customers.find(x=>x.id===customerId); if(cust){ cust.lastVisit=today(); cust.visits=n(cust.visits)+1; cust.lifetimeSpend=n(cust.lifetimeSpend)+total; cust.points=n(cust.points)+Math.floor(total/100); }
      }
      return s;
    });
    log('sale',`Created order ${orderId}`); notify(status==='Hold'?'Order held':'Sale completed'); setCart([]); setDiscount(0); setPaid(''); setNote(''); setHold(false);
  }
  const productList=state.products.filter(p=>p.active!==false);
  return <div className="grid gap-4 xl:grid-cols-[1fr_420px]"><div className="space-y-4"><Card><div className="grid gap-3 md:grid-cols-4"><Select label="Customer" value={customerId} onChange={setCustomerId} options={state.customers.map(c=>[c.id,`${c.name} ${c.pendingDues?`(${money(c.pendingDues)} due)`:''}`])}/><Select label="Salesman" value={salesmanId} onChange={setSalesmanId} options={state.salesmen.map(s=>[s.id,s.name])}/><Select label="Payment" value={paymentMethod} onChange={setPaymentMethod} options={['Cash','Easypaisa','JazzCash','Bank Transfer','Credit Card','Debit Card','Other Wallet']}/><Select label="Account" value={bankId} onChange={setBankId} options={state.bankAccounts.map(b=>[b.id,`${b.name} - ${money(b.balance)}`])}/></div></Card><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{productList.map(p=><button key={p.id} onClick={()=>add(p)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><p className="font-bold">{p.name}</p><p className="text-xs text-slate-500">{p.category} • Stock {p.stock}</p><p className="mt-2 text-lg font-black">{money(p.price)}</p></button>)}</div></div><Card className="sticky top-24 h-max"><h3 className="mb-3 text-lg font-black">Current Bill</h3><div className="max-h-80 space-y-2 overflow-y-auto">{cart.map(i=><div key={i.productId} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800"><div className="mr-auto"><p className="font-semibold">{i.name}</p><p className="text-xs text-slate-500">{money(i.price)} x {i.qty}</p></div><button onClick={()=>setCart(c=>c.map(x=>x.productId===i.productId?{...x,qty:Math.max(1,x.qty-1)}:x))} className="rounded-lg bg-white px-2 dark:bg-slate-950">-</button><b>{i.qty}</b><button onClick={()=>setCart(c=>c.map(x=>x.productId===i.productId?{...x,qty:x.qty+1}:x))} className="rounded-lg bg-white px-2 dark:bg-slate-950">+</button><button onClick={()=>setCart(c=>c.filter(x=>x.productId!==i.productId))} className="text-rose-500">×</button></div>)}</div><div className="mt-4 grid grid-cols-2 gap-3"><Input label="Discount % or Rs" type="number" value={discount} onChange={setDiscount}/><Input label="Tax %" type="number" value={tax} onChange={setTax}/><Input label="Paid Amount" type="number" value={paid} onChange={setPaid}/><Input label="Notes" value={note} onChange={setNote}/></div><div className="my-4 space-y-2 text-sm"><Row label="Subtotal" value={money(subtotal)}/><Row label="Discount" value={money(discAmt)}/><Row label="Tax" value={money(taxAmt)}/><Row label="Total" value={money(total)}/><Row label="Due / Udhaar" value={money(due)}/></div><div className="grid grid-cols-2 gap-2"><Button variant="soft" onClick={()=>checkout('Hold')}>Hold</Button><Button variant="soft" onClick={()=>checkout('Draft')}>Draft</Button><Button className="col-span-2" onClick={()=>checkout('Completed')}>Complete & Print</Button></div></Card></div>;
}

function GenericAdd({fields,onSubmit,button='Add'}){ const [form,setForm]=useState(Object.fromEntries(fields.map(f=>[f.key,f.default||'']))); return <Card><form onSubmit={e=>{e.preventDefault(); onSubmit(form); setForm(Object.fromEntries(fields.map(f=>[f.key,f.default||''])));}} className="grid gap-3 md:grid-cols-4">{fields.map(f=> f.options?<Select key={f.key} label={f.label} value={form[f.key]} onChange={v=>setForm({...form,[f.key]:v})} options={f.options}/>:<Input key={f.key} label={f.label} type={f.type||'text'} value={form[f.key]} onChange={v=>setForm({...form,[f.key]:v})}/>)}<div className="flex items-end"><Button type="submit" className="w-full">{button}</Button></div></form></Card>; }
function Sales({state,update}){ return <div className="space-y-4"><Card><div className="flex flex-wrap gap-2"><Button variant="soft" onClick={()=>exportCSV('orders',state.orders)}>Export Orders CSV</Button><Button variant="soft" onClick={()=>window.print()}>Print</Button></div></Card><Card><Table rows={state.orders} columns={[{key:'date',label:'Date',render:r=>String(r.date).slice(0,16).replace('T',' ')},{key:'id',label:'Order'},{key:'customerName',label:'Customer'},{key:'salesmanName',label:'Salesman'},{key:'subtotal',label:'Subtotal',render:r=>money(r.subtotal)},{key:'discountAmount',label:'Discount',render:r=>money(r.discountAmount)},{key:'total',label:'Total',render:r=>money(r.total)},{key:'due',label:'Due',render:r=>money(r.due)},{key:'status',label:'Status'},{key:'actions',label:'Actions',render:r=><div className="flex gap-2"><Button variant="soft" onClick={()=>window.print()}>Invoice</Button><Button variant="danger" onClick={()=>update(s=>{const o=s.orders.find(x=>x.id===r.id); if(o)o.status='Returned'; return s;})}>Return</Button></div>}]} /></Card></div>; }
function Customers({state,update}){ const fields=[{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'address',label:'Address'},{key:'category',label:'Category',default:'Normal',options:['Normal','Regular','VIP','Wholesale']},{key:'discountType',label:'Discount Type',default:'none',options:['none','fixed','percent']},{key:'discountValue',label:'Discount',type:'number',default:0},{key:'pendingDues',label:'Opening Due',type:'number',default:0}]; return <div className="space-y-4"><GenericAdd fields={fields} onSubmit={f=>update(s=>{s.customers.unshift({id:uid('C'),cnic:'',photo:'',notes:'',firstVisit:today(),lastVisit:'',visits:0,lifetimeSpend:0,points:0,loyaltyEnabled:f.discountType!=='none',minOrder:0,expiry:'',birthday:'',...f,pendingDues:n(f.pendingDues),discountValue:n(f.discountValue)}); return s;})}/><Card><Table rows={state.customers} columns={[{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'category',label:'Category'},{key:'visits',label:'Visits'},{key:'lifetimeSpend',label:'Lifetime',render:r=>money(r.lifetimeSpend)},{key:'pendingDues',label:'Due',render:r=>money(r.pendingDues)},{key:'points',label:'Points'},{key:'discount',label:'Discount',render:r=>r.discountType==='percent'?`${r.discountValue}%`:r.discountType==='fixed'?money(r.discountValue):'-'}]}/></Card></div>; }
function Products({state,update}){ const fields=[{key:'name',label:'Name'},{key:'sku',label:'SKU'},{key:'barcode',label:'Barcode'},{key:'category',label:'Category',default:'Grocery',options:state.categories},{key:'variant',label:'Variant'},{key:'unit',label:'Unit',default:'pc'},{key:'cost',label:'Cost',type:'number'},{key:'price',label:'Price',type:'number'},{key:'stock',label:'Stock',type:'number'},{key:'lowStock',label:'Low Stock',type:'number',default:5},{key:'expiry',label:'Expiry',type:'date'}]; return <div className="space-y-4"><GenericAdd fields={fields} onSubmit={f=>update(s=>{s.products.unshift({id:uid('P'),supplierId:'',taxable:false,active:true,...f,cost:n(f.cost),price:n(f.price),stock:n(f.stock),lowStock:n(f.lowStock)}); return s;})}/><Card><Table rows={state.products} columns={[{key:'name',label:'Name'},{key:'sku',label:'SKU'},{key:'category',label:'Category'},{key:'barcode',label:'Barcode'},{key:'cost',label:'Cost',render:r=>money(r.cost)},{key:'price',label:'Price',render:r=>money(r.price)},{key:'stock',label:'Stock'},{key:'expiry',label:'Expiry'},{key:'actions',label:'Actions',render:r=><Button variant="danger" onClick={()=>update(s=>{s.products=s.products.filter(x=>x.id!==r.id);return s;})}>Delete</Button>}]} /></Card></div>; }
function Inventory({state,update,metrics}){ return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><KPI title="Low Stock" value={metrics.lowStock.length} sub="Needs reorder" icon="⚠️"/><KPI title="Expired Items" value={metrics.expired.length} sub="Remove from shelf" icon="⛔"/><KPI title="Inventory Value" value={money(metrics.inventoryValue)} sub="Cost value" icon="🏬"/></div><Card><h3 className="mb-3 font-bold">Stock Adjustment</h3><Table rows={state.products} columns={[{key:'name',label:'Product'},{key:'stock',label:'Stock'},{key:'lowStock',label:'Low Stock'},{key:'expiry',label:'Expiry'},{key:'adjust',label:'Adjust',render:r=><div className="flex gap-2"><Button variant="soft" onClick={()=>update(s=>{const p=s.products.find(x=>x.id===r.id); p.stock=n(p.stock)+1; s.ledgerEntries.unshift({id:uid('LED'),accountType:'inventory',accountId:p.id,debit:p.cost,credit:0,balance:p.stock*p.cost,description:'Stock adjustment +1',date:nowISO()}); return s;})}>+1</Button><Button variant="soft" onClick={()=>update(s=>{const p=s.products.find(x=>x.id===r.id); p.stock=Math.max(0,n(p.stock)-1); s.ledgerEntries.unshift({id:uid('LED'),accountType:'inventory',accountId:p.id,debit:0,credit:p.cost,balance:p.stock*p.cost,description:'Damaged/adjustment -1',date:nowISO()}); return s;})}>-1</Button></div>}]} /></Card></div>; }
function Salesmen({state,update,metrics}){ const fields=[{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'salary',label:'Salary',type:'number'},{key:'commissionRate',label:'Commission %',type:'number'},{key:'target',label:'Target',type:'number'}]; return <div className="space-y-4"><GenericAdd fields={fields} onSubmit={f=>update(s=>{s.salesmen.unshift({id:uid('SM'),attendance:0,active:true,totalSales:0,...f,salary:n(f.salary),commissionRate:n(f.commissionRate),target:n(f.target)});return s;})}/><Card><Table rows={metrics.salesmanPerf} columns={[{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'salary',label:'Salary',render:r=>money(r.salary)},{key:'commissionRate',label:'Commission %'},{key:'target',label:'Target',render:r=>money(r.target)},{key:'totalSales',label:'Sales',render:r=>money(r.totalSales)},{key:'commission',label:'Commission Earned',render:r=>money(n(r.totalSales)*n(r.commissionRate)/100)}]} /></Card></div>; }
function Expenses({state,update}){ const fields=[{key:'category',label:'Category',default:'Miscellaneous',options:['Salary','Rent','Bills','Transport','Purchases','Marketing','Miscellaneous']},{key:'description',label:'Description'},{key:'amount',label:'Amount',type:'number'},{key:'method',label:'Payment Method',default:'Cash',options:['Cash','Easypaisa','JazzCash','Bank Transfer']},{key:'date',label:'Date',type:'date',default:today()}]; return <div className="space-y-4"><GenericAdd fields={fields} onSubmit={f=>update(s=>{s.expenses.unshift({id:uid('EXP'),...f,amount:n(f.amount)}); const b=s.bankAccounts[0]; if(b) b.balance=n(b.balance)-n(f.amount); s.transactions.unshift({id:uid('TXN'),type:'outflow',accountId:b?.id||'',method:f.method,amount:n(f.amount),description:f.description,date:f.date||today()}); s.ledgerEntries.unshift({id:uid('LED'),accountType:'expense',accountId:f.category,debit:n(f.amount),credit:0,balance:0,description:f.description,date:f.date||today()}); return s;})}/><Card><Table rows={state.expenses} columns={[{key:'date',label:'Date'},{key:'category',label:'Category'},{key:'description',label:'Description'},{key:'method',label:'Method'},{key:'amount',label:'Amount',render:r=>money(r.amount)}]}/></Card></div>; }
function Suppliers({state,update}){ const fields=[{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'address',label:'Address'},{key:'category',label:'Category'},{key:'balance',label:'Opening Balance',type:'number'}]; return <div className="space-y-4"><GenericAdd fields={fields} onSubmit={f=>update(s=>{s.suppliers.unshift({id:uid('SUP'),...f,balance:n(f.balance)});return s;})}/><Card><Table rows={state.suppliers} columns={[{key:'name',label:'Name'},{key:'phone',label:'Phone'},{key:'address',label:'Address'},{key:'category',label:'Category'},{key:'balance',label:'Balance',render:r=>money(r.balance)}]}/></Card></div>; }
function Purchases({state,update,notify}){ const fields=[{key:'supplierId',label:'Supplier',default:state.suppliers[0]?.id,options:state.suppliers.map(s=>[s.id,s.name])},{key:'productId',label:'Product',default:state.products[0]?.id,options:state.products.map(p=>[p.id,p.name])},{key:'qty',label:'Qty',type:'number',default:1},{key:'cost',label:'Unit Cost',type:'number'},{key:'paid',label:'Paid',type:'number',default:0},{key:'date',label:'Date',type:'date',default:today()}]; return <div className="space-y-4"><GenericAdd fields={fields} button="Add Purchase" onSubmit={f=>update(s=>{const p=s.products.find(x=>x.id===f.productId); const sup=s.suppliers.find(x=>x.id===f.supplierId); const total=n(f.qty)*n(f.cost||p?.cost); const pur={id:uid('PUR'),supplierId:f.supplierId,supplierName:sup?.name||'',date:f.date,total,paid:n(f.paid),balance:total-n(f.paid),status:total-n(f.paid)>0?'Partial':'Paid'}; s.purchases.unshift(pur); s.purchaseItems.unshift({id:uid('PI'),purchaseId:pur.id,productId:f.productId,name:p?.name||'',qty:n(f.qty),cost:n(f.cost||p?.cost),total}); if(p){p.stock=n(p.stock)+n(f.qty); p.cost=n(f.cost||p.cost);} if(sup) sup.balance=n(sup.balance)+pur.balance; s.ledgerEntries.unshift({id:uid('LED'),accountType:'purchase',accountId:pur.id,debit:total,credit:0,balance:0,description:'Purchase invoice',date:f.date}); notify('Purchase added and stock updated'); return s;})}/><Card><Table rows={state.purchases} columns={[{key:'date',label:'Date'},{key:'id',label:'Purchase'},{key:'supplierName',label:'Supplier'},{key:'total',label:'Total',render:r=>money(r.total)},{key:'paid',label:'Paid',render:r=>money(r.paid)},{key:'balance',label:'Balance',render:r=>money(r.balance)},{key:'status',label:'Status'}]}/></Card></div>; }
function Payments({state,update}){ const accountFields=[{key:'name',label:'Account Name'},{key:'type',label:'Type',default:'Cash',options:['Cash','Easypaisa','JazzCash','Bank','Card','Wallet']},{key:'accountNo',label:'Account No'},{key:'balance',label:'Opening Balance',type:'number'}]; const txFields=[{key:'type',label:'Type',default:'inflow',options:['inflow','outflow']},{key:'accountId',label:'Account',default:state.bankAccounts[0]?.id,options:state.bankAccounts.map(b=>[b.id,b.name])},{key:'method',label:'Method',default:'Cash',options:['Cash','Easypaisa','JazzCash','Bank Transfer','Card','Other Wallet']},{key:'amount',label:'Amount',type:'number'},{key:'description',label:'Description'}]; return <div className="space-y-4"><GenericAdd fields={accountFields} button="Add Account" onSubmit={f=>update(s=>{s.bankAccounts.unshift({id:uid('BA'),active:true,...f,balance:n(f.balance)});return s;})}/><GenericAdd fields={txFields} button="Add Transaction" onSubmit={f=>update(s=>{const b=s.bankAccounts.find(x=>x.id===f.accountId); if(b) b.balance += f.type==='inflow'?n(f.amount):-n(f.amount); s.transactions.unshift({id:uid('TXN'),date:nowISO(),...f,amount:n(f.amount)});return s;})}/><div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-3 font-bold">Accounts</h3><Table rows={state.bankAccounts} columns={[{key:'name',label:'Name'},{key:'type',label:'Type'},{key:'accountNo',label:'No'},{key:'balance',label:'Balance',render:r=>money(r.balance)}]}/></Card><Card><h3 className="mb-3 font-bold">Transactions</h3><Table rows={state.transactions} columns={[{key:'date',label:'Date',render:r=>String(r.date).slice(0,10)},{key:'type',label:'Type'},{key:'method',label:'Method'},{key:'description',label:'Description'},{key:'amount',label:'Amount',render:r=>money(r.amount)}]}/></Card></div></div>; }
function Accounting({state,metrics}){ return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-4"><KPI title="Gross Profit" value={money(metrics.grossProfit)} sub="Net sales - COGS" icon="📊"/><KPI title="Net Profit" value={money(metrics.netProfit)} sub="After expenses" icon="✅"/><KPI title="Assets" value={money(metrics.assets)} sub="Cash + stock + dues" icon="🏦"/><KPI title="Equity" value={money(metrics.equity)} sub="Business worth" icon="💼"/></div><div className="grid gap-4 xl:grid-cols-2"><Card><h3 className="mb-3 font-bold">Profit & Loss</h3><Row label="Total Sales" value={money(metrics.netSales)}/><Row label="COGS" value={money(metrics.cogs)}/><Row label="Gross Profit" value={money(metrics.grossProfit)}/><Row label="Expenses" value={money(metrics.expenses)}/><Row label="Discounts" value={money(metrics.discounts)}/><Row label="Refund Loss" value={money(metrics.refundLoss)}/><Row label="Net Profit" value={money(metrics.netProfit)}/></Card><Card><h3 className="mb-3 font-bold">Balance Sheet</h3><Row label="Cash + Bank" value={money(metrics.bankBalances)}/><Row label="Inventory" value={money(metrics.inventoryValue)}/><Row label="Customer Receivables" value={money(metrics.receivables)}/><Row label="Total Assets" value={money(metrics.assets)}/><Row label="Supplier Dues" value={money(metrics.supplierDues)}/><Row label="Pending Salaries" value={money(metrics.salariesPayable)}/><Row label="Net Equity" value={money(metrics.equity)}/></Card></div><div className="grid gap-4 xl:grid-cols-2"><Card><h3 className="mb-3 font-bold">Trial Balance</h3><Table rows={metrics.trial} columns={[{key:'account',label:'Account'},{key:'debit',label:'Debit',render:r=>money(r.debit)},{key:'credit',label:'Credit',render:r=>money(r.credit)}]}/></Card><Card><h3 className="mb-3 font-bold">General Ledger</h3><Table rows={state.ledgerEntries.slice(0,30)} columns={[{key:'date',label:'Date',render:r=>String(r.date).slice(0,10)},{key:'accountType',label:'Account'},{key:'description',label:'Description'},{key:'debit',label:'Debit',render:r=>money(r.debit)},{key:'credit',label:'Credit',render:r=>money(r.credit)}]}/></Card></div></div>; }
function Reports({state,metrics}){ const [range,setRange]=useState('monthly'); const reportRows = state.orders.map(o=>({date:String(o.date).slice(0,10),order:o.id,customer:o.customerName,salesman:o.salesmanName,total:o.total,paid:o.paid,due:o.due,status:o.status})); return <div className="space-y-4"><Card><div className="flex flex-wrap items-center gap-3"><Select label="Filter" value={range} onChange={setRange} options={['today','yesterday','weekly','monthly','quarterly','yearly','custom']}/><div className="flex items-end gap-2"><Button variant="soft" onClick={()=>exportCSV('sales-report',reportRows)}>Export CSV</Button><Button variant="soft" onClick={()=>exportCSV('products-report',state.products)}>Products CSV</Button><Button variant="soft" onClick={()=>window.print()}>Print/PDF</Button></div></div></Card><div className="grid gap-4 md:grid-cols-3"><KPI title="Sales" value={money(metrics.netSales)} sub={range} icon="💰"/><KPI title="Expenses" value={money(metrics.expenses)} sub={range} icon="💸"/><KPI title="Profit" value={money(metrics.netProfit)} sub={range} icon="📈"/></div><Card><h3 className="mb-3 font-bold">Sales Report</h3><Table rows={reportRows} columns={[{key:'date',label:'Date'},{key:'order',label:'Order'},{key:'customer',label:'Customer'},{key:'salesman',label:'Salesman'},{key:'total',label:'Total',render:r=>money(r.total)},{key:'paid',label:'Paid',render:r=>money(r.paid)},{key:'due',label:'Due',render:r=>money(r.due)},{key:'status',label:'Status'}]}/></Card></div>; }
function Notifications({state,metrics,update}){ const generated=[...metrics.lowStock.map(p=>({id:`LS-${p.id}`,type:'warning',message:`Low stock: ${p.name} has ${p.stock} left`,date:today()})),...metrics.expired.map(p=>({id:`EX-${p.id}`,type:'danger',message:`Expired stock: ${p.name}`,date:today()})),...metrics.pendingDues.map(c=>({id:`DU-${c.id}`,type:'info',message:`Pending due from ${c.name}: ${money(c.pendingDues)}`,date:today()})),...state.notifications]; return <Card><div className="mb-3 flex justify-between"><h3 className="font-bold">Real-time Alerts</h3><Button variant="soft" onClick={()=>update(s=>{s.notifications=[];return s;})}>Clear Manual Alerts</Button></div><div className="space-y-2">{generated.map(a=><div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"><p className="font-semibold">{a.message}</p><p className="text-xs text-slate-500">{a.type} • {String(a.date).slice(0,16).replace('T',' ')}</p></div>)}</div></Card>; }
function Settings({state,update,syncToSheet,pullFromSheet}){ const [url,setUrl]=useState(DPApi?.getScriptUrl()||''); const [raw,setRaw]=useState(''); return <div className="space-y-4"><Card><h3 className="mb-3 font-bold">Business Profile</h3><div className="grid gap-3 md:grid-cols-4"><Input label="Business Name" value={state.business.name} onChange={v=>update(s=>{s.business.name=v;return s;})}/><Input label="Owner" value={state.business.owner} onChange={v=>update(s=>{s.business.owner=v;return s;})}/><Input label="Phone" value={state.business.phone} onChange={v=>update(s=>{s.business.phone=v;return s;})}/><Input label="City" value={state.business.city} onChange={v=>update(s=>{s.business.city=v;return s;})}/><Input label="Default Tax %" type="number" value={state.business.taxRate} onChange={v=>update(s=>{s.business.taxRate=n(v);return s;})}/><Input label="Low Stock Default" type="number" value={state.business.lowStockDefault} onChange={v=>update(s=>{s.business.lowStockDefault=n(v);return s;})}/></div><p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">Direct dashboard link: <b>{window.location.origin + window.location.pathname + '?shop=' + shopId}</b></p></Card><Card><h3 className="mb-3 font-bold">Google Sheets Backend</h3><div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"><Input label="Apps Script Web App URL" value={url} onChange={setUrl}/><div className="flex items-end"><Button onClick={()=>{DPApi.setScriptUrl(url); alert('Saved');}}>Save URL</Button></div><div className="flex items-end"><Button variant="soft" onClick={syncToSheet}>Sync to Sheets</Button></div><div className="flex items-end"><Button variant="soft" onClick={pullFromSheet}>Pull from Sheets</Button></div></div></Card><Card><h3 className="mb-3 font-bold">Backup / Restore</h3><div className="flex flex-wrap gap-2"><Button variant="soft" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download=`dukandarpro-backup-${today()}.json`;a.click();}}>Download Backup</Button><Button variant="danger" onClick={()=>confirm('Reset this shop data?')&&update(seedData())}>Reset Demo Data</Button></div><textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Paste JSON backup here, then Restore" className="mt-3 h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"/><Button variant="soft" onClick={()=>{try{update(JSON.parse(raw));}catch{alert('Invalid JSON')}}}>Restore JSON</Button></Card><Card><h3 className="mb-3 font-bold">Activity Logs</h3><Table rows={state.activityLogs.slice(0,20)} columns={[{key:'date',label:'Date',render:r=>String(r.date).slice(0,16).replace('T',' ')},{key:'type',label:'Type'},{key:'message',label:'Message'}]}/></Card></div>; }

export default App;