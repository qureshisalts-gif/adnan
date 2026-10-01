let transactions = JSON.parse(localStorage.getItem('adnan_transactions')) || [];
let items = JSON.parse(localStorage.getItem('adnan_items')) || [];

// Form Elements
const labourDate = document.getElementById('labour-date');
const labourName = document.getElementById('labour-name');
const labourItem = document.getElementById('labour-item');
const labourQty = document.getElementById('labour-qty');
const labourRate = document.getElementById('labour-rate');
const labourTotal = document.getElementById('labour-total');
const labourPaid = document.getElementById('labour-paid');
const labourPaymentMethod = document.getElementById('labour-payment-method');
const labourBalance = document.getElementById('labour-balance');
const saveLabourBtn = document.getElementById('save-labour-btn');

// History Elements
const historySection = document.getElementById('labour-history-section');
const historyLabourName = document.getElementById('history-labour-name');
const historyList = document.getElementById('history-list');
const historyEmptyState = document.getElementById('history-empty-state');

// Dialog Elements
const dialogModal = document.getElementById('dialog-modal');
const dialogTitle = document.getElementById('dialog-title');
const dialogMessage = document.getElementById('dialog-message');
const dialogOkBtn = document.getElementById('dialog-ok-btn');
const dialogCancelBtn = document.getElementById('dialog-cancel-btn');
let dialogCallback = null;

const showAlert = (title, message) => {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogOkBtn.textContent = 'OK';
    dialogOkBtn.style.backgroundColor = 'var(--accent-color)';
    dialogCancelBtn.classList.add('hidden');
    dialogCallback = null;
    dialogModal.classList.remove('hidden');
};

const showConfirm = (title, message, okText, okColor, callback) => {
    dialogTitle.textContent = title;
    dialogMessage.textContent = message;
    dialogOkBtn.textContent = okText;
    dialogOkBtn.style.backgroundColor = okColor || 'var(--accent-color)';
    dialogCancelBtn.classList.remove('hidden');
    dialogCallback = callback;
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

// Init Date
labourDate.value = new Date().toISOString().split('T')[0];

let labourNames = JSON.parse(localStorage.getItem('adnan_labour_names')) || [];
let rawItems = JSON.parse(localStorage.getItem('adnan_labour_items')) || [];
let labourItems = rawItems.map(item => {
    if (typeof item === 'string') {
        return { name: item, qty: 0, unit: 'Kg' };
    }
    return item;
});

const renderLabourNames = () => {
    const ul = document.getElementById('labour-names-list-ul');
    const datalist = document.getElementById('labour-name-list');
    if (ul) ul.innerHTML = '';
    if (datalist) datalist.innerHTML = '';

    labourNames.forEach(name => {
        if (ul) {
            const li = document.createElement('li');
            li.style = "display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--card-border);";
            li.innerHTML = `<span>${name}</span> <button type="button" class="icon-btn text-red" onclick="removeLabourName('${name}')" style="cursor: pointer; background: none; border: none; color: var(--red);" title="Remove">✖</button>`;
            ul.appendChild(li);
        }
        if (datalist) {
            const opt = document.createElement('option');
            opt.value = name;
            datalist.appendChild(opt);
        }
    });
};

const renderLabourItems = () => {
    const ul = document.getElementById('labour-items-list-ul');
    const select = document.getElementById('labour-item');
    if (ul) ul.innerHTML = '';

    if (select) select.innerHTML = '<option value="">Select an item...</option>';

    labourItems.forEach(item => {
        if (ul) {
            const li = document.createElement('li');
            li.style = "display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--card-border);";
            li.innerHTML = `<span>${item.name} <small class="text-secondary">(${item.qty} ${item.unit})</small></span> <button type="button" class="icon-btn text-red" onclick="removeLabourItem('${item.name}')" style="cursor: pointer; background: none; border: none; color: var(--red);" title="Remove">✖</button>`;
            ul.appendChild(li);
        }
        if (select) {
            const opt = document.createElement('option');
            opt.value = item.name;
            opt.textContent = `${item.name} (${item.unit})`;
            select.appendChild(opt);
        }
    });
};

window.removeLabourName = (name) => {
    labourNames = labourNames.filter(n => n !== name);
    localStorage.setItem('adnan_labour_names', JSON.stringify(labourNames));
    renderLabourNames();
};

window.removeLabourItem = (itemName) => {
    labourItems = labourItems.filter(i => i.name !== itemName);
    localStorage.setItem('adnan_labour_items', JSON.stringify(labourItems));
    renderLabourItems();
};

document.getElementById('add-labour-name-btn')?.addEventListener('click', () => {
    const val = document.getElementById('new-labour-name').value.trim();
    if (val && !labourNames.includes(val)) {
        labourNames.push(val);
        localStorage.setItem('adnan_labour_names', JSON.stringify(labourNames));
        document.getElementById('new-labour-name').value = '';
        renderLabourNames();
    }
});

document.getElementById('add-labour-item-btn')?.addEventListener('click', () => {
    const nameVal = document.getElementById('new-labour-item').value.trim();
    const qtyVal = parseFloat(document.getElementById('new-labour-qty').value) || 0;
    const unitVal = document.getElementById('new-labour-unit').value || 'Kg';

    if (nameVal && !labourItems.some(i => i.name === nameVal)) {
        labourItems.push({ name: nameVal, qty: qtyVal, unit: unitVal });
        localStorage.setItem('adnan_labour_items', JSON.stringify(labourItems));

        document.getElementById('new-labour-item').value = '';
        document.getElementById('new-labour-qty').value = '';

        renderLabourItems();
    }
});

document.getElementById('toggle-admin-btn')?.addEventListener('click', () => {
    document.getElementById('labour-admin-modal')?.classList.remove('hidden');
});

document.getElementById('close-admin-modal-btn')?.addEventListener('click', () => {
    document.getElementById('labour-admin-modal')?.classList.add('hidden');
});

// Initial Render
renderLabourNames();
renderLabourItems();

document.getElementById('labour-item')?.addEventListener('change', (e) => {
    const selectedName = e.target.value;
    const found = labourItems.find(i => i.name === selectedName);
    if (found) {
        if (found.qty > 0) document.getElementById('labour-qty').value = found.qty;
        calculateTotal();
    }
});

let labourCart = [];

const renderLabourCart = () => {
    const list = document.getElementById('labour-cart-list');
    const emptyState = document.getElementById('labour-cart-empty');
    const tableEl = document.getElementById('labour-cart-table');
    
    if (!list) return;
    list.innerHTML = '';
    
    if (labourCart.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (tableEl) tableEl.style.display = 'none';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (tableEl) tableEl.style.display = 'table';
        
        labourCart.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border);">${item.name}</td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border);">${item.qty} <small>${item.unit}</small></td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border);">${item.rate}</td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border);">${(item.qty * item.rate).toFixed(2)}</td>
                <td style="padding: 0.75rem 1rem; border-bottom: 1px solid var(--card-border);"><button class="icon-btn text-red" onclick="removeLabourCartItem(${index})" style="background:none; border:none; color: var(--red); cursor: pointer;" title="Remove">🗑️</button></td>
            `;
            list.appendChild(tr);
        });
    }
    
    calculateTotal();
};



window.removeLabourCartItem = (index) => {
    labourCart.splice(index, 1);
    renderLabourCart();
};

document.getElementById('add-to-labour-cart-btn')?.addEventListener('click', () => {
    const selectedItemVal = document.getElementById('labour-item').value;
    if (!selectedItemVal) {
        showAlert('Error', 'Please select an item.');
        return;
    }
    const qty = parseFloat(document.getElementById('labour-qty').value) || 0;
    if (qty <= 0) {
        showAlert('Error', 'Please enter a valid quantity.');
        return;
    }
    const rate = parseFloat(document.getElementById('labour-rate').value) || 0;

    let itemName = selectedItemVal;
    let itemUnit = 'unit';
    // Look up the item in our labourItems list to get the correct unit
    const foundItem = labourItems.find(i => i.name === selectedItemVal);
    if (foundItem) {
        itemUnit = foundItem.unit;
    } else {
        // fallback: try JSON parse (legacy)
        try {
            const parsed = JSON.parse(selectedItemVal);
            itemName = parsed.name;
            itemUnit = parsed.unit;
        } catch(e) {}
    }

    labourCart.push({
        name: itemName,
        unit: itemUnit,
        qty: qty,
        rate: rate
    });

    document.getElementById('labour-item').value = '';
    document.getElementById('labour-qty').value = '';
    document.getElementById('labour-rate').value = '';
    renderLabourCart();
});

const calculateTotal = () => {
    let itemsTotal = 0;
    labourCart.forEach(i => {
        itemsTotal += (i.qty * i.rate);
    });
    const extra = parseFloat(document.getElementById('labour-extra-fee')?.value) || 0;
    labourTotal.value = (itemsTotal + extra).toFixed(2);
};

renderLabourCart();

labourQty.addEventListener('input', calculateTotal);
labourRate.addEventListener('input', calculateTotal);
document.getElementById('labour-extra-fee')?.addEventListener('input', calculateTotal);

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(amount));
};

const calculateLabourBalance = (name) => {
    if (!name) return 0;
    const searchStr = name.trim().toLowerCase();
    const cleanSearchStr = searchStr.replace(/^\d+\s*-\s*/, '').trim();
    let bal = 0;
    transactions.forEach(t => {
        const rawName = (t.personName || '').trim().toLowerCase();
        const cleanName = rawName.replace(/^\d+\s*-\s*/, '').trim();
        const isMatch = searchStr && (
            rawName === searchStr ||
            rawName.startsWith(`${searchStr} -`) ||
            cleanName === cleanSearchStr
        );
        if (isMatch) {
            const total = (t.quantity * t.price) + (parseFloat(t.freight) || 0);
            if (t.type === 'labour_charge' || t.type === 'labour_load' || t.type === 'labour_unload') bal -= total;
            else if (t.type === 'labour_payment') bal += total;
            else if (t.type === 'payment_out') bal += total;
            else if (t.type === 'sale') bal += total;
            else if (t.type === 'purchase') bal -= total;
            else if (t.type === 'payment_in') bal -= total;
        }
    });
    return bal;
};

const renderHistory = (name) => {
    if (!name) {
        historySection.classList.add('hidden');
        return;
    }
    const searchStr = name.trim().toLowerCase();
    const cleanSearchStr = searchStr.replace(/^\d+\s*-\s*/, '').trim();

    // First get all person txns to calculate running balance accurately
    let personTxns = transactions.filter(t => {
        const rawName = (t.personName || '').trim().toLowerCase();
        const cleanName = rawName.replace(/^\d+\s*-\s*/, '').trim();
        return searchStr && (
            rawName === searchStr ||
            rawName.startsWith(`${searchStr} -`) ||
            cleanName === cleanSearchStr
        );
    });

    // Sort ascending by date to calculate running balance
    personTxns.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));

    let currentBalance = 0;
    personTxns.forEach(t => {
        const total = (t.quantity * t.price) + (parseFloat(t.freight) || 0);
        if (t.type === 'labour_charge' || t.type === 'labour_load' || t.type === 'labour_unload') currentBalance -= total;
        else if (t.type === 'labour_payment') currentBalance += total;
        else if (t.type === 'payment_out') currentBalance += total;
        else if (t.type === 'sale') currentBalance += total;
        else if (t.type === 'purchase') currentBalance -= total;
        else if (t.type === 'payment_in') currentBalance -= total;
        t._runningBalance = currentBalance;
    });

    // Filter only labour related transactions
    let txns = personTxns.filter(t => t.type.startsWith('labour_'));

    const timeFilter = document.getElementById('history-time-filter')?.value || 'all';
    if (timeFilter === 'week') {
        const today = new Date();
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        txns = txns.filter(t => {
            const d = new Date(t.date);
            return d >= oneWeekAgo && d <= today;
        });
    }

    historySection.classList.remove('hidden');
    historyLabourName.textContent = name;

    if (txns.length === 0) {
        historyList.innerHTML = '';
        historyEmptyState.classList.remove('hidden');
        document.querySelector('.table-container').classList.add('hidden');
        return;
    }

    historyEmptyState.classList.add('hidden');
    document.querySelector('.table-container').classList.remove('hidden');

    // Group txns by txnId
    const groups = {};
    txns.forEach(t => {
        const key = t.txnId || t.id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
    });

    const combinedTxns = Object.values(groups).map(group => {
        const charge = group.find(t => t.type !== 'labour_payment');
        const payment = group.find(t => t.type === 'labour_payment');
        const base = charge || payment;
        return {
            txnId: base.txnId || base.id,
            date: base.date,
            time: base.time,
            charge: charge,
            payment: payment,
            // If payment exists, it was processed last, so it holds the final running balance
            _runningBalance: payment ? payment._runningBalance : charge._runningBalance
        };
    });

    // Sort descending for display
    combinedTxns.sort((a, b) => new Date(b.date) - new Date(a.date) || b.txnId.localeCompare(a.txnId));

    historyList.innerHTML = '';
    combinedTxns.forEach(item => {
        const tr = document.createElement('tr');

        const c = item.charge;
        const p = item.payment;
        const base = c || p;

        let typeBadge = '';
        if (c && p) {
            typeBadge = `<span class="badge badge-sale" style="background-color: #d1fae5; color: #059669; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Work & Payment</span>`;
        } else if (c) {
            typeBadge = `<span class="badge badge-sale" style="background-color: #d1fae5; color: #059669; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Labour Work</span>`;
        } else if (p) {
            typeBadge = `<span class="badge badge-payment-out" style="background-color: #fee2e2; color: #dc2626; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Payment Paid</span>`;
        }

        const dispPersonName = base.personName || name;
        const dispItem = c ? c.itemName : '-';
        const dispQty = c ? `${c.quantity} <span style="font-size: 0.85em; color: var(--text-primary);">${c.unit || 'Kg'}</span>` : '-';

        let dispWorkType = '-';
        if (c) {
            if (c.type === 'labour_load') dispWorkType = 'Load';
            else if (c.type === 'labour_unload') dispWorkType = 'Unload';
            else dispWorkType = 'Normal';
            
            const extraFee = parseFloat(c.freight) || 0;
            if (extraFee > 0) {
                dispWorkType += `<br><small class="text-secondary">Fee: ${formatCurrency(extraFee)}</small>`;
            }
        } else if (p && !c) {
            dispWorkType = (p.itemName.split('/')[1] || '-').trim();
        }

        const chargeAmt = c ? formatCurrency((c.quantity * c.price) + (parseFloat(c.freight) || 0)) : '-';
        const paidAmt = p ? formatCurrency((p.quantity * p.price) + (parseFloat(p.freight) || 0)) : '-';

        const dateObj = new Date(item.date);
        const dayName = !isNaN(dateObj) ? dateObj.toLocaleDateString('en-US', { weekday: 'short' }) : '';
        const timeStr = item.time ? (dayName ? `${dayName}, ${item.time}` : item.time) : dayName;

        tr.innerHTML = `
            <td>${dispPersonName}</td>
            <td>${item.date}<br><small class="text-secondary">${timeStr}</small></td>
            <td>${typeBadge}</td>
            <td><strong>${dispItem}</strong></td>
            <td>${dispQty}</td>
            <td>${dispWorkType}</td>
            <td><span style="font-weight: 600; color: var(--green);">${c ? '+' + chargeAmt : chargeAmt}</span></td>
            <td><span style="font-weight: 600; color: var(--red);">${p ? '-' + paidAmt : paidAmt}</span></td>
            <td style="font-weight: 600;">${formatCurrency(item._runningBalance)}</td>
            <td>
                <button class="action-icon text-red" style="background: none; border: none; cursor: pointer; color: var(--red);" onclick="deleteLabourTxnGroup('${item.txnId}')" title="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;
        historyList.appendChild(tr);
    });
};

labourName.addEventListener('input', (e) => {
    const name = e.target.value.trim();
    const bal = calculateLabourBalance(name);
    labourBalance.value = bal.toFixed(2);
    renderHistory(name);
});

document.getElementById('history-time-filter')?.addEventListener('change', () => {
    const name = labourName.value.trim();
    if (name) {
        renderHistory(name);
    }
});

saveLabourBtn.addEventListener('click', () => {
    const name = labourName.value.trim();
    const date = labourDate.value || new Date().toISOString().split('T')[0];
    
    const selectedItemVal = labourItem.value;
    const qty = parseFloat(labourQty.value) || 0;
    if (selectedItemVal && qty > 0) {
        document.getElementById('add-to-labour-cart-btn').click();
    }

    const extra = parseFloat(document.getElementById('labour-extra-fee')?.value) || 0;
    const paid = parseFloat(labourPaid.value) || 0;
    const method = labourPaymentMethod.value;
    const workType = document.getElementById('labour-work-type')?.value || 'normal';

    let itemsTotal = 0;
    labourCart.forEach(i => itemsTotal += (i.qty * i.rate));
    const total = itemsTotal + extra;

    if (!name) {
        showAlert('Error', 'Please enter a Labourer Name.');
        return;
    }

    if (total === 0 && paid === 0) {
        showAlert('Error', 'Please add work items or enter a Payment Amount.');
        return;
    }

    const txnId = 'LBR-' + Math.floor(100000 + Math.random() * 900000);
    const timeString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Add Labour Charges
    if (total > 0) {
        if (labourCart.length === 0 && extra > 0) {
            // Edge case: No items, but an extra fee is added
            transactions.push({
                id: crypto.randomUUID(),
                txnId: txnId,
                time: timeString,
                type: 'labour_charge',
                date,
                personName: name,
                itemName: 'Extra Fee',
                price: 0,
                quantity: 0,
                unit: 'unit',
                freight: extra
            });
        } else {
            let txType = 'labour_charge';
            if (workType === 'load') txType = 'labour_load';
            else if (workType === 'unload') txType = 'labour_unload';

            labourCart.forEach((item, index) => {
                // Attach extra fee only to the first item so it's not duplicated
                const itemFreight = (index === 0) ? extra : 0;
                transactions.push({
                    id: crypto.randomUUID(),
                    txnId: txnId,
                    time: timeString,
                    type: txType,
                    date,
                    personName: name,
                    itemName: item.name,
                    price: item.rate,
                    quantity: item.qty,
                    unit: item.unit,
                    freight: itemFreight
                });
            });
        }
    }

    // Add Payment
    if (paid > 0) {
        transactions.push({
            id: crypto.randomUUID(),
            txnId: txnId,
            time: timeString,
            type: 'labour_payment',
            date,
            personName: name,
            itemName: `Payment / ${method}`,
            price: paid,
            quantity: 1,
            unit: '',
            freight: 0
        });
    }

    if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
    localStorage.setItem('adnan_transactions', JSON.stringify(transactions));

    showAlert('Success', 'Labour record saved successfully.');

    // Reset Form
    // Do not set default 0 for rate and qty
    const wTypeEl = document.getElementById('labour-work-type');
    if (wTypeEl) wTypeEl.value = 'unload';
    labourItem.value = '';
    labourQty.value = '';
    labourRate.value = '';
    labourCart = [];
    renderLabourCart();
    const extraFeeEl = document.getElementById('labour-extra-fee');
    if (extraFeeEl) extraFeeEl.value = '';
    labourTotal.value = '0.00';
    labourPaid.value = '';
    labourPaymentMethod.value = '-';
    const bankContainer = document.getElementById('labour-bank-container');
    if (bankContainer) {
        bankContainer.style.display = 'none';
    }
    const bal = calculateLabourBalance(name);
    labourBalance.value = bal.toFixed(2);
    renderHistory(name);
});

window.deleteLabourTxnGroup = (txnId) => {
    showConfirm('Delete Transaction', 'Are you sure you want to delete this labour record?', 'Delete', 'var(--red)', () => {
        const txnsToDelete = transactions.filter(t => (t.txnId === txnId) || (t.id === txnId));
        transactions = transactions.filter(t => (t.txnId !== txnId) && (t.id !== txnId));
        localStorage.setItem('adnan_transactions', JSON.stringify(transactions));
        if (window.deleteSpecificTransactionFromCloud) {
            txnsToDelete.forEach(t => window.deleteSpecificTransactionFromCloud(t.id));
        }
        const name = labourName.value.trim();
        const bal = calculateLabourBalance(name);
        labourBalance.value = bal.toFixed(2);
        renderHistory(name);
    });
};

if (window.fetchDataFromCloudAndRender) {
    window.fetchDataFromCloudAndRender((preFetchSyncedTxns) => {
        const cloudTxns = window.cloudTransactions || [];
        const syncedTxns = preFetchSyncedTxns || new Set(JSON.parse(localStorage.getItem('adnan_synced_txns') || '[]'));
        const cloudTxnSet = new Set(cloudTxns.map(t => t.id));

        const txnsMap = new Map();
        transactions.forEach(t => {
            if (syncedTxns.has(t.id) && !cloudTxnSet.has(t.id)) return;
            txnsMap.set(t.id, t);
        });
        cloudTxns.forEach(t => txnsMap.set(t.id, { ...t }));
        transactions = Array.from(txnsMap.values());
        localStorage.setItem('adnan_transactions', JSON.stringify(transactions));
        renderLabourNames();
        renderLabourItems();
        const name = labourName.value.trim();
        if (name) {
            const bal = calculateLabourBalance(name);
            labourBalance.value = bal.toFixed(2);
            renderHistory(name);
        }
    });
}

document.getElementById('toggle-admin-btn')?.addEventListener('click', () => { document.getElementById('labour-admin-modal')?.classList.remove('hidden'); });
document.getElementById('close-admin-modal-btn')?.addEventListener('click', () => { document.getElementById('labour-admin-modal')?.classList.add('hidden'); });
