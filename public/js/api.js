/**
 * LogiRoute API Client Service
 * Connects frontend modules with Node.js Express backend and MySQL database
 */

const API_BASE = '/api';

const api = {
    getToken() {
        return localStorage.getItem('logiroute_token');
    },

    setToken(token) {
        if (token) {
            localStorage.setItem('logiroute_token', token);
        } else {
            localStorage.removeItem('logiroute_token');
        }
    },

    getStoredCustomer() {
        try {
            const raw = localStorage.getItem('logiroute_customer');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    setStoredCustomer(customer) {
        if (customer) {
            localStorage.setItem('logiroute_customer', JSON.stringify(customer));
        } else {
            localStorage.removeItem('logiroute_customer');
        }
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Server request failed');
        }
        return data;
    },

    // Authentication Endpoints
    async getDemoCustomers() {
        return this.request('/auth/demo-customers');
    },

    async login(identifier) {
        const res = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier })
        });
        if (res.token) {
            this.setToken(res.token);
            this.setStoredCustomer(res.customer);
        }
        return res;
    },

    async signup(payload) {
        const res = await this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        if (res.token) {
            this.setToken(res.token);
            this.setStoredCustomer(res.customer);
        }
        return res;
    },

    async demoLogin(customerId) {
        const res = await this.request(`/auth/demo-login/${customerId}`, {
            method: 'POST'
        });
        if (res.token) {
            this.setToken(res.token);
            this.setStoredCustomer(res.customer);
        }
        return res;
    },

    async getCurrentUser() {
        return this.request('/auth/me');
    },

    logout() {
        this.setToken(null);
        this.setStoredCustomer(null);
    },

    // Customer Dashboard Feature Endpoints
    async getDashboard() {
        return this.request('/customer/dashboard');
    },

    async submitReview(orderId, payload) {
        return this.request(`/customer/orders/${orderId}/review`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async submitReturn(orderId, payload) {
        return this.request(`/customer/orders/${orderId}/return`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async placeOrder(payload) {
        return this.request('/customer/orders', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async getItems() {
        return this.request('/items');
    },

    // =========================================================================
    // Driver Earnings & Payroll Endpoints (Teammate 2 - Feature 2)
    // =========================================================================
    async getDrivers() {
        return this.request('/drivers');
    },

    async getDriver(driverId) {
        return this.request(`/drivers/${driverId}`);
    },

    async getDriverTrips(driverId) {
        return this.request(`/drivers/${driverId}/trips`);
    },

    async getDriverPaychecks(driverId) {
        return this.request(`/drivers/${driverId}/paychecks`);
    },

    async getWeeklyCalculation(driverId, weekStart, weekEnd) {
        let query = '';
        if (weekStart && weekEnd) {
            query = `?week_start=${encodeURIComponent(weekStart)}&week_end=${encodeURIComponent(weekEnd)}`;
        }
        return this.request(`/drivers/${driverId}/weekly-calculation${query}`);
    },

    async generatePaycheck(driverId, payload) {
        return this.request(`/drivers/${driverId}/generate-paycheck`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async logTrip(driverId, payload) {
        return this.request(`/drivers/${driverId}/trips`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async getDriverKPIs() {
        return this.request('/drivers/kpis');
    },

    // =========================================================================
    // Low Stock Alert & Inventory Endpoints (Teammate 3 - Feature 2)
    // =========================================================================
    async getLowStockAlerts(warehouseId = 'all', severity = 'all') {
        const params = new URLSearchParams();
        if (warehouseId && warehouseId !== 'all') params.append('warehouse_id', warehouseId);
        if (severity && severity !== 'all') params.append('severity', severity);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/inventory/low-stock${qs}`);
    },

    async getStockMatrix() {
        return this.request('/inventory/stock-matrix');
    },

    async getWarehouses() {
        return this.request('/inventory/warehouses');
    },

    async getInventoryKPIs() {
        return this.request('/inventory/kpis');
    },

    async restockItem(payload) {
        return this.request('/inventory/restock', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async updateSafetyThreshold(itemId, safetyThreshold) {
        return this.request(`/inventory/items/${itemId}/threshold`, {
            method: 'PUT',
            body: JSON.stringify({ safety_threshold: safetyThreshold })
        });
    }
};

window.api = api;
