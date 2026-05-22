// Google Sheets API Client for DukanDarPro
// Simplified version with better error handling
// Version 5 - Updated Deployment

// Auto-detect environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const API_URL = isDevelopment 
  ? "/google-api/macros/s/AKfycbwHJkjwEyaGA854DDO-FUPksCMvOshd11EOOIA9N31JUzhKyjLLkYUalQdJMWUq5g0/exec"
  : "https://script.google.com/macros/s/AKfycbwHJkjwEyaGA854DDO-FUPksCMvOshd11EOOIA9N31JUzhKyjLLkYUalQdJMWUq5g0/exec";

const OFFLINE_QUEUE_KEY = "dp_offline_queue_v4";

// ==============================
// UTILITY FUNCTIONS
// ==============================

export const isOnline = () => navigator.onLine;

const saveToQueue = (queue) => {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save queue:", error);
  }
};

const loadQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)) || [];
  } catch {
    return [];
  }
};

export const queueOfflineOperation = async (operation, data) => {
  const queue = loadQueue();
  queue.push({
    id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    operation,
    data,
    timestamp: new Date().toISOString(),
    retries: 0
  });
  saveToQueue(queue);
  return { queued: true, pending: queue.length };
};

export const getPendingSyncCount = async () => {
  return loadQueue().length;
};

// Test API connection
export const testConnection = async () => {
  console.log('Testing connection to:', API_URL);
  
  try {
    // Test with a simple GET request
    const testUrl = `${API_URL}?action=getProducts`;
    console.log('Test URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText.substring(0, 200));
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Test result:', result);
    
    if (result.success) {
      const count = result.data ? result.data.length : 0;
      return { 
        success: true, 
        message: `✅ Connected successfully! Found ${count} records in Products sheet.` 
      };
    } else {
      return { 
        success: false, 
        error: result.error || 'API returned error' 
      };
    }
  } catch (error) {
    console.error('Connection test failed:', error);
    
    // Try alternative URL format
    try {
      console.log('Trying alternative URL format...');
      const altResponse = await fetch(API_URL + '?action=getProducts');
      const altResult = await altResponse.json();
      console.log('Alternative test result:', altResult);
      
      if (altResult.success) {
        return { 
          success: true, 
          message: `✅ Connected (alternative method)! Found ${altResult.data?.length || 0} records.` 
        };
      }
    } catch (altError) {
      console.error('Alternative test also failed:', altError);
    }
    
    return { 
      success: false, 
      error: `Connection failed: ${error.message}. Make sure the Apps Script is deployed as "Anyone can access".` 
    };
  }
};

// Simple API request - all methods use POST for data, GET for fetching
const apiRequest = async (endpoint, method = 'GET', data = null) => {
  // Check online status for write operations
  if (!isOnline() && method !== 'GET') {
    console.log('Offline detected, operation will be queued');
    throw new Error("Offline");
  }
  
  try {
    // For GET requests, add action as query parameter
    // For POST requests, also add action as query parameter
    let url = `${API_URL}?action=${endpoint}`;
    
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    // Add body for write operations
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    console.log(`API ${method} request to: ${endpoint}`);
    
    // Make the request
    const response = await fetch(url, options);
    
    console.log(`${endpoint} response status:`, response.status);
    
    // Check if response is ok
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${endpoint} error:`, errorText.substring(0, 200));
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Parse response
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API returned error');
    }
    
    console.log(`✅ ${endpoint} successful`);
    return result;
    
  } catch (error) {
    console.error(`❌ API request failed for ${endpoint}:`, error.message);
    
    // If it's a network error and we're doing a write operation, queue it
    if ((error.name === 'TypeError' || error.message === 'Failed to fetch') && method !== 'GET') {
      console.log('Network error - will queue operation');
      throw new Error("Offline");
    }
    
    throw error;
  }
};

// ==============================
// PRODUCTS API
// ==============================

export const getProducts = async () => {
  try {
    const result = await apiRequest('getProducts', 'GET');
    return result.data || [];
  } catch (error) {
    console.error("getProducts failed:", error);
    return [];
  }
};

export const addProduct = async (product) => {
  try {
    return await apiRequest('addProduct', 'POST', product);
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('addProduct', { product });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (id, product) => {
  try {
    return await apiRequest('updateProduct', 'POST', { id, ...product });
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('updateProduct', { id, product });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

export const patchProductStock = async (id, delta, reason, by) => {
  try {
    return await apiRequest('patchProductStock', 'POST', { id, delta, reason, by });
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('adjustStock', { productId: id, delta, reason, by });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

// ==============================
// ORDERS API
// ==============================

export const getOrders = async () => {
  try {
    const result = await apiRequest('getOrders', 'GET');
    return result.data || [];
  } catch (error) {
    console.error("getOrders failed:", error);
    return [];
  }
};

export const addOrder = async (order, stockUpdates) => {
  try {
    return await apiRequest('addOrder', 'POST', { order, stockUpdates });
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('addOrder', { order, stockUpdates });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

export const updateOrderStatus = async (orderId, status, metadata) => {
  try {
    return await apiRequest('updateOrderStatus', 'POST', { orderId, status, ...metadata });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const processOrderReturn = async (orderId, returnedItems, reason, refundAmount) => {
  try {
    return await apiRequest('processReturn', 'POST', { 
      orderId, 
      items: returnedItems, 
      reason, 
      refundAmount 
    });
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('processReturn', { 
        orderId, returnedItems, reason, refundAmount 
      });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

// ==============================
// CUSTOMERS API
// ==============================

export const getCustomers = async () => {
  try {
    const result = await apiRequest('getCustomers', 'GET');
    return result.data || [];
  } catch (error) {
    console.error("getCustomers failed:", error);
    return [];
  }
};

export const addCustomer = async (customer) => {
  try {
    console.log('Attempting to add customer:', customer.name);
    const result = await apiRequest('addCustomer', 'POST', customer);
    console.log('Customer added successfully:', result);
    return result;
  } catch (error) {
    console.error('addCustomer error:', error.message);
    
    if (error.message === "Offline") {
      console.log('Queuing customer for offline sync');
      await queueOfflineOperation('addCustomer', { customer });
      return { success: true, queued: true, message: "Saved offline - will sync when online" };
    }
    
    return { success: false, error: error.message };
  }
};

export const updateCustomer = async (id, customer) => {
  try {
    return await apiRequest('updateCustomer', 'POST', { id, ...customer });
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('updateCustomer', { id, customer });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

export const addCustomerCreditPayment = async (customerId, amount, dueDate, orderId) => {
  try {
    return await apiRequest('addCustomerCreditPayment', 'POST', { 
      customerId, amount, dueDate, orderId 
    });
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('addCustomerCreditPayment', { 
        customerId, amount, dueDate, orderId 
      });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

// ==============================
// EXPENSES API
// ==============================

export const getExpenses = async () => {
  try {
    const result = await apiRequest('getExpenses', 'GET');
    return result.data || [];
  } catch (error) {
    console.error("getExpenses failed:", error);
    return [];
  }
};

export const addExpense = async (expense) => {
  try {
    return await apiRequest('addExpense', 'POST', expense);
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('addExpense', { expense });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

// ==============================
// STAFF API
// ==============================

export const getStaff = async () => {
  try {
    const result = await apiRequest('getStaff', 'GET');
    return result.data || [];
  } catch (error) {
    console.error("getStaff failed:", error);
    return [];
  }
};

export const addStaff = async (staffMember) => {
  try {
    return await apiRequest('addStaff', 'POST', staffMember);
  } catch (error) {
    if (error.message === "Offline") {
      await queueOfflineOperation('addStaff', { staff: staffMember });
      return { success: true, queued: true };
    }
    return { success: false, error: error.message };
  }
};

// ==============================
// OFFLINE QUEUE PROCESSING
// ==============================

export const processOfflineQueue = async () => {
  const queue = loadQueue();
  if (queue.length === 0) return { success: true, processed: 0, failed: 0 };
  
  if (!isOnline()) {
    return { success: false, processed: 0, failed: 0, error: "Offline" };
  }
  
  console.log(`Processing ${queue.length} offline operations...`);
  
  let processed = 0;
  let failed = 0;
  const newQueue = [];
  
  for (const item of queue) {
    try {
      let result;
      switch (item.operation) {
        case 'addProduct':
          result = await addProduct(item.data.product);
          break;
        case 'updateProduct':
          result = await updateProduct(item.data.id, item.data.product);
          break;
        case 'adjustStock':
          result = await patchProductStock(item.data.productId, item.data.delta, item.data.reason, item.data.by);
          break;
        case 'addOrder':
          result = await addOrder(item.data.order, item.data.stockUpdates);
          break;
        case 'addCustomer':
          result = await addCustomer(item.data.customer);
          break;
        case 'updateCustomer':
          result = await updateCustomer(item.data.id, item.data.customer);
          break;
        case 'addCustomerCreditPayment':
          result = await addCustomerCreditPayment(item.data.customerId, item.data.amount, item.data.dueDate, item.data.orderId);
          break;
        case 'addExpense':
          result = await addExpense(item.data.expense);
          break;
        case 'addStaff':
          result = await addStaff(item.data.staff);
          break;
        case 'processReturn':
          result = await processOrderReturn(item.data.orderId, item.data.returnedItems, item.data.reason, item.data.refundAmount);
          break;
        default:
          console.warn("Unknown operation:", item.operation);
          newQueue.push(item);
          continue;
      }
      
      if (result && !result.error) {
        processed++;
        console.log(`✅ Processed: ${item.operation}`);
      } else {
        item.retries = (item.retries || 0) + 1;
        if (item.retries < 3) {
          newQueue.push(item);
        } else {
          failed++;
          console.error(`❌ Failed after 3 retries: ${item.operation}`);
        }
      }
    } catch (error) {
      console.error(`Failed to process ${item.operation}:`, error);
      item.retries = (item.retries || 0) + 1;
      if (item.retries < 3) {
        newQueue.push(item);
      } else {
        failed++;
      }
    }
  }
  
  saveToQueue(newQueue);
  console.log(`Queue processing complete: ${processed} succeeded, ${failed} failed, ${newQueue.length} remaining`);
  
  return { 
    success: failed === 0, 
    processed, 
    failed, 
    remaining: newQueue.length 
  };
};

// ==============================
// SYNC ALL DATA
// ==============================

export const syncAllData = async (setProducts, setCustomers, setOrders, setExpenses, setStaff) => {
  if (!isOnline()) {
    console.log("Offline - using local data only");
    return { success: false, error: "Offline" };
  }
  
  try {
    console.log("Starting full data sync...");
    
    // First process any pending offline operations
    const queueResult = await processOfflineQueue();
    console.log('Offline queue processed:', queueResult);
    
    // Then fetch fresh data from sheets
    const [products, customers, orders, expenses, staff] = await Promise.all([
      getProducts(),
      getCustomers(),
      getOrders(),
      getExpenses(),
      getStaff()
    ]);
    
    console.log(`Sync complete:
      - Products: ${products.length}
      - Customers: ${customers.length}
      - Orders: ${orders.length}
      - Expenses: ${expenses.length}
      - Staff: ${staff.length}
    `);
    
    // Update local state with cloud data
    if (setProducts) setProducts(products);
    if (setCustomers) setCustomers(customers);
    if (setOrders) setOrders(orders);
    if (setExpenses) setExpenses(expenses);
    if (setStaff) setStaff(staff);
    
    return { 
      success: true, 
      data: { products, customers, orders, expenses, staff } 
    };
  } catch (error) {
    console.error("Sync failed:", error);
    return { success: false, error: error.message };
  }
};

// ==============================
// STATUS
// ==============================

export const syncStatus = async () => {
  const queue = loadQueue();
  return {
    isOnline: isOnline(),
    pendingOperations: queue.length,
    queueItems: queue
  };
};

// ==============================
// EXPORT ALL FUNCTIONS
// ==============================

export default {
  isOnline,
  testConnection,
  queueOfflineOperation,
  getPendingSyncCount,
  processOfflineQueue,
  getProducts,
  addProduct,
  updateProduct,
  patchProductStock,
  getOrders,
  addOrder,
  updateOrderStatus,
  processOrderReturn,
  getCustomers,
  addCustomer,
  updateCustomer,
  addCustomerCreditPayment,
  getExpenses,
  addExpense,
  getStaff,
  addStaff,
  syncAllData,
  syncStatus
};