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
            localStorage.setItem('logiroute_role', 'customer');
        } else {
            localStorage.removeItem('logiroute_customer');
        }
    },

    getStoredWarehouseUser() {
        try {
            const raw = localStorage.getItem('logiroute_warehouse_user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    setStoredWarehouseUser(user) {
        if (user) {
            localStorage.setItem('logiroute_warehouse_user', JSON.stringify(user));
            localStorage.setItem('logiroute_role', 'warehouse');
        } else {
            localStorage.removeItem('logiroute_warehouse_user');
        }
    },

    getUserRole() {
        return localStorage.getItem('logiroute_role') || (this.getStoredWarehouseUser() ? 'warehouse' : (this.getStoredCustomer() ? 'customer' : null));
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

    // Customer Authentication Endpoints
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
            this.setStoredWarehouseUser(null);
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
            this.setStoredWarehouseUser(null);
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
            this.setStoredWarehouseUser(null);
        }
        return res;
    },

    // Warehouse Manager Authentication Endpoints
    async getDemoWarehouseUsers() {
        return this.request('/auth/warehouse/demo-users');
    },

    async warehouseLogin(username, password) {
        const res = await this.request('/auth/warehouse/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (res.token) {
            this.setToken(res.token);
            this.setStoredWarehouseUser(res.warehouse_user);
            this.setStoredCustomer(null);
        }
        return res;
    },

    async warehouseDemoLogin(warehouseId) {
        const res = await this.request(`/auth/warehouse/demo-login/${warehouseId}`, {
            method: 'POST'
        });
        if (res.token) {
            this.setToken(res.token);
            this.setStoredWarehouseUser(res.warehouse_user);
            this.setStoredCustomer(null);
        }
        return res;
    },

    async getCurrentUser() {
        return this.request('/auth/me');
    },

    logout() {
        this.setToken(null);
        this.setStoredCustomer(null);
        this.setStoredWarehouseUser(null);
        localStorage.removeItem('logiroute_role');
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
    // Driver–Warehouse Coverage Map (Teammate 2 - Feature 1)
    // =========================================================================
    async getCoverageMap(zone = 'all') {
        const qs = zone && zone !== 'all' ? `?zone=${encodeURIComponent(zone)}` : '';
        return this.request(`/drivers/coverage-map${qs}`);
    },

    async getCoverageKPIs() {
        return this.request('/drivers/coverage-kpis');
    },

    async updateDriverZone(driverId, locationZone) {
        return this.request(`/drivers/${driverId}/zone`, {
            method: 'PUT',
            body: JSON.stringify({ location_zone: locationZone })
        });
    },

    // =========================================================================
    // Order Dispatch & Priority Queue (Teammate 2 - Feature 3)
    // =========================================================================
    async getDispatchSummary() {
        return this.request('/dispatch/summary');
    },

    async getDispatchBatches() {
        return this.request('/dispatch/batches');
    },

    async getDispatchOrders(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.zone && filters.zone !== 'all') params.append('zone', filters.zone);
        if (filters.shipping_type && filters.shipping_type !== 'all') params.append('shipping_type', filters.shipping_type);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/dispatch/orders${qs}`);
    },

    async assignDispatch(driverId, orderIds) {
        return this.request('/dispatch/assign', {
            method: 'POST',
            body: JSON.stringify({ driver_id: driverId, order_ids: orderIds })
        });
    },

    async assignZoneDispatch(driverId, locationZone) {
        return this.request('/dispatch/assign-zone', {
            method: 'POST',
            body: JSON.stringify({ driver_id: driverId, location_zone: locationZone })
        });
    },

    async getDriverQueue(driverId) {
        return this.request(`/dispatch/driver-queue/${driverId}`);
    },

    async markOrderDelivered(orderId) {
        return this.request(`/dispatch/orders/${orderId}/deliver`, {
            method: 'POST'
        });
    },

    // =========================================================================
    // Notification Queue & SMS/Email Alerts (Teammate 2 - Feature 3)
    // =========================================================================
    async getNotifications(filters = {}) {
        const params = new URLSearchParams();
        if (filters.channel && filters.channel !== 'all') params.append('channel', filters.channel);
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.order_id) params.append('order_id', filters.order_id);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/notifications${qs}`);
    },

    async getNotificationStats() {
        return this.request('/notifications/stats');
    },

    async simulateNotification(payload) {
        return this.request('/notifications/simulate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    // =========================================================================
    // Item–Warehouse Stock Matrix Endpoints (Teammate 3 - Feature 1)
    // =========================================================================
    async getStockMatrix(warehouseId = 'all', severity = 'all', search = '') {
        const params = new URLSearchParams();
        if (warehouseId && warehouseId !== 'all') params.append('warehouse_id', warehouseId);
        if (severity && severity !== 'all') params.append('severity', severity);
        if (search && search.trim()) params.append('search', search.trim());
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/inventory/stock-matrix${qs}`);
    },

    async getStockMatrixPivot() {
        return this.request('/inventory/stock-matrix/pivot');
    },

    async getStockMatrixKPIs() {
        return this.request('/inventory/matrix/kpis');
    },

    async transferStock(payload) {
        return this.request('/inventory/transfer', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
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
    },

    // =========================================================================
    // Goods Monitoring & Quarantine Control Endpoints (Teammate 3 - Feature 3)
    // =========================================================================
    async getGoodsMonitoring(filters = {}) {
        const params = new URLSearchParams();
        if (filters.type && filters.type !== 'all') params.append('type', filters.type);
        if (filters.warehouse_id && filters.warehouse_id !== 'all') params.append('warehouse_id', filters.warehouse_id);
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/inventory/goods-monitoring${qs}`);
    },

    async getGoodsMonitoringKPIs() {
        return this.request('/inventory/goods-monitoring/kpis');
    },

    async logDamagedGoods(payload) {
        return this.request('/inventory/goods-monitoring/damage', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async logExpiredGoods(payload) {
        return this.request('/inventory/goods-monitoring/expiry', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async updateQuarantineStatus(type, id, status, notes = '') {
        return this.request(`/inventory/goods-monitoring/${encodeURIComponent(type)}/${encodeURIComponent(id)}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes })
        });
    },

    // =========================================================================
    // Return Tracking Endpoints (Teammate 1 - Feature 2)
    // =========================================================================
    async getReturns(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
        if (filters.customer_id) params.append('customer_id', filters.customer_id);
        if (filters.order_id) params.append('order_id', filters.order_id);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/returns${qs}`);
    },

    async getReturnKPIs() {
        return this.request('/returns/kpis');
    },

    async getReturn(returnId) {
        return this.request(`/returns/${returnId}`);
    },

    async createReturnRequest(payload) {
        return this.request('/returns', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async updateReturnStatus(returnId, status, refundAmount) {
        const payload = { status };
        if (refundAmount !== undefined) payload.refund_amount = refundAmount;
        return this.request(`/returns/${returnId}/status`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    },

    // =========================================================================
    // Missing Sales Report Endpoints (Teammate 1 - Feature 1)
    // =========================================================================
    async getMissingSalesReport(itemId = null, search = '') {
        const params = new URLSearchParams();
        if (itemId) params.append('item_id', itemId);
        if (search && search.trim()) params.append('search', search.trim());
        const qs = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/reports/missing-sales${qs}`);
    },

    async getMissingSalesMatrix() {
        return this.request('/reports/missing-sales/matrix');
    },

    async getMissingSalesKPIs() {
        return this.request('/reports/missing-sales/kpis');
    },

    async launchMissingSalesCampaign(payload) {
        return this.request('/reports/missing-sales/campaign', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
};

window.api = api;
