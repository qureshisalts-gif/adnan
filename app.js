// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let items = JSON.parse(localStorage.getItem('items')) || [];

// DOM Elements
const txnType = document.getElementById('txn-type');
const txnDate = document.getElementById('txn-date');
const txnPerson = document.getElementById('txn-person');

const itemSelect = document.getElementById('item-select');
const itemQty = document.getElementById('item-qty');
const cartItemTotal = document.getElementById('cart-item-total');
const cartItemWeight = document.getElementById('cart-item-weight');
const freightChargesInput = document.getElementById('freight-charges');
const addToListBtn = document.getElementById('add-to-list-btn');

const stockSummaryList = document.getElementById('stock-summary-list');
const cartSection = document.getElementById('cart-section');
const cartList = document.getElementById('cart-list');

// Financial Elements
const finItemsTotal = document.getElementById('fin-items-total');
const finPrevBalance = document.getElementById('fin-prev-balance');
const finGrandTotal = document.getElementById('fin-grand-total');
const finAmountPaid = document.getElementById('fin-amount-paid');
const finPaymentMethod = document.getElementById('fin-payment-method');
const finRemainingBalance = document.getElementById('fin-remaining-balance');
const saveTxnBtn = document.getElementById('save-txn-btn');

const historySection = document.getElementById('person-history-section');
const historyPersonName = document.getElementById('history-person-name');
const historyList = document.getElementById('history-list');
const historyEmptyState = document.getElementById('history-empty-state');

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

// Set default date to today
txnDate.valueAsDate = new Date();

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR'
    }).format(amount);
};

// Initialize Items Dropdown
const initItemsDropdown = () => {
    itemSelect.innerHTML = '<option value="">Select an item...</option>';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        option.setAttribute('data-rate', item.rate);
        option.setAttribute('data-name', item.name);
        option.setAttribute('data-unit', item.unit || 'Kg');
        itemSelect.appendChild(option);
    });
};

// ----- NEW CART SYSTEM -----
let currentCart = [];

const calculateItemStock = (itemName) => {
    let stockIn = 0;
    let stockOut = 0;
    transactions.forEach(t => {
        if (t.itemName === itemName) {
            if (t.type === 'purchase') stockIn += t.quantity;
            else if (t.type === 'sale') stockOut += t.quantity;
        }
    });
    return { stockIn, stockOut, currentStock: stockIn - stockOut };
};

const renderStockSummary = (itemName) => {
    if (!itemName) {
        stockSummaryList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; font-size: 0.9rem; padding: 1.5rem 0; border-bottom: 1px solid #e2e8f0;">Search for an item or person to view stock summary</td></tr>`;
        return;
    }
    const { stockIn, stockOut, currentStock } = calculateItemStock(itemName);
    stockSummaryList.innerHTML = `
        <tr>
            <td style="font-weight: 600; color: var(--text-primary); border-bottom: 1px solid #e2e8f0;">${itemName}</td>
            <td style="color: var(--green); font-weight: 600; border-bottom: 1px solid #e2e8f0;">${stockIn.toFixed(2)}</td>
            <td style="color: var(--red); font-weight: 600; border-bottom: 1px solid #e2e8f0;">${stockOut.toFixed(2)}</td>
            <td style="color: var(--accent-color); font-weight: 700; border-bottom: 1px solid #e2e8f0;">${currentStock.toFixed(2)}</td>
        </tr>
    `;
};

const renderCart = () => {
    cartList.innerHTML = '';
    let itemsTotal = 0;

    if (currentCart.length === 0) {
        cartSection.classList.add('hidden');
    } else {
        cartSection.classList.remove('hidden');
        currentCart.forEach(item => {
            itemsTotal += (item.qty * item.rate) + item.freight;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.itemName}</td>
                <td>${item.qty} ${item.unit}</td>
                <td>${formatCurrency(item.rate)}</td>
                <td>${formatCurrency((item.qty * item.rate) + item.freight)}</td>
                <td>
                    <button class="icon-btn text-red" onclick="removeFromCart('${item.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            `;
            cartList.appendChild(tr);
        });
    }

    finItemsTotal.value = itemsTotal.toFixed(2);
    const prevBalance = parseFloat(finPrevBalance.value) || 0;
    finGrandTotal.value = (itemsTotal + prevBalance).toFixed(2);
    updateRemainingBalance();
};

window.removeFromCart = (id) => {
    currentCart = currentCart.filter(item => item.id !== id);
    renderCart();
};


// Update Item Totals (Live Calculation)
const updateItemTotals = () => {
    const qty = parseFloat(itemQty.value) || 0;
    const freight = parseFloat(freightChargesInput.value) || 0;

    let rate = 0;
    let unit = 'Kg';
    let name = '';
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    if (selectedOption.value) {
        rate = parseFloat(selectedOption.getAttribute('data-rate')) || 0;
        unit = selectedOption.getAttribute('data-unit') || 'Kg';
        name = selectedOption.getAttribute('data-name');
    }

    renderStockSummary(name);

    const itemsTotal = (qty * rate) + freight;
    cartItemTotal.textContent = formatCurrency(itemsTotal);
    cartItemWeight.textContent = `${qty.toFixed(2)} (${unit})`;
};

// (Remaining balance uses the finGrandTotal updated in renderCart)

const updateRemainingBalance = () => {
    const grandTotal = parseFloat(finGrandTotal.value) || 0;
    const amountPaid = parseFloat(finAmountPaid.value) || 0;
    const remaining = grandTotal - amountPaid;
    finRemainingBalance.value = remaining.toFixed(2);
};

itemSelect.addEventListener('change', updateItemTotals);
itemQty.addEventListener('input', updateItemTotals);
freightChargesInput.addEventListener('input', updateItemTotals);
finAmountPaid.addEventListener('input', updateRemainingBalance);

const calculatePersonBalance = (personName) => {
    if (!personName) return 0;

    // Sum up balance chronologically
    const nameLower = personName.toLowerCase();
    const sortedAsc = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));

    let bal = 0;
    sortedAsc.forEach(t => {
        if ((t.personName || '').toLowerCase() === nameLower) {
            const total = (t.quantity * t.price) + (parseFloat(t.freight) || 0);
            if (t.type === 'sale') bal += total;
            else if (t.type === 'purchase') bal -= total;
            else if (t.type === 'payment_out') bal += total;
            else if (t.type === 'payment_in') bal -= total; // wait, payment_in from them means they owe us less
        }
    });
    return bal;
};



// Render Person History
const renderHistory = (filterText = '') => {
    if (!filterText) {
        historySection.classList.add('hidden');
        return;
    }

    historySection.classList.remove('hidden');
    historyPersonName.textContent = filterText;
    historyList.innerHTML = '';

    const filteredTransactions = transactions.filter(t => {
        const name = t.personName || '';
        return name.toLowerCase().includes(filterText.toLowerCase());
    });

    if (filteredTransactions.length === 0) {
        historyEmptyState.classList.remove('hidden');
        historyList.parentElement.classList.add('hidden');
    } else {
        historyEmptyState.classList.add('hidden');
        historyList.parentElement.classList.remove('hidden');

        const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedTransactions.forEach(t => {
            const row = document.createElement('tr');
            const total = t.quantity * t.price;
            const badgeClass = t.type === 'sale' ? 'badge-sale' : 'badge-purchase';

            row.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td><span class="type-badge ${badgeClass}">${t.type}</span></td>
                <td>${t.itemName}</td>
                <td>${t.quantity} <span style="font-size: 0.85em; color: var(--text-secondary);">${t.unit || 'Kg'}</span></td>
                <td>${formatCurrency(t.price)}</td>
                <td>${formatCurrency(total)}</td>
                <td class="invoice-cell" style="width: 120px;">
                <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end;">
                    <button class="action-icon" style="background: none; border: none; color: var(--accent-color); cursor: pointer;" onclick="printInvoice('${t.txnId}')" title="Print">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <button class="action-icon" style="background: none; border: none; color: #4338ca; cursor: pointer; display: flex; align-items: center;" onclick="showCopyModal('${t.txnId}')" title="Copy Invoice Image">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button class="action-icon text-red" style="background: none; border: none; color: var(--red); cursor: pointer;" onclick="deleteHistoryTransaction('${t.id}')" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>`;
            historyList.appendChild(row);
            
            if (t.freight && parseFloat(t.freight) > 0) {
                const fRow = document.createElement('tr');
                fRow.innerHTML = `
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td><span class="type-badge ${badgeClass}">${t.type}</span></td>
                <td style="color: var(--text-secondary);">Freight Charges</td>
                <td>-</td>
                <td>-</td>
                <td>${formatCurrency(t.freight)}</td>
                <td class="invoice-cell"></td>
                `;
                historyList.appendChild(fRow);
            }
        });
    }
};

window.deleteHistoryTransaction = (id) => {
    showConfirm('Delete Transaction', 'Are you sure you want to delete this historical transaction?', 'Delete', 'var(--red)', () => {
        transactions = transactions.filter(t => t.id !== id);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        renderHistory(txnPerson.value.trim());
    });
};

txnPerson.addEventListener('input', (e) => {
    const name = e.target.value.trim();
    renderHistory(name);

    const bal = calculatePersonBalance(name);
    finPrevBalance.value = bal.toFixed(2);
    updateItemTotals();
});

addToListBtn.addEventListener('click', () => {
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    if (!selectedOption.value) {
        showAlert('Error', 'Please select an item first.');
        return;
    }

    const itemName = selectedOption.getAttribute('data-name');
    const rate = parseFloat(selectedOption.getAttribute('data-rate'));
    const unit = selectedOption.getAttribute('data-unit') || 'Kg';
    const qty = parseFloat(itemQty.value);
    const freight = parseFloat(freightChargesInput.value) || 0;

    if (isNaN(qty) || qty <= 0) {
        showAlert('Error', 'Please enter a valid quantity greater than 0.');
        return;
    }

    currentCart.push({
        id: crypto.randomUUID(),
        itemName,
        rate,
        qty,
        unit,
        freight
    });

    itemSelect.value = '';
    itemQty.value = '0';
    freightChargesInput.value = '0';
    updateItemTotals();
    renderCart();
});

// Save Transaction
saveTxnBtn.addEventListener('click', () => {
    if (currentCart.length === 0) {
        showAlert('Error', 'Your cart is empty. Add items to list first.');
        return;
    }

    const type = txnType.value;
    let date = txnDate.value;
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }
    const personName = txnPerson.value.trim();

    if (!personName) {
        showAlert('Error', 'Please enter a Person Name.');
        return;
    }

    const amountPaid = parseFloat(finAmountPaid.value) || 0;
    const paymentMethod = finPaymentMethod.value;

    const txnId = window.currentEditTxnId || ('TXN-' + Math.floor(100000 + Math.random() * 900000));
    const timeString = window.currentEditTxnTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (window.currentEditTxnId) {
        transactions = transactions.filter(t => t.txnId !== txnId);
    }

    // 1. Record the Cart Items
    currentCart.forEach(cartItem => {
        transactions.push({
            id: crypto.randomUUID(),
            txnId: txnId,
            time: timeString,
            type,
            date,
            personName,
            itemName: cartItem.itemName,
            price: cartItem.rate,
            quantity: cartItem.qty,
            unit: cartItem.unit,
            freight: cartItem.freight
        });
    });

    // 2. If Amount Paid > 0, record a Payment
    if (amountPaid > 0) {
        const paymentType = type === 'sale' ? 'payment_in' : 'payment_out';
        transactions.push({
            id: crypto.randomUUID(),
            txnId: txnId,
            time: timeString,
            type: paymentType,
            date,
            personName,
            itemName: `Payment / ${paymentMethod}`,
            price: amountPaid,
            quantity: 1,
            unit: '-',
            freight: 0
        });
    }

    localStorage.setItem('transactions', JSON.stringify(transactions));
    if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);

    // Reset Form
    currentCart = [];
    renderCart();

    finAmountPaid.value = '0';

    if (window.currentEditTxnId) {
        window.currentEditTxnId = null;
        window.currentEditTxnTime = null;
        saveTxnBtn.textContent = 'Save Transaction';
        saveTxnBtn.style.backgroundColor = '';
        showAlert('Success', 'Transaction successfully updated.');
    }

    // Refresh person's balance and history
    const bal = calculatePersonBalance(personName);
    finPrevBalance.value = bal.toFixed(2);

    renderHistory(personName);
});

const copyModal = document.getElementById('copy-modal');
const copyNormalBtn = document.getElementById('copy-normal-btn');
const copyUrduBtn = document.getElementById('copy-urdu-btn');
const copyFreightBtn = document.getElementById('copy-freight-btn');
const copyUrduFreightBtn = document.getElementById('copy-urdu-freight-btn');
const copyCancelBtn = document.getElementById('copy-cancel-btn');
let currentCopyTxnId = null;

window.showCopyModal = (txnId) => {
    currentCopyTxnId = txnId;
    if (copyModal) copyModal.classList.remove('hidden');
};

if (copyCancelBtn) {
    copyCancelBtn.addEventListener('click', () => {
        copyModal.classList.add('hidden');
        currentCopyTxnId = null;
    });
}
if (copyNormalBtn) {
    copyNormalBtn.addEventListener('click', () => {
        if (currentCopyTxnId) {
            window.copyInvoiceImage(currentCopyTxnId, 'normal');
            copyModal.classList.add('hidden');
        }
    });
}
if (copyUrduBtn) {
    copyUrduBtn.addEventListener('click', () => {
        if (currentCopyTxnId) {
            window.copyInvoiceImage(currentCopyTxnId, 'urdu');
            copyModal.classList.add('hidden');
        }
    });
}
if (copyFreightBtn) {
    copyFreightBtn.addEventListener('click', () => {
        if (currentCopyTxnId) {
            window.copyInvoiceImage(currentCopyTxnId, 'freight');
            copyModal.classList.add('hidden');
        }
    });
}
if (copyUrduFreightBtn) {
    copyUrduFreightBtn.addEventListener('click', () => {
        if (currentCopyTxnId) {
            window.copyInvoiceImage(currentCopyTxnId, 'urdu-freight');
            copyModal.classList.add('hidden');
        }
    });
}

window.copyInvoiceImage = async (txnId, type = 'normal') => {
    const txns = transactions.filter(t => t.txnId === txnId || t.id === txnId);
    if (!txns.length) return;
    
    const firstTxn = txns[0];
    const dateObj = new Date(firstTxn.date);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
    const timeStr = firstTxn.time || '';
    const personName = firstTxn.personName || 'Cash Customer';
    const isUrdu = type === 'urdu' || type === 'urdu-freight';
    const isFreight = type === 'freight' || type === 'urdu-freight';
    
    let invoiceType = isUrdu ? 'انوائس' : 'Invoice';
    if (isFreight) {
        invoiceType = isUrdu ? 'کرایہ چارجز بل' : 'Freight Charges';
    } else if (isUrdu) {
        if (firstTxn.type === 'purchase') invoiceType = 'خریداری بل';
        if (firstTxn.type === 'payment_in' || firstTxn.type === 'payment_out') invoiceType = 'ادائیگی کی رسید';
    } else {
        if (firstTxn.type === 'purchase') invoiceType = 'Purchase Bill';
        if (firstTxn.type === 'payment_in' || firstTxn.type === 'payment_out') invoiceType = 'Payment Receipt';
    }
    
    const t = {
        ref: isUrdu ? 'حوالہ:' : 'Ref:',
        date: isUrdu ? 'تاریخ:' : 'Date:',
        billedTo: isUrdu ? 'کس کے نام:' : 'Billed To',
        itemDesc: isUrdu ? 'تفصیل' : 'Item Description',
        qty: isUrdu ? 'مقدار' : 'Qty',
        price: isUrdu ? 'قیمت' : 'Price',
        freight: isUrdu ? 'کرایہ' : 'Freight',
        total: isUrdu ? 'کل رقم' : 'Total',
        subtotal: isUrdu ? 'میزان:' : 'Subtotal:',
        freightCharges: isUrdu ? 'کرایہ چارجز:' : 'Freight Charges:',
        totalAmount: isUrdu ? 'کل رقم:' : 'Total Amount:',
        amountPaid: isUrdu ? 'ادا شدہ رقم:' : 'Amount Paid:',
        thankYou: isUrdu ? 'آپ کے کاروبار کا شکریہ!' : 'Thank you for your business!'
    };
    
    let totalAmt = 0;
    let amountPaid = 0;
    
    let itemsHtml = '';
    let totalFreight = 0;
    let subtotal = 0;

    if (isFreight) {
        txns.forEach(t => {
            if (t.type === 'sale' || t.type === 'purchase') {
                totalFreight += (parseFloat(t.freight) || 0);
            }
        });
        totalAmt = totalFreight;
        subtotal = totalFreight;
        
        itemsHtml = `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">1</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.freightCharges.replace(':', '')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">-</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${isUrdu ? 'left' : 'right'};">${formatCurrency(totalFreight)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${isUrdu ? 'left' : 'right'};">${formatCurrency(totalFreight)}</td>
            </tr>
        `;
    } else {
        itemsHtml = txns.map((t, index) => {
            let itemTotal = 0;
            let qty = t.quantity || 0;
            let price = t.price || 0;
            let freight = parseFloat(t.freight) || 0;
            totalFreight += freight;
            
            if (t.type === 'sale' || t.type === 'purchase') {
                itemTotal = (qty * price);
                subtotal += itemTotal;
                totalAmt += itemTotal + freight;
            } else if (t.type.startsWith('payment')) {
                itemTotal = qty * price;
                amountPaid += itemTotal;
            }
            
            return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${t.itemName || '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${isUrdu ? 'left' : 'right'};">${formatCurrency(price)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${isUrdu ? 'left' : 'right'};">${formatCurrency(itemTotal)}</td>
                </tr>
            `;
        }).join('');
        
        if (totalFreight > 0) {
            itemsHtml += `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">-</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 600;">${t.freightCharges.replace(':', '')}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">-</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${isUrdu ? 'left' : 'right'};">${formatCurrency(totalFreight)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${isUrdu ? 'left' : 'right'}; font-weight: 600;">${formatCurrency(totalFreight)}</td>
                </tr>
            `;
        }
    }

    let copyDiv = document.getElementById('copy-div');
    if (!copyDiv) {
        copyDiv = document.createElement('div');
        copyDiv.id = 'copy-div';
        copyDiv.style.position = 'absolute';
        copyDiv.style.left = '-9999px';
        copyDiv.style.top = '-9999px';
        copyDiv.style.width = '800px';
        copyDiv.style.backgroundColor = '#ffffff';
        copyDiv.style.padding = '40px';
        copyDiv.style.boxSizing = 'border-box';
        document.body.appendChild(copyDiv);
    }

    const html = `
        <div style="font-family: ${isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', sans-serif"}; color: #333; direction: ${isUrdu ? 'rtl' : 'ltr'};">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                <div>
                    <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #4338ca; font-family: 'Inter', sans-serif;">TrackFlow</h1>
                    <p style="margin: 0; color: #666; font-family: 'Inter', sans-serif;">Inventory Management System</p>
                </div>
                <div style="text-align: ${isUrdu ? 'left' : 'right'};">
                    <h2 style="margin: 0 0 10px 0; font-size: 24px; color: #666; text-transform: uppercase;">${invoiceType}</h2>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>${t.ref}</strong> ${txnId}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>${t.date}</strong> ${dateStr} ${timeStr}</p>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase;">${t.billedTo}</h3>
                    <p style="margin: 5px 0; font-size: 16px; font-weight: 600;">${personName}</p>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th style="padding: 12px 10px; text-align: ${isUrdu ? 'right' : 'left'}; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase;">#</th>
                        <th style="padding: 12px 10px; text-align: ${isUrdu ? 'right' : 'left'}; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase;">${t.itemDesc}</th>
                        <th style="padding: 12px 10px; text-align: center; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase;">${t.qty}</th>
                        ${!isFreight ? `<th style="padding: 12px 10px; text-align: ${isUrdu ? 'left' : 'right'}; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase;">${t.price}</th>` : `<th style="padding: 12px 10px; text-align: ${isUrdu ? 'left' : 'right'}; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase;">${t.freight}</th>`}
                        <th style="padding: 12px 10px; text-align: ${isUrdu ? 'left' : 'right'}; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase;">${t.total}</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div style="width: 300px; margin-${isUrdu ? 'right' : 'left'}: auto;">
                ${totalAmt > 0 ? `
                <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px;">
                    <span>${t.totalAmount}</span>
                    <span>${formatCurrency(totalAmt)}</span>
                </div>
                ` : ''}
                ${amountPaid > 0 && !isFreight ? `
                <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px;">
                    <span>${t.amountPaid}</span>
                    <span>${formatCurrency(amountPaid)}</span>
                </div>
                ` : ''}
            </div>
            
            <div style="margin-top: 50px; text-align: center; color: #666; font-size: 14px;">
                <p>${t.thankYou}</p>
            </div>
        </div>
    `;
    
    copyDiv.innerHTML = html;
    
    if (typeof html2canvas === 'undefined') {
        showAlert('Error', 'html2canvas library is not loaded. Cannot copy image.');
        return;
    }
    
    try {
        const canvas = await html2canvas(copyDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        
        canvas.toBlob(async (blob) => {
            if (!blob) {
                showAlert('Error', 'Failed to generate image blob.');
                return;
            }
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                showAlert('Success', 'Invoice image copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy image: ', err);
                showAlert('Error', 'Failed to copy image to clipboard.');
            }
        }, 'image/png');
    } catch (err) {
        console.error('Error with html2canvas:', err);
        showAlert('Error', 'Error generating image.');
    } finally {
        document.body.removeChild(copyDiv);
    }
};

// Initialize
initItemsDropdown();

const editTxnId = localStorage.getItem('editTxnId');
if (editTxnId) {
    const editTxns = transactions.filter(t => t.txnId === editTxnId);
    if (editTxns.length > 0) {
        const firstTxn = editTxns.find(t => !t.type.includes('payment')) || editTxns[0];
        
        txnType.value = (firstTxn.type.includes('payment')) ? 'sale' : firstTxn.type;
        txnDate.value = firstTxn.date;
        txnPerson.value = firstTxn.personName || '';
        
        editTxns.forEach(t => {
            if (t.type.startsWith('payment') || t.type === 'labour_payment') {
                finAmountPaid.value = t.price;
                if (t.itemName.includes('/')) {
                    finPaymentMethod.value = t.itemName.split('/')[1].trim();
                }
            } else {
                currentCart.push({
                    id: crypto.randomUUID(),
                    itemName: t.itemName,
                    rate: t.price,
                    qty: t.quantity,
                    unit: t.unit,
                    freight: parseFloat(t.freight) || 0
                });
            }
        });
        
        window.currentEditTxnId = editTxnId;
        window.currentEditTxnTime = firstTxn.time;
        saveTxnBtn.textContent = 'Update Transaction';
        saveTxnBtn.style.backgroundColor = 'var(--green)';
        
        const bal = calculatePersonBalance(firstTxn.personName);
        finPrevBalance.value = bal.toFixed(2);
        renderHistory(firstTxn.personName);
    }
    localStorage.removeItem('editTxnId');
} else {
    txnDate.value = new Date().toISOString().split('T')[0];
    renderHistory('');
}

updateItemTotals();
renderCart();

if (window.fetchDataFromCloudAndRender) {
    window.fetchDataFromCloudAndRender(() => {
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        items = JSON.parse(localStorage.getItem('items')) || [];
        
        updateItemTotals();
        renderCart();
        renderHistory(txnPerson.value.trim());
    });
}
