// State
let transactions = [];
let items = [];
let pendingItems = [];

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

const pendingItemsSection = document.getElementById('pending-items-section');
const pendingPersonName = document.getElementById('pending-person-name');
const pendingItemsList = document.getElementById('pending-items-list');
const savePendingItemsBtn = document.getElementById('save-pending-items-btn');

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

// Render Dashboard Metrics
const renderDashboardMetrics = () => {
    const elRemaining = document.getElementById('metric-remaining');
    const elPayables = document.getElementById('metric-payables');

    if (!elRemaining) return;

    const formatNumber = (num) => new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

    const balances = {};

    transactions.forEach(t => {
        const pName = (t.personName || '').trim().toLowerCase();
        if (!pName) return;

        if (!balances[pName]) balances[pName] = 0;

        const amount = (t.quantity * t.price) + (parseFloat(t.freight) || 0);

        if (t.type === 'sale') balances[pName] += amount;
        else if (t.type === 'purchase') balances[pName] -= amount;
        else if (t.type === 'payment_out') balances[pName] += t.price;
        else if (t.type === 'payment_in') balances[pName] -= t.price;
        else if (t.type === 'labour_charge') balances[pName] -= amount;
        else if (t.type === 'labour_payment') balances[pName] += t.price;
    });

    let totalRemaining = 0;
    let totalPayables = 0;

    Object.values(balances).forEach(bal => {
        if (bal > 0) totalRemaining += bal;
        if (bal < 0) totalPayables += Math.abs(bal);
    });

    elRemaining.textContent = formatNumber(totalRemaining);
    elPayables.textContent = formatNumber(totalPayables);
};

// Render Outstanding and Payables Tables
const renderBalances = (outstandingFilter = '', payablesFilter = '') => {
    const outstandingList = document.getElementById('outstanding-list');
    const payablesList = document.getElementById('payables-list');
    const outEmpty = document.getElementById('outstanding-empty-state');
    const payEmpty = document.getElementById('payables-empty-state');

    if (!outstandingList || !payablesList) return;

    outstandingList.innerHTML = '';
    payablesList.innerHTML = '';

    const personData = {};

    transactions.forEach(t => {
        const pNameOrig = (t.personName || '').trim();
        if (!pNameOrig) return;
        const pName = pNameOrig.toLowerCase();

        if (!personData[pName]) {
            personData[pName] = { name: pNameOrig, balance: 0, paidAmount: 0, givenAmount: 0 };
        }

        const amount = (t.quantity * t.price) + (parseFloat(t.freight) || 0);

        if (t.type === 'sale') personData[pName].balance += amount;
        else if (t.type === 'purchase') personData[pName].balance -= amount;
        else if (t.type === 'payment_out') {
            personData[pName].balance += t.price;
            personData[pName].givenAmount += t.price;
        }
        else if (t.type === 'payment_in') {
            personData[pName].balance -= t.price;
            personData[pName].paidAmount += t.price;
        }
        else if (t.type === 'labour_charge') personData[pName].balance -= amount;
        else if (t.type === 'labour_payment') {
            personData[pName].balance += t.price;
            personData[pName].paidAmount += t.price; // or givenAmount depending on context, assuming we pay labour it should be givenAmount? Actually labour payment is 'payment_out' style. Wait, labour_payment increases balance? No, labour payment is US giving THEM money. So we gave them money.
            // Wait, in my original logic labour_payment increases balance because they did labour for us (we owe them), and we pay them. 
            // If they did labour, it's 'labour_charge' -> balance decreases (we owe them more).
            // When we pay them, 'labour_payment' -> balance increases. So we paid them. Thus, givenAmount.
            personData[pName].givenAmount += t.price;
        }
    });

    const outstandingArr = [];
    const payablesArr = [];

    Object.values(personData).forEach(data => {
        if (data.balance > 0.01) outstandingArr.push(data);
        if (data.balance < -0.01) payablesArr.push(data);
    });

    const filteredOutstanding = outstandingArr.filter(d => !outstandingFilter || d.name.toLowerCase().includes(outstandingFilter.toLowerCase()));
    const filteredPayables = payablesArr.filter(d => !payablesFilter || d.name.toLowerCase().includes(payablesFilter.toLowerCase()));

    // Render Outstanding
    if (filteredOutstanding.length === 0) {
        outEmpty.classList.remove('hidden');
        outstandingList.classList.add('hidden');
    } else {
        outEmpty.classList.add('hidden');
        outstandingList.classList.remove('hidden');
        filteredOutstanding.sort((a, b) => b.balance - a.balance).forEach(data => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--card-border)';
            row.innerHTML = `
                <td style="padding: 1rem; font-weight: 600; color: var(--text-primary);">${data.name}</td>
                <td style="padding: 1rem;">${formatCurrency(data.paidAmount)}</td>
                <td style="padding: 1rem; font-weight: 700; color: var(--accent-color);">${formatCurrency(data.balance)}</td>
                <td style="padding: 1rem;">
                    <button class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; margin: 0; width: auto;" onclick="window.location.href='invoices.html'">View</button>
                </td>
            `;
            outstandingList.appendChild(row);
        });
    }

    // Render Payables
    if (filteredPayables.length === 0) {
        payEmpty.classList.remove('hidden');
        payablesList.classList.add('hidden');
    } else {
        payEmpty.classList.add('hidden');
        payablesList.classList.remove('hidden');
        filteredPayables.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).forEach(data => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--card-border)';
            row.innerHTML = `
                <td style="padding: 1rem; font-weight: 600; color: var(--text-primary);">${data.name}</td>
                <td style="padding: 1rem;">${formatCurrency(data.givenAmount)}</td>
                <td style="padding: 1rem; font-weight: 700; color: var(--pink);">${formatCurrency(Math.abs(data.balance))}</td>
                <td style="padding: 1rem;">
                    <button class="btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; margin: 0; width: auto;" onclick="window.location.href='invoices.html'">View</button>
                </td>
            `;
            payablesList.appendChild(row);
        });
    }
};

const outstandingSearch = document.getElementById('outstanding-search');
const payablesSearch = document.getElementById('payables-search');

if (outstandingSearch) outstandingSearch.addEventListener('input', e => renderBalances(e.target.value, payablesSearch ? payablesSearch.value : ''));
if (payablesSearch) payablesSearch.addEventListener('input', e => renderBalances(outstandingSearch ? outstandingSearch.value : '', e.target.value));

// Datalist for Person Names in Admin
const initAdminPersonDatalist = () => {
    let datalist = document.getElementById('admin-person-list');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'admin-person-list';
        document.body.appendChild(datalist);
    }
    if (itemPersonInput) itemPersonInput.setAttribute('list', 'admin-person-list');
    if (editItemPerson) editItemPerson.setAttribute('list', 'admin-person-list');
    const legerPerson = document.getElementById('leger-person');
    if (legerPerson) legerPerson.setAttribute('list', 'admin-person-list');

    datalist.innerHTML = '';
    const persons = [];
    transactions.forEach(t => {
        if (t.personName) {
            const name = t.personName.trim();
            if (!persons.find(p => p.toLowerCase() === name.toLowerCase())) persons.push(name);
        }
    });
    items.forEach(i => {
        if (i.personName) {
            const name = i.personName.trim();
            if (!persons.find(p => p.toLowerCase() === name.toLowerCase())) persons.push(name);
        }
    });
    persons.sort((a, b) => {
        const getNum = (name) => {
            const m = name.match(/^(\d+)\s*-/);
            return m ? parseInt(m[1], 10) : 999999;
        };
        return getNum(a) - getNum(b);
    });
    persons.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });
};

// Render Items Table - Grouped by Person
const renderItems = (filterText = '') => {
    renderDashboardMetrics();
    renderBalances();
    initAdminPersonDatalist();
    itemList.innerHTML = '';

    const filter = (filterText || '').trim().toLowerCase();
    const filteredItems = items.filter(item => {
        if (!filter) return true;
        const nameMatch = item.name.toLowerCase().includes(filter);
        const personMatch = (item.personName || '').toLowerCase().includes(filter);
        return nameMatch || personMatch;
    });

    if (filteredItems.length === 0) {
        itemEmptyState.classList.remove('hidden');
        itemTable.classList.add('hidden');
    } else {
        itemEmptyState.classList.add('hidden');
        itemTable.classList.remove('hidden');

        // Pre-calculate simple item indices to match invoice dropdown
        const simpleItemIndices = {};
        let gIndex = 1;
        items.forEach(i => {
            if (!i.personName) {
                simpleItemIndices[i.id] = gIndex++;
            }
        });

        // Group items by person name
        const groups = new Map();
        filteredItems.forEach(item => {
            const personKey = (item.personName || '').trim() || '__no_person__';
            if (!groups.has(personKey)) groups.set(personKey, []);
            groups.get(personKey).push(item);
        });

        const getQtyInKg = (t) => {
            const u = (t.unit || '').toLowerCase();
            if (u === 'mun' || u === 'bag (40kg)') return t.quantity * 40;
            if (u === 'bag (50kg)') return t.quantity * 50;
            return t.quantity;
        };

        groups.forEach((groupItems, personKey) => {
            const personDisplay = personKey === '__no_person__' ? 'No Person Assigned' : personKey;

            // Person header row spanning all columns
            const personId = `item-group-${personKey.replace(/\W/g, '')}`;

            const headerRow = document.createElement('tr');
            headerRow.style.cursor = 'pointer';
            headerRow.onclick = () => {
                const rows = document.querySelectorAll(`.${personId}-row`);
                const icon = document.getElementById(`${personId}-icon`);
                let isHidden = false;
                rows.forEach(r => {
                    if (r.style.display === 'none') {
                        r.style.display = '';
                        isHidden = true;
                    } else {
                        r.style.display = 'none';
                    }
                });
                if (icon) {
                    icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            };
            headerRow.innerHTML = `
                <td colspan="7" style="
                    background: linear-gradient(90deg, rgba(139,92,246,0.12), transparent);
                    padding: 0.6rem 1rem;
                    font-weight: 700;
                    font-size: 0.95rem;
                    color: var(--accent-color);
                    border-top: 2px solid rgba(139,92,246,0.25);
                    letter-spacing: 0.01em;
                ">
                    <svg id="${personId}-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:middle; margin-right:6px; margin-bottom:2px; transition: transform 0.2s;">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                    ${personDisplay}
                    <span style="font-size:0.78rem; color:var(--text-secondary); font-weight:500; margin-left:8px;">(${groupItems.length} item${groupItems.length !== 1 ? 's' : ''})</span>
                </td>
            `;
            itemList.appendChild(headerRow);

            // Item rows for this person (no Person Name column repeated)
            groupItems.forEach(item => {
                const getStock = (type) => transactions
                    .filter(t => {
                        if (t.itemName !== item.name || t.type !== type) return false;
                        if (item.personName) {
                            const tPerson = (t.personName || '').replace(/^\d+\s*-\s*/, '').toLowerCase();
                            const iPerson = item.personName.replace(/^\d+\s*-\s*/, '').toLowerCase();
                            if (tPerson !== iPerson) return false;
                        }
                        return true;
                    })
                    .reduce((sum, t) => sum + getQtyInKg(t), 0);

                const stockIn = getStock('purchase');
                const stockOut = getStock('sale');
                const currentStock = stockIn - stockOut;
                const stockClass = currentStock < 0 ? 'text-red' : (currentStock > 0 ? 'text-green' : '');

                const row = document.createElement('tr');
                row.className = `${personId}-row`;
                row.style.display = 'none';
                row.style.backgroundColor = 'rgba(139,92,246,0.02)';

                const prefix = simpleItemIndices[item.id] ? `${simpleItemIndices[item.id]} - ` : '';

                row.innerHTML = `
                    <td style="font-weight: 600; padding-left: 2rem;">↳ ${prefix}${item.name}</td>
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
        });
    }
};

// Item Search Filter
itemSearch.addEventListener('input', (e) => {
    renderItems(e.target.value);
});

// Render Pending Items
const renderPendingItems = () => {
    if (pendingItems.length === 0) {
        pendingItemsSection.classList.add('hidden');
        return;
    }

    pendingItemsSection.classList.remove('hidden');
    pendingPersonName.textContent = pendingItems[0].personName || 'No Person Assigned';
    pendingItemsList.innerHTML = '';

    pendingItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${formatCurrency(item.rate)}</td>
            <td>${item.unit}</td>
            <td>
                <button class="delete-btn" onclick="removePendingItem(${index})" title="Remove">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </td>
        `;
        pendingItemsList.appendChild(row);
    });
};

window.removePendingItem = (index) => {
    pendingItems.splice(index, 1);
    renderPendingItems();
};

// Add Item to Pending Cart
itemForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const pName = itemPersonInput ? itemPersonInput.value.trim() : '';
    const unit = itemUnitInput ? itemUnitInput.value : 'Kg';
    const rate = parseFloat(itemRateInput.value) || 0;

    // Check if the person matches the existing cart (if any)
    if (pendingItems.length > 0) {
        const currentPendingPerson = pendingItems[0].personName;
        if (pName.toLowerCase() !== (currentPendingPerson || '').toLowerCase()) {
            showAlert('Different Person', 'You are already adding items for another person. Save or clear the pending items first.');
            return;
        }
    }

    const rawNames = itemNameInput.value.split(/[,\n]/).map(s => s.trim()).filter(s => s.length > 0);

    if (rawNames.length === 0) {
        showAlert('Invalid Item', 'Please enter at least one item name.');
        return;
    }

    rawNames.forEach(n => {
        // Skip exact duplicates already in system
        if (items.some(i =>
            i.name.toLowerCase() === n.toLowerCase() &&
            (i.personName || '').toLowerCase() === pName.toLowerCase() &&
            (i.unit || 'Kg').toLowerCase() === unit.toLowerCase()
        )) {
            showAlert('Duplicate Item', `"${n}" already exists for this person in the database. Skipped.`);
            return;
        }

        // Skip duplicates in pending items
        if (pendingItems.some(i => i.name.toLowerCase() === n.toLowerCase() && i.unit.toLowerCase() === unit.toLowerCase())) {
            showAlert('Duplicate Item', `"${n}" is already in your pending list. Skipped.`);
            return;
        }

        pendingItems.push({
            id: crypto.randomUUID(),
            name: n,
            personName: pName,
            rate: rate,
            unit: unit
        });
    });

    renderPendingItems();

    // Retain Person Name so the user can easily add MORE items
    const currentPerson = itemPersonInput ? itemPersonInput.value : '';
    itemForm.reset();
    if (itemPersonInput && currentPerson) {
        itemPersonInput.value = currentPerson;
    }
});

// Save All Pending Items
if (savePendingItemsBtn) {
    savePendingItemsBtn.addEventListener('click', () => {
        if (pendingItems.length === 0) return;

        items.push(...pendingItems);
        saveItems();
        renderItems(itemSearch ? itemSearch.value : '');

        // Clear pending items
        pendingItems = [];
        renderPendingItems();

        // Fully reset form including person name
        itemForm.reset();

        showAlert('Success', 'Items saved successfully!', 'success');
    });
}

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
    const newUnit = editItemUnit ? editItemUnit.value : 'Kg';

    const item = items.find(i => i.id === id);
    if (item && newRate >= 0 && newName) {
        // Check for duplicate name + person + unit combo
        if (items.some(i =>
            i.id !== id &&
            i.name.toLowerCase() === newName.toLowerCase() &&
            (i.personName || '').toLowerCase() === newPersonName.toLowerCase() &&
            (i.unit || 'Kg').toLowerCase() === newUnit.toLowerCase()
        )) {
            showAlert('Duplicate Item', `An item "${newName}" with unit "${newUnit}" already exists for this person.`);
            return;
        }

        if (item.name !== newName) {
            // Cascade update to transactions
            transactions.forEach(t => {
                const tPerson = (t.personName || '').replace(/^\d+\s*-\s*/, '').toLowerCase();
                const iPerson = (item.personName || '').replace(/^\d+\s*-\s*/, '').toLowerCase();

                if (t.itemName === item.name && tPerson === iPerson) {
                    t.itemName = newName;
                }
            });
            if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
            item.name = newName;
        }

        item.rate = newRate;
        item.personName = newPersonName;
        item.unit = newUnit;
        saveItems();
        renderItems(itemSearch.value);
        editModal.classList.add('hidden');
    }
});

// Save Items to LocalStorage
const saveItems = () => {
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

        const groupedTxns = new Map();
        salesTransactions.forEach(t => {
            const key = t.txnId || t.id;
            if (!groupedTxns.has(key)) {
                groupedTxns.set(key, {
                    ...t,
                    itemsList: [],
                    quantitiesList: [],
                    idsList: [],
                    allDelivered: true
                });
            }
            const group = groupedTxns.get(key);
            group.itemsList.push(t.itemName || '-');
            group.quantitiesList.push(`${t.quantity} ${t.unit || 'Kg'}`);
            group.idsList.push(t.id);
            if (!t.delivered) {
                group.allDelivered = false;
            }
        });

        groupedTxns.forEach((group, key) => {
            const row = document.createElement('tr');

            if (group.allDelivered) {
                row.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
            }

            const itemsStr = group.itemsList.join(', ');
            const qtyStr = group.quantitiesList.join(', ');
            const idsStr = group.idsList.join(',');

            row.innerHTML = `
                <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">${new Date(group.date).toLocaleDateString('en-GB')}</td>
                <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;"><span style="font-weight: 500;">${group.personName || '-'}</span></td>
                <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">${itemsStr}</td>
                <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">${qtyStr}</td>
                <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">
                    <label class="delivery-toggle" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
                        <input type="checkbox" onchange="toggleDelivery('${idsStr}', this.checked)" ${group.allDelivered ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                        <span class="status-text ${group.allDelivered ? 'status-delivered' : 'status-pending'}" style="color: ${group.allDelivered ? 'var(--green)' : 'var(--red)'}; font-weight: 600;">
                            ${group.allDelivered ? 'Delivered' : 'Pending'}
                        </span>
                    </label>
                </td>
            `;
            deliveryList.appendChild(row);
        });
    }
};

window.toggleDelivery = (ids, isDelivered) => {
    const idArray = ids.split(',');
    let changed = false;
    idArray.forEach(id => {
        const txn = transactions.find(t => t.id === id);
        if (txn) {
            txn.delivered = isDelivered;
            changed = true;
        }
    });

    if (changed) {
        if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
        renderDeliveries(deliverySearch ? deliverySearch.value : '');
    }
};

if (deliverySearch) {
    deliverySearch.addEventListener('input', (e) => {
        renderDeliveries(e.target.value);
    });
}

// Daily Payments Ledger
const dailyPaymentDate = document.getElementById('daily-payment-date');
const dailyPaymentsList = document.getElementById('daily-payments-list');
const dailyPaymentsTotal = document.getElementById('daily-payments-total');
const dailyPaymentsEmptyState = document.getElementById('daily-payments-empty-state');
const dailyPaymentsTable = dailyPaymentsList ? dailyPaymentsList.closest('table') : null;

if (dailyPaymentDate) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dailyPaymentDate.value = `${yyyy}-${mm}-${dd}`;

    dailyPaymentDate.addEventListener('change', () => {
        renderDailyPayments(dailyPaymentDate.value);
    });
}

const renderDailyPayments = (dateString) => {
    if (!dailyPaymentsList) return;

    dailyPaymentsList.innerHTML = '';
    let totalReceived = 0;

    const dateTxns = transactions.filter(t => t.date === dateString);

    const groups = {};
    const groupedList = [];

    dateTxns.forEach(t => {
        const key = t.txnId || t.id;
        if (!groups[key]) {
            groups[key] = {
                txnId: key,
                date: t.date,
                time: t.time,
                personName: t.personName,
                type: t.type,
                items: [],
                paymentMethod: '-',
                totalAmt: 0,
                amountPaid: 0
            };
            groupedList.push(groups[key]);
        }

        const group = groups[key];

        if (t.type === 'sale' || t.type === 'purchase') {
            group.type = t.type;
        }

        if (t.type.startsWith('payment')) {
            group.amountPaid += (t.quantity * t.price);
            if (t.itemName && t.itemName.includes('/')) {
                group.paymentMethod = t.itemName.split('/')[1].trim();
            }
        } else {
            group.items.push(t.itemName);
            group.totalAmt += (t.quantity * t.price) + (parseFloat(t.freight) || 0);
        }
    });

    const paymentsReceived = groupedList.filter(g => g.amountPaid > 0 && (g.type === 'sale' || g.type === 'payment_in'));

    if (paymentsReceived.length === 0) {
        dailyPaymentsEmptyState.classList.remove('hidden');
        dailyPaymentsTable.parentElement.classList.add('hidden');
        dailyPaymentsTotal.textContent = 'Rs 0.00';
        return;
    }

    dailyPaymentsEmptyState.classList.add('hidden');
    dailyPaymentsTable.parentElement.classList.remove('hidden');

    paymentsReceived.forEach(g => {
        totalReceived += g.amountPaid;
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--card-border)';

        const dateObj = new Date(g.date);
        const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

        let displayType = g.type === 'sale' ? 'SALE' : 'PAYMENT IN';
        if (g.items.length === 1 && g.items[0] === 'Previous Balance') {
            displayType = 'leger payment';
        }

        const itemDisplay = g.items.length > 0 ? g.items.join(', ') : '-';

        row.innerHTML = `
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem;">${g.personName || 'Unknown'}</div>
            </td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem;">${formattedDate}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${g.time || ''}</div>
            </td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;"><span style="font-weight: 700; font-size: 0.7rem; padding: 2px 4px; border-radius: 4px; background-color: rgba(34, 197, 94, 0.1); color: var(--green);">${displayType}</span></td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">${itemDisplay}</td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">${g.paymentMethod}</td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem;">${g.totalAmt > 0 ? formatCurrency(g.totalAmt) : '-'}</td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem; font-weight: 600;">${formatCurrency(g.amountPaid)}</td>
            <td style="padding: 0.5rem 0.25rem; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">${g.totalAmt > 0 ? formatCurrency(g.totalAmt - g.amountPaid) : '-'}</td>
        `;
        dailyPaymentsList.appendChild(row);
    });

    dailyPaymentsTotal.textContent = formatCurrency(totalReceived);
};

// Initial Render
renderItems();
renderDeliveries();
if (dailyPaymentDate) renderDailyPayments(dailyPaymentDate.value);

if (window.fetchDataFromCloudAndRender) {
    window.fetchDataFromCloudAndRender(() => {
        transactions = window.cloudTransactions || [];
        items = window.cloudItems || [];
        renderItems(itemSearch.value);
        if (deliverySearch) renderDeliveries(deliverySearch.value);
        if (dailyPaymentDate) renderDailyPayments(dailyPaymentDate.value);
    });
}

// Leger Payment Modal Logic
const legerBtn = document.getElementById('leger-btn');
const legerModal = document.getElementById('leger-payment-modal');
const legerForm = document.getElementById('leger-payment-form');
const legerCancelBtn = document.getElementById('leger-cancel-btn');
const legerPerson = document.getElementById('leger-person');
const legerCurrentBalance = document.getElementById('leger-current-balance');
const legerAmount = document.getElementById('leger-amount');
const legerMethod = document.getElementById('leger-method');
const legerNewBalance = document.getElementById('leger-new-balance');

if (legerBtn && legerModal) {
    const calculatePersonBalance = (pName) => {
        let bal = 0;
        const searchName = pName.trim().toLowerCase();
        transactions.forEach(t => {
            const tName = (t.personName || '').replace(/^\d+\s*-\s*/, '').trim().toLowerCase();
            if (tName === searchName || (t.personName || '').trim().toLowerCase() === searchName) {
                const total = (t.quantity * t.price) + (parseFloat(t.freight) || 0);
                if (t.type === 'sale') bal += total;
                else if (t.type === 'purchase') bal -= total;
                else if (t.type === 'payment_out') bal += total;
                else if (t.type === 'payment_in') bal -= total;
                else if (t.type === 'labour_charge') bal -= total;
                else if (t.type === 'labour_payment') bal += total;
            }
        });
        return bal;
    };

    const onPersonChange = () => {
        const name = legerPerson.value.trim();
        if (!name) {
            legerCurrentBalance.value = '';
            legerNewBalance.value = '';
            legerAmount.value = '';
            return;
        }
        const currentBal = calculatePersonBalance(name);
        legerCurrentBalance.value = currentBal.toFixed(2);
        updateNewBalance();
    };

    const updateNewBalance = () => {
        const currentBal = parseFloat(legerCurrentBalance.value) || 0;
        const amountPaid = parseFloat(legerAmount.value) || 0;
        legerNewBalance.value = (currentBal - amountPaid).toFixed(2);
    };

    const updateAmountPaid = () => {
        const currentBal = parseFloat(legerCurrentBalance.value) || 0;
        const newBal = parseFloat(legerNewBalance.value) || 0;
        const amountPaid = currentBal - newBal;
        legerAmount.value = amountPaid.toFixed(2);
    };

    legerPerson.addEventListener('input', onPersonChange);
    legerPerson.addEventListener('change', onPersonChange);

    legerCurrentBalance.addEventListener('input', updateNewBalance);
    legerAmount.addEventListener('input', updateNewBalance);
    legerNewBalance.addEventListener('input', updateAmountPaid);

    legerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        legerForm.reset();
        legerCurrentBalance.value = '';
        legerNewBalance.value = '';
        legerAmount.value = '0';
        legerModal.classList.remove('hidden');
    });

    legerCancelBtn.addEventListener('click', () => {
        legerModal.classList.add('hidden');
    });

    legerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = legerPerson.value.trim();
        const enteredCurrentBal = parseFloat(legerCurrentBalance.value) || 0;
        const amount = parseFloat(legerAmount.value) || 0;
        const method = legerMethod.value;

        if (!name) return;

        const trueBal = calculatePersonBalance(name);
        const adjustment = enteredCurrentBal - trueBal;

        let hasChanges = false;

        if (Math.abs(adjustment) > 0.001) {
            const adjTxn = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                txnId: 'TXN-' + Date.now(),
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                date: new Date().toISOString().split('T')[0],
                personName: name,
                itemName: 'Previous Balance',
                type: adjustment > 0 ? 'sale' : 'payment_in',
                quantity: 1,
                price: Math.abs(adjustment),
                freight: 0,
                amountPaid: 0,
                paymentMethod: '-'
            };
            transactions.push(adjTxn);
            hasChanges = true;
        }

        if (amount > 0) {
            const newTxn = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                txnId: 'TXN-' + Date.now(),
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                date: new Date().toISOString().split('T')[0],
                personName: name,
                itemName: 'Payment / ' + method,
                type: 'payment_in',
                quantity: 1,
                price: amount,
                freight: 0,
                amountPaid: amount,
                paymentMethod: method
            };
            transactions.push(newTxn);
            hasChanges = true;
        }

        if (hasChanges) {
            if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);

            if (typeof showAlert !== 'undefined') {
                showAlert('Success', `Changes saved successfully for ${name}`);
            } else {
                alert(`Changes saved successfully for ${name}`);
            }

            if (typeof renderDashboardMetrics === 'function') renderDashboardMetrics();
            if (typeof renderOutstandingBalances === 'function') renderOutstandingBalances();
            if (typeof renderDailyPayments === 'function' && typeof dailyPaymentDate !== 'undefined' && dailyPaymentDate) renderDailyPayments(dailyPaymentDate.value);
            if (typeof renderHistory === 'function' && typeof txnPerson !== 'undefined' && txnPerson) renderHistory(txnPerson.value.trim());
            if (typeof updateItemTotals === 'function') updateItemTotals();
        }

        legerModal.classList.add('hidden');
    });
}
