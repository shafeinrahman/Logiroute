/**
 * LogiRoute Main Frontend Application Controller
 * Handles SPA state, module navigation, Customer Portal, Driver Earnings & Payroll, and Low Stock Alerts
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Global State
    // =========================================================================
    let activeModule = 'customer'; // 'customer' | 'drivers' | 'inventory'
    let currentCustomer = null;
    let dashboardData = null;
    let catalogItems = [];
    let activeReviewOrderId = null;
    let activeReturnOrderId = null;
    let selectedRating = 5;

    // Driver Earnings Module State
    let driversList = [];
    let selectedDriverId = 1;
    let selectedDriverCalculation = null;
    let activeLogTripDriverRates = { base_rate: 25.0, per_km_bonus: 0.45 };

    // Inventory & Low Stock Module State
    let inventoryKPIs = null;
    let warehousesList = [];
    let lowStockAlerts = [];
    let stockMatrixList = [];
    let currentInventoryView = 'alerts'; // 'alerts' | 'matrix'
    let activeRestockTarget = { warehouse_id: 1, item_id: 1, current_stock: 0, safety_threshold: 10, item_name: '', warehouse_name: '' };
    let activeThresholdTarget = { item_id: 1, item_name: '', safety_threshold: 10 };

    // =========================================================================
    // DOM Elements - Module Navigation
    // =========================================================================
    const navCustomerBtn = document.getElementById('navCustomerBtn');
    const navDriversBtn = document.getElementById('navDriversBtn');
    const navInventoryBtn = document.getElementById('navInventoryBtn');

    const customerModuleWrapper = document.getElementById('customerModuleWrapper');
    const driverEarningsSection = document.getElementById('driverEarningsSection');
    const lowStockSection = document.getElementById('lowStockSection');

    // Customer Portal DOM Elements
    const authSection = document.getElementById('authSection');
    const dashboardSection = document.getElementById('dashboardSection');
    const userPill = document.getElementById('userPill');
    const userNameSpan = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const authTabs = document.querySelectorAll('.auth-tab-btn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const demoChipsContainer = document.getElementById('demoChipsContainer');

    const customerNameEl = document.getElementById('customerNameEl');
    const customerAddressEl = document.getElementById('customerAddressEl');
    const customerPhoneEl = document.getElementById('customerPhoneEl');
    const metricStoreCredit = document.getElementById('metricStoreCredit');
    const metricTotalOrders = document.getElementById('metricTotalOrders');
    const metricActiveOrders = document.getElementById('metricActiveOrders');
    const metricAvgRating = document.getElementById('metricAvgRating');
    const ordersListContainer = document.getElementById('ordersListContainer');
    const returnsListContainer = document.getElementById('returnsListContainer');

    // Driver Earnings DOM Elements
    const driverKpiTotalDrivers = document.getElementById('driverKpiTotalDrivers');
    const driverKpiTotalTrips = document.getElementById('driverKpiTotalTrips');
    const driverKpiTotalDistance = document.getElementById('driverKpiTotalDistance');
    const driverKpiTotalPayout = document.getElementById('driverKpiTotalPayout');
    const driverPillsContainer = document.getElementById('driverPillsContainer');

    const currentDriverTitleName = document.getElementById('currentDriverTitleName');
    const currentDriverStatusBadge = document.getElementById('currentDriverStatusBadge');
    const currentDriverBaseRate = document.getElementById('currentDriverBaseRate');
    const currentDriverMileageBonus = document.getElementById('currentDriverMileageBonus');
    const currentDriverRating = document.getElementById('currentDriverRating');
    const currentDriverLifetimeTrips = document.getElementById('currentDriverLifetimeTrips');

    const calcWeekStart = document.getElementById('calcWeekStart');
    const calcWeekEnd = document.getElementById('calcWeekEnd');
    const recalculateEarningsBtn = document.getElementById('recalculateEarningsBtn');
    const datePresetBtns = document.querySelectorAll('.date-preset-btn');
    const stepBasePay = document.getElementById('stepBasePay');
    const stepBaseFormula = document.getElementById('stepBaseFormula');
    const stepMileagePay = document.getElementById('stepMileagePay');
    const stepMileageFormula = document.getElementById('stepMileageFormula');
    const stepTotalEarnings = document.getElementById('stepTotalEarnings');
    const stepPaycheckStatus = document.getElementById('stepPaycheckStatus');
    const paycheckIssuedNotice = document.getElementById('paycheckIssuedNotice');
    const generatePaycheckActionBtn = document.getElementById('generatePaycheckActionBtn');

    const driverTripsTableBody = document.getElementById('driverTripsTableBody');
    const driverPaychecksTableBody = document.getElementById('driverPaychecksTableBody');
    const driverTripCountBadge = document.getElementById('driverTripCountBadge');
    const driverPaycheckCountBadge = document.getElementById('driverPaycheckCountBadge');
    const openLogTripModalBtn = document.getElementById('openLogTripModalBtn');

    // Inventory & Low Stock DOM Elements
    const invKpiTotalAlerts = document.getElementById('invKpiTotalAlerts');
    const invKpiCriticalAlerts = document.getElementById('invKpiCriticalAlerts');
    const invKpiTotalDeficit = document.getElementById('invKpiTotalDeficit');
    const invKpiTotalWarehouses = document.getElementById('invKpiTotalWarehouses');

    const viewAlertsTabBtn = document.getElementById('viewAlertsTabBtn');
    const viewMatrixTabBtn = document.getElementById('viewMatrixTabBtn');
    const alertsFeedView = document.getElementById('alertsFeedView');
    const stockMatrixView = document.getElementById('stockMatrixView');

    const filterWarehouse = document.getElementById('filterWarehouse');
    const filterSeverity = document.getElementById('filterSeverity');
    const searchInventoryItem = document.getElementById('searchInventoryItem');
    const lowStockCardsContainer = document.getElementById('lowStockCardsContainer');
    const stockMatrixTableBody = document.getElementById('stockMatrixTableBody');

    // Modals
    const reviewModal = document.getElementById('reviewModal');
    const returnModal = document.getElementById('returnModal');
    const newOrderModal = document.getElementById('newOrderModal');
    const logTripModal = document.getElementById('logTripModal');
    const issuePaycheckModal = document.getElementById('issuePaycheckModal');
    const restockModal = document.getElementById('restockModal');
    const thresholdModal = document.getElementById('thresholdModal');

    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');
    const closeNewOrderModalBtn = document.getElementById('closeNewOrderModalBtn');
    const closeLogTripModalBtn = document.getElementById('closeLogTripModalBtn');
    const closeIssuePaycheckModalBtn = document.getElementById('closeIssuePaycheckModalBtn');
    const closeRestockModalBtn = document.getElementById('closeRestockModalBtn');
    const closeThresholdModalBtn = document.getElementById('closeThresholdModalBtn');

    const submitReviewBtn = document.getElementById('submitReviewBtn');
    const submitReturnBtn = document.getElementById('submitReturnBtn');
    const submitOrderBtn = document.getElementById('submitOrderBtn');
    const openNewOrderBtn = document.getElementById('openNewOrderBtn');
    const orderItemsContainer = document.getElementById('orderItemsContainer');
    const addItemBtn = document.getElementById('addItemBtn');

    const logTripDriverSelect = document.getElementById('logTripDriverSelect');
    const logTripStartTime = document.getElementById('logTripStartTime');
    const logTripEndTime = document.getElementById('logTripEndTime');
    const logTripDistance = document.getElementById('logTripDistance');
    const logTripPayoutPreview = document.getElementById('logTripPayoutPreview');
    const submitLogTripBtn = document.getElementById('submitLogTripBtn');

    const confirmPaycheckDriver = document.getElementById('confirmPaycheckDriver');
    const confirmPaycheckRange = document.getElementById('confirmPaycheckRange');
    const confirmPaycheckTrips = document.getElementById('confirmPaycheckTrips');
    const confirmPaycheckAmount = document.getElementById('confirmPaycheckAmount');
    const confirmPaycheckOverride = document.getElementById('confirmPaycheckOverride');
    const confirmIssuePaycheckBtn = document.getElementById('confirmIssuePaycheckBtn');

    const restockItemName = document.getElementById('restockItemName');
    const restockWarehouseName = document.getElementById('restockWarehouseName');
    const restockCurrentStock = document.getElementById('restockCurrentStock');
    const restockSafetyThresh = document.getElementById('restockSafetyThresh');
    const restockQuantity = document.getElementById('restockQuantity');
    const submitRestockBtn = document.getElementById('submitRestockBtn');

    const thresholdItemName = document.getElementById('thresholdItemName');
    const newSafetyThreshold = document.getElementById('newSafetyThreshold');
    const submitThresholdBtn = document.getElementById('submitThresholdBtn');

    // =========================================================================
    // Toast Notification Helper
    // =========================================================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 4500);
    }

    // =========================================================================
    // Module Navigation Switching
    // =========================================================================
    function switchModule(moduleName) {
        activeModule = moduleName;

        [navCustomerBtn, navDriversBtn, navInventoryBtn].forEach(btn => btn.classList.remove('active'));
        customerModuleWrapper.classList.add('hidden');
        driverEarningsSection.classList.add('hidden');
        lowStockSection.classList.add('hidden');

        if (moduleName === 'customer') {
            navCustomerBtn.classList.add('active');
            customerModuleWrapper.classList.remove('hidden');
            renderAuthUI();
            if (currentCustomer) loadDashboard();
        } else if (moduleName === 'drivers') {
            navDriversBtn.classList.add('active');
            driverEarningsSection.classList.remove('hidden');
            loadDriverEarningsModule();
        } else if (moduleName === 'inventory') {
            navInventoryBtn.classList.add('active');
            lowStockSection.classList.remove('hidden');
            loadInventoryModule();
        }
    }

    navCustomerBtn.addEventListener('click', () => switchModule('customer'));
    navDriversBtn.addEventListener('click', () => switchModule('drivers'));
    navInventoryBtn.addEventListener('click', () => switchModule('inventory'));

    // =========================================================================
    // MODULE 1: CUSTOMER PORTAL & DASHBOARD LOGIC
    // =========================================================================

    // Tab Switching (Login / Sign Up)
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            if (target === 'login') {
                loginForm.classList.remove('hidden');
                signupForm.classList.add('hidden');
            } else {
                loginForm.classList.add('hidden');
                signupForm.classList.remove('hidden');
            }
        });
    });

    // Load Demo Customers for Instant Login
    async function loadDemoCustomers() {
        try {
            const res = await api.getDemoCustomers();
            if (res.success && res.customers) {
                demoChipsContainer.innerHTML = '';
                res.customers.forEach(c => {
                    const chip = document.createElement('button');
                    chip.className = 'demo-chip';
                    chip.textContent = `${c.name} ($${parseFloat(c.store_credit_balance || 0).toFixed(0)} credit)`;
                    chip.title = `Login as ${c.name} (${c.phone_number})`;
                    chip.addEventListener('click', async () => {
                        try {
                            const loginRes = await api.demoLogin(c.customer_id);
                            currentCustomer = loginRes.customer;
                            showToast(loginRes.message || `Logged in as ${c.name}`);
                            renderAuthUI();
                            loadDashboard();
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    });
                    demoChipsContainer.appendChild(chip);
                });
            }
        } catch (err) {
            console.error('Error loading demo customers:', err);
        }
    }

    // Login Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('loginIdentifier').value.trim();
        if (!identifier) return;

        try {
            const res = await api.login(identifier);
            currentCustomer = res.customer;
            showToast(res.message);
            renderAuthUI();
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Signup Submit
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const phone = document.getElementById('signupPhone').value.trim();
        const address = document.getElementById('signupAddress').value.trim();
        const credit = document.getElementById('signupCredit').value.trim();

        try {
            const res = await api.signup({
                name,
                phone_number: phone,
                address,
                initial_credit: credit
            });
            currentCustomer = res.customer;
            showToast(res.message);
            renderAuthUI();
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        api.logout();
        currentCustomer = null;
        dashboardData = null;
        renderAuthUI();
        showToast('Logged out successfully.');
    });

    function renderAuthUI() {
        if (currentCustomer) {
            authSection.classList.add('hidden');
            dashboardSection.classList.remove('hidden');
            userPill.classList.remove('hidden');
            logoutBtn.classList.remove('hidden');
            userNameSpan.textContent = currentCustomer.name;
            userAvatar.textContent = currentCustomer.name.charAt(0).toUpperCase();
        } else {
            authSection.classList.remove('hidden');
            dashboardSection.classList.add('hidden');
            userPill.classList.add('hidden');
            logoutBtn.classList.add('hidden');
        }
    }

    async function loadCatalogItems() {
        try {
            const res = await api.getItems();
            if (res.success && res.items) {
                catalogItems = res.items;
            }
        } catch (err) {
            console.error('Failed to load items:', err);
        }
    }

    async function loadDashboard() {
        if (!currentCustomer) return;
        try {
            const res = await api.getDashboard();
            if (res.success && res.dashboard) {
                dashboardData = res.dashboard;
                renderDashboard(dashboardData);
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderDashboard(data) {
        const { customer, orders, returns, summary } = data;

        customerNameEl.textContent = customer.name;
        customerAddressEl.textContent = customer.address || 'Address not specified';
        customerPhoneEl.textContent = customer.phone_number || 'Phone not specified';

        metricStoreCredit.textContent = `$${summary.storeCreditBalance}`;
        metricTotalOrders.textContent = summary.totalOrders;
        metricActiveOrders.textContent = summary.activeOrders;
        metricAvgRating.textContent = summary.avgRatingGiven ? `★ ${summary.avgRatingGiven}` : 'N/A';

        // Render Orders List
        if (!orders || orders.length === 0) {
            ordersListContainer.innerHTML = `
                <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No orders placed yet.</p>
                    <p style="font-size: 0.85rem;">Click "Place New Order" above to submit your first shipment.</p>
                </div>
            `;
        } else {
            ordersListContainer.innerHTML = '';
            orders.forEach(order => {
                const card = document.createElement('div');
                card.className = 'order-item-card';

                let statusBadgeClass = 'badge-pending';
                if (order.order_status === 'Dispatched') statusBadgeClass = 'badge-dispatched';
                if (order.order_status === 'Delivered') statusBadgeClass = 'badge-delivered';

                const shippingBadgeClass = (order.shipping_type === 'Express') ? 'badge-express' : 'badge-standard';

                let itemsRows = '';
                if (order.items && order.items.length > 0) {
                    itemsRows = order.items.map(item => `
                        <tr>
                            <td><strong>${item.item_name}</strong></td>
                            <td><span style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${item.sku}</span></td>
                            <td style="text-align: right; font-weight: 600;">Qty: ${item.quantity}</td>
                        </tr>
                    `).join('');
                } else {
                    itemsRows = '<tr><td colspan="3" style="color: var(--text-muted);">Standard Package Items</td></tr>';
                }

                let reviewSectionHtml = '';
                if (order.star_rating) {
                    const starsHtml = '★'.repeat(order.star_rating) + '☆'.repeat(5 - order.star_rating);
                    reviewSectionHtml = `
                        <div class="order-review-section">
                            <div>
                                <span class="detail-label">Your Feedback:</span>
                                <div class="star-display">${starsHtml} <strong style="font-size: 0.85rem; color: var(--text-primary); margin-left: 0.4rem;">${order.star_rating}/5 Stars</strong></div>
                                ${order.review_comment ? `<p style="font-size: 0.825rem; color: var(--text-secondary); margin-top: 0.25rem;">"${order.review_comment}"</p>` : ''}
                            </div>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="order-card-top">
                        <div>
                            <div class="order-id-label">Order #${order.order_id}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${order.address} (${order.zip_code})</div>
                        </div>
                        <div class="order-tags">
                            <span class="badge ${shippingBadgeClass}">${order.shipping_type}</span>
                            <span class="badge ${statusBadgeClass}">${order.order_status}</span>
                        </div>
                    </div>

                    <div class="order-details-grid">
                        <div>
                            <div class="detail-label">Assigned Driver</div>
                            <div class="detail-val">${order.driver_name ? `${order.driver_name} (★ ${order.driver_rating || '5.0'})` : 'Awaiting Driver'}</div>
                        </div>
                        <div>
                            <div class="detail-label">Delivery Zone / Zip</div>
                            <div class="detail-val">${order.zip_code}</div>
                        </div>
                    </div>

                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Item Catalog</th>
                                <th>SKU</th>
                                <th style="text-align: right;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>

                    ${reviewSectionHtml}

                    <div class="order-card-actions">
                        ${order.order_status === 'Delivered' && !order.star_rating ? `
                            <button class="btn btn-outline btn-sm rate-order-btn" data-order-id="${order.order_id}">
                                ★ Rate Driver
                            </button>
                        ` : ''}
                        ${order.order_status === 'Delivered' ? `
                            <button class="btn btn-secondary btn-sm return-order-btn" data-order-id="${order.order_id}">
                                ↩️ Request Return
                            </button>
                        ` : ''}
                    </div>
                `;

                const rateBtn = card.querySelector('.rate-order-btn');
                if (rateBtn) {
                    rateBtn.addEventListener('click', () => {
                        activeReviewOrderId = order.order_id;
                        document.getElementById('reviewOrderTitle').textContent = `Order #${order.order_id}`;
                        document.getElementById('reviewComment').value = '';
                        setStarRating(5);
                        reviewModal.classList.remove('hidden');
                    });
                }

                const returnBtn = card.querySelector('.return-order-btn');
                if (returnBtn) {
                    returnBtn.addEventListener('click', () => {
                        activeReturnOrderId = order.order_id;
                        document.getElementById('returnOrderTitle').textContent = `Order #${order.order_id}`;
                        returnModal.classList.remove('hidden');
                    });
                }

                ordersListContainer.appendChild(card);
            });
        }

        // Render Returns List
        if (!returns || returns.length === 0) {
            returnsListContainer.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); font-size: 0.85rem;">
                    No returns logged. Approved returns will reflect here and credit your store balance.
                </div>
            `;
        } else {
            returnsListContainer.innerHTML = '';
            returns.forEach(ret => {
                const retCard = document.createElement('div');
                retCard.className = 'return-item-card';

                let retBadgeClass = 'badge-pending';
                if (ret.status === 'Arrived at Warehouse') retBadgeClass = 'badge-delivered';
                if (ret.status === 'Mailed Back') retBadgeClass = 'badge-dispatched';

                retCard.innerHTML = `
                    <div class="return-header">
                        <div>
                            <strong>Return #${ret.return_id}</strong> (For Order #${ret.order_id})
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Date: ${ret.date_requested ? ret.date_requested.split('T')[0] : 'Recent'}</div>
                        </div>
                        <span class="badge ${retBadgeClass}">${ret.status}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-top: 0.5rem;">
                        <span style="color: var(--text-secondary);">Store Credit Refund:</span>
                        <span class="return-amount">+$${parseFloat(ret.refund_amount || 0).toFixed(2)}</span>
                    </div>
                `;
                returnsListContainer.appendChild(retCard);
            });
        }
    }

    // Star Rating Widget Handling
    const stars = document.querySelectorAll('#starRatingInput .star-item');
    function setStarRating(rating) {
        selectedRating = rating;
        stars.forEach(s => {
            const val = parseInt(s.dataset.value, 10);
            if (val <= rating) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    }

    stars.forEach(s => {
        s.addEventListener('click', () => {
            setStarRating(parseInt(s.dataset.value, 10));
        });
    });

    closeReviewModalBtn.addEventListener('click', () => reviewModal.classList.add('hidden'));
    submitReviewBtn.addEventListener('click', async () => {
        if (!activeReviewOrderId) return;
        const comment = document.getElementById('reviewComment').value.trim();

        try {
            const res = await api.submitReview(activeReviewOrderId, {
                star_rating: selectedRating,
                review_comment: comment
            });
            showToast(res.message);
            reviewModal.classList.add('hidden');
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    closeReturnModalBtn.addEventListener('click', () => returnModal.classList.add('hidden'));
    submitReturnBtn.addEventListener('click', async () => {
        if (!activeReturnOrderId) return;
        const reason = document.getElementById('returnReason').value.trim();
        const refundAmount = document.getElementById('returnAmount').value.trim();

        try {
            const res = await api.submitReturn(activeReturnOrderId, {
                refund_amount: refundAmount,
                reason
            });
            showToast(res.message);
            returnModal.classList.add('hidden');
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Place Order Modal Logic
    openNewOrderBtn.addEventListener('click', () => {
        if (currentCustomer) {
            document.getElementById('orderAddress').value = currentCustomer.address || '';
        }
        renderOrderItemsRows();
        newOrderModal.classList.remove('hidden');
    });

    closeNewOrderModalBtn.addEventListener('click', () => newOrderModal.classList.add('hidden'));

    function renderOrderItemsRows() {
        orderItemsContainer.innerHTML = `
            <div class="form-group" style="display: flex; gap: 0.5rem; align-items: center;">
                <select class="form-select order-item-select" style="flex: 2;">
                    ${catalogItems.map(it => `<option value="${it.item_id}">${it.name} (${it.sku})</option>`).join('')}
                </select>
                <input type="number" class="form-input order-item-qty" value="1" min="1" max="50" style="flex: 1;" placeholder="Qty">
            </div>
        `;
    }

    addItemBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'form-group';
        row.style.display = 'flex';
        row.style.gap = '0.5rem';
        row.style.alignItems = 'center';
        row.innerHTML = `
            <select class="form-select order-item-select" style="flex: 2;">
                ${catalogItems.map(it => `<option value="${it.item_id}">${it.name} (${it.sku})</option>`).join('')}
            </select>
            <input type="number" class="form-input order-item-qty" value="1" min="1" max="50" style="flex: 1;" placeholder="Qty">
            <button type="button" class="btn btn-outline btn-sm remove-row-btn" style="padding: 0.6rem;">✕</button>
        `;
        row.querySelector('.remove-row-btn').addEventListener('click', () => row.remove());
        orderItemsContainer.appendChild(row);
    });

    submitOrderBtn.addEventListener('click', async () => {
        const zipCode = document.getElementById('orderZip').value.trim();
        const address = document.getElementById('orderAddress').value.trim();
        const shippingType = document.getElementById('orderShippingType').value;

        const selects = document.querySelectorAll('.order-item-select');
        const quantities = document.querySelectorAll('.order-item-qty');
        const items = [];

        for (let i = 0; i < selects.length; i++) {
            const itemId = parseInt(selects[i].value, 10);
            const qty = parseInt(quantities[i].value, 10);
            if (itemId && qty > 0) {
                items.push({ item_id: itemId, quantity: qty });
            }
        }

        if (items.length === 0) {
            showToast('Please select at least one item.', 'error');
            return;
        }

        try {
            const res = await api.placeOrder({
                zip_code: zipCode,
                address,
                shipping_type: shippingType,
                items
            });
            showToast(res.message);
            newOrderModal.classList.add('hidden');
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE 2: DRIVER EARNINGS & WEEKLY PAYROLL LOGIC (Teammate 2 - Feature 2)
    // Weekly paycheck calculation: base_rate per trip plus per_km_bonus × distance_miles,
    // summed from trips into paycheck. Tables: trips, paycheck, drivers
    // =========================================================================

    async function loadDriverEarningsModule() {
        try {
            // 1. Load Driver KPIs
            const kpiRes = await api.getDriverKPIs();
            if (kpiRes.success && kpiRes.kpis) {
                driverKpiTotalDrivers.textContent = kpiRes.kpis.totalDrivers;
                driverKpiTotalTrips.textContent = kpiRes.kpis.totalTrips;
                driverKpiTotalDistance.textContent = `${kpiRes.kpis.totalDistanceMiles} mi`;
                driverKpiTotalPayout.textContent = `$${kpiRes.kpis.totalPayoutRecorded}`;
            }

            // 2. Load All Drivers
            const driversRes = await api.getDrivers();
            if (driversRes.success && driversRes.drivers) {
                driversList = driversRes.drivers;
                renderDriverPills(driversList);

                // Default date inputs to past 7 days if empty
                if (!calcWeekStart.value || !calcWeekEnd.value) {
                    setDatePreset('last7');
                }

                // Select driver
                if (!selectedDriverId && driversList.length > 0) {
                    selectedDriverId = driversList[0].driver_id;
                }
                selectDriver(selectedDriverId);
            }
        } catch (err) {
            console.error('Error loading driver earnings module:', err);
            showToast(err.message, 'error');
        }
    }

    function renderDriverPills(drivers) {
        driverPillsContainer.innerHTML = '';
        drivers.forEach(d => {
            const pill = document.createElement('button');
            pill.className = `driver-select-pill ${d.driver_id === selectedDriverId ? 'active' : ''}`;
            pill.dataset.driverId = d.driver_id;
            pill.innerHTML = `
                <span>🚚</span>
                <span>${d.full_name}</span>
                <span style="font-size: 0.725rem; opacity: 0.75;">(★ ${d.rating})</span>
            `;
            pill.addEventListener('click', () => {
                selectDriver(d.driver_id);
            });
            driverPillsContainer.appendChild(pill);
        });
    }

    async function selectDriver(driverId) {
        selectedDriverId = driverId;

        // Update pills active class
        const pills = document.querySelectorAll('.driver-select-pill');
        pills.forEach(p => {
            if (parseInt(p.dataset.driverId, 10) === driverId) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });

        const driver = driversList.find(d => d.driver_id === driverId);
        if (driver) {
            currentDriverTitleName.textContent = `${driver.full_name}`;
            currentDriverStatusBadge.textContent = driver.status_flag || 'Available';
            
            if (driver.status_flag === 'On Trip') {
                currentDriverStatusBadge.className = 'badge badge-dispatched';
            } else if (driver.status_flag === 'Under Review') {
                currentDriverStatusBadge.className = 'badge badge-pending';
            } else {
                currentDriverStatusBadge.className = 'badge badge-delivered';
            }

            currentDriverBaseRate.textContent = `$${parseFloat(driver.base_rate).toFixed(2)}`;
            currentDriverMileageBonus.textContent = `$${parseFloat(driver.per_km_bonus).toFixed(2)} / mi`;
            currentDriverRating.textContent = `★ ${parseFloat(driver.rating).toFixed(2)}`;
            currentDriverLifetimeTrips.textContent = driver.total_trips || 0;
            activeLogTripDriverRates = { base_rate: driver.base_rate, per_km_bonus: driver.per_km_bonus };
        }

        // Trigger weekly paycheck calculation
        await calculateWeeklyEarnings();

        // Load trips table
        await loadDriverTrips(driverId);

        // Load paychecks table
        await loadDriverPaychecks(driverId);
    }

    async function calculateWeeklyEarnings() {
        if (!selectedDriverId) return;
        const start = calcWeekStart.value;
        const end = calcWeekEnd.value;

        try {
            const res = await api.getWeeklyCalculation(selectedDriverId, start, end);
            if (res.success && res.calculation) {
                selectedDriverCalculation = res.calculation;
                renderCalculationBreakdown(selectedDriverCalculation);
            }
        } catch (err) {
            console.error('Calculation error:', err);
            showToast(err.message, 'error');
        }
    }

    function renderCalculationBreakdown(calc) {
        const { trip_count, total_distance_miles, base_rate, per_km_bonus, base_earnings_total, mileage_earnings_total, total_weekly_earnings, is_already_issued, existing_paycheck } = calc;

        stepBasePay.textContent = `$${base_earnings_total.toFixed(2)}`;
        stepBaseFormula.textContent = `${trip_count} trip(s) × $${base_rate.toFixed(2)}`;

        stepMileagePay.textContent = `$${mileage_earnings_total.toFixed(2)}`;
        stepMileageFormula.textContent = `${total_distance_miles} mi × $${per_km_bonus.toFixed(2)}`;

        stepTotalEarnings.textContent = `$${total_weekly_earnings.toFixed(2)}`;
        stepPaycheckStatus.textContent = `Summed from ${trip_count} completed trip(s)`;

        if (is_already_issued && existing_paycheck) {
            paycheckIssuedNotice.innerHTML = `
                <span style="color: var(--accent-success);">✓ Paycheck #${existing_paycheck.paycheck_id} recorded for this period ($${parseFloat(existing_paycheck.total_amount).toFixed(2)})</span>
            `;
            generatePaycheckActionBtn.textContent = 'Re-Issue Paycheck';
            generatePaycheckActionBtn.className = 'btn btn-outline btn-sm';
        } else {
            paycheckIssuedNotice.innerHTML = `
                <span style="color: var(--text-muted);">ℹ️ Paycheck not yet recorded for this date window</span>
            `;
            generatePaycheckActionBtn.textContent = '💳 Generate & Record Paycheck';
            generatePaycheckActionBtn.className = 'btn btn-success';
        }
    }

    async function loadDriverTrips(driverId) {
        try {
            const res = await api.getDriverTrips(driverId);
            if (res.success && res.trips) {
                driverTripCountBadge.textContent = `${res.trips.length} Trips`;
                if (res.trips.length === 0) {
                    driverTripsTableBody.innerHTML = `
                        <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No trips recorded for this driver yet. Click "Log Completed Trip" above to add one.</td></tr>
                    `;
                } else {
                    driverTripsTableBody.innerHTML = res.trips.map(t => {
                        const startDate = t.start_time ? t.start_time.replace('T', ' ').substring(0, 16) : 'N/A';
                        return `
                            <tr>
                                <td><strong style="color: var(--text-primary);">Trip #${t.trip_id}</strong></td>
                                <td>${startDate}</td>
                                <td><span style="font-weight: 600;">${parseFloat(t.distance_miles).toFixed(1)} miles</span></td>
                                <td style="text-align: right; font-weight: 700; color: var(--accent-success);">$${parseFloat(t.calculated_trip_pay || 0).toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } catch (err) {
            console.error('Error loading trips:', err);
        }
    }

    async function loadDriverPaychecks(driverId) {
        try {
            const res = await api.getDriverPaychecks(driverId);
            if (res.success && res.paychecks) {
                driverPaycheckCountBadge.textContent = `${res.paychecks.length} Records`;
                if (res.paychecks.length === 0) {
                    driverPaychecksTableBody.innerHTML = `
                        <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No historical paychecks recorded for this driver yet.</td></tr>
                    `;
                } else {
                    driverPaychecksTableBody.innerHTML = res.paychecks.map(p => {
                        const start = p.week_start ? p.week_start.split('T')[0] : '';
                        const end = p.week_end ? p.week_end.split('T')[0] : '';
                        return `
                            <tr>
                                <td><strong style="color: var(--text-primary);">Paycheck #${p.paycheck_id}</strong></td>
                                <td>${start} to ${end}</td>
                                <td><span class="badge badge-delivered" style="font-size: 0.7rem;">Paid & Recorded</span></td>
                                <td style="text-align: right; font-weight: 700; color: var(--accent-success);">$${parseFloat(p.total_amount).toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } catch (err) {
            console.error('Error loading paychecks:', err);
        }
    }

    // Date Preset Buttons
    function setDatePreset(preset) {
        datePresetBtns.forEach(b => {
            if (b.dataset.preset === preset) b.classList.add('active');
            else b.classList.remove('active');
        });

        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        if (preset === 'last7') {
            start.setDate(now.getDate() - 6);
        } else if (preset === 'thisWeek') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
            start = new Date(now.setDate(diff));
            end = new Date();
        } else if (preset === 'allTime') {
            start = new Date('2026-08-01');
            end = new Date('2026-08-31');
        }

        calcWeekStart.value = start.toISOString().split('T')[0];
        calcWeekEnd.value = end.toISOString().split('T')[0];
    }

    datePresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setDatePreset(btn.dataset.preset);
            calculateWeeklyEarnings();
        });
    });

    recalculateEarningsBtn.addEventListener('click', () => {
        datePresetBtns.forEach(b => b.classList.remove('active'));
        calculateWeeklyEarnings();
    });

    // Log Trip Modal
    openLogTripModalBtn.addEventListener('click', () => {
        // Populate drivers in select
        logTripDriverSelect.innerHTML = driversList.map(d => `
            <option value="${d.driver_id}" ${d.driver_id === selectedDriverId ? 'selected' : ''}>
                ${d.full_name} (Base: $${d.base_rate}, Bonus: $${d.per_km_bonus}/mi)
            </option>
        `).join('');

        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));

        // Format datetime-local string
        const toLocalISO = (d) => {
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        logTripStartTime.value = toLocalISO(twoHoursAgo);
        logTripEndTime.value = toLocalISO(now);
        logTripDistance.value = '30.0';

        updateLogTripPreview();
        logTripModal.classList.remove('hidden');
    });

    closeLogTripModalBtn.addEventListener('click', () => logTripModal.classList.add('hidden'));

    function updateLogTripPreview() {
        const dId = parseInt(logTripDriverSelect.value, 10);
        const driver = driversList.find(d => d.driver_id === dId) || { base_rate: 25.0, per_km_bonus: 0.45 };
        const dist = parseFloat(logTripDistance.value) || 0;
        const base = parseFloat(driver.base_rate);
        const mileageBonus = dist * parseFloat(driver.per_km_bonus);
        const total = base + mileageBonus;

        logTripPayoutPreview.innerHTML = `$${base.toFixed(2)} Base + $${mileageBonus.toFixed(2)} Mileage (${dist} mi × $${driver.per_km_bonus}) = <strong style="color: var(--accent-success);">$${total.toFixed(2)}</strong>`;
    }

    logTripDriverSelect.addEventListener('change', updateLogTripPreview);
    logTripDistance.addEventListener('input', updateLogTripPreview);

    submitLogTripBtn.addEventListener('click', async () => {
        const driverId = parseInt(logTripDriverSelect.value, 10);
        const start = logTripStartTime.value ? logTripStartTime.value.replace('T', ' ') + ':00' : '';
        const end = logTripEndTime.value ? logTripEndTime.value.replace('T', ' ') + ':00' : '';
        const dist = parseFloat(logTripDistance.value);

        if (!driverId || !start || !end || isNaN(dist) || dist <= 0) {
            showToast('Please fill out all trip details with valid positive distance.', 'error');
            return;
        }

        try {
            const res = await api.logTrip(driverId, {
                start_time: start,
                end_time: end,
                distance_miles: dist
            });
            showToast(res.message);
            logTripModal.classList.add('hidden');

            // Refresh driver earnings
            await loadDriverEarningsModule();
            selectDriver(driverId);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Issue Paycheck Modal
    generatePaycheckActionBtn.addEventListener('click', () => {
        if (!selectedDriverCalculation) return;
        const calc = selectedDriverCalculation;
        const driver = calc.driver;

        confirmPaycheckDriver.textContent = driver.full_name;
        confirmPaycheckRange.textContent = `${calc.week_start} to ${calc.week_end}`;
        confirmPaycheckTrips.textContent = `${calc.trip_count} Trips (${calc.total_distance_miles} miles)`;
        confirmPaycheckAmount.textContent = `$${calc.total_weekly_earnings.toFixed(2)}`;
        confirmPaycheckOverride.value = calc.total_weekly_earnings.toFixed(2);

        issuePaycheckModal.classList.remove('hidden');
    });

    closeIssuePaycheckModalBtn.addEventListener('click', () => issuePaycheckModal.classList.add('hidden'));

    confirmIssuePaycheckBtn.addEventListener('click', async () => {
        if (!selectedDriverCalculation) return;
        const calc = selectedDriverCalculation;
        const override = parseFloat(confirmPaycheckOverride.value);

        try {
            const res = await api.generatePaycheck(selectedDriverId, {
                week_start: calc.week_start,
                week_end: calc.week_end,
                override_amount: !isNaN(override) ? override : calc.total_weekly_earnings
            });
            showToast(res.message);
            issuePaycheckModal.classList.add('hidden');

            // Refresh view
            await loadDriverEarningsModule();
            selectDriver(selectedDriverId);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE 3: LOW STOCK ALERT & INVENTORY LOGIC (Teammate 3 - Feature 2)
    // Query warehouse_stocks where stock_quantity is below item's safety_threshold
    // Tables: warehouse_stocks, items, warehouses
    // =========================================================================

    async function loadInventoryModule() {
        try {
            // 1. Load Inventory KPIs
            const kpiRes = await api.getInventoryKPIs();
            if (kpiRes.success && kpiRes.kpis) {
                inventoryKPIs = kpiRes.kpis;
                invKpiTotalAlerts.textContent = inventoryKPIs.totalLowStockAlerts;
                invKpiCriticalAlerts.textContent = inventoryKPIs.criticalAlerts;
                invKpiTotalDeficit.textContent = `${inventoryKPIs.totalDeficitUnits} units`;
                invKpiTotalWarehouses.textContent = inventoryKPIs.totalWarehouses;
            }

            // 2. Load Warehouses for Dropdown
            const whRes = await api.getWarehouses();
            if (whRes.success && whRes.warehouses) {
                warehousesList = whRes.warehouses;
            }

            // 3. Load Low Stock Alerts
            await filterAndRenderAlerts();

            // 4. Load Stock Matrix
            const matrixRes = await api.getStockMatrix();
            if (matrixRes.success && matrixRes.matrix) {
                stockMatrixList = matrixRes.matrix;
                renderStockMatrix(stockMatrixList);
            }
        } catch (err) {
            console.error('Error loading inventory module:', err);
            showToast(err.message, 'error');
        }
    }

    async function filterAndRenderAlerts() {
        const wId = filterWarehouse.value;
        const sev = filterSeverity.value;
        const search = searchInventoryItem.value.trim().toLowerCase();

        try {
            const res = await api.getLowStockAlerts(wId, sev);
            if (res.success && res.alerts) {
                lowStockAlerts = res.alerts;

                let filtered = lowStockAlerts;
                if (search) {
                    filtered = filtered.filter(a =>
                        a.item_name.toLowerCase().includes(search) ||
                        a.sku.toLowerCase().includes(search) ||
                        a.warehouse_name.toLowerCase().includes(search)
                    );
                }

                renderLowStockAlertCards(filtered);
            }
        } catch (err) {
            console.error('Filter alerts error:', err);
        }
    }

    function renderLowStockAlertCards(alerts) {
        if (!alerts || alerts.length === 0) {
            lowStockCardsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
                    <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">No Low Stock Alerts Matching Filters</h3>
                    <p style="font-size: 0.85rem; color: var(--text-secondary);">All monitored warehouses currently maintain stock levels at or above configured safety thresholds.</p>
                </div>
            `;
            return;
        }

        lowStockCardsContainer.innerHTML = '';
        alerts.forEach(alert => {
            const card = document.createElement('div');
            const isCritical = alert.alert_severity === 'Critical' || alert.alert_severity === 'Out of Stock';
            card.className = `alert-card ${isCritical ? 'critical-border' : 'warning-border'}`;

            let badgeClass = isCritical ? 'badge-express' : 'badge-pending';
            let fillClass = isCritical ? 'fill-critical' : 'fill-warning';
            const percent = Math.min(Math.max(alert.stock_percentage || 0, 5), 100);

            card.innerHTML = `
                <div>
                    <div class="alert-card-top">
                        <div>
                            <div class="alert-item-title">${alert.item_name}</div>
                            <span class="alert-sku-pill">${alert.sku}</span>
                        </div>
                        <span class="badge ${badgeClass}">${alert.alert_severity}</span>
                    </div>

                    <div class="alert-warehouse-badge">
                        <span>🏢</span>
                        <span><strong>${alert.warehouse_name}</strong> (${alert.location_zone})</span>
                    </div>

                    <div class="stock-progress-wrapper">
                        <div class="stock-progress-labels">
                            <span>Current: <strong style="color: var(--text-primary);">${alert.stock_quantity} units</strong></span>
                            <span>Safety Min: <strong>${alert.safety_threshold} units</strong></span>
                        </div>
                        <div class="stock-progress-bar">
                            <div class="stock-progress-fill ${fillClass}" style="width: ${percent}%;"></div>
                        </div>
                    </div>

                    <div class="alert-deficit-stat">
                        <span style="color: var(--text-muted);">Stock Shortage Deficit:</span>
                        <strong style="color: ${isCritical ? 'var(--accent-danger)' : 'var(--accent-warning)'};">-${alert.deficit} units required</strong>
                    </div>
                </div>

                <div class="alert-actions-row">
                    <button class="btn btn-outline btn-sm edit-threshold-btn" data-item-id="${alert.item_id}" data-item-name="${alert.item_name}" data-threshold="${alert.safety_threshold}">
                        ⚙️ Threshold (${alert.safety_threshold})
                    </button>
                    <button class="btn btn-success btn-sm restock-action-btn" data-warehouse-id="${alert.warehouse_id}" data-warehouse-name="${alert.warehouse_name}" data-item-id="${alert.item_id}" data-item-name="${alert.item_name}" data-stock="${alert.stock_quantity}" data-threshold="${alert.safety_threshold}" data-deficit="${alert.deficit}">
                        + Restock Item
                    </button>
                </div>
            `;

            // Attach action listeners
            const restockBtn = card.querySelector('.restock-action-btn');
            restockBtn.addEventListener('click', () => {
                openRestockModal({
                    warehouse_id: alert.warehouse_id,
                    warehouse_name: alert.warehouse_name,
                    item_id: alert.item_id,
                    item_name: alert.item_name,
                    current_stock: alert.stock_quantity,
                    safety_threshold: alert.safety_threshold,
                    suggested_qty: Math.max(alert.deficit + 10, 25)
                });
            });

            const thresholdBtn = card.querySelector('.edit-threshold-btn');
            thresholdBtn.addEventListener('click', () => {
                openThresholdModal({
                    item_id: alert.item_id,
                    item_name: alert.item_name,
                    safety_threshold: alert.safety_threshold
                });
            });

            lowStockCardsContainer.appendChild(card);
        });
    }

    function renderStockMatrix(matrix) {
        const search = searchInventoryItem.value.trim().toLowerCase();
        const wId = filterWarehouse.value;

        let filtered = matrix;
        if (wId && wId !== 'all') {
            const targetId = parseInt(wId, 10);
            filtered = filtered.filter(m => m.warehouse_id === targetId);
        }

        if (search) {
            filtered = filtered.filter(m =>
                m.item_name.toLowerCase().includes(search) ||
                m.sku.toLowerCase().includes(search) ||
                m.warehouse_name.toLowerCase().includes(search)
            );
        }

        if (filtered.length === 0) {
            stockMatrixTableBody.innerHTML = `
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No inventory records match current filter criteria.</td></tr>
            `;
            return;
        }

        stockMatrixTableBody.innerHTML = filtered.map(row => {
            const isLow = row.is_low_stock || row.stock_quantity < row.safety_threshold;
            let statusBadge = `<span class="badge badge-delivered" style="font-size: 0.725rem;">Optimal</span>`;
            if (row.stock_quantity === 0) {
                statusBadge = `<span class="badge badge-express" style="font-size: 0.725rem;">Out of Stock</span>`;
            } else if (isLow) {
                statusBadge = `<span class="badge badge-pending" style="font-size: 0.725rem;">Low Stock (-${row.deficit || (row.safety_threshold - row.stock_quantity)})</span>`;
            }

            const stockColor = isLow ? 'var(--accent-danger)' : 'var(--text-primary)';

            return `
                <tr>
                    <td>
                        <strong>${row.warehouse_name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${row.location_zone}</div>
                    </td>
                    <td>
                        <span style="font-weight: 600; color: var(--text-primary);">${row.item_name}</span>
                        <div style="font-family: monospace; font-size: 0.75rem; color: var(--text-muted);">${row.sku}</div>
                    </td>
                    <td><strong style="color: ${stockColor}; font-size: 0.95rem;">${row.stock_quantity}</strong> units</td>
                    <td>${row.safety_threshold} units</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-outline btn-sm matrix-restock-btn" data-warehouse-id="${row.warehouse_id}" data-warehouse-name="${row.warehouse_name}" data-item-id="${row.item_id}" data-item-name="${row.item_name}" data-stock="${row.stock_quantity}" data-threshold="${row.safety_threshold}">
                            + Restock
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach listeners for matrix restock buttons
        document.querySelectorAll('.matrix-restock-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openRestockModal({
                    warehouse_id: parseInt(btn.dataset.warehouseId, 10),
                    warehouse_name: btn.dataset.warehouseName,
                    item_id: parseInt(btn.dataset.itemId, 10),
                    item_name: btn.dataset.itemName,
                    current_stock: parseInt(btn.dataset.stock, 10),
                    safety_threshold: parseInt(btn.dataset.threshold, 10),
                    suggested_qty: 25
                });
            });
        });
    }

    // View toggle handlers (Alerts feed vs Stock matrix)
    viewAlertsTabBtn.addEventListener('click', () => {
        currentInventoryView = 'alerts';
        viewAlertsTabBtn.className = 'btn btn-primary btn-sm';
        viewMatrixTabBtn.className = 'btn btn-outline btn-sm';
        alertsFeedView.classList.remove('hidden');
        stockMatrixView.classList.add('hidden');
        filterAndRenderAlerts();
    });

    viewMatrixTabBtn.addEventListener('click', () => {
        currentInventoryView = 'matrix';
        viewMatrixTabBtn.className = 'btn btn-primary btn-sm';
        viewAlertsTabBtn.className = 'btn btn-outline btn-sm';
        alertsFeedView.classList.add('hidden');
        stockMatrixView.classList.remove('hidden');
        renderStockMatrix(stockMatrixList);
    });

    filterWarehouse.addEventListener('change', () => {
        if (currentInventoryView === 'alerts') filterAndRenderAlerts();
        else renderStockMatrix(stockMatrixList);
    });

    filterSeverity.addEventListener('change', () => {
        if (currentInventoryView === 'alerts') filterAndRenderAlerts();
    });

    searchInventoryItem.addEventListener('input', () => {
        if (currentInventoryView === 'alerts') filterAndRenderAlerts();
        else renderStockMatrix(stockMatrixList);
    });

    // Restock Modal Logic
    function openRestockModal(target) {
        activeRestockTarget = target;
        restockItemName.textContent = target.item_name;
        restockWarehouseName.textContent = target.warehouse_name;
        restockCurrentStock.textContent = `${target.current_stock} units`;
        restockSafetyThresh.textContent = `${target.safety_threshold} units`;
        restockQuantity.value = target.suggested_qty || 25;
        restockModal.classList.remove('hidden');
    }

    closeRestockModalBtn.addEventListener('click', () => restockModal.classList.add('hidden'));

    document.querySelectorAll('.quick-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            restockQuantity.value = btn.dataset.qty;
        });
    });

    submitRestockBtn.addEventListener('click', async () => {
        const qty = parseInt(restockQuantity.value, 10);
        if (!qty || qty <= 0) {
            showToast('Please enter a valid positive restock quantity.', 'error');
            return;
        }

        try {
            const res = await api.restockItem({
                warehouse_id: activeRestockTarget.warehouse_id,
                item_id: activeRestockTarget.item_id,
                quantity: qty
            });
            showToast(res.message);
            restockModal.classList.add('hidden');

            // Refresh inventory module
            await loadInventoryModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Safety Threshold Modal Logic
    function openThresholdModal(target) {
        activeThresholdTarget = target;
        thresholdItemName.textContent = `${target.item_name}`;
        newSafetyThreshold.value = target.safety_threshold;
        thresholdModal.classList.remove('hidden');
    }

    closeThresholdModalBtn.addEventListener('click', () => thresholdModal.classList.add('hidden'));

    submitThresholdBtn.addEventListener('click', async () => {
        const thresh = parseInt(newSafetyThreshold.value, 10);
        if (!thresh || thresh <= 0) {
            showToast('Safety threshold must be a positive number.', 'error');
            return;
        }

        try {
            const res = await api.updateSafetyThreshold(activeThresholdTarget.item_id, thresh);
            showToast(res.message);
            thresholdModal.classList.add('hidden');

            // Refresh inventory module
            await loadInventoryModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    async function init() {
        await loadCatalogItems();
        await loadDemoCustomers();

        const storedToken = api.getToken();
        if (storedToken) {
            try {
                const res = await api.getCurrentUser();
                if (res.success && res.customer) {
                    currentCustomer = res.customer;
                    renderAuthUI();
                    loadDashboard();
                    return;
                }
            } catch (err) {
                api.logout();
            }
        }
        renderAuthUI();
    }

    init();
});
