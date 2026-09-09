// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let items = JSON.parse(localStorage.getItem('items')) || [];

// DOM Elements
const itemForm = document.getElementById('item-form');
const itemNameInput = document.getElementById('item-name');
const itemPersonInput = document.getElementById('item-person');
const itemRateInput = document.getElementById('item-rate');
const itemUnitInput = document.getElementById('item-unit');
const itemList = document.getElementById('item-list');
const itemEmptyState = document.getElementById('item-empty-state');
const itemTable = document.getElementById('item-table');
const itemSearch = document.getElementById('item-search');

const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const editForm = document.getElementById('edit-form');
const editItemId = document.getElementById('edit-item-id');
const editItemName = document.getElementById('edit-item-name');
const editItemPerson = document.getElementById('edit-item-person');
const editItemRate = document.getElementById('edit-item-rate');
const editItemUnit = document.getElementById('edit-item-unit');

// Dialog Elements
const dialogModal = document.getElementById('dialog-modal');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');
const dialogCancelBtn = document.getElementById('dialog-cancel-btn');

let dialogCallback = null;

const showConfirm = (title, message, okText, okColor, callback) => {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogOkBtn.textContent = okText;
    dialogOkBtn.style.backgroundColor = okColor || 'var(--accent-color)';
    dialogCancelBtn.classList.remove('hidden');
    dialogCallback = callback;
    dialogModal.classList.remove('hidden');
};

const showAlert = (title, message) => {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogOkBtn.textContent = 'OK';
    dialogOkBtn.style.backgroundColor = 'var(--accent-color)';
    dialogCancelBtn.classList.add('hidden'); // Hide cancel for alerts
    dialogCallback = null;
    dialogModal.classList.remove('hidden');
};

dialogCancelBtn.addEventListener('click', () => {
    dialogModal.classList.add('hidden');
    dialogCallback = null;
});

dialogOkBtn.addEventListener('click', () => {
    dialogModal.classList.add('hidden');
    if (dialogCallback) dialogCallback();
});

// Format Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR'
    }).format(amount);
};

// Render Items Table
const renderItems = (filterText = '') => {
    itemList.innerHTML = '';

    const filteredItems = items.filter(item => {
        if (!filterText) return true;
        return item.name.toLowerCase().startsWith(filterText.toLowerCase());
    });

    if (filteredItems.length === 0) {
        itemEmptyState.classList.remove('hidden');
        itemTable.classList.add('hidden');
    } else {
        itemEmptyState.classList.add('hidden');
        itemTable.classList.remove('hidden');

        filteredItems.forEach(item => {
            // Calculate Stock
            const stockIn = transactions
                .filter(t => t.itemName === item.name && t.type === 'purchase')
                .reduce((sum, t) => sum + t.quantity, 0);

            const stockOut = transactions
                .filter(t => t.itemName === item.name && t.type === 'sale')
                .reduce((sum, t) => sum + t.quantity, 0);

            const currentStock = stockIn - stockOut;
            const stockClass = currentStock < 0 ? 'text-red' : (currentStock > 0 ? 'text-green' : '');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td><span style="font-weight: 500;">${item.personName || '-'}</span></td>
                <td>${formatCurrency(item.rate)}</td>
                <td><span style="color: var(--text-secondary); font-size: 0.9em; padding: 2px 6px; border: 1px solid var(--card-border); border-radius: 4px;">${item.unit || 'Kg'}</span></td>
                <td class="text-green">${stockIn}</td>
                <td class="text-red">${stockOut}</td>
                <td class="${stockClass}"><strong>${currentStock}</strong></td>
                <td>
                    <button class="edit-btn" onclick="editItem('${item.id}')" title="Edit" style="margin-right: 0.5rem;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </button>
                    <button class="delete-btn" onclick="deleteItem('${item.id}')" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </td>
            `;
            itemList.appendChild(row);
        });
    }
};

// Item Search Filter
itemSearch.addEventListener('input', (e) => {
    renderItems(e.target.value);
});

// Add Item
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = itemNameInput.value.trim();
    // Check for duplicates
    if (items.some(i => i.name.toLowerCase() === name.toLowerCase())) {
        showAlert('Duplicate Item', 'An item with this name already exists.');
        return;
    }

    const newItem = {
        id: crypto.randomUUID(),
        name: name,
        personName: itemPersonInput ? itemPersonInput.value.trim() : '',
        rate: parseFloat(itemRateInput.value) || 0,
        unit: itemUnitInput.value
    };

    items.push(newItem);
    saveItems();
    renderItems();
    
    itemForm.reset();
});

// Delete Item
window.deleteItem = (id) => {
    showConfirm('Delete Item', 'Are you sure you want to delete this item?', 'Delete', 'var(--red)', () => {
        items = items.filter(i => i.id !== id);
        saveItems();
        renderItems(itemSearch.value);
    });
};

// Edit Item
window.editItem = (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    editItemId.value = item.id;
    editItemName.value = item.name;
    if (editItemPerson) editItemPerson.value = item.personName || '';
    editItemRate.value = item.rate;
    editItemUnit.value = item.unit || 'Kg';
    
    editModal.classList.remove('hidden');
};

closeModalBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.add('hidden');
    }
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editItemId.value;
    const newName = editItemName.value.trim();
    const newRate = parseFloat(editItemRate.value) || 0;
    const newPersonName = editItemPerson ? editItemPerson.value.trim() : '';
    
    const item = items.find(i => i.id === id);
    if (item && newRate >= 0 && newName) {
        if (item.name !== newName) {
            // Check for duplicate name
            if (items.some(i => i.id !== id && i.name.toLowerCase() === newName.toLowerCase())) {
                showAlert('Duplicate Item', 'An item with this new name already exists.');
                return;
            }

            // Cascade update to transactions
            transactions.forEach(t => {
                if (t.itemName === item.name) {
                    t.itemName = newName;
                }
            });
            localStorage.setItem('transactions', JSON.stringify(transactions));
            if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
            item.name = newName;
        }

        item.rate = newRate;
        item.personName = newPersonName;
        item.unit = editItemUnit.value;
        saveItems();
        renderItems(itemSearch.value);
        editModal.classList.add('hidden');
    }
});

// Save Items to LocalStorage
const saveItems = () => {
    localStorage.setItem('items', JSON.stringify(items));
    if (window.syncItemsToCloud) window.syncItemsToCloud(items);
};

// Delivery System Elements
const deliveryList = document.getElementById('delivery-list');
const deliveryEmptyState = document.getElementById('delivery-empty-state');
const deliveryTable = document.getElementById('delivery-table');
const deliverySearch = document.getElementById('delivery-search');

// Render Deliveries Table
const renderDeliveries = (filterText = '') => {
    if (!deliveryList) return; // Ensure elements exist

    deliveryList.innerHTML = '';

    const salesTransactions = transactions.filter(t => {
        if (t.type !== 'sale') return false;
        if (!filterText) return true;
        const nameMatch = (t.personName || '').toLowerCase().includes(filterText.toLowerCase());
        const itemMatch = (t.itemName || '').toLowerCase().includes(filterText.toLowerCase());
        return nameMatch || itemMatch;
    });

    // Sort by most recent first
    salesTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (salesTransactions.length === 0) {
        deliveryEmptyState.classList.remove('hidden');
        deliveryTable.classList.add('hidden');
    } else {
        deliveryEmptyState.classList.add('hidden');
        deliveryTable.classList.remove('hidden');

        salesTransactions.forEach(t => {
            const row = document.createElement('tr');
            
            if (t.delivered) {
                row.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
            }
            
            row.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td style="font-weight: 600;">${t.personName || 'Unknown'}</td>
                <td>${t.itemName}</td>
                <td>${t.quantity} <span style="font-size: 0.85em; color: var(--text-secondary);">${t.unit || 'Kg'}</span></td>
                <td>
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
                        <input type="checkbox" ${t.delivered ? 'checked' : ''} onchange="toggleDelivery('${t.id}', this.checked)" style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="color: ${t.delivered ? 'var(--green)' : 'var(--red)'}; font-weight: 600;">
                            ${t.delivered ? 'Delivered' : 'Pending'}
                        </span>
                    </label>
                </td>
            `;
            deliveryList.appendChild(row);
        });
    }
};

window.toggleDelivery = (id, isDelivered) => {
    const txn = transactions.find(t => t.id === id);
    if (txn) {
        txn.delivered = isDelivered;
        localStorage.setItem('transactions', JSON.stringify(transactions));
        if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
        renderDeliveries(deliverySearch ? deliverySearch.value : '');
    }
};

if (deliverySearch) {
    deliverySearch.addEventListener('input', (e) => {
        renderDeliveries(e.target.value);
    });
}

// Initial Render
renderItems();
renderDeliveries();

if (window.fetchDataFromCloudAndRender) {
    window.fetchDataFromCloudAndRender(() => {
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        items = JSON.parse(localStorage.getItem('items')) || [];
        renderItems(itemSearch.value);
        if (deliverySearch) renderDeliveries(deliverySearch.value);
    });
}
