// // Google Sheets API Client for DukanDarPro
// // v7 - Fixed syncAllData to always return arrays

// const isDevelopment =
//   window.location.hostname === "localhost" ||
//   window.location.hostname === "127.0.0.1";

// const SCRIPT_URL = isDevelopment
//   ? "/google-api/macros/s/AKfycbxtwc4aFj4DREGEVrsFMJR026iSC3U1CtyB5_HF8KKiwrPSCaaknou3Vx1AI25PWjA/exec"
//   : "https://script.google.com/macros/s/AKfycbxtwc4aFj4DREGEVrsFMJR026iSC3U1CtyB5_HF8KKiwrPSCaaknou3Vx1AI25PWjA/exec";
// const OFFLINE_QUEUE_KEY = "dp_offline_queue_v4";

// export const isOnline = () => navigator.onLine;

// const saveToQueue = (queue) => {
//   try {
//     localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
//   } catch {}
// };

// const loadQueue = () => {
//   try {
//     return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
//   } catch {
//     return [];
//   }
// };

// export const queueOfflineOperation = async (operation, data) => {
//   const queue = loadQueue();
//   queue.push({
//     id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
//     operation,
//     data,
//     timestamp: new Date().toISOString(),
//     retries: 0,
//   });
//   saveToQueue(queue);
//   return { queued: true, pending: queue.length };
// };

// export const getPendingSyncCount = async () => loadQueue().length;

// const apiCall = async (action, data = null) => {
//   const isWrite = data !== null;
//   if (!isOnline() && isWrite) throw new Error("Offline");
//   try {
//     let response;
//     if (isWrite) {
//       const body = JSON.stringify({ action, ...data });
//       response = await fetch(SCRIPT_URL, { method: "POST", body });
//     } else {
//       const url = `${SCRIPT_URL}?action=${encodeURIComponent(action)}`;
//       response = await fetch(url, { method: "GET" });
//     }
//     if (!response.ok) {
//       const txt = await response.text();
//       throw new Error(`HTTP ${response.status}: ${txt.slice(0, 200)}`);
//     }
//     const text = await response.text();
//     if (text.trim().startsWith("<")) {
//       throw new Error("Apps Script returned HTML — check deployment URL and permissions");
//     }
//     const result = JSON.parse(text);
//     if (!result.success) throw new Error(result.error || "API returned error");
//     return result;
//   } catch (error) {
//     if (error.message === "Offline") throw error;
//     if (error.name === "TypeError" || error.message === "Failed to fetch") {
//       throw new Error("Offline");
//     }
//     throw error;
//   }
// };

// export const testConnection = async () => {
//   try {
//     const result = await apiCall("getProducts");
//     return { success: true, message: `✅ Connected! Found ${result.data?.length ?? 0} products in Google Sheets.` };
//   } catch (error) {
//     return { success: false, error: `❌ ${error.message}. Make sure Apps Script is deployed as "Anyone" access.` };
//   }
// };

// export const getProducts = async () => {
//   try {
//     const r = await apiCall("getProducts");
//     return Array.isArray(r.data) ? r.data : [];
//   } catch {
//     return [];
//   }
// };

// export const addProduct = async (product) => {
//   try {
//     return await apiCall("addProduct", { product });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("addProduct", { product });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const updateProduct = async (id, product) => {
//   try {
//     return await apiCall("updateProduct", { id, product });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("updateProduct", { id, product });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const deleteProduct = async (id) => {
//   try {
//     return await apiCall("deleteProduct", { id });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("deleteProduct", { id });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const patchProductStock = async (id, delta, reason, by) => {
//   try {
//     return await apiCall("patchProductStock", { id, delta, reason, by });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("adjustStock", { productId: id, delta, reason, by });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const getOrders = async () => {
//   try {
//     const r = await apiCall("getOrders");
//     return Array.isArray(r.data) ? r.data : [];
//   } catch {
//     return [];
//   }
// };

// export const addOrder = async (order, stockUpdates) => {
//   try {
//     return await apiCall("addOrder", { order, stockUpdates });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("addOrder", { order, stockUpdates });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const updateOrderStatus = async (orderId, status, metadata) => {
//   try {
//     return await apiCall("updateOrderStatus", { orderId, status, ...metadata });
//   } catch (e) {
//     return { success: false, error: e.message };
//   }
// };

// export const processOrderReturn = async (orderId, returnedItems, reason, refundAmount) => {
//   try {
//     return await apiCall("processReturn", { orderId, items: returnedItems, reason, refundAmount });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("processReturn", { orderId, returnedItems, reason, refundAmount });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const getCustomers = async () => {
//   try {
//     const r = await apiCall("getCustomers");
//     return Array.isArray(r.data) ? r.data : [];
//   } catch {
//     return [];
//   }
// };

// export const addCustomer = async (customer) => {
//   try {
//     return await apiCall("addCustomer", { customer });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("addCustomer", { customer });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const updateCustomer = async (id, customer) => {
//   try {
//     return await apiCall("updateCustomer", { id, customer });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("updateCustomer", { id, customer });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const deleteCustomer = async (id) => {
//   try {
//     return await apiCall("deleteCustomer", { id });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("deleteCustomer", { id });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const addCustomerCreditPayment = async (customerId, amount, dueDate, orderId) => {
//   try {
//     return await apiCall("addCustomerCreditPayment", { customerId, amount, dueDate, orderId });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("addCustomerCreditPayment", { customerId, amount, dueDate, orderId });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const getExpenses = async () => {
//   try {
//     const r = await apiCall("getExpenses");
//     return Array.isArray(r.data) ? r.data : [];
//   } catch {
//     return [];
//   }
// };

// export const addExpense = async (expense) => {
//   try {
//     return await apiCall("addExpense", { expense });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("addExpense", { expense });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const getStaff = async () => {
//   try {
//     const r = await apiCall("getStaff");
//     return Array.isArray(r.data) ? r.data : [];
//   } catch {
//     return [];
//   }
// };

// export const addStaff = async (staffMember) => {
//   try {
//     return await apiCall("addStaff", { staff: staffMember });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("addStaff", { staff: staffMember });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const updateStaff = async (id, staffMember) => {
//   try {
//     return await apiCall("updateStaff", { id, staff: staffMember });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("updateStaff", { id, staff: staffMember });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const deleteStaff = async (id) => {
//   try {
//     return await apiCall("deleteStaff", { id });
//   } catch (e) {
//     if (e.message === "Offline") {
//       await queueOfflineOperation("deleteStaff", { id });
//       return { success: true, queued: true };
//     }
//     return { success: false, error: e.message };
//   }
// };

// export const processOfflineQueue = async () => {
//   const queue = loadQueue();
//   if (queue.length === 0) return { success: true, processed: 0, failed: 0 };
//   if (!isOnline()) return { success: false, processed: 0, failed: 0, error: "Offline" };
//   let processed = 0;
//   let failed = 0;
//   const newQueue = [];
//   for (const item of queue) {
//     try {
//       let result;
//       switch (item.operation) {
//         case "addProduct": result = await addProduct(item.data.product); break;
//         case "updateProduct": result = await updateProduct(item.data.id, item.data.product); break;
//         case "deleteProduct": result = await deleteProduct(item.data.id); break;
//         case "adjustStock": result = await patchProductStock(item.data.productId, item.data.delta, item.data.reason, item.data.by); break;
//         case "addOrder": result = await addOrder(item.data.order, item.data.stockUpdates); break;
//         case "addCustomer": result = await addCustomer(item.data.customer); break;
//         case "updateCustomer": result = await updateCustomer(item.data.id, item.data.customer); break;
//         case "deleteCustomer": result = await deleteCustomer(item.data.id); break;
//         case "addCustomerCreditPayment": result = await addCustomerCreditPayment(item.data.customerId, item.data.amount, item.data.dueDate, item.data.orderId); break;
//         case "addExpense": result = await addExpense(item.data.expense); break;
//         case "addStaff": result = await addStaff(item.data.staff); break;
//         case "updateStaff": result = await updateStaff(item.data.id, item.data.staff); break;
//         case "deleteStaff": result = await deleteStaff(item.data.id); break;
//         case "processReturn": result = await processOrderReturn(item.data.orderId, item.data.returnedItems, item.data.reason, item.data.refundAmount); break;
//         default: console.warn("Unknown operation:", item.operation); newQueue.push(item); continue;
//       }
//       if (result && !result.error) {
//         processed++;
//       } else {
//         item.retries = (item.retries || 0) + 1;
//         if (item.retries < 3) newQueue.push(item);
//         else failed++;
//       }
//     } catch (error) {
//       item.retries = (item.retries || 0) + 1;
//       if (item.retries < 3) newQueue.push(item);
//       else failed++;
//     }
//   }
//   saveToQueue(newQueue);
//   return { success: failed === 0, processed, failed, remaining: newQueue.length };
// };

// export const syncAllData = async (setProducts, setCustomers, setOrders, setExpenses, setStaff) => {
//   if (!isOnline()) return { success: false, error: "Offline" };
//   try {
//     await processOfflineQueue();
//     const [products, customers, orders, expenses, staff] = await Promise.all([
//       getProducts(), getCustomers(), getOrders(), getExpenses(), getStaff()
//     ]);
//     if (setProducts) setProducts(Array.isArray(products) ? products : []);
//     if (setCustomers) setCustomers(Array.isArray(customers) ? customers : []);
//     if (setOrders) setOrders(Array.isArray(orders) ? orders : []);
//     if (setExpenses) setExpenses(Array.isArray(expenses) ? expenses : []);
//     if (setStaff) setStaff(Array.isArray(staff) ? staff : []);
//     return { success: true, data: { products, customers, orders, expenses, staff } };
//   } catch (error) {
//     return { success: false, error: error.message };
//   }
// };

// export default {
//   isOnline,
//   testConnection,
//   queueOfflineOperation,
//   getPendingSyncCount,
//   processOfflineQueue,
//   getProducts,
//   addProduct,
//   updateProduct,
//   deleteProduct,
//   patchProductStock,
//   getOrders,
//   addOrder,
//   updateOrderStatus,
//   processOrderReturn,
//   getCustomers,
//   addCustomer,
//   updateCustomer,
//   deleteCustomer,
//   addCustomerCreditPayment,
//   getExpenses,
//   addExpense,
//   getStaff,
//   addStaff,
//   updateStaff,
//   deleteStaff,
//   syncAllData,
// };
/*
  DukanDarPro Google Sheets API Client
  File 2 of 3. Works with Code.gs in this package.
  Usage in index.html: window.DPApi.syncAll(state), window.DPApi.fetchAll()
*/
(function () {
  const URL_KEY = 'dukandarpro_apps_script_url';

// Default URL fallback
const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzF_Khjwl9OJN09XQDqmkXcTo_gWUlQoh8PLp7qk84c15pcUMR3lNL8BjTIg4HH_HI/exec';

const isOnline = () => navigator.onLine;

const getScriptUrl = () =>
  localStorage.getItem(URL_KEY) || DEFAULT_SCRIPT_URL;

const setScriptUrl = (url) =>
  localStorage.setItem(URL_KEY, String(url || '').trim());

  const loadQueue = () => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; }
  };
  const saveQueue = (queue) => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  const queueOperation = (action, payload) => {
    const queue = loadQueue();
    queue.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, action, payload, date: new Date().toISOString(), retries: 0 });
    saveQueue(queue);
    return { success: true, queued: true, pending: queue.length };
  };

  async function request(action, payload, method) {
    const scriptUrl = getScriptUrl();
    if (!scriptUrl) throw new Error('Apps Script URL is missing. Add it in Settings.');
    const isWrite = payload !== undefined && payload !== null;
    if (!isOnline() && isWrite) return queueOperation(action, payload);

    const options = isWrite
      ? { method: method || 'POST', body: JSON.stringify({ action, payload }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } }
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
      } catch (e) {
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 3) next.push(item); else failed += 1;
      }
    }
    saveQueue(next);
    return { success: failed === 0, processed, failed, remaining: next.length };
  }

  async function setupSheets() { return request('setup', {}); }
  async function fetchAll() { return request('syncAll'); }
  async function syncAll(state) {
    await processQueue();
    return request('syncAll', state);
  }
  async function list(sheet) { return request('list', { sheet }); }
  async function create(sheet, record) { return request('create', { sheet, record }); }
  async function update(sheet, id, patch) { return request('update', { sheet, id, patch }); }
  async function remove(sheet, id) { return request('remove', { sheet, id }); }
  async function batchUpsert(sheet, records) { return request('batchUpsert', { sheet, records }); }
  async function addOrder(order, orderItems, payment) { return request('addOrder', { order, orderItems, payment }); }
  async function addPurchase(purchase, purchaseItems, payment) { return request('addPurchase', { purchase, purchaseItems, payment }); }
  async function getFinancials() { return request('getFinancials'); }
  async function generateInvoicePdf(orderId) { return request('generateInvoicePdf', { orderId }); }
  async function testConnection() {
    try {
      const res = await request('ping');
      return res.success ? { success: true, message: 'Connected to Google Sheets backend.' } : res;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  window.DPApi = {
    isOnline,
    getScriptUrl,
    setScriptUrl,
    loadQueue,
    queueOperation,
    processQueue,
    request,
    setupSheets,
    fetchAll,
    syncAll,
    list,
    create,
    update,
    remove,
    batchUpsert,
    addOrder,
    addPurchase,
    getFinancials,
    generateInvoicePdf,
    testConnection,
  };
})();
