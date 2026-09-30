let transactions = [];
let items = [];

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

const calculateTotal = () => {
    const qty = parseFloat(labourQty.value) || 0;
    const rate = parseFloat(labourRate.value) || 0;
    labourTotal.value = (qty * rate).toFixed(2);
};

labourQty.addEventListener('input', calculateTotal);
labourRate.addEventListener('input', calculateTotal);

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(amount));
};

const calculateLabourBalance = (name) => {
    if (!name) return 0;
    const nameLower = name.toLowerCase();
    let bal = 0;
    transactions.forEach(t => {
        if ((t.personName || '').toLowerCase() === nameLower) {
            const total = (t.quantity * t.price);
            if (t.type === 'labour_charge') bal -= total;
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
    const nameLower = name.toLowerCase();

    // Filter only labour related transactions
    const txns = transactions.filter(t => (t.personName || '').toLowerCase() === nameLower && (t.type === 'labour_charge' || t.type === 'labour_payment'));

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

    // Sort descending
    txns.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id));

    historyList.innerHTML = '';
    txns.forEach(t => {
        const tr = document.createElement('tr');
        const total = formatCurrency(t.quantity * t.price);

        let typeBadge = '';
        let amountHtml = '';

        if (t.type === 'labour_charge') {
            typeBadge = `<span class="badge badge-sale">Labour Work</span>`;
            amountHtml = `<span style="font-weight: 600; color: var(--green);">+${total}</span>`;
        } else {
            typeBadge = `<span class="badge badge-payment-out">Payment Paid</span>`;
            amountHtml = `<span style="font-weight: 600; color: var(--red);">-${total}</span>`;
        }

        let detailsHtml = `<strong>${t.itemName}</strong><br><small class="text-secondary">${t.quantity} unit(s) @ ${t.price}</small>`;
        if (t.type === 'labour_payment') {
            detailsHtml = `<strong>${t.itemName}</strong>`;
        }

        tr.innerHTML = `
            <td>${t.date}<br><small class="text-secondary">${t.time || ''}</small></td>
            <td>${typeBadge}</td>
            <td>${detailsHtml}</td>
            <td>${amountHtml}</td>
            <td>
                <button class="action-icon text-red" style="background: none; border: none; cursor: pointer; color: var(--red);" onclick="deleteLabourTxn('${t.id}')" title="Delete">
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

saveLabourBtn.addEventListener('click', () => {
    const name = labourName.value.trim();
    const date = labourDate.value || new Date().toISOString().split('T')[0];
    const itemName = labourItem.value;
    const qty = parseFloat(labourQty.value) || 0;
    const rate = parseFloat(labourRate.value) || 0;
    const total = qty * rate;
    const paid = parseFloat(labourPaid.value) || 0;
    const method = labourPaymentMethod.value;

    if (!name) {
        showAlert('Error', 'Please enter a Labourer Name.');
        return;
    }

    if (total === 0 && paid === 0) {
        showAlert('Error', 'Please enter work done (Quantity & Rate) OR a Payment Amount.');
        return;
    }

    const txnId = 'LBR-' + Math.floor(100000 + Math.random() * 900000);
    const timeString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Add Labour Charge
    if (total > 0) {
        if (!itemName) {
            showAlert('Error', 'Please select the Item they worked on.');
            return;
        }
        transactions.push({
            id: crypto.randomUUID(),
            txnId: txnId,
            time: timeString,
            type: 'labour_charge',
            date,
            personName: name,
            itemName: itemName,
            price: rate,
            quantity: qty,
            unit: items.find(i => i.name === itemName)?.unit || 'unit',
            freight: 0
        });
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

    showAlert('Success', 'Labour record saved successfully.');

    // Reset Form
    // Do not set default 0 for rate and qty
    labourItem.value = '';
    labourQty.value = '';
    labourRate.value = '';
    labourTotal.value = '0.00';
    labourPaid.value = '';
    labourPaymentMethod.value = 'Cash';
    document.getElementById('labour-bank-container').style.display = 'none';
    const bal = calculateLabourBalance(name);
    labourBalance.value = bal.toFixed(2);
    renderHistory(name);
});

window.deleteLabourTxn = (id) => {
    showConfirm('Delete Transaction', 'Are you sure you want to delete this labour record?', 'Delete', 'var(--red)', () => {
        transactions = transactions.filter(t => t.id !== id);
        if (window.deleteSpecificTransactionFromCloud) window.deleteSpecificTransactionFromCloud(id);
        const name = labourName.value.trim();
        const bal = calculateLabourBalance(name);
        labourBalance.value = bal.toFixed(2);
        renderHistory(name);
    });
};

if (window.fetchDataFromCloudAndRender) {
    window.fetchDataFromCloudAndRender(() => {
        transactions = window.cloudTransactions || [];
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
