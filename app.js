// Trip Expense Tracker - Santa Clara Trip
// Using ExchangeRate-API for real-time USD-IDR rates

const APP_STATE = {
    transactions: [],
    wishlist: [],
    exchangeRate: 16000, // Default fallback
    lastRateUpdate: null,
    activeTab: 'expenses'
};

// DOM Elements
const elements = {
    rateDisplay: document.getElementById('rate-display'),
    refreshRate: document.getElementById('refresh-rate'),
    totalIncome: document.getElementById('total-income'),
    totalIncomeIdr: document.getElementById('total-income-idr'),
    totalExpense: document.getElementById('total-expense'),
    totalExpenseIdr: document.getElementById('total-expense-idr'),
    totalBalance: document.getElementById('total-balance'),
    totalBalanceIdr: document.getElementById('total-balance-idr'),
    addBtn: document.getElementById('add-btn'),
    modal: document.getElementById('modal'),
    closeModal: document.getElementById('close-modal'),
    cancelBtn: document.getElementById('cancel-btn'),
    form: document.getElementById('transaction-form'),
    transactionId: document.getElementById('transaction-id'),
    modalTitle: document.getElementById('modal-title'),
    typeInput: document.getElementById('type'),
    descInput: document.getElementById('description'),
    amountInput: document.getElementById('amount'),
    currencySelect: document.getElementById('currency'),
    categorySelect: document.getElementById('category'),
    dateInput: document.getElementById('date'),
    convertedPreview: document.getElementById('converted-preview'),
    filterCategory: document.getElementById('filter-category'),
    filterType: document.getElementById('filter-type'),
    categoryList: document.getElementById('category-list'),
    transactionList: document.getElementById('transaction-list'),
    exportBtn: document.getElementById('export-btn'),
    clearBtn: document.getElementById('clear-btn'),
    toggleBtns: document.querySelectorAll('.toggle-btn')
};

// Category icons mapping
const CATEGORY_ICONS = {
    food: '🍔',
    transport: '🚗',
    shopping: '🛍️',
    accommodation: '🏨',
    entertainment: '🎬',
    other: '📦'
};

const CATEGORY_LABELS = {
    food: 'Makan',
    transport: 'Transport',
    shopping: 'Belanja',
    accommodation: 'Akomodasi',
    entertainment: 'Hiburan',
    other: 'Lainnya'
};

// Initialize App
document.addEventListener('DOMContentLoaded', init);

async function init() {
    loadFromStorage();
    await fetchExchangeRate();
    setupEventListeners();
    renderAll();
    setDefaultDate();
}

// Storage Functions
function loadFromStorage() {
    const saved = localStorage.getItem('tripExpenseTracker');
    if (saved) {
        const data = JSON.parse(saved);
        APP_STATE.transactions = data.transactions || [];
        APP_STATE.wishlist = data.wishlist || [];
        APP_STATE.exchangeRate = data.exchangeRate || 16000;
        APP_STATE.lastRateUpdate = data.lastRateUpdate;
    }
}

function saveToStorage() {
    localStorage.setItem('tripExpenseTracker', JSON.stringify(APP_STATE));
}

// Exchange Rate API
async function fetchExchangeRate() {
    try {
        elements.rateDisplay.textContent = 'Updating rate...';
        
        // Using exchangerate-api.com (free, no API key needed)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        
        if (data.rates && data.rates.IDR) {
            APP_STATE.exchangeRate = data.rates.IDR;
            APP_STATE.lastRateUpdate = new Date().toISOString();
            saveToStorage();
            updateRateDisplay();
        }
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        // Use cached or default rate
        updateRateDisplay(true);
    }
}

function updateRateDisplay(isOffline = false) {
    const rate = formatNumber(APP_STATE.exchangeRate, 0);
    const status = isOffline ? ' (offline)' : '';
    elements.rateDisplay.textContent = `$1 = Rp ${rate}${status}`;
}

// Event Listeners
function setupEventListeners() {
    // Add transaction button
    elements.addBtn.addEventListener('click', () => openModal());
    
    // Modal controls
    elements.closeModal.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });
    
    // Form submission
    elements.form.addEventListener('submit', handleSubmit);
    
    // Toggle type buttons
    elements.toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            elements.typeInput.value = btn.dataset.type;
        });
    });
    
    // Amount & currency change for preview
    elements.amountInput.addEventListener('input', updateConvertedPreview);
    elements.currencySelect.addEventListener('change', updateConvertedPreview);
    
    // Refresh rate button
    elements.refreshRate.addEventListener('click', fetchExchangeRate);
    
    // Filters
    elements.filterCategory.addEventListener('change', renderTransactions);
    elements.filterType.addEventListener('change', renderTransactions);
    
    // Export & Clear
    elements.exportBtn.addEventListener('click', exportToCSV);
    elements.clearBtn.addEventListener('click', clearAllData);
}

// Modal Functions
function openModal(transaction = null) {
    elements.modal.classList.add('active');
    elements.form.reset();
    setDefaultDate();
    
    if (transaction) {
        // Edit mode
        elements.modalTitle.textContent = 'Edit Transaksi';
        elements.transactionId.value = transaction.id;
        elements.descInput.value = transaction.description;
        elements.amountInput.value = transaction.originalAmount;
        elements.currencySelect.value = transaction.originalCurrency;
        elements.categorySelect.value = transaction.category;
        elements.dateInput.value = transaction.date;
        
        // Set type toggle
        elements.typeInput.value = transaction.type;
        elements.toggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === transaction.type);
        });
    } else {
        // Add mode
        elements.modalTitle.textContent = 'Tambah Transaksi';
        elements.transactionId.value = '';
        elements.typeInput.value = 'expense';
        elements.toggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === 'expense');
        });
    }
    
    updateConvertedPreview();
}

function closeModal() {
    elements.modal.classList.remove('active');
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    elements.dateInput.value = today;
}

// Form Handling
function handleSubmit(e) {
    e.preventDefault();
    
    const id = elements.transactionId.value || generateId();
    const type = elements.typeInput.value;
    const description = elements.descInput.value.trim();
    const originalAmount = parseFloat(elements.amountInput.value);
    const originalCurrency = elements.currencySelect.value;
    const category = elements.categorySelect.value;
    const date = elements.dateInput.value;
    
    // Convert to USD for consistent calculations
    let amountUSD;
    if (originalCurrency === 'USD') {
        amountUSD = originalAmount;
    } else {
        amountUSD = originalAmount / APP_STATE.exchangeRate;
    }
    
    const transaction = {
        id,
        type,
        description,
        amountUSD: Math.round(amountUSD * 100) / 100,
        originalAmount,
        originalCurrency,
        category,
        date,
        createdAt: new Date().toISOString()
    };
    
    // Update or add
    const existingIndex = APP_STATE.transactions.findIndex(t => t.id === id);
    if (existingIndex >= 0) {
        APP_STATE.transactions[existingIndex] = transaction;
    } else {
        APP_STATE.transactions.unshift(transaction);
    }
    
    saveToStorage();
    renderAll();
    closeModal();
}

// Rendering Functions
function renderAll() {
    renderSummary();
    renderCategoryBreakdown();
    renderTransactions();
}

function renderSummary() {
    const income = APP_STATE.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amountUSD, 0);
    
    const expense = APP_STATE.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amountUSD, 0);
    
    const balance = income - expense;
    
    elements.totalIncome.textContent = formatUSD(income);
    elements.totalIncomeIdr.textContent = formatIDR(income * APP_STATE.exchangeRate);
    
    elements.totalExpense.textContent = formatUSD(expense);
    elements.totalExpenseIdr.textContent = formatIDR(expense * APP_STATE.exchangeRate);
    
    elements.totalBalance.textContent = formatUSD(balance);
    elements.totalBalanceIdr.textContent = formatIDR(balance * APP_STATE.exchangeRate);
}

function renderCategoryBreakdown() {
    const expenses = APP_STATE.transactions.filter(t => t.type === 'expense');
    const breakdown = {};
    
    expenses.forEach(t => {
        if (!breakdown[t.category]) {
            breakdown[t.category] = 0;
        }
        breakdown[t.category] += t.amountUSD;
    });
    
    const html = Object.entries(breakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amount]) => `
            <div class="category-item">
                <span>${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}</span>
                <span class="cat-amount">${formatUSD(amount)}</span>
            </div>
        `).join('');
    
    elements.categoryList.innerHTML = html || '<span class="empty-state">Belum ada pengeluaran</span>';
}

function renderTransactions() {
    const filterCat = elements.filterCategory.value;
    const filterType = elements.filterType.value;
    
    let filtered = [...APP_STATE.transactions];
    
    if (filterCat !== 'all') {
        filtered = filtered.filter(t => t.category === filterCat);
    }
    
    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filtered.length === 0) {
        elements.transactionList.innerHTML = '<p class="empty-state">Belum ada transaksi. Tap + untuk menambah.</p>';
        return;
    }
    
    // Group by date
    const grouped = {};
    filtered.forEach(t => {
        if (!grouped[t.date]) {
            grouped[t.date] = [];
        }
        grouped[t.date].push(t);
    });
    
    let html = '';
    Object.entries(grouped).forEach(([date, transactions]) => {
        const dateLabel = formatDate(date);
        html += `<div class="date-group">
            <div class="date-header">${dateLabel}</div>`;
        
        transactions.forEach(t => {
            const amountIDR = t.amountUSD * APP_STATE.exchangeRate;
            const sign = t.type === 'income' ? '+' : '-';
            
            html += `
                <div class="transaction-item">
                    <div class="icon">${CATEGORY_ICONS[t.category]}</div>
                    <div class="details">
                        <div class="desc">${escapeHtml(t.description)}</div>
                        <div class="meta">${CATEGORY_LABELS[t.category]}</div>
                    </div>
                    <div class="amount-col">
                        <div class="tx-amount ${t.type}">${sign}${formatUSD(t.amountUSD)}</div>
                        <div class="tx-amount-idr">${formatIDR(amountIDR)}</div>
                    </div>
                    <div class="actions">
                        <button class="btn-sm" onclick="editTransaction('${t.id}')" title="Edit">✏️</button>
                        <button class="btn-sm" onclick="deleteTransaction('${t.id}')" title="Hapus">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    elements.transactionList.innerHTML = html;
}

// Transaction Actions
function editTransaction(id) {
    const transaction = APP_STATE.transactions.find(t => t.id === id);
    if (transaction) {
        openModal(transaction);
    }
}

function deleteTransaction(id) {
    if (confirm('Hapus transaksi ini?')) {
        APP_STATE.transactions = APP_STATE.transactions.filter(t => t.id !== id);
        saveToStorage();
        renderAll();
    }
}

// Preview conversion
function updateConvertedPreview() {
    const amount = parseFloat(elements.amountInput.value) || 0;
    const currency = elements.currencySelect.value;
    
    if (amount === 0) {
        elements.convertedPreview.textContent = '';
        return;
    }
    
    if (currency === 'USD') {
        const idr = amount * APP_STATE.exchangeRate;
        elements.convertedPreview.textContent = `≈ ${formatIDR(idr)}`;
    } else {
        const usd = amount / APP_STATE.exchangeRate;
        elements.convertedPreview.textContent = `≈ ${formatUSD(usd)}`;
    }
}

// Export to CSV
function exportToCSV() {
    if (APP_STATE.transactions.length === 0) {
        alert('Tidak ada data untuk di-export');
        return;
    }
    
    const headers = ['Tanggal', 'Tipe', 'Deskripsi', 'Kategori', 'Jumlah USD', 'Jumlah IDR', 'Input Original'];
    const rows = APP_STATE.transactions.map(t => [
        t.date,
        t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
        t.description,
        CATEGORY_LABELS[t.category],
        t.amountUSD.toFixed(2),
        (t.amountUSD * APP_STATE.exchangeRate).toFixed(0),
        `${t.originalAmount} ${t.originalCurrency}`
    ]);
    
    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `santa-clara-trip-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Clear all data
function clearAllData() {
    if (confirm('Hapus semua data transaksi? Aksi ini tidak dapat dibatalkan.')) {
        APP_STATE.transactions = [];
        saveToStorage();
        renderAll();
    }
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatUSD(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatNumber(num, decimals = 2) {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) {
        return 'Hari Ini';
    } else if (date.getTime() === yesterday.getTime()) {
        return 'Kemarin';
    }
    
    return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    }).format(date);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}

// ============================================
// WISHLIST FUNCTIONALITY
// ============================================

const wishlistElements = {
    page: document.getElementById('wishlist-page'),
    addBtn: document.getElementById('add-wishlist-btn'),
    modal: document.getElementById('wishlist-modal'),
    modalTitle: document.getElementById('wishlist-modal-title'),
    closeModal: document.getElementById('close-wishlist-modal'),
    cancelBtn: document.getElementById('cancel-wishlist-btn'),
    form: document.getElementById('wishlist-form'),
    itemId: document.getElementById('wishlist-item-id'),
    productName: document.getElementById('product-name'),
    productStore: document.getElementById('product-store'),
    productPrice: document.getElementById('product-price'),
    productPricePreview: document.getElementById('product-price-preview'),
    productLink: document.getElementById('product-link'),
    productPriority: document.getElementById('product-priority'),
    productNotes: document.getElementById('product-notes'),
    filterPriority: document.getElementById('filter-priority'),
    filterStatus: document.getElementById('filter-status'),
    wishlistList: document.getElementById('wishlist-list'),
    wishlistCount: document.getElementById('wishlist-count'),
    wishlistTotal: document.getElementById('wishlist-total'),
    wishlistTotalIdr: document.getElementById('wishlist-total-idr'),
    wishlistPurchased: document.getElementById('wishlist-purchased'),
    navBtns: document.querySelectorAll('.nav-btn'),
    appPage: document.querySelector('.app')
};

// Setup wishlist event listeners
function setupWishlistListeners() {
    // Tab navigation
    wishlistElements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Add wishlist item
    wishlistElements.addBtn.addEventListener('click', () => openWishlistModal());

    // Modal controls
    wishlistElements.closeModal.addEventListener('click', closeWishlistModal);
    wishlistElements.cancelBtn.addEventListener('click', closeWishlistModal);
    wishlistElements.modal.addEventListener('click', (e) => {
        if (e.target === wishlistElements.modal) closeWishlistModal();
    });

    // Form submission
    wishlistElements.form.addEventListener('submit', handleWishlistSubmit);

    // Price preview
    wishlistElements.productPrice.addEventListener('input', updateWishlistPricePreview);

    // Filters
    wishlistElements.filterPriority.addEventListener('change', renderWishlist);
    wishlistElements.filterStatus.addEventListener('change', renderWishlist);
}

function switchTab(tab) {
    APP_STATE.activeTab = tab;
    
    wishlistElements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (tab === 'expenses') {
        wishlistElements.appPage.classList.remove('hidden');
        wishlistElements.page.classList.remove('active');
    } else {
        wishlistElements.appPage.classList.add('hidden');
        wishlistElements.page.classList.add('active');
        renderWishlistSummary();
        renderWishlist();
    }
}

function openWishlistModal(item = null) {
    wishlistElements.modal.classList.add('active');
    wishlistElements.form.reset();

    if (item) {
        wishlistElements.modalTitle.textContent = 'Edit Item';
        wishlistElements.itemId.value = item.id;
        wishlistElements.productName.value = item.name;
        wishlistElements.productStore.value = item.store || '';
        wishlistElements.productPrice.value = item.price || '';
        wishlistElements.productLink.value = item.link || '';
        wishlistElements.productPriority.value = item.priority;
        wishlistElements.productNotes.value = item.notes || '';
    } else {
        wishlistElements.modalTitle.textContent = 'Tambah Item';
        wishlistElements.itemId.value = '';
    }

    updateWishlistPricePreview();
}

function closeWishlistModal() {
    wishlistElements.modal.classList.remove('active');
}

function handleWishlistSubmit(e) {
    e.preventDefault();

    const id = wishlistElements.itemId.value || generateId();
    const item = {
        id,
        name: wishlistElements.productName.value.trim(),
        store: wishlistElements.productStore.value.trim(),
        price: parseFloat(wishlistElements.productPrice.value) || 0,
        link: wishlistElements.productLink.value.trim(),
        priority: wishlistElements.productPriority.value,
        notes: wishlistElements.productNotes.value.trim(),
        purchased: false,
        createdAt: new Date().toISOString()
    };

    const existingIndex = APP_STATE.wishlist.findIndex(w => w.id === id);
    if (existingIndex >= 0) {
        item.purchased = APP_STATE.wishlist[existingIndex].purchased;
        APP_STATE.wishlist[existingIndex] = item;
    } else {
        APP_STATE.wishlist.unshift(item);
    }

    saveToStorage();
    renderWishlistSummary();
    renderWishlist();
    closeWishlistModal();
}

function toggleWishlistPurchased(id) {
    const item = APP_STATE.wishlist.find(w => w.id === id);
    if (item) {
        item.purchased = !item.purchased;
        saveToStorage();
        renderWishlistSummary();
        renderWishlist();
    }
}

function editWishlistItem(id) {
    const item = APP_STATE.wishlist.find(w => w.id === id);
    if (item) {
        openWishlistModal(item);
    }
}

function deleteWishlistItem(id) {
    if (confirm('Hapus item ini dari wishlist?')) {
        APP_STATE.wishlist = APP_STATE.wishlist.filter(w => w.id !== id);
        saveToStorage();
        renderWishlistSummary();
        renderWishlist();
    }
}

function updateWishlistPricePreview() {
    const price = parseFloat(wishlistElements.productPrice.value) || 0;
    if (price === 0) {
        wishlistElements.productPricePreview.textContent = '';
        return;
    }
    const idr = price * APP_STATE.exchangeRate;
    wishlistElements.productPricePreview.textContent = `≈ ${formatIDR(idr)}`;
}

function renderWishlistSummary() {
    const total = APP_STATE.wishlist.reduce((sum, w) => sum + (w.price || 0), 0);
    const purchased = APP_STATE.wishlist.filter(w => w.purchased).length;

    wishlistElements.wishlistCount.textContent = APP_STATE.wishlist.length;
    wishlistElements.wishlistTotal.textContent = formatUSD(total);
    wishlistElements.wishlistTotalIdr.textContent = formatIDR(total * APP_STATE.exchangeRate);
    wishlistElements.wishlistPurchased.textContent = purchased;
}

function renderWishlist() {
    const filterPriority = wishlistElements.filterPriority.value;
    const filterStatus = wishlistElements.filterStatus.value;

    let filtered = [...APP_STATE.wishlist];

    if (filterPriority !== 'all') {
        filtered = filtered.filter(w => w.priority === filterPriority);
    }

    if (filterStatus === 'pending') {
        filtered = filtered.filter(w => !w.purchased);
    } else if (filterStatus === 'purchased') {
        filtered = filtered.filter(w => w.purchased);
    }

    // Sort: unpurchased first, then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => {
        if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (filtered.length === 0) {
        wishlistElements.wishlistList.innerHTML = '<p class="empty-state">Belum ada wishlist. Tap + untuk menambah.</p>';
        return;
    }

    const priorityLabels = {
        high: '🔴 Wajib Beli',
        medium: '🟡 Kalau Ada Budget',
        low: '🟢 Nice to Have'
    };

    const html = filtered.map(item => {
        const priceIDR = item.price * APP_STATE.exchangeRate;
        return `
            <div class="wishlist-item ${item.purchased ? 'purchased' : ''}">
                <div class="item-header">
                    <div class="checkbox" onclick="toggleWishlistPurchased('${item.id}')">
                        ${item.purchased ? '✓' : ''}
                    </div>
                    <div class="item-details">
                        <div class="item-name">${escapeHtml(item.name)}</div>
                        ${item.store ? `<div class="item-store">📍 ${escapeHtml(item.store)}</div>` : ''}
                    </div>
                    <div class="item-price">
                        ${item.price ? `<div class="price-usd">${formatUSD(item.price)}</div>` : ''}
                        ${item.price ? `<div class="price-idr">${formatIDR(priceIDR)}</div>` : ''}
                    </div>
                </div>
                <div class="item-meta">
                    <span class="priority-badge ${item.priority}">${priorityLabels[item.priority]}</span>
                    ${item.notes ? `<span class="item-notes">${escapeHtml(item.notes)}</span>` : ''}
                    <div class="item-actions">
                        ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" class="btn-sm" title="Buka Link">🔗</a>` : ''}
                        <button class="btn-sm" onclick="editWishlistItem('${item.id}')" title="Edit">✏️</button>
                        <button class="btn-sm" onclick="deleteWishlistItem('${item.id}')" title="Hapus">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    wishlistElements.wishlistList.innerHTML = html;
}

// Initialize wishlist listeners on load
document.addEventListener('DOMContentLoaded', () => {
    setupWishlistListeners();
});
