let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let items = JSON.parse(localStorage.getItem('items')) || [];

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

// Populate Items Dropdown
items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    opt.textContent = `${item.name} (Unit: ${item.unit})`;
    labourItem.appendChild(opt);
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
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
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

    localStorage.setItem('transactions', JSON.stringify(transactions));
    if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);

    showAlert('Success', 'Labour record saved successfully.');

    // Reset Form
    labourItem.value = '';
    labourQty.value = '0';
    labourRate.value = '0';
    labourTotal.value = '0.00';
    labourPaid.value = '0';

    const bal = calculateLabourBalance(name);
    labourBalance.value = bal.toFixed(2);
    renderHistory(name);
});

window.deleteLabourTxn = (id) => {
    showConfirm('Delete Transaction', 'Are you sure you want to delete this labour record?', 'Delete', 'var(--red)', () => {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        if (window.deleteSpecificTransactionFromCloud) window.deleteSpecificTransactionFromCloud(id);
        const name = labourName.value.trim();
        const bal = calculateLabourBalance(name);
        labourBalance.value = bal.toFixed(2);
        renderHistory(name);
    });
};

if (window.fetchDataFromCloudAndRender) {
    window.fetchDataFromCloudAndRender(() => {
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        initItemDropdown();
        const name = labourName.value.trim();
        if (name) {
            const bal = calculateLabourBalance(name);
            labourBalance.value = bal.toFixed(2);
            renderHistory(name);
        }
    });
}
