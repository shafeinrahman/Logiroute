/**
 * LogiRoute Main Frontend Application Controller
 * Handles SPA state, module navigation, Customer Portal, Driver Earnings, Coverage Map, Order Dispatch, Notifications, and Inventory Monitor
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Global State
    // =========================================================================
    let activeModule = 'customer'; // 'customer' | 'stock-matrix' | 'inventory' | 'goods-monitoring' | 'dispatch' | 'coverage' | 'drivers' | 'returns' | 'missing-sales' | 'notifications'
    let currentPortal = 'customer'; // 'customer' | 'warehouse'
    let currentCustomer = null;
    let currentWarehouseUser = null;
    let demoWarehouseUsers = [];
    let dashboardData = null;
    let catalogItems = [];
    let activeReviewOrderId = null;
    let activeReturnOrderId = null;
    let selectedRating = 5;

    // Driver Earnings Module State
    let driversList = [];
    let selectedDriverId = 1;
    let selectedDriverCalculation = null;

    // Driver-Warehouse Coverage Map State
    let coverageMapData = null;
    let currentCoverageView = 'cards'; // 'cards' | 'table'

    // Order Dispatch & Priority Queue State
    let dispatchSummary = null;
    let dispatchBatches = [];
    let dispatchOrders = [];
    let selectedOrderIds = new Set();
    let currentDispatchTab = 'batches'; // 'batches' | 'queue'
    let selectedQueueDriverId = null;
    let activeQuickDispatchOrder = null;

    // Return Tracking Module State (Tanvir's - Feature 2)
    let returnsModuleList = [];
    let returnKPIs = null;
    let currentReturnsView = 'pipeline'; // 'pipeline' | 'table'
    let activeAdvanceReturnTarget = null;

    // Missing Sales Report Module State (Tanvir's - Feature 1)
    let missingSalesData = null;
    let missingSalesMatrixData = null;
    let selectedMissingSalesItemId = null;
    let currentMissingSalesView = 'list'; // 'list' | 'matrix'
    let activeCampaignItem = null;

    // Notifications Module State
    let notificationsList = [];
    let notificationStats = null;

    // Inventory & Low Stock Module State
    let inventoryKPIs = null;
    let warehousesList = [];
    let lowStockAlerts = [];
    let stockMatrixList = [];
    let currentInventoryView = 'alerts'; // 'alerts' | 'matrix'
    let activeRestockTarget = { warehouse_id: 1, item_id: 1, current_stock: 0, safety_threshold: 10, item_name: '', warehouse_name: '' };
    let activeThresholdTarget = { item_id: 1, item_name: '', safety_threshold: 10 };

    // Stock Matrix State (Shafein's - Feature 1)
    let stockMatrixPivotData = null;
    let stockMatrixFlatData = [];
    let stockMatrixKPIs = null;
    let currentMatrixView = 'pivot'; // 'pivot' | 'list'

    // Goods Monitoring State (Shafein's - Feature 3)
    let goodsMonitoringRecords = [];
    let goodsMonitoringKPIs = null;
    let currentGmTypeFilter = 'all'; // 'all' | 'damaged' | 'expired'
    let activeQuarantineTarget = null;

    // =========================================================================
    // DOM Elements - Navigation & Sections
    // =========================================================================
    const portalCustomerBtn = document.getElementById('portalCustomerBtn');
    const portalWarehouseBtn = document.getElementById('portalWarehouseBtn');
    const warehouseNavPills = document.getElementById('warehouseNavPills');
    const customerNavPills = document.getElementById('customerNavPills');

    const navCustomerBtn = document.getElementById('navCustomerBtn');
    const navReturnsBtn = document.getElementById('navReturnsBtn');
    const navMissingSalesBtn = document.getElementById('navMissingSalesBtn');
    const navDriversBtn = document.getElementById('navDriversBtn');
    const navCoverageBtn = document.getElementById('navCoverageBtn');
    const navDispatchBtn = document.getElementById('navDispatchBtn');
    const navNotificationsBtn = document.getElementById('navNotificationsBtn');
    const navInventoryBtn = document.getElementById('navInventoryBtn');
    const navStockMatrixBtn = document.getElementById('navStockMatrixBtn');
    const navGoodsMonitoringBtn = document.getElementById('navGoodsMonitoringBtn');

    const customerModuleWrapper = document.getElementById('customerModuleWrapper');
    const returnsSection = document.getElementById('returnsSection');
    const missingSalesSection = document.getElementById('missingSalesSection');
    const driverEarningsSection = document.getElementById('driverEarningsSection');
    const coverageMapSection = document.getElementById('coverageMapSection');
    const dispatchSection = document.getElementById('dispatchSection');
    const notificationsSection = document.getElementById('notificationsSection');
    const lowStockSection = document.getElementById('lowStockSection');
    const stockMatrixSection = document.getElementById('stockMatrixSection');
    const goodsMonitoringSection = document.getElementById('goodsMonitoringSection');

    // Header & User Identity Elements
    const userPill = document.getElementById('userPill');
    const userNameSpan = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const userRoleBadge = document.getElementById('userRoleBadge');
    const logoutBtn = document.getElementById('logoutBtn');

    // Authentication Elements
    const authSection = document.getElementById('authSection');
    const authPortalHeading = document.getElementById('authPortalHeading');
    const authPortalSubtitle = document.getElementById('authPortalSubtitle');
    const customerAuthTabs = document.getElementById('customerAuthTabs');
    const authTabs = document.querySelectorAll('.auth-tab-btn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const customerDemoBox = document.getElementById('customerDemoBox');
    const demoChipsContainer = document.getElementById('demoChipsContainer');

    const warehouseLoginForm = document.getElementById('warehouseLoginForm');
    const warehouseUsernameInput = document.getElementById('warehouseUsernameInput');
    const warehousePasswordInput = document.getElementById('warehousePasswordInput');
    const warehouseLoginSubmitBtn = document.getElementById('warehouseLoginSubmitBtn');
    const warehouseDemoBox = document.getElementById('warehouseDemoBox');
    const warehouseDemoChipsContainer = document.getElementById('warehouseDemoChipsContainer');

    const dashboardSection = document.getElementById('dashboardSection');

    const customerNameEl = document.getElementById('customerNameEl');
    const customerAddressEl = document.getElementById('customerAddressEl');
    const customerPhoneEl = document.getElementById('customerPhoneEl');
    const metricStoreCredit = document.getElementById('metricStoreCredit');
    const metricTotalOrders = document.getElementById('metricTotalOrders');
    const metricActiveOrders = document.getElementById('metricActiveOrders');
    const metricAvgRating = document.getElementById('metricAvgRating');
    const ordersListContainer = document.getElementById('ordersListContainer');
    const returnsListContainer = document.getElementById('returnsListContainer');

    // Driver Earnings Elements
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

    // Coverage Map Elements
    const covKpiWarehouses = document.getElementById('covKpiWarehouses');
    const covKpiAssignedDrivers = document.getElementById('covKpiAssignedDrivers');
    const covKpiAvailableDrivers = document.getElementById('covKpiAvailableDrivers');
    const covKpiCoverageRatio = document.getElementById('covKpiCoverageRatio');
    const viewCoverageCardsBtn = document.getElementById('viewCoverageCardsBtn');
    const viewCoverageTableBtn = document.getElementById('viewCoverageTableBtn');
    const openReassignZoneModalBtn = document.getElementById('openReassignZoneModalBtn');
    const filterCoverageZone = document.getElementById('filterCoverageZone');
    const searchCoverageDriver = document.getElementById('searchCoverageDriver');
    const coverageCardsView = document.getElementById('coverageCardsView');
    const coverageCardsContainer = document.getElementById('coverageCardsContainer');
    const coverageTableView = document.getElementById('coverageTableView');
    const coverageTableBody = document.getElementById('coverageTableBody');
    const coverageTableCountBadge = document.getElementById('coverageTableCountBadge');

    // Dispatch Elements
    const dspKpiPending = document.getElementById('dspKpiPending');
    const dspKpiExpress = document.getElementById('dspKpiExpress');
    const dspKpiActive = document.getElementById('dspKpiActive');
    const dspKpiAvailDrivers = document.getElementById('dspKpiAvailDrivers');
    const viewDispatchBatchesTabBtn = document.getElementById('viewDispatchBatchesTabBtn');
    const viewDriverQueueTabBtn = document.getElementById('viewDriverQueueTabBtn');
    const dispatchBatchesView = document.getElementById('dispatchBatchesView');
    const driverQueueView = document.getElementById('driverQueueView');
    const zoneBatchesCardsContainer = document.getElementById('zoneBatchesCardsContainer');
    const bulkDriverSelect = document.getElementById('bulkDriverSelect');
    const bulkDispatchBtn = document.getElementById('bulkDispatchBtn');
    const selectedOrdersCount = document.getElementById('selectedOrdersCount');
    const dispatchFilterChips = document.querySelectorAll('#dispatchBatchesView .filter-chip');
    const dispatchTableZoneFilter = document.getElementById('dispatchTableZoneFilter');
    const dispatchTablePriorityFilter = document.getElementById('dispatchTablePriorityFilter');
    const selectAllOrdersCheckbox = document.getElementById('selectAllOrdersCheckbox');
    const dispatchOrdersTableBody = document.getElementById('dispatchOrdersTableBody');
    const queueDriverPillsContainer = document.getElementById('queueDriverPillsContainer');
    const queueDriverTitle = document.getElementById('queueDriverTitle');
    const queueLengthBadge = document.getElementById('queueLengthBadge');
    const driverQueueListContainer = document.getElementById('driverQueueListContainer');
    const queueDriverStatusBadge = document.getElementById('queueDriverStatusBadge');
    const queueDriverName = document.getElementById('queueDriverName');
    const queueDriverZone = document.getElementById('queueDriverZone');
    const queueDriverRating = document.getElementById('queueDriverRating');
    const queueDriverRate = document.getElementById('queueDriverRate');

    // Notifications Elements
    const notifKpiTotal = document.getElementById('notifKpiTotal');
    const notifKpiSms = document.getElementById('notifKpiSms');
    const notifKpiEmail = document.getElementById('notifKpiEmail');
    const notifKpiDelivered = document.getElementById('notifKpiDelivered');
    const openSimulateNotifModalBtn = document.getElementById('openSimulateNotifModalBtn');
    const filterNotifChannel = document.getElementById('filterNotifChannel');
    const filterNotifStatus = document.getElementById('filterNotifStatus');
    const searchNotifInput = document.getElementById('searchNotifInput');
    const notifFeedCountBadge = document.getElementById('notifFeedCountBadge');
    const notificationsFeedContainer = document.getElementById('notificationsFeedContainer');

    // Inventory Elements
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
    const reassignZoneModal = document.getElementById('reassignZoneModal');
    const quickDispatchModal = document.getElementById('quickDispatchModal');
    const simulateNotifModal = document.getElementById('simulateNotifModal');

    const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
    const closeReturnModalBtn = document.getElementById('closeReturnModalBtn');
    const closeNewOrderModalBtn = document.getElementById('closeNewOrderModalBtn');
    const closeLogTripModalBtn = document.getElementById('closeLogTripModalBtn');
    const closeIssuePaycheckModalBtn = document.getElementById('closeIssuePaycheckModalBtn');
    const closeRestockModalBtn = document.getElementById('closeRestockModalBtn');
    const closeThresholdModalBtn = document.getElementById('closeThresholdModalBtn');
    const closeReassignZoneModalBtn = document.getElementById('closeReassignZoneModalBtn');
    const closeQuickDispatchModalBtn = document.getElementById('closeQuickDispatchModalBtn');
    const closeSimulateNotifModalBtn = document.getElementById('closeSimulateNotifModalBtn');

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

    const reassignDriverSelect = document.getElementById('reassignDriverSelect');
    const reassignZoneSelect = document.getElementById('reassignZoneSelect');
    const submitReassignZoneBtn = document.getElementById('submitReassignZoneBtn');

    const quickDispatchOrderTitle = document.getElementById('quickDispatchOrderTitle');
    const quickDispatchCustomer = document.getElementById('quickDispatchCustomer');
    const quickDispatchAddress = document.getElementById('quickDispatchAddress');
    const quickDispatchPriority = document.getElementById('quickDispatchPriority');
    const quickDispatchDriverSelect = document.getElementById('quickDispatchDriverSelect');
    const submitQuickDispatchBtn = document.getElementById('submitQuickDispatchBtn');

    const simNotifOrderSelect = document.getElementById('simNotifOrderSelect');
    const simNotifChannelSelect = document.getElementById('simNotifChannelSelect');
    const simNotifRecipient = document.getElementById('simNotifRecipient');
    const simNotifMessage = document.getElementById('simNotifMessage');
    const submitSimulateNotifBtn = document.getElementById('submitSimulateNotifBtn');

    // Return Tracking Elements (Tanvir's - Feature 2)
    const retKpiTotal = document.getElementById('retKpiTotal');
    const retKpiMailedBack = document.getElementById('retKpiMailedBack');
    const retKpiAtWarehouse = document.getElementById('retKpiAtWarehouse');
    const retKpiRefundVolume = document.getElementById('retKpiRefundVolume');
    const viewReturnsPipelineBtn = document.getElementById('viewReturnsPipelineBtn');
    const viewReturnsTableBtn = document.getElementById('viewReturnsTableBtn');
    const openGlobalReturnModalBtn = document.getElementById('openGlobalReturnModalBtn');
    const filterReturnStatus = document.getElementById('filterReturnStatus');
    const searchReturnInput = document.getElementById('searchReturnInput');
    const returnsPipelineView = document.getElementById('returnsPipelineView');
    const returnsCardsContainer = document.getElementById('returnsCardsContainer');
    const returnsTableView = document.getElementById('returnsTableView');
    const returnsTableBody = document.getElementById('returnsTableBody');
    const returnsTableCountBadge = document.getElementById('returnsTableCountBadge');

    const globalReturnModal = document.getElementById('globalReturnModal');
    const globalReturnOrderSelect = document.getElementById('globalReturnOrderSelect');
    const globalReturnReason = document.getElementById('globalReturnReason');
    const globalReturnAmount = document.getElementById('globalReturnAmount');
    const closeGlobalReturnModalBtn = document.getElementById('closeGlobalReturnModalBtn');
    const submitGlobalReturnBtn = document.getElementById('submitGlobalReturnBtn');

    const advanceReturnWorkflowModal = document.getElementById('advanceReturnWorkflowModal');
    const advanceReturnTitle = document.getElementById('advanceReturnTitle');
    const advanceReturnOrderNumber = document.getElementById('advanceReturnOrderNumber');
    const advanceReturnCustomer = document.getElementById('advanceReturnCustomer');
    const advanceReturnCurrentStatus = document.getElementById('advanceReturnCurrentStatus');
    const advanceReturnRefundVal = document.getElementById('advanceReturnRefundVal');
    const advanceReturnNextStatus = document.getElementById('advanceReturnNextStatus');
    const advanceReturnAmountInput = document.getElementById('advanceReturnAmountInput');
    const advanceReturnCreditNotice = document.getElementById('advanceReturnCreditNotice');
    const closeAdvanceReturnModalBtn = document.getElementById('closeAdvanceReturnModalBtn');
    const submitAdvanceReturnBtn = document.getElementById('submitAdvanceReturnBtn');

    // Missing Sales Report Elements (Tanvir's - Feature 1)
    const msKpiTotalCustomers = document.getElementById('msKpiTotalCustomers');
    const msKpiPenetrationRate = document.getElementById('msKpiPenetrationRate');
    const msKpiMissingCount = document.getElementById('msKpiMissingCount');
    const msKpiPurchasedCount = document.getElementById('msKpiPurchasedCount');
    const viewMissingSalesListBtn = document.getElementById('viewMissingSalesListBtn');
    const viewMissingSalesMatrixBtn = document.getElementById('viewMissingSalesMatrixBtn');
    const openPromoCampaignModalBtn = document.getElementById('openPromoCampaignModalBtn');
    const missingSalesItemPills = document.getElementById('missingSalesItemPills');
    const targetItemName = document.getElementById('targetItemName');
    const targetItemSku = document.getElementById('targetItemSku');
    const targetItemAdoptionText = document.getElementById('targetItemAdoptionText');
    const targetItemProgressBar = document.getElementById('targetItemProgressBar');
    const targetItemPenetrationBadge = document.getElementById('targetItemPenetrationBadge');
    const missingCustomersListView = document.getElementById('missingCustomersListView');
    const missingCustomersCardsContainer = document.getElementById('missingCustomersCardsContainer');
    const missingCustomersCountBadge = document.getElementById('missingCustomersCountBadge');
    const purchasedCustomersTableBody = document.getElementById('purchasedCustomersTableBody');
    const purchasedCustomersCountBadge = document.getElementById('purchasedCustomersCountBadge');

    const missingSalesMatrixView = document.getElementById('missingSalesMatrixView');
    const matrixItemsCountBadge = document.getElementById('matrixItemsCountBadge');
    const penetrationMatrixThead = document.getElementById('penetrationMatrixThead');
    const penetrationMatrixTbody = document.getElementById('penetrationMatrixTbody');

    const promoCampaignModal = document.getElementById('promoCampaignModal');
    const campaignItemName = document.getElementById('campaignItemName');
    const campaignMissingCount = document.getElementById('campaignMissingCount');
    const campaignChannelSelect = document.getElementById('campaignChannelSelect');
    const campaignPromoMessage = document.getElementById('campaignPromoMessage');
    const closePromoCampaignModalBtn = document.getElementById('closePromoCampaignModalBtn');
    const submitPromoCampaignBtn = document.getElementById('submitPromoCampaignBtn');

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
    // =========================================================================
    // Dual Portal & Module Navigation Switching (RBAC Enforced)
    // =========================================================================
    const allWarehouseNavBtns = [navStockMatrixBtn, navInventoryBtn, navGoodsMonitoringBtn, navDispatchBtn, navCoverageBtn, navDriversBtn, navReturnsBtn, navMissingSalesBtn, navNotificationsBtn];
    const allWarehouseSections = [stockMatrixSection, lowStockSection, goodsMonitoringSection, dispatchSection, coverageMapSection, driverEarningsSection, returnsSection, missingSalesSection, notificationsSection];

    function switchPortal(portalName) {
        currentPortal = portalName;

        if (portalName === 'customer') {
            portalCustomerBtn?.classList.add('active');
            portalWarehouseBtn?.classList.remove('active');

            warehouseNavPills?.classList.add('hidden');
            customerNavPills?.classList.remove('hidden');

            // Hide all warehouse sections
            allWarehouseSections.forEach(sec => sec?.classList.add('hidden'));

            if (currentCustomer) {
                authSection?.classList.add('hidden');
                customerModuleWrapper?.classList.remove('hidden');
                renderAuthUI();
                loadDashboard();
            } else {
                customerModuleWrapper?.classList.add('hidden');
                authSection?.classList.remove('hidden');
                renderAuthUI();
            }
        } else if (portalName === 'warehouse') {
            portalWarehouseBtn?.classList.add('active');
            portalCustomerBtn?.classList.remove('active');

            customerNavPills?.classList.add('hidden');
            customerModuleWrapper?.classList.add('hidden');

            if (currentWarehouseUser) {
                warehouseNavPills?.classList.remove('hidden');
                authSection?.classList.add('hidden');
                renderAuthUI();
                // Default to stock-matrix on warehouse entrance
                switchModule(activeModule === 'customer' ? 'stock-matrix' : activeModule);
            } else {
                warehouseNavPills?.classList.add('hidden');
                allWarehouseSections.forEach(sec => sec?.classList.add('hidden'));
                authSection?.classList.remove('hidden');
                renderAuthUI();
            }
        }
    }

    portalCustomerBtn?.addEventListener('click', () => switchPortal('customer'));
    portalWarehouseBtn?.addEventListener('click', () => switchPortal('warehouse'));

    function switchModule(moduleName) {
        activeModule = moduleName;

        if (moduleName === 'customer') {
            switchPortal('customer');
            return;
        }

        // Warehouse Module Navigation with RBAC Check
        if (!currentWarehouseUser) {
            showToast('Warehouse Manager access required. Please sign in with your Warehouse ID.', 'error');
            switchPortal('warehouse');
            return;
        }

        // Highlight active nav pill
        allWarehouseNavBtns.forEach(btn => btn?.classList.remove('active'));
        allWarehouseSections.forEach(sec => sec?.classList.add('hidden'));
        authSection?.classList.add('hidden');
        customerModuleWrapper?.classList.add('hidden');

        if (moduleName === 'stock-matrix') {
            navStockMatrixBtn?.classList.add('active');
            stockMatrixSection?.classList.remove('hidden');
            loadStockMatrixModule();
        } else if (moduleName === 'inventory') {
            navInventoryBtn?.classList.add('active');
            lowStockSection?.classList.remove('hidden');
            loadInventoryModule();
        } else if (moduleName === 'goods-monitoring') {
            navGoodsMonitoringBtn?.classList.add('active');
            goodsMonitoringSection?.classList.remove('hidden');
            loadGoodsMonitoringModule();
        } else if (moduleName === 'dispatch') {
            navDispatchBtn?.classList.add('active');
            dispatchSection?.classList.remove('hidden');
            loadDispatchModule();
        } else if (moduleName === 'coverage') {
            navCoverageBtn?.classList.add('active');
            coverageMapSection?.classList.remove('hidden');
            loadCoverageMapModule();
        } else if (moduleName === 'drivers') {
            navDriversBtn?.classList.add('active');
            driverEarningsSection?.classList.remove('hidden');
            loadDriverEarningsModule();
        } else if (moduleName === 'returns') {
            navReturnsBtn?.classList.add('active');
            returnsSection?.classList.remove('hidden');
            loadReturnsModule();
        } else if (moduleName === 'missing-sales') {
            navMissingSalesBtn?.classList.add('active');
            missingSalesSection?.classList.remove('hidden');
            loadMissingSalesModule();
        } else if (moduleName === 'notifications') {
            navNotificationsBtn?.classList.add('active');
            notificationsSection?.classList.remove('hidden');
            loadNotificationsModule();
        }
    }

    navCustomerBtn?.addEventListener('click', () => switchModule('customer'));
    navStockMatrixBtn?.addEventListener('click', () => switchModule('stock-matrix'));
    navInventoryBtn?.addEventListener('click', () => switchModule('inventory'));
    navGoodsMonitoringBtn?.addEventListener('click', () => switchModule('goods-monitoring'));
    navDispatchBtn?.addEventListener('click', () => switchModule('dispatch'));
    navCoverageBtn?.addEventListener('click', () => switchModule('coverage'));
    navDriversBtn?.addEventListener('click', () => switchModule('drivers'));
    navReturnsBtn?.addEventListener('click', () => switchModule('returns'));
    navMissingSalesBtn?.addEventListener('click', () => switchModule('missing-sales'));
    navNotificationsBtn?.addEventListener('click', () => switchModule('notifications'));

    // =========================================================================
    // DUAL AUTHENTICATION & DEMO USERS (Customers & Warehouse Managers)
    // =========================================================================
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
                            currentWarehouseUser = null;
                            showToast(loginRes.message || `Logged in as customer ${c.name}`);
                            switchPortal('customer');
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    });
                    demoChipsContainer.appendChild(chip);
                });
            }
        } catch (err) {
            console.error('Demo customers load failed:', err.message);
        }
    }

    async function loadDemoWarehouseUsers() {
        try {
            const res = await api.getDemoWarehouseUsers();
            if (res.success && res.warehouseUsers) {
                demoWarehouseUsers = res.warehouseUsers;
                warehouseDemoChipsContainer.innerHTML = '';
                res.warehouseUsers.forEach(wu => {
                    const chip = document.createElement('button');
                    chip.className = 'demo-chip warehouse-chip';
                    chip.innerHTML = `<span>🏢</span> <strong>WH #${wu.warehouse_id}</strong>: ${wu.warehouse_name} (${wu.location_zone})`;
                    chip.title = `Login as Warehouse Manager #${wu.warehouse_id} (Username: ${wu.username}, Password: password123)`;
                    chip.addEventListener('click', async () => {
                        try {
                            const loginRes = await api.warehouseDemoLogin(wu.warehouse_id);
                            currentWarehouseUser = loginRes.warehouse_user;
                            currentCustomer = null;
                            showToast(`Authenticated as Warehouse Manager: ${loginRes.warehouse_user.full_name}`);
                            switchPortal('warehouse');
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    });
                    warehouseDemoChipsContainer.appendChild(chip);
                });
            }
        } catch (err) {
            console.error('Demo warehouse users load failed:', err.message);
        }
    }

    // Customer Login Submit
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = document.getElementById('loginIdentifier').value.trim();
        if (!val) return;
        try {
            const res = await api.login(val);
            currentCustomer = res.customer;
            currentWarehouseUser = null;
            showToast(res.message);
            switchPortal('customer');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Customer Signup Submit
    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const phone_number = document.getElementById('signupPhone').value.trim();
        const address = document.getElementById('signupAddress').value.trim();
        const initial_credit = parseFloat(document.getElementById('signupCredit').value) || 0.00;

        try {
            const res = await api.signup({ name, phone_number, address, initial_credit });
            currentCustomer = res.customer;
            currentWarehouseUser = null;
            showToast(res.message);
            switchPortal('customer');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Warehouse Manager Login Submit (Username = Warehouse ID, Password)
    warehouseLoginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = warehouseUsernameInput?.value.trim();
        const password = warehousePasswordInput?.value.trim();

        if (!username || !password) {
            showToast('Please enter your Warehouse ID and password.', 'error');
            return;
        }

        try {
            const res = await api.warehouseLogin(username, password);
            currentWarehouseUser = res.warehouse_user;
            currentCustomer = null;
            showToast(res.message);
            switchPortal('warehouse');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    logoutBtn?.addEventListener('click', () => {
        api.logout();
        currentCustomer = null;
        currentWarehouseUser = null;
        dashboardData = null;
        renderAuthUI();
        if (currentPortal === 'customer') {
            customerModuleWrapper?.classList.add('hidden');
        } else {
            allWarehouseSections.forEach(sec => sec?.classList.add('hidden'));
            warehouseNavPills?.classList.add('hidden');
        }
        authSection?.classList.remove('hidden');
        showToast('Signed out successfully.');
    });

    function renderAuthUI() {
        if (currentPortal === 'customer') {
            authPortalHeading.textContent = '👤 Customer Portal Access';
            authPortalSubtitle.textContent = 'Sign in with your customer account to place orders, track deliveries, and manage returns.';

            customerAuthTabs?.classList.remove('hidden');
            loginForm?.classList.remove('hidden');
            customerDemoBox?.classList.remove('hidden');
            warehouseLoginForm?.classList.add('hidden');
            warehouseDemoBox?.classList.add('hidden');

            if (currentCustomer) {
                authSection?.classList.add('hidden');
                customerModuleWrapper?.classList.remove('hidden');
                dashboardSection?.classList.remove('hidden');
                userPill?.classList.remove('hidden');
                logoutBtn?.classList.remove('hidden');
                userNameSpan.textContent = currentCustomer.name;
                userAvatar.textContent = currentCustomer.name.charAt(0).toUpperCase();
                if (userRoleBadge) {
                    userRoleBadge.textContent = 'Customer';
                    userRoleBadge.className = 'user-role-badge';
                }
            } else {
                authSection?.classList.remove('hidden');
                customerModuleWrapper?.classList.add('hidden');
                userPill?.classList.add('hidden');
                logoutBtn?.classList.add('hidden');
            }
        } else if (currentPortal === 'warehouse') {
            authPortalHeading.textContent = '🏢 Warehouse Operations Portal';
            authPortalSubtitle.textContent = 'Sign in with your Warehouse ID entity credentials (WH ID 1-4) to manage inventory, quarantine & dispatch.';

            customerAuthTabs?.classList.add('hidden');
            loginForm?.classList.add('hidden');
            signupForm?.classList.add('hidden');
            customerDemoBox?.classList.add('hidden');
            warehouseLoginForm?.classList.remove('hidden');
            warehouseDemoBox?.classList.remove('hidden');

            if (currentWarehouseUser) {
                authSection?.classList.add('hidden');
                userPill?.classList.remove('hidden');
                logoutBtn?.classList.remove('hidden');
                userNameSpan.textContent = currentWarehouseUser.full_name;
                userAvatar.textContent = '🏢';
                if (userRoleBadge) {
                    userRoleBadge.textContent = `${currentWarehouseUser.warehouse_name} (WH #${currentWarehouseUser.warehouse_id})`;
                    userRoleBadge.className = 'user-role-badge role-warehouse';
                }
            } else {
                authSection?.classList.remove('hidden');
                userPill?.classList.add('hidden');
                logoutBtn?.classList.add('hidden');
            }
        }
    }

    async function loadDashboard() {
        try {
            const res = await api.getDashboard();
            if (res.success && res.dashboard) {
                dashboardData = res.dashboard;
                renderDashboard();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderDashboard() {
        if (!dashboardData) return;
        const { customer, orders: customerOrders, returns: customerReturns, summary } = dashboardData;

        customerNameEl.textContent = customer.name.split(' ')[0];
        customerAddressEl.textContent = customer.address;
        customerPhoneEl.textContent = customer.phone_number;

        metricStoreCredit.textContent = `$${parseFloat(summary.storeCreditBalance || 0).toFixed(2)}`;
        metricTotalOrders.textContent = summary.totalOrders;
        metricActiveOrders.textContent = summary.activeOrders;
        metricAvgRating.textContent = summary.avgRatingGiven ? `★ ${summary.avgRatingGiven}` : '★ --';

        renderCustomerOrders(customerOrders);
        renderCustomerReturns(customerReturns);
    }

    function renderCustomerOrders(ordersList) {
        if (!ordersList || ordersList.length === 0) {
            ordersListContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No orders placed yet. Click "+ Place New Order" to start!
                </div>
            `;
            return;
        }

        ordersListContainer.innerHTML = ordersList.map(ord => {
            const isExpress = ord.shipping_type === 'Express';
            const statusClass = ord.order_status === 'Delivered' ? 'badge-delivered' :
                               (ord.order_status === 'Out for Delivery' || ord.order_status === 'Dispatched') ? 'badge-dispatched' : 'badge-pending';

            const itemsHtml = (ord.items || []).map(i => `${i.quantity}x ${i.item_name}`).join(', ') || 'No items detail';

            const hasReview = ord.star_rating !== null;
            const reviewButtonHtml = ord.order_status === 'Delivered' ? `
                <button class="btn btn-outline btn-sm open-review-btn" data-order-id="${ord.order_id}" data-rating="${ord.star_rating || 5}" data-comment="${ord.review_comment || ''}">
                    ${hasReview ? `★ ${ord.star_rating} (Edit Review)` : '★ Rate Delivery'}
                </button>
            ` : '';

            const returnButtonHtml = ord.order_status === 'Delivered' ? `
                <button class="btn btn-outline btn-sm open-return-btn" data-order-id="${ord.order_id}" style="color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.3);">
                    ↩ Return Items
                </button>
            ` : '';

            const driverHtml = ord.driver_name ? `
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.4rem;">
                    🚚 Assigned Driver: <strong style="color: var(--text-primary);">${ord.driver_name}</strong>
                    ${ord.driver_rating ? `<span style="color: #fbbf24; margin-left: 0.3rem;">★ ${parseFloat(ord.driver_rating).toFixed(2)}</span>` : ''}
                </div>
            ` : '<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.4rem;">🚚 Driver: Awaiting assignment in fulfillment queue</div>';

            return `
                <div class="order-item-card">
                    <div class="order-card-header">
                        <div class="order-id-title">
                            Order #${ord.order_id}
                            <span class="badge ${isExpress ? 'badge-express' : 'badge-standard'}">
                                ${isExpress ? '⚡ Express Shipping' : 'Standard Delivery'}
                            </span>
                        </div>
                        <span class="badge ${statusClass}">${ord.order_status}</span>
                    </div>
                    <div class="order-card-body">
                        <div style="font-size: 0.85rem; color: var(--text-primary); font-weight: 500;">
                            <strong>Items:</strong> ${itemsHtml}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                            📍 Delivery Destination: ${ord.address} (Zip: ${ord.zip_code})
                        </div>
                        ${driverHtml}
                        ${hasReview ? `<div style="font-size: 0.8rem; color: #fbbf24; margin-top: 0.35rem;">Review: "${ord.review_comment || 'No textual comment'}"</div>` : ''}
                    </div>
                    <div class="order-card-actions">
                        ${reviewButtonHtml}
                        ${returnButtonHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners for customer reviews & returns
        document.querySelectorAll('.open-review-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = parseInt(btn.dataset.orderId, 10);
                activeReviewOrderId = orderId;
                document.getElementById('reviewOrderTitle').textContent = `Order #${orderId}`;
                document.getElementById('reviewComment').value = btn.dataset.comment || '';
                setStarRating(parseInt(btn.dataset.rating, 10) || 5);
                reviewModal?.classList.remove('hidden');
            });
        });

        document.querySelectorAll('.open-return-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = parseInt(btn.dataset.orderId, 10);
                activeReturnOrderId = orderId;
                document.getElementById('returnOrderTitle').textContent = `Order #${orderId}`;
                returnModal?.classList.remove('hidden');
            });
        });
    }

    function renderCustomerReturns(returnsList) {
        if (!returnsList || returnsList.length === 0) {
            returnsListContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.85rem;">
                    No returns submitted. Eligible delivered orders can initiate returns for instant store credit.
                </div>
            `;
            return;
        }

        returnsListContainer.innerHTML = returnsList.map(ret => {
            const badgeCls = getReturnBadgeClass(ret.status);
            const step = ret.workflow?.step || (ret.status === 'Refund Approved' || ret.status === 'Refund Credited' ? 4 : ret.status === 'Arrived at Warehouse' ? 3 : ret.status === 'Mailed Back' ? 2 : 1);

            return `
                <div class="return-item-card" style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.3rem;">
                        <strong style="color: var(--text-primary); font-size: 0.9rem;">Return #${ret.return_id} (Order #${ret.order_id})</strong>
                        <span class="badge ${badgeCls}" style="font-size: 0.7rem;">${ret.status}</span>
                    </div>
                    <div class="workflow-stepper" style="margin: 0.5rem 0;">
                        <div class="workflow-step ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}">
                            <div class="step-node" style="width: 22px; height: 22px; font-size: 0.65rem;">${step > 1 ? '✓' : '1'}</div>
                            <span class="step-text" style="font-size: 0.65rem;">Initiated</span>
                        </div>
                        <div class="workflow-step ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}">
                            <div class="step-node" style="width: 22px; height: 22px; font-size: 0.65rem;">${step > 2 ? '✓' : '2'}</div>
                            <span class="step-text" style="font-size: 0.65rem;">Mailed Back</span>
                        </div>
                        <div class="workflow-step ${step >= 3 ? (step > 3 ? 'completed' : 'active') : ''}">
                            <div class="step-node" style="width: 22px; height: 22px; font-size: 0.65rem;">${step > 3 ? '✓' : '3'}</div>
                            <span class="step-text" style="font-size: 0.65rem;">At Hub</span>
                        </div>
                        <div class="workflow-step ${step >= 4 ? 'completed' : ''}">
                            <div class="step-node" style="width: 22px; height: 22px; font-size: 0.65rem;">${step >= 4 ? '✓' : '4'}</div>
                            <span class="step-text" style="font-size: 0.65rem;">Refunded</span>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.35rem;">
                        <span>Requested: ${ret.date_requested}</span>
                        <strong style="color: var(--accent-success);">+$${parseFloat(ret.refund_amount || 0).toFixed(2)} Store Credit</strong>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Star Rating Widget
    function setStarRating(val) {
        selectedRating = val;
        document.querySelectorAll('#starRatingInput .star-item').forEach(star => {
            const v = parseInt(star.dataset.value, 10);
            if (v <= val) star.classList.add('active');
            else star.classList.remove('active');
        });
    }

    document.querySelectorAll('#starRatingInput .star-item').forEach(star => {
        star.addEventListener('click', () => {
            setStarRating(parseInt(star.dataset.value, 10));
        });
    });

    closeReviewModalBtn?.addEventListener('click', () => reviewModal?.classList.add('hidden'));
    closeReturnModalBtn?.addEventListener('click', () => returnModal?.classList.add('hidden'));
    closeNewOrderModalBtn?.addEventListener('click', () => newOrderModal?.classList.add('hidden'));

    submitReviewBtn?.addEventListener('click', async () => {
        if (!activeReviewOrderId) return;
        const reviewText = document.getElementById('reviewComment').value.trim();
        try {
            const res = await api.submitReview(activeReviewOrderId, {
                star_rating: selectedRating,
                review_comment: reviewText
            });
            showToast(res.message);
            reviewModal?.classList.add('hidden');
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    submitReturnBtn?.addEventListener('click', async () => {
        if (!activeReturnOrderId) return;
        const reason = document.getElementById('returnReason').value;
        const refundAmount = parseFloat(document.getElementById('returnAmount').value) || 25.0;

        try {
            const res = await api.submitReturn(activeReturnOrderId, {
                reason,
                refund_amount: refundAmount
            });
            showToast(res.message);
            returnModal?.classList.add('hidden');
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Place Order Modal Logic
    openNewOrderBtn?.addEventListener('click', () => {
        if (!currentCustomer) return;
        document.getElementById('orderAddress').value = currentCustomer.address || '';
        renderOrderItemsPicker();
        newOrderModal?.classList.remove('hidden');
    });

    async function loadCatalogItems() {
        try {
            const res = await api.getItems();
            if (res.success && res.items) {
                catalogItems = res.items;
            }
        } catch (err) {
            console.error('Catalog items fetch:', err.message);
        }
    }

    function renderOrderItemsPicker() {
        orderItemsContainer.innerHTML = '';
        addOrderItemRow();
    }

    function addOrderItemRow() {
        const row = document.createElement('div');
        row.className = 'order-item-row';
        row.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;';

        const optionsHtml = catalogItems.map(i => `<option value="${i.item_id}">${i.name} (${i.sku})</option>`).join('');

        row.innerHTML = `
            <select class="form-select item-select" style="flex: 2;">
                ${optionsHtml}
            </select>
            <input type="number" class="form-input item-qty" value="1" min="1" max="100" style="width: 80px;" placeholder="Qty">
            <button type="button" class="btn btn-outline btn-sm remove-row-btn" style="color: var(--accent-danger); padding: 0.35rem 0.6rem;">✕</button>
        `;

        row.querySelector('.remove-row-btn').addEventListener('click', () => {
            if (orderItemsContainer.children.length > 1) {
                row.remove();
            } else {
                showToast('At least one item is required in the order.', 'error');
            }
        });

        orderItemsContainer.appendChild(row);
    }

    addItemBtn?.addEventListener('click', () => addOrderItemRow());

    submitOrderBtn?.addEventListener('click', async () => {
        const shipping_type = document.getElementById('orderShippingType').value;
        const zip_code = document.getElementById('orderZip').value.trim();
        const address = document.getElementById('orderAddress').value.trim();

        const itemRows = orderItemsContainer.querySelectorAll('.order-item-row');
        const items = [];
        itemRows.forEach(row => {
            const itemId = parseInt(row.querySelector('.item-select').value, 10);
            const quantity = parseInt(row.querySelector('.item-qty').value, 10) || 1;
            if (itemId && quantity > 0) {
                items.push({ item_id: itemId, quantity });
            }
        });

        if (!zip_code || !address || items.length === 0) {
            showToast('Please fill in all order destination and item details.', 'error');
            return;
        }

        try {
            const res = await api.placeOrder({
                shipping_type,
                zip_code,
                address,
                items
            });
            showToast(res.message);
            newOrderModal?.classList.add('hidden');
            loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE 2: DRIVER EARNINGS & PAYROLL (Moin's - Feature 2)
    // =========================================================================
    async function loadDriverEarningsModule() {
        try {
            const [kpiRes, driversRes] = await Promise.all([
                api.getDriverKPIs(),
                api.getDrivers()
            ]);

            if (kpiRes.success && kpiRes.kpis) {
                driverKpiTotalDrivers.textContent = kpiRes.kpis.totalDrivers;
                driverKpiTotalTrips.textContent = kpiRes.kpis.totalTrips;
                driverKpiTotalDistance.textContent = `${kpiRes.kpis.totalDistanceMiles} mi`;
                driverKpiTotalPayout.textContent = `$${parseFloat(kpiRes.kpis.totalPayoutRecorded || 0).toFixed(2)}`;
            }

            if (driversRes.success && driversRes.drivers) {
                driversList = driversRes.drivers;
                renderDriverPills();
                if (driversList.length > 0) {
                    if (!driversList.some(d => d.driver_id === selectedDriverId)) {
                        selectedDriverId = driversList[0].driver_id;
                    }
                    await selectDriver(selectedDriverId);
                }
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderDriverPills() {
        driverPillsContainer.innerHTML = '';
        driversList.forEach(d => {
            const pill = document.createElement('button');
            pill.className = `driver-pill ${d.driver_id === selectedDriverId ? 'active' : ''}`;
            pill.innerHTML = `<span>👤</span> ${d.full_name} (${d.location_zone || 'Hub'})`;
            pill.addEventListener('click', () => selectDriver(d.driver_id));
            driverPillsContainer.appendChild(pill);
        });
    }

    async function selectDriver(driverId) {
        selectedDriverId = driverId;
        renderDriverPills();

        const driver = driversList.find(d => d.driver_id === driverId);
        if (driver) {
            currentDriverTitleName.textContent = `${driver.full_name}'s Rates & Earnings`;
            currentDriverStatusBadge.textContent = driver.status_flag || 'Available';
            currentDriverStatusBadge.className = `badge ${driver.status_flag === 'Busy' || driver.status_flag === 'On Trip' ? 'badge-dispatched' : driver.status_flag === 'Under Review' ? 'badge-warning' : 'badge-delivered'}`;
            currentDriverBaseRate.textContent = `$${parseFloat(driver.base_rate || 25).toFixed(2)}`;
            currentDriverMileageBonus.textContent = `$${parseFloat(driver.per_km_bonus || 0.45).toFixed(2)} / mi`;
            currentDriverRating.textContent = `★ ${parseFloat(driver.rating || 5.0).toFixed(2)}`;
            currentDriverLifetimeTrips.textContent = driver.total_trips || 0;
        }

        await runWeeklyCalculation();
        await loadDriverTripsAndPaychecks(driverId);
    }

    async function runWeeklyCalculation() {
        const start = calcWeekStart.value;
        const end = calcWeekEnd.value;

        try {
            const res = await api.getWeeklyCalculation(selectedDriverId, start, end);
            if (res.success && res.calculation) {
                selectedDriverCalculation = res.calculation;
                const calc = res.calculation;

                calcWeekStart.value = calc.week_start;
                calcWeekEnd.value = calc.week_end;

                stepBasePay.textContent = `$${calc.base_earnings_total.toFixed(2)}`;
                stepBaseFormula.textContent = `${calc.trip_count} trips × $${calc.base_rate.toFixed(2)}`;

                stepMileagePay.textContent = `$${calc.mileage_earnings_total.toFixed(2)}`;
                stepMileageFormula.textContent = `${calc.total_distance_miles.toFixed(2)} mi × $${calc.per_km_bonus.toFixed(2)}`;

                stepTotalEarnings.textContent = `$${calc.total_weekly_earnings.toFixed(2)}`;
                stepPaycheckStatus.textContent = `Calculated across ${calc.trip_count} completed trips`;

                if (calc.is_already_issued) {
                    paycheckIssuedNotice.innerHTML = `<span style="color: var(--accent-success);">✓ Paycheck #${calc.existing_paycheck.paycheck_id} of $${parseFloat(calc.existing_paycheck.total_amount).toFixed(2)} already issued for this week period.</span>`;
                    generatePaycheckActionBtn.disabled = true;
                    generatePaycheckActionBtn.textContent = 'Paycheck Already Recorded';
                } else {
                    paycheckIssuedNotice.innerHTML = `<span style="color: var(--accent-warning);">⚡ Compensation computed. Click to record weekly paycheck.</span>`;
                    generatePaycheckActionBtn.disabled = false;
                    generatePaycheckActionBtn.innerHTML = `<span>💳</span> Generate & Record Paycheck ($${calc.total_weekly_earnings.toFixed(2)})`;
                }
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    recalculateEarningsBtn?.addEventListener('click', () => runWeeklyCalculation());

    datePresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            datePresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const preset = btn.dataset.preset;
            const now = new Date();
            if (preset === 'last7') {
                const s = new Date(now);
                s.setDate(now.getDate() - 6);
                calcWeekStart.value = s.toISOString().split('T')[0];
                calcWeekEnd.value = now.toISOString().split('T')[0];
            } else if (preset === 'thisWeek') {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const s = new Date(now.setDate(diff));
                calcWeekStart.value = s.toISOString().split('T')[0];
                calcWeekEnd.value = new Date().toISOString().split('T')[0];
            } else if (preset === 'allTime') {
                calcWeekStart.value = '2026-08-01';
                calcWeekEnd.value = '2026-08-31';
            }
            runWeeklyCalculation();
        });
    });

    async function loadDriverTripsAndPaychecks(driverId) {
        try {
            const [tripsRes, paychecksRes] = await Promise.all([
                api.getDriverTrips(driverId),
                api.getDriverPaychecks(driverId)
            ]);

            if (tripsRes.success && tripsRes.trips) {
                driverTripCountBadge.textContent = `${tripsRes.trips.length} Trips`;
                if (tripsRes.trips.length === 0) {
                    driverTripsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No trips logged yet for this driver.</td></tr>`;
                } else {
                    driverTripsTableBody.innerHTML = tripsRes.trips.map(t => `
                        <tr>
                            <td><strong>#${t.trip_id}</strong></td>
                            <td style="font-size: 0.8rem; color: var(--text-secondary);">${t.start_time}</td>
                            <td>${parseFloat(t.distance_miles).toFixed(1)} mi</td>
                            <td style="text-align: right; color: var(--accent-success); font-weight: 700;">$${parseFloat(t.calculated_trip_pay || 0).toFixed(2)}</td>
                        </tr>
                    `).join('');
                }
            }

            if (paychecksRes.success && paychecksRes.paychecks) {
                driverPaycheckCountBadge.textContent = `${paychecksRes.paychecks.length} Records`;
                if (paychecksRes.paychecks.length === 0) {
                    driverPaychecksTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No paychecks issued yet.</td></tr>`;
                } else {
                    driverPaychecksTableBody.innerHTML = paychecksRes.paychecks.map(p => `
                        <tr>
                            <td><strong>#${p.paycheck_id}</strong></td>
                            <td style="font-size: 0.8rem; color: var(--text-secondary);">${p.week_start} &rarr; ${p.week_end}</td>
                            <td><span class="badge badge-delivered" style="font-size: 0.7rem;">Paid & Recorded</span></td>
                            <td style="text-align: right; color: var(--accent-success); font-weight: 700;">$${parseFloat(p.total_amount).toFixed(2)}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error('Trips and paychecks fetch:', err.message);
        }
    }

    generatePaycheckActionBtn?.addEventListener('click', () => {
        if (!selectedDriverCalculation) return;
        const calc = selectedDriverCalculation;
        confirmPaycheckDriver.textContent = calc.driver.full_name;
        confirmPaycheckRange.textContent = `${calc.week_start} to ${calc.week_end}`;
        confirmPaycheckTrips.textContent = `${calc.trip_count} Trips (${calc.total_distance_miles} mi)`;
        confirmPaycheckAmount.textContent = `$${calc.total_weekly_earnings.toFixed(2)}`;
        confirmPaycheckOverride.value = calc.total_weekly_earnings.toFixed(2);
        issuePaycheckModal?.classList.remove('hidden');
    });

    closeIssuePaycheckModalBtn?.addEventListener('click', () => issuePaycheckModal?.classList.add('hidden'));

    confirmIssuePaycheckBtn?.addEventListener('click', async () => {
        if (!selectedDriverCalculation) return;
        const calc = selectedDriverCalculation;
        const overrideAmount = parseFloat(confirmPaycheckOverride.value);

        try {
            const res = await api.generatePaycheck(selectedDriverId, {
                week_start: calc.week_start,
                week_end: calc.week_end,
                override_amount: overrideAmount
            });
            showToast(res.message);
            issuePaycheckModal?.classList.add('hidden');
            await loadDriverEarningsModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Log Trip Modal
    openLogTripModalBtn?.addEventListener('click', () => {
        logTripDriverSelect.innerHTML = driversList.map(d => `<option value="${d.driver_id}" ${d.driver_id === selectedDriverId ? 'selected' : ''}>${d.full_name} ($${parseFloat(d.base_rate).toFixed(2)} base + $${parseFloat(d.per_km_bonus).toFixed(2)}/mi)</option>`).join('');

        const now = new Date();
        const start = new Date(now.getTime() - (2.5 * 60 * 60 * 1000));
        logTripStartTime.value = start.toISOString().substring(0, 16);
        logTripEndTime.value = now.toISOString().substring(0, 16);
        logTripDistance.value = '32.50';

        updateLogTripPayoutPreview();
        logTripModal?.classList.remove('hidden');
    });

    closeLogTripModalBtn?.addEventListener('click', () => logTripModal?.classList.add('hidden'));

    function updateLogTripPayoutPreview() {
        const driverId = parseInt(logTripDriverSelect.value, 10);
        const driver = driversList.find(d => d.driver_id === driverId) || { base_rate: 25.0, per_km_bonus: 0.45 };
        const dist = parseFloat(logTripDistance.value) || 0;
        const base = parseFloat(driver.base_rate) || 25.0;
        const bonus = parseFloat(driver.per_km_bonus) || 0.45;
        const mileagePay = dist * bonus;
        const total = base + mileagePay;
        logTripPayoutPreview.textContent = `$${base.toFixed(2)} Base + $${mileagePay.toFixed(2)} Mileage = $${total.toFixed(2)}`;
    }

    logTripDriverSelect?.addEventListener('change', updateLogTripPayoutPreview);
    logTripDistance?.addEventListener('input', updateLogTripPayoutPreview);

    submitLogTripBtn?.addEventListener('click', async () => {
        const driverId = parseInt(logTripDriverSelect.value, 10);
        const start_time = logTripStartTime.value.replace('T', ' ') + ':00';
        const end_time = logTripEndTime.value.replace('T', ' ') + ':00';
        const distance_miles = parseFloat(logTripDistance.value);

        if (!driverId || !distance_miles || distance_miles <= 0) {
            showToast('Please specify valid trip details and positive mileage.', 'error');
            return;
        }

        try {
            const res = await api.logTrip(driverId, { start_time, end_time, distance_miles });
            showToast(res.message);
            logTripModal?.classList.add('hidden');
            await loadDriverEarningsModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE: DRIVER–WAREHOUSE COVERAGE MAP (Moin's - Feature 1)
    // =========================================================================
    async function loadCoverageMapModule() {
        try {
            const [kpiRes, mapRes] = await Promise.all([
                api.getCoverageKPIs(),
                api.getCoverageMap(filterCoverageZone.value)
            ]);

            if (kpiRes.success && kpiRes.kpis) {
                covKpiWarehouses.textContent = kpiRes.kpis.totalWarehouses;
                covKpiAssignedDrivers.textContent = kpiRes.kpis.coveredDrivers;
                covKpiAvailableDrivers.textContent = kpiRes.kpis.availableDrivers;
                covKpiCoverageRatio.textContent = kpiRes.kpis.driverWarehouseRatio;
            }

            if (mapRes.success) {
                coverageMapData = mapRes;
                renderCoverageViews();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderCoverageViews() {
        if (!coverageMapData) return;
        const search = searchCoverageDriver.value.trim().toLowerCase();

        // Render Cards View
        coverageCardsContainer.innerHTML = '';
        (coverageMapData.coverage || []).forEach(hub => {
            let matchedDrivers = hub.drivers || [];
            if (search) {
                matchedDrivers = matchedDrivers.filter(d =>
                    d.driver_name.toLowerCase().includes(search) ||
                    hub.warehouse_name.toLowerCase().includes(search) ||
                    hub.location_zone.toLowerCase().includes(search)
                );
            }

            const card = document.createElement('div');
            card.className = 'coverage-hub-card';

            const readiness = hub.available_drivers > 0
                ? `<span style="color: var(--accent-success);">🟢 Fully Staffed (${hub.available_drivers} Available)</span>`
                : hub.busy_drivers > 0
                ? `<span style="color: var(--accent-info);">🔵 Drivers on Active Route (${hub.busy_drivers} Busy)</span>`
                : `<span style="color: var(--accent-danger);">🔴 No Available Drivers</span>`;

            const driversListHtml = matchedDrivers.length === 0
                ? `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0;">No drivers mapped to this zone. Click "Reassign Driver Zone" to assign fleet capacity.</div>`
                : matchedDrivers.map(d => `
                    <div class="driver-mini-card">
                        <div class="driver-mini-info">
                            <div>
                                <div class="driver-mini-name">${d.driver_name}</div>
                                <div class="driver-mini-rates">$${parseFloat(d.base_rate).toFixed(0)} base + $${parseFloat(d.per_km_bonus).toFixed(2)}/mi</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span class="badge ${d.driver_status === 'Available' ? 'badge-delivered' : d.driver_status === 'Busy' || d.driver_status === 'On Trip' ? 'badge-dispatched' : 'badge-warning'}" style="font-size: 0.7rem;">
                                ${d.driver_status}
                            </span>
                            <div class="driver-mini-rating">★ ${parseFloat(d.driver_rating).toFixed(2)}</div>
                        </div>
                    </div>
                `).join('');

            card.innerHTML = `
                <div class="hub-header">
                    <div>
                        <div class="hub-title">
                            <span>🏢</span> ${hub.warehouse_name}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">Facility ID #${hub.warehouse_id}</div>
                    </div>
                    <span class="hub-zone-badge">${hub.location_zone}</span>
                </div>

                <div class="hub-stats-row">
                    <div class="hub-stat-item">
                        <div class="stat-num">${hub.total_assigned_drivers}</div>
                        <div class="stat-lbl">Fleet Assigned</div>
                    </div>
                    <div class="hub-stat-item">
                        <div class="stat-num" style="color: var(--accent-success);">${hub.available_drivers}</div>
                        <div class="stat-lbl">Available Now</div>
                    </div>
                    <div class="hub-stat-item">
                        <div class="stat-num" style="color: #fbbf24;">★ ${hub.avg_driver_rating}</div>
                        <div class="stat-lbl">Avg Rating</div>
                    </div>
                </div>

                <div class="hub-drivers-section">
                    <div class="hub-drivers-title">
                        <span>Assigned Fleet Drivers</span>
                        <span>${matchedDrivers.length} matched</span>
                    </div>
                    <div class="hub-drivers-list">
                        ${driversListHtml}
                    </div>
                </div>

                <div class="zone-readiness-indicator">
                    <span>Readiness:</span> ${readiness}
                </div>
            `;

            coverageCardsContainer.appendChild(card);
        });

        // Render Table View (Direct Join Query Visualization)
        const joinRows = coverageMapData.detailedRows || [];
        let filteredRows = joinRows;
        if (search) {
            filteredRows = filteredRows.filter(r =>
                r.driver_name.toLowerCase().includes(search) ||
                r.warehouse_name.toLowerCase().includes(search) ||
                r.location_zone.toLowerCase().includes(search)
            );
        }

        coverageTableCountBadge.textContent = `${filteredRows.length} Mapped Pairs`;

        if (filteredRows.length === 0) {
            coverageTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No driver-warehouse records found matching filters.</td></tr>`;
        } else {
            coverageTableBody.innerHTML = filteredRows.map(r => `
                <tr>
                    <td>
                        <strong>${r.warehouse_name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Facility #${r.warehouse_id}</div>
                    </td>
                    <td><span class="badge badge-standard">${r.location_zone}</span></td>
                    <td>
                        <strong>${r.driver_name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">Driver #${r.driver_id}</div>
                    </td>
                    <td>
                        <span class="badge ${r.driver_status === 'Available' ? 'badge-delivered' : r.driver_status === 'Busy' || r.driver_status === 'On Trip' ? 'badge-dispatched' : 'badge-warning'}">
                            ${r.driver_status}
                        </span>
                    </td>
                    <td style="color: #fbbf24; font-weight: 700;">★ ${parseFloat(r.driver_rating).toFixed(2)}</td>
                    <td style="font-size: 0.825rem; color: var(--text-secondary);">$${parseFloat(r.base_rate).toFixed(2)} + $${parseFloat(r.per_km_bonus).toFixed(2)}/mi</td>
                    <td><strong style="color: ${r.active_deliveries > 0 ? 'var(--accent-info)' : 'var(--text-muted)'};">${r.active_deliveries} active</strong></td>
                    <td style="text-align: right;">
                        <button class="btn btn-outline btn-sm reassign-row-btn" data-driver-id="${r.driver_id}" data-current-zone="${r.location_zone}">
                            🔄 Reassign
                        </button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.reassign-row-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    openReassignZoneModal(parseInt(btn.dataset.driverId, 10));
                });
            });
        }
    }

    // View toggles for coverage map
    viewCoverageCardsBtn?.addEventListener('click', () => {
        currentCoverageView = 'cards';
        viewCoverageCardsBtn.className = 'btn btn-primary btn-sm';
        viewCoverageTableBtn.className = 'btn btn-outline btn-sm';
        coverageCardsView?.classList.remove('hidden');
        coverageTableView?.classList.add('hidden');
    });

    viewCoverageTableBtn?.addEventListener('click', () => {
        currentCoverageView = 'table';
        viewCoverageTableBtn.className = 'btn btn-primary btn-sm';
        viewCoverageCardsBtn.className = 'btn btn-outline btn-sm';
        coverageCardsView?.classList.add('hidden');
        coverageTableView?.classList.remove('hidden');
    });

    filterCoverageZone?.addEventListener('change', () => loadCoverageMapModule());
    searchCoverageDriver?.addEventListener('input', () => renderCoverageViews());

    // Reassign Driver Zone Modal
    function openReassignZoneModal(selectedId = null) {
        const dList = coverageMapData?.allDrivers || driversList;
        reassignDriverSelect.innerHTML = dList.map(d => `<option value="${d.driver_id}" ${d.driver_id === selectedId ? 'selected' : ''}>${d.full_name} (Current: ${d.location_zone || 'Unassigned'})</option>`).join('');
        reassignZoneModal?.classList.remove('hidden');
    }

    openReassignZoneModalBtn?.addEventListener('click', () => openReassignZoneModal());
    closeReassignZoneModalBtn?.addEventListener('click', () => reassignZoneModal?.classList.add('hidden'));

    submitReassignZoneBtn?.addEventListener('click', async () => {
        const driverId = parseInt(reassignDriverSelect.value, 10);
        const locationZone = reassignZoneSelect.value;

        if (!driverId || !locationZone) {
            showToast('Please select driver and target zone.', 'error');
            return;
        }

        try {
            const res = await api.updateDriverZone(driverId, locationZone);
            showToast(res.message);
            reassignZoneModal?.classList.add('hidden');
            await loadCoverageMapModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE: ORDER DISPATCH & PRIORITY QUEUE (Moin's - Feature 3)
    // =========================================================================
    async function loadDispatchModule() {
        try {
            const [sumRes, batchRes, ordRes, driversRes] = await Promise.all([
                api.getDispatchSummary(),
                api.getDispatchBatches(),
                api.getDispatchOrders({
                    status: document.querySelector('#dispatchBatchesView .filter-chip.active')?.dataset.filterStatus || 'all',
                    zone: dispatchTableZoneFilter?.value || 'all',
                    shipping_type: dispatchTablePriorityFilter?.value || 'all'
                }),
                api.getDrivers()
            ]);

            if (sumRes.success && sumRes.summary) {
                dispatchSummary = sumRes.summary;
                dspKpiPending.textContent = sumRes.summary.totalPendingOrders;
                dspKpiExpress.textContent = sumRes.summary.expressPending;
                dspKpiActive.textContent = sumRes.summary.outForDeliveryOrders;
                dspKpiAvailDrivers.textContent = sumRes.summary.availableDrivers;
            }

            if (driversRes.success && driversRes.drivers) {
                driversList = driversRes.drivers;
                populateBulkDriverDropdown();
                renderQueueDriverPills();
            }

            if (batchRes.success && batchRes.batches) {
                dispatchBatches = batchRes.batches;
                renderZoneBatches();
            }

            if (ordRes.success && ordRes.orders) {
                dispatchOrders = ordRes.orders;
                renderDispatchOrdersTable();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function populateBulkDriverDropdown() {
        bulkDriverSelect.innerHTML = '<option value="">-- Choose Available Driver --</option>';
        driversList.forEach(d => {
            const isAvail = d.status_flag === 'Available';
            const opt = document.createElement('option');
            opt.value = d.driver_id;
            opt.textContent = `${d.full_name} (${d.location_zone}) - ${d.status_flag}`;
            if (!isAvail) opt.style.color = 'var(--text-muted)';
            bulkDriverSelect.appendChild(opt);
        });
    }

    function renderZoneBatches() {
        zoneBatchesCardsContainer.innerHTML = '';
        dispatchBatches.forEach(batch => {
            const card = document.createElement('div');
            card.className = 'zone-batch-card';

            const availDriver = (batch.available_drivers || [])[0];
            const hasPending = batch.pending_order_count > 0;

            card.innerHTML = `
                <div>
                    <div class="zone-batch-top">
                        <span class="zone-batch-name">📍 ${batch.location_zone}</span>
                        <span class="badge ${hasPending ? 'badge-pending' : 'badge-delivered'}">
                            ${batch.pending_order_count} Pending
                        </span>
                    </div>

                    <div class="zone-batch-count">${batch.pending_order_count} Orders</div>
                    <div class="zone-batch-sub">
                        <span>⚡ <strong>${batch.express_count} Express</strong> • 📦 ${batch.standard_count} Standard</span>
                        <span>🏢 Servicing Facility: ${batch.warehouse_name}</span>
                        <span>🚚 Fleet: ${batch.available_drivers_count} Available (${batch.assigned_drivers_count} Total)</span>
                    </div>
                </div>

                <div style="margin-top: 0.85rem;">
                    <button class="btn btn-primary btn-sm dispatch-zone-btn" style="width: 100%;" data-zone="${batch.location_zone}" data-driver-id="${availDriver ? availDriver.driver_id : ''}" ${!hasPending ? 'disabled' : ''}>
                        <span>⚡</span> Dispatch Batch (${availDriver ? availDriver.full_name.split(' ')[0] : 'Choose Driver'})
                    </button>
                </div>
            `;

            const dispatchBtn = card.querySelector('.dispatch-zone-btn');
            dispatchBtn.addEventListener('click', async () => {
                const targetZone = batch.location_zone;
                let driverId = availDriver ? availDriver.driver_id : null;

                if (!driverId) {
                    const firstAnyAvail = driversList.find(d => d.status_flag === 'Available');
                    if (firstAnyAvail) driverId = firstAnyAvail.driver_id;
                    else {
                        showToast('No drivers are currently Available. Please mark deliveries as completed or reassign drivers.', 'error');
                        return;
                    }
                }

                try {
                    const res = await api.assignZoneDispatch(driverId, targetZone);
                    showToast(res.message);
                    await loadDispatchModule();
                    selectedOrderIds.clear();
                    updateBulkDispatchBar();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });

            zoneBatchesCardsContainer.appendChild(card);
        });
    }

    function renderDispatchOrdersTable() {
        selectedOrderIds.clear();
        updateBulkDispatchBar();
        selectAllOrdersCheckbox.checked = false;

        if (!dispatchOrders || dispatchOrders.length === 0) {
            dispatchOrdersTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No orders match filter criteria.</td></tr>`;
            return;
        }

        dispatchOrdersTableBody.innerHTML = dispatchOrders.map(ord => {
            const isExpress = ord.shipping_type === 'Express';
            const statusClass = ord.order_status === 'Delivered' ? 'badge-delivered' :
                               (ord.order_status === 'Out for Delivery' || ord.order_status === 'Dispatched') ? 'badge-dispatched' : 'badge-pending';

            const itemsStr = (ord.items || []).map(i => `${i.quantity}x ${i.item_name}`).join(', ') || 'General items';

            let actionBtn = '';
            if (ord.order_status === 'Pending') {
                actionBtn = `<button class="btn btn-primary btn-sm quick-dispatch-btn" data-order-id="${ord.order_id}">🚀 Dispatch</button>`;
            } else if (ord.order_status === 'Out for Delivery' || ord.order_status === 'Dispatched') {
                actionBtn = `<button class="btn btn-success btn-sm mark-delivered-btn" data-order-id="${ord.order_id}">✓ Delivered</button>`;
            } else {
                actionBtn = `<span style="color: var(--accent-success); font-size: 0.8rem;">✓ Complete</span>`;
            }

            return `
                <tr>
                    <td>
                        <input type="checkbox" class="order-select-checkbox" data-order-id="${ord.order_id}" ${ord.order_status !== 'Pending' ? 'disabled' : ''}>
                    </td>
                    <td>
                        <strong>Order #${ord.order_id}</strong>
                        <div>
                            <span class="badge ${isExpress ? 'badge-express' : 'badge-standard'}" style="font-size: 0.65rem;">
                                ${isExpress ? '⚡ Express' : 'Standard'}
                            </span>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${ord.customer_name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${ord.customer_phone}</div>
                    </td>
                    <td>
                        <div style="font-size: 0.825rem; color: var(--text-secondary);">${ord.address}</div>
                        <span class="badge badge-standard" style="font-size: 0.65rem;">${ord.inferred_zone}</span>
                    </td>
                    <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${itemsStr}">
                        ${itemsStr}
                    </td>
                    <td><span class="badge ${statusClass}">${ord.order_status}</span></td>
                    <td>
                        ${ord.driver_name ? `<strong>${ord.driver_name}</strong>` : '<span style="color: var(--text-muted);">Unassigned</span>'}
                    </td>
                    <td style="text-align: right;">${actionBtn}</td>
                </tr>
            `;
        }).join('');

        // Attach checkbox selection listeners
        document.querySelectorAll('.order-select-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const oId = parseInt(cb.dataset.orderId, 10);
                if (cb.checked) selectedOrderIds.add(oId);
                else selectedOrderIds.delete(oId);
                updateBulkDispatchBar();
            });
        });

        // Quick dispatch button listeners
        document.querySelectorAll('.quick-dispatch-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = parseInt(btn.dataset.orderId, 10);
                const order = dispatchOrders.find(o => o.order_id === orderId);
                if (order) openQuickDispatchModal(order);
            });
        });

        // Mark delivered listeners
        document.querySelectorAll('.mark-delivered-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const orderId = parseInt(btn.dataset.orderId, 10);
                try {
                    const res = await api.markOrderDelivered(orderId);
                    showToast(res.message);
                    await loadDispatchModule();
                    if (activeModule === 'customer' && currentCustomer) loadDashboard();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    }

    selectAllOrdersCheckbox?.addEventListener('change', () => {
        const isChecked = selectAllOrdersCheckbox.checked;
        document.querySelectorAll('.order-select-checkbox:not(:disabled)').forEach(cb => {
            cb.checked = isChecked;
            const oId = parseInt(cb.dataset.orderId, 10);
            if (isChecked) selectedOrderIds.add(oId);
            else selectedOrderIds.delete(oId);
        });
        updateBulkDispatchBar();
    });

    function updateBulkDispatchBar() {
        selectedOrdersCount.textContent = selectedOrderIds.size;
        bulkDispatchBtn.disabled = selectedOrderIds.size === 0 || !bulkDriverSelect.value;
    }

    bulkDriverSelect?.addEventListener('change', updateBulkDispatchBar);

    bulkDispatchBtn?.addEventListener('click', async () => {
        const driverId = parseInt(bulkDriverSelect.value, 10);
        const orderIds = Array.from(selectedOrderIds);

        if (!driverId || orderIds.length === 0) {
            showToast('Please select a driver and at least one order to dispatch.', 'error');
            return;
        }

        try {
            const res = await api.assignDispatch(driverId, orderIds);
            showToast(res.message);
            selectedOrderIds.clear();
            await loadDispatchModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Quick Dispatch Modal
    function openQuickDispatchModal(order) {
        activeQuickDispatchOrder = order;
        quickDispatchOrderTitle.textContent = `#${order.order_id}`;
        quickDispatchCustomer.textContent = order.customer_name;
        quickDispatchAddress.textContent = order.address;
        quickDispatchPriority.textContent = order.shipping_type;

        // Populate drivers with zone recommendation
        quickDispatchDriverSelect.innerHTML = driversList.map(d => {
            const isMatch = d.location_zone === order.inferred_zone;
            return `<option value="${d.driver_id}">${d.full_name} (${d.location_zone}) - ${d.status_flag} ${isMatch ? '★ Zone Match' : ''}</option>`;
        }).join('');

        quickDispatchModal?.classList.remove('hidden');
    }

    closeQuickDispatchModalBtn?.addEventListener('click', () => quickDispatchModal?.classList.add('hidden'));

    submitQuickDispatchBtn?.addEventListener('click', async () => {
        if (!activeQuickDispatchOrder) return;
        const driverId = parseInt(quickDispatchDriverSelect.value, 10);

        try {
            const res = await api.assignDispatch(driverId, [activeQuickDispatchOrder.order_id]);
            showToast(res.message);
            quickDispatchModal?.classList.add('hidden');
            await loadDispatchModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Filter Chips for Dispatch Orders Table
    dispatchFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dispatchFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            loadDispatchModule();
        });
    });

    dispatchTableZoneFilter?.addEventListener('change', () => loadDispatchModule());
    dispatchTablePriorityFilter?.addEventListener('change', () => loadDispatchModule());

    // Dispatch Sub-Tab Toggles (Batches vs Driver Queue)
    viewDispatchBatchesTabBtn?.addEventListener('click', () => {
        currentDispatchTab = 'batches';
        viewDispatchBatchesTabBtn.className = 'btn btn-primary btn-sm';
        viewDriverQueueTabBtn.className = 'btn btn-outline btn-sm';
        dispatchBatchesView?.classList.remove('hidden');
        driverQueueView?.classList.add('hidden');
    });

    viewDriverQueueTabBtn?.addEventListener('click', () => {
        currentDispatchTab = 'queue';
        viewDriverQueueTabBtn.className = 'btn btn-primary btn-sm';
        viewDispatchBatchesTabBtn.className = 'btn btn-outline btn-sm';
        dispatchBatchesView?.classList.add('hidden');
        driverQueueView?.classList.remove('hidden');
        if (driversList.length > 0) {
            if (!selectedQueueDriverId) selectedQueueDriverId = driversList[0].driver_id;
            loadDriverPriorityQueue(selectedQueueDriverId);
        }
    });

    function renderQueueDriverPills() {
        queueDriverPillsContainer.innerHTML = '';
        driversList.forEach(d => {
            const pill = document.createElement('button');
            pill.className = `driver-pill ${d.driver_id === selectedQueueDriverId ? 'active' : ''}`;
            pill.innerHTML = `<span>🚚</span> ${d.full_name} (${d.status_flag})`;
            pill.addEventListener('click', () => {
                selectedQueueDriverId = d.driver_id;
                renderQueueDriverPills();
                loadDriverPriorityQueue(d.driver_id);
            });
            queueDriverPillsContainer.appendChild(pill);
        });
    }

    async function loadDriverPriorityQueue(driverId) {
        try {
            const res = await api.getDriverQueue(driverId);
            if (res.success) {
                const driver = res.driver;
                const queue = res.queue || [];

                queueDriverTitle.textContent = `${driver.full_name}'s Priority Delivery Route`;
                queueLengthBadge.textContent = `${queue.length} Active Orders`;

                queueDriverName.textContent = driver.full_name;
                queueDriverZone.textContent = driver.location_zone || 'Central';
                queueDriverRating.textContent = `★ ${parseFloat(driver.rating || 5).toFixed(2)}`;
                queueDriverRate.textContent = `$${parseFloat(driver.base_rate || 25).toFixed(2)} base + $${parseFloat(driver.per_km_bonus || 0.45).toFixed(2)}/mi`;
                queueDriverStatusBadge.textContent = driver.status_flag || 'Available';
                queueDriverStatusBadge.className = `badge ${driver.status_flag === 'Busy' || driver.status_flag === 'On Trip' ? 'badge-dispatched' : 'badge-delivered'}`;

                if (queue.length === 0) {
                    driverQueueListContainer.innerHTML = `
                        <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                            No active orders currently dispatched to ${driver.full_name}. Select pending orders in the batch tab to dispatch!
                        </div>
                    `;
                    return;
                }

                driverQueueListContainer.innerHTML = queue.map((ord, idx) => {
                    const isExpress = ord.shipping_type === 'Express';
                    const itemsStr = (ord.items || []).map(i => `${i.quantity}x ${i.item_name}`).join(', ') || 'Package items';

                    return `
                        <div class="queue-card ${isExpress ? 'queue-express' : ''}">
                            <div class="queue-card-header">
                                <div class="queue-order-title">
                                    <span>#${idx + 1} Stop: Order #${ord.order_id}</span>
                                    <span class="badge ${isExpress ? 'badge-express' : 'badge-standard'} queue-priority-tag">
                                        ${isExpress ? '⚡ Express Lane Priority' : 'Standard'}
                                    </span>
                                </div>
                                <span class="badge badge-dispatched" style="font-size: 0.7rem;">Out for Delivery</span>
                            </div>
                            <div class="queue-card-body">
                                <div>
                                    <div style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">
                                        ${ord.customer_name} • ${ord.phone_number || ''}
                                    </div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">
                                        📍 ${ord.address} (Zip: ${ord.zip_code})
                                    </div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                                        📦 Items: ${itemsStr}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <button class="btn btn-success btn-sm queue-deliver-btn" data-order-id="${ord.order_id}">
                                        ✓ Mark Delivered
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                // Deliver buttons in priority queue
                document.querySelectorAll('.queue-deliver-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const orderId = parseInt(btn.dataset.orderId, 10);
                        try {
                            const deliverRes = await api.markOrderDelivered(orderId);
                            showToast(deliverRes.message);
                            await loadDriverPriorityQueue(driverId);
                            await loadDispatchModule();
                        } catch (err) {
                            showToast(err.message, 'error');
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Driver queue fetch:', err.message);
        }
    }

    // =========================================================================
    // MODULE: NOTIFICATIONS & SIMULATOR (Moin's - Feature 3)
    // =========================================================================
    async function loadNotificationsModule() {
        try {
            const [statsRes, listRes] = await Promise.all([
                api.getNotificationStats(),
                api.getNotifications({
                    channel: filterNotifChannel?.value || 'all',
                    status: filterNotifStatus?.value || 'all'
                })
            ]);

            if (statsRes.success && statsRes.stats) {
                notificationStats = statsRes.stats;
                notifKpiTotal.textContent = statsRes.stats.total_notifications;
                notifKpiSms.textContent = statsRes.stats.sms_count;
                notifKpiEmail.textContent = statsRes.stats.email_count;
                notifKpiDelivered.textContent = statsRes.stats.delivered_count;
            }

            if (listRes.success && listRes.notifications) {
                notificationsList = listRes.notifications;
                renderNotificationsFeed();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderNotificationsFeed() {
        const search = searchNotifInput.value.trim().toLowerCase();

        let filtered = notificationsList;
        if (search) {
            filtered = filtered.filter(n =>
                n.message_payload.toLowerCase().includes(search) ||
                n.recipient.toLowerCase().includes(search) ||
                (n.customer_name && n.customer_name.toLowerCase().includes(search)) ||
                String(n.order_id).includes(search)
            );
        }

        notifFeedCountBadge.textContent = `${filtered.length} Messages`;

        if (filtered.length === 0) {
            notificationsFeedContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
                    No notifications in queue. Dispatched orders will automatically trigger and log SMS and Email alerts here!
                </div>
            `;
            return;
        }

        notificationsFeedContainer.innerHTML = filtered.map(n => {
            const isEmail = n.channel === 'Email';
            const icon = isEmail ? '✉️' : '💬';
            const iconClass = isEmail ? 'icon-email' : 'icon-sms';
            const tagClass = isEmail ? 'tag-email' : 'tag-sms';

            return `
                <div class="notif-item-card">
                    <div class="notif-icon-box ${iconClass}">
                        ${icon}
                    </div>
                    <div class="notif-body-content">
                        <div class="notif-top-meta">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="notif-recipient">${n.recipient}</span>
                                <span class="notif-channel-tag ${tagClass}">${n.channel}</span>
                                ${n.customer_name ? `<span style="font-size: 0.75rem; color: var(--text-secondary);">(${n.customer_name})</span>` : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="badge ${n.dispatch_status === 'Delivered' ? 'badge-delivered' : 'badge-dispatched'}" style="font-size: 0.65rem;">
                                    ${n.dispatch_status}
                                </span>
                                <span class="notif-timestamp">${n.sent_at || n.created_at || 'Just now'}</span>
                            </div>
                        </div>
                        <div class="notif-message-text">
                            ${n.message_payload}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">
                            Linked: <strong>Order #${n.order_id}</strong> ${n.address ? `• Dest: ${n.address}` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterNotifChannel?.addEventListener('change', () => loadNotificationsModule());
    filterNotifStatus?.addEventListener('change', () => loadNotificationsModule());
    searchNotifInput?.addEventListener('input', () => renderNotificationsFeed());

    // Simulate Notification Modal
    openSimulateNotifModalBtn?.addEventListener('click', () => {
        simNotifOrderSelect.innerHTML = (dispatchOrders.length ? dispatchOrders : [{ order_id: 1, customer_name: 'Alice Johnson' }]).map(o => `
            <option value="${o.order_id}" data-phone="${o.customer_phone || ''}" data-name="${o.customer_name || ''}">Order #${o.order_id} (${o.customer_name || 'Customer'})</option>
        `).join('');

        updateSimNotifRecipientDefault();
        simulateNotifModal?.classList.remove('hidden');
    });

    function updateSimNotifRecipientDefault() {
        const opt = simNotifOrderSelect.selectedOptions[0];
        const ch = simNotifChannelSelect.value;
        if (ch === 'Email') {
            simNotifRecipient.value = `${(opt?.dataset.name || 'customer').toLowerCase().replace(/\s+/g, '.')}@example.com`;
        } else {
            simNotifRecipient.value = opt?.dataset.phone || '+1-555-0101';
        }
        simNotifMessage.value = `LogiRoute Alert: Order #${simNotifOrderSelect.value} has been updated. Out for delivery with priority handling.`;
    }

    simNotifOrderSelect?.addEventListener('change', updateSimNotifRecipientDefault);
    simNotifChannelSelect?.addEventListener('change', updateSimNotifRecipientDefault);

    closeSimulateNotifModalBtn?.addEventListener('click', () => simulateNotifModal?.classList.add('hidden'));

    submitSimulateNotifBtn?.addEventListener('click', async () => {
        const orderId = parseInt(simNotifOrderSelect.value, 10);
        const channel = simNotifChannelSelect.value;
        const recipient = simNotifRecipient.value.trim();
        const message_payload = simNotifMessage.value.trim();

        if (!orderId || !message_payload) {
            showToast('Please provide an order and message payload.', 'error');
            return;
        }

        try {
            const res = await api.simulateNotification({
                order_id: orderId,
                channel,
                recipient,
                message_payload
            });
            showToast(res.message);
            simulateNotifModal?.classList.add('hidden');
            await loadNotificationsModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE: LOW STOCK ALERT & INVENTORY (Shafein's - Feature 2)
    // =========================================================================
    async function loadInventoryModule() {
        try {
            const [kpiRes, alertsRes, matrixRes, warehousesRes] = await Promise.all([
                api.getInventoryKPIs(),
                api.getLowStockAlerts(filterWarehouse.value, filterSeverity.value),
                api.getStockMatrix(),
                api.getWarehouses()
            ]);

            if (kpiRes.success && kpiRes.kpis) {
                inventoryKPIs = kpiRes.kpis;
                invKpiTotalAlerts.textContent = kpiRes.kpis.totalLowStockAlerts;
                invKpiCriticalAlerts.textContent = kpiRes.kpis.criticalAlerts;
                invKpiTotalDeficit.textContent = `${kpiRes.kpis.totalDeficitUnits} units`;
                invKpiTotalWarehouses.textContent = kpiRes.kpis.totalWarehouses;
            }

            if (alertsRes.success && alertsRes.alerts) {
                lowStockAlerts = alertsRes.alerts;
                filterAndRenderAlerts();
            }

            if (matrixRes.success && matrixRes.matrix) {
                stockMatrixList = matrixRes.matrix;
                renderStockMatrix(stockMatrixList);
            }

            if (warehousesRes.success && warehousesRes.warehouses) {
                warehousesList = warehousesRes.warehouses;
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function filterAndRenderAlerts() {
        const search = searchInventoryItem.value.trim().toLowerCase();
        let filtered = lowStockAlerts;

        if (search) {
            filtered = filtered.filter(a =>
                a.item_name.toLowerCase().includes(search) ||
                a.sku.toLowerCase().includes(search) ||
                a.warehouse_name.toLowerCase().includes(search)
            );
        }

        if (filtered.length === 0) {
            lowStockCardsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg);">
                    <span>✓</span> All inventory levels within configured safety thresholds. No active low stock warnings.
                </div>
            `;
            return;
        }

        lowStockCardsContainer.innerHTML = '';
        filtered.forEach(alert => {
            const isCritical = alert.alert_severity === 'Critical' || alert.alert_severity === 'Out of Stock';
            const badgeClass = alert.alert_severity === 'Critical' ? 'badge-critical' : alert.alert_severity === 'Out of Stock' ? 'badge-critical' : 'badge-warning';
            const fillClass = isCritical ? 'fill-critical' : 'fill-warning';
            const percent = Math.min(Math.max(alert.stock_percentage || 0, 5), 100);

            const card = document.createElement('div');
            card.className = `alert-card ${isCritical ? 'border-critical' : ''}`;

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
            stockMatrixTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No inventory records match current filter criteria.</td></tr>`;
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

    viewAlertsTabBtn?.addEventListener('click', () => {
        currentInventoryView = 'alerts';
        viewAlertsTabBtn.className = 'btn btn-primary btn-sm';
        viewMatrixTabBtn.className = 'btn btn-outline btn-sm';
        alertsFeedView?.classList.remove('hidden');
        stockMatrixView?.classList.add('hidden');
        filterAndRenderAlerts();
    });

    viewMatrixTabBtn?.addEventListener('click', () => {
        currentInventoryView = 'matrix';
        viewMatrixTabBtn.className = 'btn btn-primary btn-sm';
        viewAlertsTabBtn.className = 'btn btn-outline btn-sm';
        alertsFeedView?.classList.add('hidden');
        stockMatrixView?.classList.remove('hidden');
        renderStockMatrix(stockMatrixList);
    });

    filterWarehouse?.addEventListener('change', () => {
        if (currentInventoryView === 'alerts') filterAndRenderAlerts();
        else renderStockMatrix(stockMatrixList);
    });

    filterSeverity?.addEventListener('change', () => {
        if (currentInventoryView === 'alerts') filterAndRenderAlerts();
    });

    searchInventoryItem?.addEventListener('input', () => {
        if (currentInventoryView === 'alerts') filterAndRenderAlerts();
        else renderStockMatrix(stockMatrixList);
    });

    function openRestockModal(target) {
        activeRestockTarget = target;
        restockItemName.textContent = target.item_name;
        restockWarehouseName.textContent = target.warehouse_name;
        restockCurrentStock.textContent = `${target.current_stock} units`;
        restockSafetyThresh.textContent = `${target.safety_threshold} units`;
        restockQuantity.value = target.suggested_qty || 25;
        restockModal?.classList.remove('hidden');
    }

    closeRestockModalBtn?.addEventListener('click', () => restockModal?.classList.add('hidden'));

    document.querySelectorAll('.quick-add-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            restockQuantity.value = btn.dataset.qty;
        });
    });

    submitRestockBtn?.addEventListener('click', async () => {
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
            restockModal?.classList.add('hidden');
            await loadInventoryModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    function openThresholdModal(target) {
        activeThresholdTarget = target;
        thresholdItemName.textContent = `${target.item_name}`;
        newSafetyThreshold.value = target.safety_threshold;
        thresholdModal?.classList.remove('hidden');
    }

    closeThresholdModalBtn?.addEventListener('click', () => thresholdModal?.classList.add('hidden'));

    submitThresholdBtn?.addEventListener('click', async () => {
        const thresh = parseInt(newSafetyThreshold.value, 10);
        if (!thresh || thresh <= 0) {
            showToast('Safety threshold must be a positive number.', 'error');
            return;
        }

        try {
            const res = await api.updateSafetyThreshold(activeThresholdTarget.item_id, thresh);
            showToast(res.message);
            thresholdModal?.classList.add('hidden');
            await loadInventoryModule();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Helper: Return Badge Class
    function getReturnBadgeClass(status) {
        switch (status) {
            case 'Return Initiated': return 'badge-pending';
            case 'Mailed Back': return 'badge-dispatched';
            case 'Arrived at Warehouse': return 'badge-review';
            case 'Refund Approved':
            case 'Refund Credited':
            case 'Completed': return 'badge-delivered';
            case 'Cancelled': return 'badge-danger';
            default: return 'badge-pending';
        }
    }

    // =========================================================================
    // MODULE: RETURN TRACKING & WORKFLOW CONSOLE (Tanvir's - Feature 2)
    // =========================================================================
    async function loadReturnsModule() {
        try {
            const [kpisRes, returnsRes, ordersRes] = await Promise.all([
                api.getReturnKPIs(),
                api.getReturns(),
                api.getDispatchOrders({ status: 'all' })
            ]);

            if (kpisRes.success && kpisRes.kpis) {
                returnKPIs = kpisRes.kpis;
                if (retKpiTotal) retKpiTotal.textContent = returnKPIs.totalReturns || 0;
                if (retKpiMailedBack) retKpiMailedBack.textContent = returnKPIs.mailedBackCount || 0;
                if (retKpiAtWarehouse) retKpiAtWarehouse.textContent = returnKPIs.arrivedWarehouseCount || 0;
                if (retKpiRefundVolume) retKpiRefundVolume.textContent = `$${returnKPIs.creditedRefundTotal || returnKPIs.totalRefundVolume || '0.00'}`;
            }

            if (returnsRes.success && returnsRes.returns) {
                returnsModuleList = returnsRes.returns;
                filterAndRenderReturns();
            }

            if (ordersRes.success && ordersRes.orders && globalReturnOrderSelect) {
                globalReturnOrderSelect.innerHTML = '<option value="">-- Choose Order to Return --</option>' +
                    ordersRes.orders.map(o => {
                        const itemsTxt = (o.items || []).map(i => `${i.quantity}x ${i.item_name}`).join(', ') || 'Items';
                        return `<option value="${o.order_id}">Order #${o.order_id} - ${o.customer_name} (${o.order_status}) [${itemsTxt}]</option>`;
                    }).join('');
            }
        } catch (err) {
            console.error('Failed to load Returns module:', err);
            showToast(err.message, 'error');
        }
    }

    function filterAndRenderReturns() {
        const statusFilter = filterReturnStatus?.value || 'all';
        const query = (searchReturnInput?.value || '').trim().toLowerCase();

        let filtered = returnsModuleList;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
        }

        if (query) {
            filtered = filtered.filter(r => 
                (r.customer_name && r.customer_name.toLowerCase().includes(query)) ||
                (r.customer_phone && r.customer_phone.includes(query)) ||
                (r.address && r.address.toLowerCase().includes(query)) ||
                String(r.return_id) === query ||
                String(r.order_id) === query
            );
        }

        if (currentReturnsView === 'pipeline') {
            renderReturnsCards(filtered);
        } else {
            renderReturnsTable(filtered);
        }
    }

    function renderReturnsCards(returnsList) {
        if (!returnsCardsContainer) return;

        if (!returnsList || returnsList.length === 0) {
            returnsCardsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">↩️</div>
                    <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">No Return Requests Found</div>
                    <div style="font-size: 0.85rem;">No returns matched your search criteria or filter.</div>
                </div>
            `;
            return;
        }

        returnsCardsContainer.innerHTML = returnsList.map(ret => {
            const badgeCls = getReturnBadgeClass(ret.status);
            const step = ret.workflow?.step || (ret.status === 'Refund Approved' || ret.status === 'Refund Credited' ? 4 : ret.status === 'Arrived at Warehouse' ? 3 : ret.status === 'Mailed Back' ? 2 : 1);

            const itemsHtml = (ret.items || []).map(it => `
                <span class="return-item-badge">📦 ${it.quantity}x ${it.item_name}</span>
            `).join('') || '<span class="return-item-badge">General Order Return</span>';

            let actionBtnHtml = '';
            if (ret.status === 'Return Initiated') {
                actionBtnHtml = `
                    <button class="btn btn-primary btn-sm quick-advance-return-btn" data-return-id="${ret.return_id}" data-target-status="Mailed Back" data-refund="${ret.refund_amount}">
                        📦 Mark Mailed Back
                    </button>
                `;
            } else if (ret.status === 'Mailed Back') {
                actionBtnHtml = `
                    <button class="btn btn-secondary btn-sm quick-advance-return-btn" data-return-id="${ret.return_id}" data-target-status="Arrived at Warehouse" data-refund="${ret.refund_amount}">
                        🏢 Mark Arrived at Warehouse
                    </button>
                `;
            } else if (ret.status === 'Arrived at Warehouse') {
                actionBtnHtml = `
                    <button class="btn btn-success btn-sm quick-advance-return-btn" data-return-id="${ret.return_id}" data-target-status="Refund Approved" data-refund="${ret.refund_amount}">
                        💳 Approve & Credit $${ret.refund_amount}
                    </button>
                `;
            } else {
                actionBtnHtml = `
                    <span class="badge badge-delivered" style="width: 100%; justify-content: center; padding: 0.5rem;">
                        ✓ Refund Completed ($${ret.refund_amount})
                    </span>
                `;
            }

            return `
                <div class="return-card">
                    <div class="return-card-header">
                        <div>
                            <div class="return-id-tag">
                                <span>↩️</span> Return #${ret.return_id}
                            </div>
                            <div class="return-order-link">
                                Linked to Original Order #${ret.order_id} (${ret.shipping_type || 'Standard'})
                            </div>
                        </div>
                        <span class="badge ${badgeCls}">${ret.status}</span>
                    </div>

                    <!-- Workflow Visual Stepper -->
                    <div class="workflow-stepper">
                        <div class="workflow-step ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}">
                            <div class="step-node">${step > 1 ? '✓' : '1'}</div>
                            <span class="step-text">Initiated</span>
                        </div>
                        <div class="workflow-step ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}">
                            <div class="step-node">${step > 2 ? '✓' : '2'}</div>
                            <span class="step-text">Mailed Back</span>
                        </div>
                        <div class="workflow-step ${step >= 3 ? (step > 3 ? 'completed' : 'active') : ''}">
                            <div class="step-node">${step > 3 ? '✓' : '3'}</div>
                            <span class="step-text">At Warehouse</span>
                        </div>
                        <div class="workflow-step ${step >= 4 ? 'completed' : ''}">
                            <div class="step-node">${step >= 4 ? '✓' : '4'}</div>
                            <span class="step-text">Refunded</span>
                        </div>
                    </div>

                    <!-- Customer Box -->
                    <div class="return-customer-box">
                        <div class="return-cust-name">👤 ${ret.customer_name}</div>
                        <div class="return-cust-info">
                            <span>📞 ${ret.customer_phone}</span>
                            <span>Store Credit: <strong style="color: var(--accent-success);">$${ret.store_credit_balance}</strong></span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            📍 ${ret.address}
                        </div>
                    </div>

                    <!-- Items & Reason -->
                    <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Returned Items:</div>
                        <div class="return-items-list">
                            ${itemsHtml}
                        </div>
                        <div style="font-size: 0.775rem; color: var(--text-secondary); margin-top: 0.25rem;">
                            <strong>Reason:</strong> <em>${ret.reason || 'Customer return request'}</em>
                        </div>
                    </div>

                    <!-- Financial & Date Row -->
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle); font-size: 0.8rem;">
                        <span style="color: var(--text-muted);">Requested: ${ret.date_requested}</span>
                        <span>Refund: <strong style="color: var(--accent-success); font-size: 0.95rem;">+$${ret.refund_amount}</strong></span>
                    </div>

                    <!-- Action Bar -->
                    <div class="return-actions-row">
                        ${actionBtnHtml}
                        <button class="btn btn-outline btn-sm open-advance-modal-btn" data-return-id="${ret.return_id}">
                            ⚙️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        attachReturnListeners();
    }

    function renderReturnsTable(returnsList) {
        if (returnsTableCountBadge) returnsTableCountBadge.textContent = `${returnsList.length} Records`;

        if (!returnsTableBody) return;

        if (!returnsList || returnsList.length === 0) {
            returnsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No return records found matching criteria.
                    </td>
                </tr>
            `;
            return;
        }

        returnsTableBody.innerHTML = returnsList.map(ret => {
            const badgeCls = getReturnBadgeClass(ret.status);
            const itemsHtml = (ret.items || []).map(it => `${it.quantity}x ${it.item_name}`).join(', ') || 'Order items';

            let quickActionBtn = '';
            if (ret.status === 'Return Initiated') {
                quickActionBtn = `<button class="btn btn-primary btn-sm quick-advance-return-btn" data-return-id="${ret.return_id}" data-target-status="Mailed Back" data-refund="${ret.refund_amount}">Mailed Back 📦</button>`;
            } else if (ret.status === 'Mailed Back') {
                quickActionBtn = `<button class="btn btn-secondary btn-sm quick-advance-return-btn" data-return-id="${ret.return_id}" data-target-status="Arrived at Warehouse" data-refund="${ret.refund_amount}">At Warehouse 🏢</button>`;
            } else if (ret.status === 'Arrived at Warehouse') {
                quickActionBtn = `<button class="btn btn-success btn-sm quick-advance-return-btn" data-return-id="${ret.return_id}" data-target-status="Refund Approved" data-refund="${ret.refund_amount}">Approve Refund 💳</button>`;
            } else {
                quickActionBtn = `<span style="color: var(--accent-success); font-weight: 700; font-size: 0.8rem;">✓ Credited</span>`;
            }

            return `
                <tr>
                    <td><strong>#${ret.return_id}</strong></td>
                    <td>
                        <span style="color: #93c5fd; font-weight: 600;">Order #${ret.order_id}</span>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${ret.shipping_type || 'Standard'}</div>
                    </td>
                    <td>
                        <strong>${ret.customer_name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${ret.customer_phone}</div>
                    </td>
                    <td style="font-size: 0.8rem; max-width: 200px;">${itemsHtml}</td>
                    <td><strong style="color: var(--accent-success);">$${ret.refund_amount}</strong></td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">${ret.date_requested}</td>
                    <td><span class="badge ${badgeCls}">${ret.status}</span></td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 0.4rem;">
                            ${quickActionBtn}
                            <button class="btn btn-outline btn-sm open-advance-modal-btn" data-return-id="${ret.return_id}">Manage</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        attachReturnListeners();
    }

    function attachReturnListeners() {
        document.querySelectorAll('.quick-advance-return-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const returnId = parseInt(btn.dataset.returnId, 10);
                const targetStatus = btn.dataset.targetStatus;
                const refundAmount = parseFloat(btn.dataset.refund);

                try {
                    const res = await api.updateReturnStatus(returnId, targetStatus, refundAmount);
                    showToast(res.message);
                    await loadReturnsModule();
                    if (currentCustomer) await loadDashboard();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        document.querySelectorAll('.open-advance-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const returnId = parseInt(btn.dataset.returnId, 10);
                const ret = returnsModuleList.find(r => r.return_id === returnId);
                if (ret) openAdvanceReturnModal(ret);
            });
        });
    }

    function openAdvanceReturnModal(ret) {
        activeAdvanceReturnTarget = ret;
        advanceReturnTitle.textContent = `Return #${ret.return_id}`;
        advanceReturnOrderNumber.textContent = `Order #${ret.order_id}`;
        advanceReturnCustomer.textContent = `${ret.customer_name} (${ret.customer_phone})`;
        advanceReturnCurrentStatus.textContent = ret.status;
        advanceReturnRefundVal.textContent = `$${ret.refund_amount}`;
        advanceReturnAmountInput.value = ret.refund_amount;

        const nextStatus = ret.workflow?.nextStatus || 'Refund Approved';
        advanceReturnNextStatus.value = nextStatus;

        if (advanceReturnNextStatus.value === 'Refund Approved') {
            advanceReturnCreditNotice.style.display = 'block';
        } else {
            advanceReturnCreditNotice.style.display = 'none';
        }

        advanceReturnWorkflowModal?.classList.remove('hidden');
    }

    advanceReturnNextStatus?.addEventListener('change', () => {
        if (advanceReturnNextStatus.value === 'Refund Approved') {
            advanceReturnCreditNotice.style.display = 'block';
        } else {
            advanceReturnCreditNotice.style.display = 'none';
        }
    });

    closeAdvanceReturnModalBtn?.addEventListener('click', () => advanceReturnWorkflowModal?.classList.add('hidden'));

    submitAdvanceReturnBtn?.addEventListener('click', async () => {
        if (!activeAdvanceReturnTarget) return;

        const targetStatus = advanceReturnNextStatus.value;
        const refundAmt = parseFloat(advanceReturnAmountInput.value) || parseFloat(activeAdvanceReturnTarget.refund_amount);

        try {
            const res = await api.updateReturnStatus(activeAdvanceReturnTarget.return_id, targetStatus, refundAmt);
            showToast(res.message);
            advanceReturnWorkflowModal?.classList.add('hidden');
            await loadReturnsModule();
            if (currentCustomer) await loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // View Toggles for Returns
    viewReturnsPipelineBtn?.addEventListener('click', () => {
        currentReturnsView = 'pipeline';
        viewReturnsPipelineBtn.className = 'btn btn-primary btn-sm';
        viewReturnsTableBtn.className = 'btn btn-outline btn-sm';
        returnsPipelineView?.classList.remove('hidden');
        returnsTableView?.classList.add('hidden');
        filterAndRenderReturns();
    });

    viewReturnsTableBtn?.addEventListener('click', () => {
        currentReturnsView = 'table';
        viewReturnsTableBtn.className = 'btn btn-primary btn-sm';
        viewReturnsPipelineBtn.className = 'btn btn-outline btn-sm';
        returnsPipelineView?.classList.add('hidden');
        returnsTableView?.classList.remove('hidden');
        filterAndRenderReturns();
    });

    filterReturnStatus?.addEventListener('change', filterAndRenderReturns);
    searchReturnInput?.addEventListener('input', filterAndRenderReturns);

    // Global Create Return Modal
    openGlobalReturnModalBtn?.addEventListener('click', () => {
        globalReturnModal?.classList.remove('hidden');
    });

    closeGlobalReturnModalBtn?.addEventListener('click', () => globalReturnModal?.classList.add('hidden'));

    submitGlobalReturnBtn?.addEventListener('click', async () => {
        const orderId = parseInt(globalReturnOrderSelect.value, 10);
        const reason = globalReturnReason.value;
        const refundAmount = parseFloat(globalReturnAmount.value) || 25.00;

        if (!orderId) {
            showToast('Please choose an order to return.', 'error');
            return;
        }

        try {
            const res = await api.createReturnRequest({
                order_id: orderId,
                reason,
                refund_amount: refundAmount
            });
            showToast(res.message);
            globalReturnModal?.classList.add('hidden');
            await loadReturnsModule();
            if (currentCustomer) await loadDashboard();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE: MISSING SALES REPORT & PENETRATION (Tanvir's - Feature 1)
    // =========================================================================
    async function loadMissingSalesModule() {
        try {
            const [kpisRes, reportRes] = await Promise.all([
                api.getMissingSalesKPIs(),
                api.getMissingSalesReport(selectedMissingSalesItemId)
            ]);

            if (kpisRes.success && kpisRes.kpis) {
                if (msKpiTotalCustomers) msKpiTotalCustomers.textContent = kpisRes.kpis.totalCustomers;
            }

            if (reportRes.success) {
                missingSalesData = reportRes;
                if (!selectedMissingSalesItemId && reportRes.selectedItem) {
                    selectedMissingSalesItemId = reportRes.selectedItem.item_id;
                }

                renderMissingSalesItemPills(reportRes.items, reportRes.selectedItem?.item_id);

                if (reportRes.selectedItem) {
                    if (targetItemName) targetItemName.textContent = reportRes.selectedItem.name;
                    if (targetItemSku) targetItemSku.textContent = `SKU: ${reportRes.selectedItem.sku} • Safety Baseline: ${reportRes.selectedItem.safety_threshold} units`;
                }

                const metrics = reportRes.metrics || {};
                if (msKpiPenetrationRate) msKpiPenetrationRate.textContent = metrics.penetrationRate || '0.0%';
                if (msKpiMissingCount) msKpiMissingCount.textContent = `${metrics.missingCount || 0} Customers`;
                if (msKpiPurchasedCount) msKpiPurchasedCount.textContent = `${metrics.purchasedCount || 0} Buyers`;

                if (targetItemAdoptionText) targetItemAdoptionText.textContent = `${metrics.purchasedCount || 0} / ${metrics.totalCustomers || 0} Customers (${metrics.penetrationRate || '0.0%'})`;
                if (targetItemProgressBar) targetItemProgressBar.style.width = metrics.penetrationRate || '0%';
                if (targetItemPenetrationBadge) targetItemPenetrationBadge.textContent = metrics.penetrationRate || '0.0%';

                renderMissingCustomersCards(reportRes.missingCustomers || []);
                renderPurchasedCustomersTable(reportRes.purchasedCustomers || []);
            }
        } catch (err) {
            console.error('Failed to load Missing Sales module:', err);
            showToast(err.message, 'error');
        }
    }

    function renderMissingSalesItemPills(itemsList, selectedId) {
        if (!itemsList || itemsList.length === 0 || !missingSalesItemPills) return;

        missingSalesItemPills.innerHTML = itemsList.map(it => {
            const isActive = it.item_id === selectedId;
            return `
                <button class="item-select-pill ${isActive ? 'active' : ''}" data-item-id="${it.item_id}">
                    <span>📦</span> ${it.name}
                </button>
            `;
        }).join('');

        missingSalesItemPills.querySelectorAll('.item-select-pill').forEach(btn => {
            btn.addEventListener('click', async () => {
                selectedMissingSalesItemId = parseInt(btn.dataset.itemId, 10);
                await loadMissingSalesModule();
            });
        });
    }

    function renderMissingCustomersCards(missingList) {
        if (missingCustomersCountBadge) missingCustomersCountBadge.textContent = `${missingList.length} Untapped`;

        if (!missingCustomersCardsContainer) return;

        if (!missingList || missingList.length === 0) {
            missingCustomersCardsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
                    <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">100% Market Adoption!</div>
                    <div style="font-size: 0.85rem;">All active customers have already purchased this item!</div>
                </div>
            `;
            return;
        }

        missingCustomersCardsContainer.innerHTML = missingList.map(c => {
            return `
                <div class="missing-cust-card">
                    <div class="missing-cust-top">
                        <div>
                            <div class="missing-cust-name">👤 ${c.customer_name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                                📞 ${c.phone_number}
                            </div>
                        </div>
                        <span class="missing-badge">Never Bought</span>
                    </div>

                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        📍 ${c.address}
                    </div>

                    <div class="missing-cust-stats">
                        <div class="missing-stat-item">
                            <div class="label">Lifetime Orders:</div>
                            <div class="val">${c.total_orders_placed || 0} Orders</div>
                        </div>
                        <div class="missing-stat-item">
                            <div class="label">Store Credit:</div>
                            <div class="val" style="color: var(--accent-success);">$${c.store_credit_balance || '0.00'}</div>
                        </div>
                    </div>

                    <button class="btn btn-outline btn-sm single-promo-offer-btn" data-customer-id="${c.customer_id}" data-customer-name="${c.customer_name}" data-phone="${c.phone_number}">
                        <span>📢</span> Send 15% Promo Offer
                    </button>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.single-promo-offer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetItem = missingSalesData?.selectedItem;
                if (targetItem) {
                    openPromoCampaignModal(targetItem, 1, btn.dataset.customerName);
                }
            });
        });
    }

    function renderPurchasedCustomersTable(purchasedList) {
        if (purchasedCustomersCountBadge) purchasedCustomersCountBadge.textContent = `${purchasedList.length} Active Buyers`;

        if (!purchasedCustomersTableBody) return;

        if (!purchasedList || purchasedList.length === 0) {
            purchasedCustomersTableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                        No customer purchase records found yet for this product.
                    </td>
                </tr>
            `;
            return;
        }

        purchasedCustomersTableBody.innerHTML = purchasedList.map(c => {
            return `
                <tr>
                    <td>
                        <strong>${c.customer_name}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${c.phone_number}</div>
                    </td>
                    <td><strong style="color: #34d399;">${c.total_units_bought || 0} units</strong></td>
                    <td style="font-size: 0.85rem; color: var(--text-secondary);">${c.orders_with_item || 0} orders</td>
                </tr>
            `;
        }).join('');
    }

    async function loadMissingSalesMatrix() {
        try {
            const res = await api.getMissingSalesMatrix();
            if (res.success) {
                missingSalesMatrixData = res;
                if (matrixItemsCountBadge) matrixItemsCountBadge.textContent = `${res.totalItems} Products (${res.totalCustomers} Accounts)`;
                renderPenetrationMatrix(res);
            }
        } catch (err) {
            console.error('Failed to load matrix:', err);
            showToast(err.message, 'error');
        }
    }

    function renderPenetrationMatrix(data) {
        if (!penetrationMatrixThead || !penetrationMatrixTbody) return;
        const items = data.items || [];
        const customers = data.customers || [];

        let theadHtml = `
            <tr>
                <th style="position: sticky; left: 0; background: var(--bg-surface); z-index: 5;">Customer Account</th>
        `;

        items.forEach(it => {
            theadHtml += `
                <th style="text-align: center; min-width: 140px;">
                    <div>${it.name}</div>
                    <div style="font-size: 0.7rem; color: var(--accent-info); font-weight: 600;">${it.penetration_rate} Penetration</div>
                </th>
            `;
        });
        theadHtml += `</tr>`;
        penetrationMatrixThead.innerHTML = theadHtml;

        let tbodyHtml = '';
        customers.forEach(c => {
            tbodyHtml += `
                <tr>
                    <td style="position: sticky; left: 0; background: var(--bg-surface); font-weight: 700; z-index: 4;">
                        ${c.customer_name}
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">${c.phone_number}</div>
                    </td>
            `;

            items.forEach(it => {
                const p = c.purchases ? c.purchases[it.item_id] : null;
                if (p && p.has_purchased) {
                    tbodyHtml += `
                        <td style="text-align: center;">
                            <span class="matrix-cell-purchased">✓ ${p.quantity} units</span>
                        </td>
                    `;
                } else {
                    tbodyHtml += `
                        <td style="text-align: center;">
                            <span class="matrix-cell-missing">✕ Never Bought</span>
                        </td>
                    `;
                }
            });

            tbodyHtml += `</tr>`;
        });

        penetrationMatrixTbody.innerHTML = tbodyHtml;
    }

    viewMissingSalesListBtn?.addEventListener('click', () => {
        currentMissingSalesView = 'list';
        viewMissingSalesListBtn.className = 'btn btn-primary btn-sm';
        viewMissingSalesMatrixBtn.className = 'btn btn-outline btn-sm';
        missingCustomersListView?.classList.remove('hidden');
        missingSalesMatrixView?.classList.add('hidden');
    });

    viewMissingSalesMatrixBtn?.addEventListener('click', async () => {
        currentMissingSalesView = 'matrix';
        viewMissingSalesMatrixBtn.className = 'btn btn-primary btn-sm';
        viewMissingSalesListBtn.className = 'btn btn-outline btn-sm';
        missingCustomersListView?.classList.add('hidden');
        missingSalesMatrixView?.classList.remove('hidden');
        await loadMissingSalesMatrix();
    });

    function openPromoCampaignModal(targetItem, missingCount, specificCustomerName = null) {
        activeCampaignItem = targetItem;
        if (campaignItemName) campaignItemName.textContent = targetItem.name;
        if (campaignMissingCount) campaignMissingCount.textContent = specificCustomerName ? `1 Customer (${specificCustomerName})` : `${missingCount} Missing Customers`;

        const defaultMsg = `Exclusive Offer from LogiRoute: Enjoy 15% off our "${targetItem.name}" (SKU: ${targetItem.sku}) on your next delivery order! Use promo code LOGI15 at checkout.`;
        if (campaignPromoMessage) campaignPromoMessage.value = defaultMsg;

        promoCampaignModal?.classList.remove('hidden');
    }

    openPromoCampaignModalBtn?.addEventListener('click', () => {
        const targetItem = missingSalesData?.selectedItem;
        const missingCount = missingSalesData?.missingCustomers?.length || 0;
        if (targetItem) {
            openPromoCampaignModal(targetItem, missingCount);
        } else {
            showToast('Please select a catalog product first.', 'error');
        }
    });

    closePromoCampaignModalBtn?.addEventListener('click', () => promoCampaignModal?.classList.add('hidden'));

    submitPromoCampaignBtn?.addEventListener('click', async () => {
        if (!activeCampaignItem) return;

        const promoMsg = campaignPromoMessage?.value.trim();
        const ch = campaignChannelSelect?.value || 'SMS';

        try {
            const res = await api.launchMissingSalesCampaign({
                item_id: activeCampaignItem.item_id,
                promo_message: promoMsg,
                channel: ch
            });
            showToast(res.message);
            promoCampaignModal?.classList.add('hidden');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE: ITEM–WAREHOUSE STOCK MATRIX (Shafein's - Feature 1)
    // Join Items with Warehouses (via Warehouse_Stocks)
    // =========================================================================

    // DOM Elements - Stock Matrix
    const openInterWarehouseTransferBtn = document.getElementById('openInterWarehouseTransferBtn');
    const viewMatrixPivotBtn = document.getElementById('viewMatrixPivotBtn');
    const viewMatrixListBtn = document.getElementById('viewMatrixListBtn');
    const matrixPivotView = document.getElementById('matrixPivotView');
    const matrixListView = document.getElementById('matrixListView');
    const matrixPivotThead = document.getElementById('matrixPivotThead');
    const matrixPivotTbody = document.getElementById('matrixPivotTbody');
    const matrixPivotCountBadge = document.getElementById('matrixPivotCountBadge');
    const matrixListTableBody = document.getElementById('matrixListTableBody');
    const matrixListCountBadge = document.getElementById('matrixListCountBadge');

    const smKpiTotalItems = document.getElementById('smKpiTotalItems');
    const smKpiTotalWarehouses = document.getElementById('smKpiTotalWarehouses');
    const smKpiTotalUnits = document.getElementById('smKpiTotalUnits');
    const smKpiLowStockPoints = document.getElementById('smKpiLowStockPoints');
    const smKpiQuarantinedUnits = document.getElementById('smKpiQuarantinedUnits');

    const filterMatrixWarehouse = document.getElementById('filterMatrixWarehouse');
    const filterMatrixStatus = document.getElementById('filterMatrixStatus');
    const searchMatrixInput = document.getElementById('searchMatrixInput');

    // Transfer Modal Elements
    const transferStockModal = document.getElementById('transferStockModal');
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    const transferItemSelect = document.getElementById('transferItemSelect');
    const transferSourceSelect = document.getElementById('transferSourceSelect');
    const transferDestSelect = document.getElementById('transferDestSelect');
    const transferAvailableStockPreview = document.getElementById('transferAvailableStockPreview');
    const transferQuantity = document.getElementById('transferQuantity');
    const submitTransferBtn = document.getElementById('submitTransferBtn');

    async function loadStockMatrixModule() {
        try {
            const [kpiRes, pivotRes, matrixRes, warehousesRes] = await Promise.all([
                api.getStockMatrixKPIs(),
                api.getStockMatrixPivot(),
                api.getStockMatrix(),
                api.getWarehouses()
            ]);

            if (warehousesRes.success && warehousesRes.warehouses) {
                warehousesList = warehousesRes.warehouses;
            }

            if (kpiRes.success && kpiRes.kpis) {
                stockMatrixKPIs = kpiRes.kpis;
                if (smKpiTotalItems) smKpiTotalItems.textContent = kpiRes.kpis.totalCatalogItems;
                if (smKpiTotalWarehouses) smKpiTotalWarehouses.textContent = kpiRes.kpis.totalWarehouses;
                if (smKpiTotalUnits) smKpiTotalUnits.textContent = `${kpiRes.kpis.totalStockUnits} units`;
                if (smKpiLowStockPoints) smKpiLowStockPoints.textContent = kpiRes.kpis.totalLowStockAlerts;
                if (smKpiQuarantinedUnits) smKpiQuarantinedUnits.textContent = `${kpiRes.kpis.totalQuarantinedUnits} units`;
            }

            if (pivotRes.success) {
                stockMatrixPivotData = pivotRes;
                renderStockMatrixPivot(pivotRes);
            }

            if (matrixRes.success && matrixRes.matrix) {
                stockMatrixFlatData = matrixRes.matrix;
                renderStockMatrixDetailedList(matrixRes.matrix);
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderStockMatrixPivot(pivotData) {
        if (!matrixPivotThead || !matrixPivotTbody || !pivotData) return;

        const { warehouses, matrix, summary } = pivotData;
        const search = searchMatrixInput?.value.trim().toLowerCase() || '';
        const focusWarehouseId = filterMatrixWarehouse?.value;
        const statusFilter = filterMatrixStatus?.value;

        // Build Header
        let theadHtml = `
            <tr>
                <th style="min-width: 220px;">Catalog Item & SKU</th>
                <th style="text-align: center; width: 110px;">Safety Min</th>
        `;

        warehouses.forEach(w => {
            const isHighlight = focusWarehouseId && focusWarehouseId !== 'all' && parseInt(focusWarehouseId, 10) === w.warehouse_id;
            theadHtml += `
                <th class="warehouse-col-header" style="min-width: 140px; ${isHighlight ? 'background: rgba(37,99,235,0.22); border-top: 2px solid #60a5fa;' : ''}">
                    <div>${w.name}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">${w.location_zone}</div>
                </th>
            `;
        });

        theadHtml += `
                <th style="text-align: center; min-width: 120px; border-left: 2px solid var(--border-subtle);">Network Total</th>
                <th style="text-align: center; min-width: 130px;">Health Status</th>
                <th style="text-align: right; min-width: 130px;">Actions</th>
            </tr>
        `;
        matrixPivotThead.innerHTML = theadHtml;

        // Filter Rows
        let filteredRows = matrix || [];
        if (search) {
            filteredRows = filteredRows.filter(r =>
                r.item_name.toLowerCase().includes(search) ||
                r.sku.toLowerCase().includes(search)
            );
        }

        if (statusFilter && statusFilter !== 'all') {
            filteredRows = filteredRows.filter(r => {
                if (statusFilter === 'Healthy') return r.network_health_status === 'Optimal';
                if (statusFilter === 'Low Stock') return r.network_health_status === 'Low Stock' || r.network_health_status === 'Critical Shortage';
                if (statusFilter === 'Critical') return r.network_health_status === 'Critical Shortage';
                if (statusFilter === 'Out of Stock') return r.total_network_stock === 0 || r.low_stock_warehouses_count > 0;
                return true;
            });
        }

        if (matrixPivotCountBadge) {
            matrixPivotCountBadge.textContent = `${filteredRows.length} Products × ${warehouses.length} Facilities`;
        }

        if (filteredRows.length === 0) {
            matrixPivotTbody.innerHTML = `
                <tr>
                    <td colspan="${warehouses.length + 5}" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                        No catalog items match current matrix filters.
                    </td>
                </tr>
            `;
            return;
        }

        matrixPivotTbody.innerHTML = filteredRows.map(row => {
            let cellsHtml = '';

            warehouses.forEach(w => {
                const stockInfo = row.warehouse_stocks[w.warehouse_id] || {
                    stock_quantity: 0,
                    is_low_stock: true,
                    status: 'Out of Stock',
                    quarantined_units: 0
                };

                let boxClass = 'status-healthy';
                let tagClass = 'matrix-tag-healthy';
                let tagText = 'Optimal';

                if (stockInfo.stock_quantity === 0) {
                    boxClass = 'status-out';
                    tagClass = 'matrix-tag-out';
                    tagText = 'Out of Stock';
                } else if (stockInfo.status === 'Critical') {
                    boxClass = 'status-critical';
                    tagClass = 'matrix-tag-critical';
                    tagText = 'Critical';
                } else if (stockInfo.is_low_stock) {
                    boxClass = 'status-low';
                    tagClass = 'matrix-tag-low';
                    tagText = 'Low Stock';
                }

                const quarantineHtml = stockInfo.quarantined_units > 0 
                    ? `<div class="matrix-quarantine-pill" title="${stockInfo.quarantined_units} quarantined units locked">🔒 ${stockInfo.quarantined_units} Q</div>` 
                    : '';

                cellsHtml += `
                    <td class="matrix-stock-cell">
                        <div class="matrix-stock-box ${boxClass}" title="${row.item_name} at ${w.name}: ${stockInfo.stock_quantity} units">
                            <span class="matrix-stock-val">${stockInfo.stock_quantity}</span>
                            <span class="matrix-stock-tag ${tagClass}">${tagText}</span>
                            ${quarantineHtml}
                        </div>
                    </td>
                `;
            });

            let healthBadge = `<span class="badge badge-delivered" style="font-size: 0.75rem;">Optimal</span>`;
            if (row.network_health_status === 'Critical Shortage') {
                healthBadge = `<span class="badge badge-critical" style="font-size: 0.75rem;">Critical (${row.low_stock_warehouses_count} Low)</span>`;
            } else if (row.network_health_status === 'Low Stock') {
                healthBadge = `<span class="badge badge-warning" style="font-size: 0.75rem;">Shortage (${row.low_stock_warehouses_count} Low)</span>`;
            }

            return `
                <tr>
                    <td>
                        <div class="matrix-item-info">
                            <span class="matrix-item-title">${row.item_name}</span>
                            <span class="matrix-item-sku">${row.sku}</span>
                        </div>
                    </td>
                    <td style="text-align: center; color: var(--text-secondary); font-weight: 600;">
                        ${row.safety_threshold}
                    </td>
                    ${cellsHtml}
                    <td class="matrix-total-cell">
                        <span class="matrix-total-val">${row.total_network_stock}</span>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">units</div>
                    </td>
                    <td style="text-align: center;">
                        ${healthBadge}
                    </td>
                    <td style="text-align: right;">
                        <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
                            <button class="btn btn-outline btn-sm quick-transfer-btn" data-item-id="${row.item_id}" data-item-name="${row.item_name}" title="Transfer this item between facilities">
                                ⇄ Transfer
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Wire quick transfer buttons
        document.querySelectorAll('.quick-transfer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.dataset.itemId, 10);
                openTransferModal(itemId);
            });
        });
    }

    function renderStockMatrixDetailedList(matrix) {
        if (!matrixListTableBody) return;

        const search = searchMatrixInput?.value.trim().toLowerCase() || '';
        const wId = filterMatrixWarehouse?.value;
        const statusFilter = filterMatrixStatus?.value;

        let filtered = matrix || [];
        if (wId && wId !== 'all') {
            const targetW = parseInt(wId, 10);
            filtered = filtered.filter(m => m.warehouse_id === targetW);
        }

        if (search) {
            filtered = filtered.filter(m =>
                m.item_name.toLowerCase().includes(search) ||
                m.sku.toLowerCase().includes(search) ||
                m.warehouse_name.toLowerCase().includes(search)
            );
        }

        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(m => {
                if (statusFilter === 'Healthy') return m.stock_status === 'Optimal';
                if (statusFilter === 'Low Stock') return m.is_low_stock;
                if (statusFilter === 'Critical') return m.stock_status === 'Critical';
                if (statusFilter === 'Out of Stock') return m.stock_quantity === 0;
                return true;
            });
        }

        if (matrixListCountBadge) {
            matrixListCountBadge.textContent = `${filtered.length} Storage Nodes`;
        }

        if (filtered.length === 0) {
            matrixListTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No inventory records match current filter criteria.</td></tr>`;
            return;
        }

        matrixListTableBody.innerHTML = filtered.map(row => {
            let statusBadge = `<span class="badge badge-delivered" style="font-size: 0.725rem;">Optimal</span>`;
            if (row.stock_quantity === 0) {
                statusBadge = `<span class="badge badge-critical" style="font-size: 0.725rem;">Out of Stock</span>`;
            } else if (row.stock_status === 'Critical') {
                statusBadge = `<span class="badge badge-critical" style="font-size: 0.725rem;">Critical (-${row.deficit})</span>`;
            } else if (row.is_low_stock) {
                statusBadge = `<span class="badge badge-warning" style="font-size: 0.725rem;">Low Stock (-${row.deficit})</span>`;
            }

            const stockColor = row.is_low_stock ? 'var(--accent-danger)' : 'var(--text-primary)';
            const quarantinedHtml = row.quarantined_units > 0 
                ? `<span class="matrix-quarantine-pill">🔒 ${row.quarantined_units} units</span>` 
                : `<span style="color: var(--text-muted); font-size: 0.8rem;">0</span>`;

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
                    <td>${quarantinedHtml}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn btn-outline btn-sm list-transfer-btn" data-item-id="${row.item_id}" data-warehouse-id="${row.warehouse_id}">
                            ⇄ Transfer
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.list-transfer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = parseInt(btn.dataset.itemId, 10);
                const warehouseId = parseInt(btn.dataset.warehouseId, 10);
                openTransferModal(itemId, warehouseId);
            });
        });
    }

    // Stock Matrix View Toggles
    viewMatrixPivotBtn?.addEventListener('click', () => {
        currentMatrixView = 'pivot';
        viewMatrixPivotBtn.className = 'btn btn-primary btn-sm';
        viewMatrixListBtn.className = 'btn btn-outline btn-sm';
        matrixPivotView?.classList.remove('hidden');
        matrixListView?.classList.add('hidden');
        if (stockMatrixPivotData) renderStockMatrixPivot(stockMatrixPivotData);
    });

    viewMatrixListBtn?.addEventListener('click', () => {
        currentMatrixView = 'list';
        viewMatrixListBtn.className = 'btn btn-primary btn-sm';
        viewMatrixPivotBtn.className = 'btn btn-outline btn-sm';
        matrixPivotView?.classList.add('hidden');
        matrixListView?.classList.remove('hidden');
        if (stockMatrixFlatData) renderStockMatrixDetailedList(stockMatrixFlatData);
    });

    // Filters
    filterMatrixWarehouse?.addEventListener('change', () => {
        if (currentMatrixView === 'pivot' && stockMatrixPivotData) renderStockMatrixPivot(stockMatrixPivotData);
        else if (stockMatrixFlatData) renderStockMatrixDetailedList(stockMatrixFlatData);
    });

    filterMatrixStatus?.addEventListener('change', () => {
        if (currentMatrixView === 'pivot' && stockMatrixPivotData) renderStockMatrixPivot(stockMatrixPivotData);
        else if (stockMatrixFlatData) renderStockMatrixDetailedList(stockMatrixFlatData);
    });

    searchMatrixInput?.addEventListener('input', () => {
        if (currentMatrixView === 'pivot' && stockMatrixPivotData) renderStockMatrixPivot(stockMatrixPivotData);
        else if (stockMatrixFlatData) renderStockMatrixDetailedList(stockMatrixFlatData);
    });

    // Inter-Warehouse Transfer Modal
    openInterWarehouseTransferBtn?.addEventListener('click', () => openTransferModal());
    closeTransferModalBtn?.addEventListener('click', () => transferStockModal?.classList.add('hidden'));

    function openTransferModal(defaultItemId = null, defaultSrcWarehouseId = null) {
        if (!catalogItems.length || !warehousesList.length) return;

        // Populate Items
        transferItemSelect.innerHTML = catalogItems.map(item =>
            `<option value="${item.item_id}" ${defaultItemId === item.item_id ? 'selected' : ''}>${item.name} (${item.sku})</option>`
        ).join('');

        // Populate Source & Destination Warehouses
        populateTransferWarehouseSelects(defaultSrcWarehouseId);
        updateTransferStockPreview();

        transferStockModal?.classList.remove('hidden');
    }

    function populateTransferWarehouseSelects(defaultSrcId = null) {
        transferSourceSelect.innerHTML = warehousesList.map((w, idx) =>
            `<option value="${w.warehouse_id}" ${defaultSrcId ? (w.warehouse_id === defaultSrcId ? 'selected' : '') : (idx === 0 ? 'selected' : '')}>${w.name} (${w.location_zone})</option>`
        ).join('');

        const selectedSrcId = parseInt(transferSourceSelect.value, 10);
        transferDestSelect.innerHTML = warehousesList
            .filter(w => w.warehouse_id !== selectedSrcId)
            .map((w, idx) =>
                `<option value="${w.warehouse_id}" ${idx === 0 ? 'selected' : ''}>${w.name} (${w.location_zone})</option>`
            ).join('');
    }

    transferItemSelect?.addEventListener('change', updateTransferStockPreview);
    transferSourceSelect?.addEventListener('change', () => {
        const selectedSrcId = parseInt(transferSourceSelect.value, 10);
        const currentDestId = parseInt(transferDestSelect.value, 10);

        transferDestSelect.innerHTML = warehousesList
            .filter(w => w.warehouse_id !== selectedSrcId)
            .map(w => `<option value="${w.warehouse_id}" ${w.warehouse_id === currentDestId ? 'selected' : ''}>${w.name} (${w.location_zone})</option>`)
            .join('');

        updateTransferStockPreview();
    });

    function updateTransferStockPreview() {
        const itemId = parseInt(transferItemSelect.value, 10);
        const srcId = parseInt(transferSourceSelect.value, 10);

        const stockRec = stockMatrixFlatData.find(m => m.item_id === itemId && m.warehouse_id === srcId);
        const qty = stockRec ? stockRec.stock_quantity : 0;

        if (transferAvailableStockPreview) {
            transferAvailableStockPreview.textContent = `${qty} units available`;
            transferAvailableStockPreview.style.color = qty > 0 ? '#34d399' : '#ef4444';
        }
    }

    document.querySelectorAll('.transfer-quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const add = parseInt(btn.dataset.qty, 10);
            transferQuantity.value = add;
        });
    });

    submitTransferBtn?.addEventListener('click', async () => {
        const itemId = parseInt(transferItemSelect.value, 10);
        const srcId = parseInt(transferSourceSelect.value, 10);
        const dstId = parseInt(transferDestSelect.value, 10);
        const qty = parseInt(transferQuantity.value, 10);

        if (!itemId || !srcId || !dstId || !qty || qty <= 0) {
            showToast('Please enter a valid positive transfer quantity.', 'error');
            return;
        }

        if (srcId === dstId) {
            showToast('Source and destination warehouses cannot be the same.', 'error');
            return;
        }

        try {
            const res = await api.transferStock({
                item_id: itemId,
                source_warehouse_id: srcId,
                dest_warehouse_id: dstId,
                quantity: qty
            });

            showToast(res.message);
            transferStockModal?.classList.add('hidden');

            await Promise.all([
                loadStockMatrixModule(),
                loadInventoryModule()
            ]);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // =========================================================================
    // MODULE: GOODS MONITORING & QUARANTINE CONTROL (Shafein's - Feature 3)
    // Report/insert view over Damaged_Inventory and Expired_Inventory
    // Quarantined stock can NEVER be resold or dispatched to orders
    // =========================================================================

    // DOM Elements - Goods Monitoring
    const openLogDamageModalBtn = document.getElementById('openLogDamageModalBtn');
    const openLogExpiryModalBtn = document.getElementById('openLogExpiryModalBtn');
    const gmFilterTabAll = document.getElementById('gmFilterTabAll');
    const gmFilterTabDamaged = document.getElementById('gmFilterTabDamaged');
    const gmFilterTabExpired = document.getElementById('gmFilterTabExpired');
    const filterGmWarehouse = document.getElementById('filterGmWarehouse');
    const filterGmStatus = document.getElementById('filterGmStatus');
    const searchGmInput = document.getElementById('searchGmInput');
    const goodsMonitoringCardsContainer = document.getElementById('goodsMonitoringCardsContainer');

    const gmKpiTotalQuarantined = document.getElementById('gmKpiTotalQuarantined');
    const gmKpiDamagedUnits = document.getElementById('gmKpiDamagedUnits');
    const gmKpiExpiredUnits = document.getElementById('gmKpiExpiredUnits');
    const gmKpiActiveQuarantine = document.getElementById('gmKpiActiveQuarantine');
    const gmKpiWrittenOff = document.getElementById('gmKpiWrittenOff');
    const gmKpiAffectedWarehouses = document.getElementById('gmKpiAffectedWarehouses');

    // Modals
    const logDamagedModal = document.getElementById('logDamagedModal');
    const closeLogDamageModalBtn = document.getElementById('closeLogDamageModalBtn');
    const logDamageWarehouseSelect = document.getElementById('logDamageWarehouseSelect');
    const logDamageItemSelect = document.getElementById('logDamageItemSelect');
    const logDamageQuantity = document.getElementById('logDamageQuantity');
    const logDamageSeveritySelect = document.getElementById('logDamageSeveritySelect');
    const logDamageReasonSelect = document.getElementById('logDamageReasonSelect');
    const logDamageCustomReasonGroup = document.getElementById('logDamageCustomReasonGroup');
    const logDamageCustomReason = document.getElementById('logDamageCustomReason');
    const logDamageLoggedBy = document.getElementById('logDamageLoggedBy');
    const logDamageDeductStock = document.getElementById('logDamageDeductStock');
    const logDamageNotes = document.getElementById('logDamageNotes');
    const submitLogDamageBtn = document.getElementById('submitLogDamageBtn');

    const logExpiredModal = document.getElementById('logExpiredModal');
    const closeLogExpiryModalBtn = document.getElementById('closeLogExpiryModalBtn');
    const logExpiryWarehouseSelect = document.getElementById('logExpiryWarehouseSelect');
    const logExpiryItemSelect = document.getElementById('logExpiryItemSelect');
    const logExpiryLotNumber = document.getElementById('logExpiryLotNumber');
    const logExpiryQuantity = document.getElementById('logExpiryQuantity');
    const logExpiryDate = document.getElementById('logExpiryDate');
    const logExpiryLoggedBy = document.getElementById('logExpiryLoggedBy');
    const logExpiryDeductStock = document.getElementById('logExpiryDeductStock');
    const logExpiryNotes = document.getElementById('logExpiryNotes');
    const submitLogExpiryBtn = document.getElementById('submitLogExpiryBtn');

    const advanceQuarantineModal = document.getElementById('advanceQuarantineModal');
    const closeAdvanceQuarantineModalBtn = document.getElementById('closeAdvanceQuarantineModalBtn');
    const advQuarantineTitle = document.getElementById('advQuarantineTitle');
    const advQuarantineItemName = document.getElementById('advQuarantineItemName');
    const advQuarantineWarehouseName = document.getElementById('advQuarantineWarehouseName');
    const advQuarantineQty = document.getElementById('advQuarantineQty');
    const advQuarantineCurrentStatus = document.getElementById('advQuarantineCurrentStatus');
    const advQuarantineNextStatus = document.getElementById('advQuarantineNextStatus');
    const advQuarantineNotes = document.getElementById('advQuarantineNotes');
    const submitAdvanceQuarantineBtn = document.getElementById('submitAdvanceQuarantineBtn');

    async function loadGoodsMonitoringModule() {
        try {
            const [kpiRes, gmRes, warehousesRes] = await Promise.all([
                api.getGoodsMonitoringKPIs(),
                api.getGoodsMonitoring({
                    type: currentGmTypeFilter,
                    warehouse_id: filterGmWarehouse?.value || 'all',
                    status: filterGmStatus?.value || 'all',
                    search: searchGmInput?.value.trim() || ''
                }),
                api.getWarehouses()
            ]);

            if (warehousesRes.success && warehousesRes.warehouses) {
                warehousesList = warehousesRes.warehouses;
            }

            if (kpiRes.success && kpiRes.kpis) {
                goodsMonitoringKPIs = kpiRes.kpis;
                if (gmKpiTotalQuarantined) gmKpiTotalQuarantined.textContent = `${kpiRes.kpis.totalQuarantinedUnits} units`;
                if (gmKpiDamagedUnits) gmKpiDamagedUnits.textContent = `${kpiRes.kpis.damagedUnits} units`;
                if (gmKpiExpiredUnits) gmKpiExpiredUnits.textContent = `${kpiRes.kpis.expiredUnits} units`;
                if (gmKpiActiveQuarantine) gmKpiActiveQuarantine.textContent = `${kpiRes.kpis.activeQuarantineUnits} units`;
                if (gmKpiWrittenOff) gmKpiWrittenOff.textContent = `${kpiRes.kpis.writtenOffUnits} units`;
                if (gmKpiAffectedWarehouses) gmKpiAffectedWarehouses.textContent = `${kpiRes.kpis.affectedWarehouses} Hubs`;
            }

            if (gmRes.success && gmRes.records) {
                goodsMonitoringRecords = gmRes.records;
                renderGoodsMonitoringCards(gmRes.records);
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function renderGoodsMonitoringCards(records) {
        if (!goodsMonitoringCardsContainer) return;

        const search = searchGmInput?.value.trim().toLowerCase() || '';
        const wId = filterGmWarehouse?.value;
        const statusFilter = filterGmStatus?.value;

        let filtered = records || [];

        if (currentGmTypeFilter !== 'all') {
            filtered = filtered.filter(r => r.quarantine_type.toLowerCase() === currentGmTypeFilter.toLowerCase());
        }

        if (wId && wId !== 'all') {
            const targetW = parseInt(wId, 10);
            filtered = filtered.filter(r => r.warehouse_id === targetW);
        }

        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(r => r.quarantine_status.toLowerCase() === statusFilter.toLowerCase());
        }

        if (search) {
            filtered = filtered.filter(r =>
                r.item_name.toLowerCase().includes(search) ||
                r.sku.toLowerCase().includes(search) ||
                r.reason.toLowerCase().includes(search) ||
                r.logged_by.toLowerCase().includes(search) ||
                (r.batch_lot_number && r.batch_lot_number.toLowerCase().includes(search))
            );
        }

        if (filtered.length === 0) {
            goodsMonitoringCardsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3.5rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-subtle);">
                    <div style="font-size: 1.75rem; margin-bottom: 0.5rem;">🔒</div>
                    <strong>No quarantined inventory records match your criteria.</strong>
                    <div style="font-size: 0.8rem; margin-top: 0.35rem;">All stored stock in selected facilities is active and cleared for fulfillment.</div>
                </div>
            `;
            return;
        }

        goodsMonitoringCardsContainer.innerHTML = filtered.map(rec => {
            const isDamaged = rec.quarantine_type === 'Damaged';
            const cardTypeClass = isDamaged ? 'type-damaged' : 'type-expired';
            const typeBadge = isDamaged 
                ? `<span class="badge-damaged-type">💥 Damaged (${rec.condition_grade})</span>` 
                : `<span class="badge-expired-type">⏳ Expired Batch</span>`;

            let statusBadge = `<span class="badge-quarantined-status">🔒 Quarantined</span>`;
            if (rec.quarantine_status === 'Written Off') {
                statusBadge = `<span class="badge-written-off-status">📝 Written Off</span>`;
            } else if (rec.quarantine_status === 'Disposed') {
                statusBadge = `<span class="badge-disposed-status">♻️ Disposed</span>`;
            }

            const lotHtml = rec.batch_lot_number ? `
                <div class="quarantine-meta-item">
                    <div class="meta-label">Batch / Lot #</div>
                    <div class="meta-val" style="font-family: monospace;">${rec.batch_lot_number}</div>
                </div>
            ` : `
                <div class="quarantine-meta-item">
                    <div class="meta-label">Severity Level</div>
                    <div class="meta-val" style="color: ${rec.condition_grade === 'Severe' || rec.condition_grade === 'Total Loss' ? '#f87171' : '#fbbf24'};">${rec.condition_grade || 'Standard'}</div>
                </div>
            `;

            const dateOrExpiryHtml = rec.expiration_date ? `
                <div class="quarantine-meta-item">
                    <div class="meta-label">Expired On</div>
                    <div class="meta-val" style="color: #f87171;">${rec.expiration_date}</div>
                </div>
            ` : `
                <div class="quarantine-meta-item">
                    <div class="meta-label">Logged On</div>
                    <div class="meta-val">${rec.date_logged}</div>
                </div>
            `;

            return `
                <div class="quarantine-card ${cardTypeClass}">
                    <div>
                        <div class="quarantine-card-header">
                            <div>
                                <div class="quarantine-item-title">${rec.item_name}</div>
                                <span class="quarantine-item-sku">${rec.sku}</span>
                            </div>
                            ${typeBadge}
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin: 0.85rem 0 0.65rem 0;">
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                🏢 <strong>${rec.warehouse_name}</strong> (${rec.location_zone})
                            </div>
                            <div>${statusBadge}</div>
                        </div>

                        <div class="quarantine-reason-box">
                            <strong>Reason:</strong> ${rec.reason}
                            ${rec.notes ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">Note: ${rec.notes}</div>` : ''}
                        </div>
                    </div>

                    <div>
                        <div class="quarantine-meta-grid">
                            <div class="quarantine-meta-item">
                                <div class="meta-label">Quarantined Qty</div>
                                <div class="meta-val" style="color: var(--accent-danger); font-size: 0.95rem;">${rec.quantity} units</div>
                            </div>
                            <div class="quarantine-meta-item">
                                <div class="meta-label">Inspector</div>
                                <div class="meta-val" style="font-size: 0.775rem;">${rec.logged_by}</div>
                            </div>
                            ${lotHtml}
                            ${dateOrExpiryHtml}
                        </div>

                        <div class="quarantine-card-footer">
                            <span style="font-size: 0.725rem; color: var(--text-muted);">ID #${rec.record_id} &bull; Locked from Resale</span>
                            <button class="btn btn-outline btn-sm manage-quarantine-btn" data-type="${rec.quarantine_type}" data-id="${rec.record_id}">
                                ⚙️ Status & Disposal
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Wire status manage buttons
        document.querySelectorAll('.manage-quarantine-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const id = parseInt(btn.dataset.id, 10);
                const target = goodsMonitoringRecords.find(r => r.quarantine_type.toLowerCase() === type.toLowerCase() && r.record_id === id);
                if (target) openAdvanceQuarantineModal(target);
            });
        });
    }

    // Category Tabs
    gmFilterTabAll?.addEventListener('click', () => {
        currentGmTypeFilter = 'all';
        gmFilterTabAll.className = 'filter-chip active';
        gmFilterTabDamaged.className = 'filter-chip';
        gmFilterTabExpired.className = 'filter-chip';
        renderGoodsMonitoringCards(goodsMonitoringRecords);
    });

    gmFilterTabDamaged?.addEventListener('click', () => {
        currentGmTypeFilter = 'damaged';
        gmFilterTabDamaged.className = 'filter-chip active';
        gmFilterTabAll.className = 'filter-chip';
        gmFilterTabExpired.className = 'filter-chip';
        renderGoodsMonitoringCards(goodsMonitoringRecords);
    });

    gmFilterTabExpired?.addEventListener('click', () => {
        currentGmTypeFilter = 'expired';
        gmFilterTabExpired.className = 'filter-chip active';
        gmFilterTabAll.className = 'filter-chip';
        gmFilterTabDamaged.className = 'filter-chip';
        renderGoodsMonitoringCards(goodsMonitoringRecords);
    });

    filterGmWarehouse?.addEventListener('change', () => renderGoodsMonitoringCards(goodsMonitoringRecords));
    filterGmStatus?.addEventListener('change', () => renderGoodsMonitoringCards(goodsMonitoringRecords));
    searchGmInput?.addEventListener('input', () => renderGoodsMonitoringCards(goodsMonitoringRecords));

    // Log Damaged Goods Modal
    openLogDamageModalBtn?.addEventListener('click', () => {
        if (!catalogItems.length || !warehousesList.length) return;

        logDamageWarehouseSelect.innerHTML = warehousesList.map((w, idx) =>
            `<option value="${w.warehouse_id}" ${idx === 0 ? 'selected' : ''}>${w.name} (${w.location_zone})</option>`
        ).join('');

        logDamageItemSelect.innerHTML = catalogItems.map((item, idx) =>
            `<option value="${item.item_id}" ${idx === 0 ? 'selected' : ''}>${item.name} (${item.sku})</option>`
        ).join('');

        logDamageQuantity.value = 1;
        logDamageReasonSelect.value = 'Water damage during storage handling';
        logDamageCustomReasonGroup?.classList.add('hidden');
        logDamageNotes.value = '';
        logDamagedModal?.classList.remove('hidden');
    });

    closeLogDamageModalBtn?.addEventListener('click', () => logDamagedModal?.classList.add('hidden'));

    logDamageReasonSelect?.addEventListener('change', () => {
        if (logDamageReasonSelect.value === 'Custom') {
            logDamageCustomReasonGroup?.classList.remove('hidden');
            logDamageCustomReason?.focus();
        } else {
            logDamageCustomReasonGroup?.classList.add('hidden');
        }
    });

    submitLogDamageBtn?.addEventListener('click', async () => {
        const wId = parseInt(logDamageWarehouseSelect.value, 10);
        const iId = parseInt(logDamageItemSelect.value, 10);
        const qty = parseInt(logDamageQuantity.value, 10);
        let reason = logDamageReasonSelect.value;

        if (reason === 'Custom') {
            reason = logDamageCustomReason?.value.trim() || 'Custom damage reported';
        }

        if (!wId || !iId || !qty || qty <= 0) {
            showToast('Please specify valid warehouse, item, and quantity.', 'error');
            return;
        }

        try {
            const res = await api.logDamagedGoods({
                warehouse_id: wId,
                item_id: iId,
                quantity: qty,
                damage_reason: reason,
                severity: logDamageSeveritySelect.value,
                logged_by: logDamageLoggedBy.value.trim() || 'QA Staff',
                deduct_active_stock: logDamageDeductStock.checked,
                notes: logDamageNotes.value.trim()
            });

            showToast(res.message);
            logDamagedModal?.classList.add('hidden');

            await Promise.all([
                loadGoodsMonitoringModule(),
                loadStockMatrixModule(),
                loadInventoryModule()
            ]);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Log Expired Batch Modal
    openLogExpiryModalBtn?.addEventListener('click', () => {
        if (!catalogItems.length || !warehousesList.length) return;

        logExpiryWarehouseSelect.innerHTML = warehousesList.map((w, idx) =>
            `<option value="${w.warehouse_id}" ${idx === 0 ? 'selected' : ''}>${w.name} (${w.location_zone})</option>`
        ).join('');

        logExpiryItemSelect.innerHTML = catalogItems.map((item, idx) =>
            `<option value="${item.item_id}" ${idx === 0 ? 'selected' : ''}>${item.name} (${item.sku})</option>`
        ).join('');

        logExpiryQuantity.value = 5;
        logExpiryLotNumber.value = `LOT-EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
        logExpiryDate.value = new Date().toISOString().substring(0, 10);
        logExpiryNotes.value = '';
        logExpiredModal?.classList.remove('hidden');
    });

    closeLogExpiryModalBtn?.addEventListener('click', () => logExpiredModal?.classList.add('hidden'));

    submitLogExpiryBtn?.addEventListener('click', async () => {
        const wId = parseInt(logExpiryWarehouseSelect.value, 10);
        const iId = parseInt(logExpiryItemSelect.value, 10);
        const lot = logExpiryLotNumber.value.trim();
        const qty = parseInt(logExpiryQuantity.value, 10);
        const expDate = logExpiryDate.value;

        if (!wId || !iId || !lot || !qty || qty <= 0 || !expDate) {
            showToast('Please fill all required fields: warehouse, item, lot #, quantity, and expiry date.', 'error');
            return;
        }

        try {
            const res = await api.logExpiredGoods({
                warehouse_id: wId,
                item_id: iId,
                batch_lot_number: lot,
                quantity: qty,
                expiration_date: expDate,
                logged_by: logExpiryLoggedBy.value.trim() || 'Compliance Inspector',
                deduct_active_stock: logExpiryDeductStock.checked,
                notes: logExpiryNotes.value.trim()
            });

            showToast(res.message);
            logExpiredModal?.classList.add('hidden');

            await Promise.all([
                loadGoodsMonitoringModule(),
                loadStockMatrixModule(),
                loadInventoryModule()
            ]);
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Advance Quarantine Status / Disposal Modal
    function openAdvanceQuarantineModal(target) {
        activeQuarantineTarget = target;

        advQuarantineTitle.textContent = `${target.quarantine_type} Lot #${target.record_id}`;
        advQuarantineItemName.textContent = `${target.item_name} (${target.sku})`;
        advQuarantineWarehouseName.textContent = `${target.warehouse_name} (${target.location_zone})`;
        advQuarantineQty.textContent = `${target.quantity} units`;
        advQuarantineCurrentStatus.textContent = target.quarantine_status;
        advQuarantineNextStatus.value = target.quarantine_status === 'Quarantined' ? 'Written Off' : target.quarantine_status;
        advQuarantineNotes.value = '';

        advanceQuarantineModal?.classList.remove('hidden');
    }

    closeAdvanceQuarantineModalBtn?.addEventListener('click', () => advanceQuarantineModal?.classList.add('hidden'));

    submitAdvanceQuarantineBtn?.addEventListener('click', async () => {
        if (!activeQuarantineTarget) return;

        const nextStatus = advQuarantineNextStatus.value;
        const notes = advQuarantineNotes.value.trim();

        try {
            const res = await api.updateQuarantineStatus(
                activeQuarantineTarget.quarantine_type.toLowerCase(),
                activeQuarantineTarget.record_id,
                nextStatus,
                notes
            );

            showToast(res.message);
            advanceQuarantineModal?.classList.add('hidden');

            await Promise.all([
                loadGoodsMonitoringModule(),
                loadStockMatrixModule()
            ]);
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
        await loadDemoWarehouseUsers();

        const storedToken = api.getToken();
        const storedRole = api.getUserRole();

        if (storedToken) {
            try {
                const res = await api.getCurrentUser();
                if (res.success) {
                    if (res.role === 'warehouse' && res.user) {
                        currentWarehouseUser = res.user;
                        currentCustomer = null;
                        switchPortal('warehouse');
                        return;
                    } else if (res.role === 'customer' && res.customer) {
                        currentCustomer = res.customer;
                        currentWarehouseUser = null;
                        switchPortal('customer');
                        return;
                    }
                }
            } catch (err) {
                api.logout();
            }
        }

        // Default: display Customer Portal auth
        switchPortal('customer');
    }

    init();
});
