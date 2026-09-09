let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
const invoiceList = document.getElementById('invoice-list');
const invoiceSearch = document.getElementById('invoice-search');
const invoiceEmptyState = document.getElementById('invoice-empty-state');

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
    dialogCancelBtn.classList.add('hidden');
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

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const renderInvoices = (filterText = '') => {
    invoiceList.innerHTML = '';

    let filteredTransactions = transactions;
    if (filterText) {
        filteredTransactions = transactions.filter(t => {
            const name = t.personName || '';
            const txnId = t.txnId || '';
            return name.toLowerCase().includes(filterText.toLowerCase()) ||
                txnId.toLowerCase().includes(filterText.toLowerCase());
        });
    }

    if (filteredTransactions.length === 0) {
        invoiceEmptyState.classList.remove('hidden');
        return;
    }

    invoiceEmptyState.classList.add('hidden');

    // Group by txnId to combine cart items into a single invoice row
    const sortedAsc = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    
    const groups = {};
    const groupedList = [];
    
    sortedAsc.forEach(t => {
        const key = t.txnId || t.id; // fallback if no txnId
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
                amountPaid: 0,
                runningBalance: 0
            };
            groupedList.push(groups[key]);
        }
        
        const group = groups[key];
        
        // Prioritize actual transaction type over payment type for the whole invoice
        if ((group.type.startsWith('payment') || group.type === 'labour_payment') && 
            (t.type === 'sale' || t.type === 'purchase' || t.type === 'labour_charge')) {
            group.type = t.type;
        }
        
        if (t.type.startsWith('payment') || t.type === 'labour_payment') {
            group.amountPaid += (t.quantity * t.price);
            if (t.itemName.includes('/')) {
                group.paymentMethod = t.itemName.split('/')[1].trim();
            }
        } else {
            group.items.push(t.itemName);
            group.totalAmt += (t.quantity * t.price) + (parseFloat(t.freight) || 0);
        }
    });

    const balances = {};
    groupedList.forEach(g => {
        const pName = (g.personName || '').toLowerCase();
        if (!balances[pName]) balances[pName] = 0;
        
        if (g.type === 'sale') balances[pName] += g.totalAmt;
        else if (g.type === 'purchase') balances[pName] -= g.totalAmt;
        else if (g.type === 'payment_out') balances[pName] += g.amountPaid;
        else if (g.type === 'payment_in') balances[pName] -= g.amountPaid;
        else if (g.type === 'labour_charge') balances[pName] -= g.totalAmt;
        else if (g.type === 'labour_payment') balances[pName] += g.amountPaid;
        
        g.runningBalance = balances[pName];
    });

    // Sort descending for display (newest first)
    const sortedDesc = groupedList.reverse();

    sortedDesc.forEach(g => {
        const row = document.createElement('tr');
        row.className = 'invoice-row';
        
        const dateObj = new Date(g.date);
        const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
        
        let displayType = g.type;
        let badgeClass = 'badge-purchase';
        if (g.type === 'sale') {
            displayType = 'SALE';
            badgeClass = 'badge-sale';
        }
        if (g.type === 'purchase') displayType = 'PURCHASE';
        if (g.type === 'payment_out') displayType = 'PAYMENT OUT';
        if (g.type === 'payment_in') displayType = 'PAYMENT IN';
        if (g.type === 'labour_charge') {
            displayType = 'LABOUR WORK';
            badgeClass = 'badge-sale';
        }
        if (g.type === 'labour_payment') {
            displayType = 'LABOUR PAID';
            badgeClass = 'badge-purchase';
        }

        const joinedItems = g.items.length > 0 ? g.items.join(', ') : '-';

        row.innerHTML = `
            <td class="invoice-cell">
                <div class="cell-primary">${g.personName}</div>
                <div class="cell-secondary" style="font-family: monospace;">${g.txnId}</div>
            </td>
            <td class="invoice-cell">
                <div class="cell-primary" style="font-weight: 400;">${formattedDate}</div>
                <div class="cell-secondary">${g.time || '00:00 AM'}</div>
            </td>
            <td class="invoice-cell">
                <div class="type-bold"><span class="type-badge ${badgeClass}">${displayType}</span></div>
            </td>
            <td class="invoice-cell">
                <div class="cell-primary" style="font-weight: 400;">${joinedItems}</div>
            </td>
            <td class="invoice-cell">
                <div class="cell-primary" style="font-weight: 400;">${g.paymentMethod}</div>
            </td>
            <td class="invoice-cell">
                <div class="cell-primary" style="font-weight: 400;">${formatCurrency(g.totalAmt)}</div>
            </td>
            <td class="invoice-cell">
                <div class="cell-primary" style="font-weight: 400;">${formatCurrency(g.amountPaid)}</div>
            </td>
            <td class="invoice-cell">
                <div class="cell-primary" style="font-weight: 400;">${formatCurrency(g.runningBalance)}</div>
            </td>
            <td class="invoice-cell" style="width: 140px;">
                <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end;">
                    <button class="action-icon" style="background: none; border: none; color: var(--accent-color); cursor: pointer;" onclick="showEditOptionsModal('${g.txnId}')" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon" style="background: none; border: none; color: var(--text-secondary); cursor: pointer;" onclick="showPrintModal('${g.txnId}')" title="Print Options">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                    </button>
                    <button class="action-icon" style="background: none; border: none; color: #4338ca; cursor: pointer; display: flex; align-items: center;" onclick="showCopyModal('${g.txnId}')" title="Copy Invoice Image">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button class="action-icon text-red" style="background: none; border: none; color: var(--red); cursor: pointer;" onclick="deleteTransaction('${g.txnId}')" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        invoiceList.appendChild(row);
    });
};

window.deleteTransaction = (txnId) => {
    showConfirm('Delete Transaction', 'Are you sure you want to delete this invoice?', 'Delete', 'var(--red)', () => {
        transactions = transactions.filter(t => t.txnId !== txnId && t.id !== txnId);
        localStorage.setItem('transactions', JSON.stringify(transactions));
        renderInvoices(invoiceSearch.value.trim());
    });
};

invoiceSearch.addEventListener('input', (e) => {
    renderInvoices(e.target.value.trim());
});

// Initial Render
renderInvoices();

const printModal = document.getElementById('print-modal');
const printNormalBtn = document.getElementById('print-normal-btn');
const printUrduBtn = document.getElementById('print-urdu-btn');
const printFreightBtn = document.getElementById('print-freight-btn');
const printUrduFreightBtn = document.getElementById('print-urdu-freight-btn');
const printCancelBtn = document.getElementById('print-cancel-btn');
let currentPrintTxnId = null;

window.showPrintModal = (txnId) => {
    currentPrintTxnId = txnId;
    if (printModal) printModal.classList.remove('hidden');
};

if (printCancelBtn) {
    printCancelBtn.addEventListener('click', () => {
        printModal.classList.add('hidden');
        currentPrintTxnId = null;
    });
}
if (printNormalBtn) {
    printNormalBtn.addEventListener('click', () => {
        if (currentPrintTxnId) {
            window.printInvoice(currentPrintTxnId, 'normal');
            printModal.classList.add('hidden');
        }
    });
}
if (printUrduBtn) {
    printUrduBtn.addEventListener('click', () => {
        if (currentPrintTxnId) {
            window.printInvoice(currentPrintTxnId, 'urdu');
            printModal.classList.add('hidden');
        }
    });
}
if (printFreightBtn) {
    printFreightBtn.addEventListener('click', () => {
        if (currentPrintTxnId) {
            window.printInvoice(currentPrintTxnId, 'freight');
            printModal.classList.add('hidden');
        }
    });
}
if (printUrduFreightBtn) {
    printUrduFreightBtn.addEventListener('click', () => {
        if (currentPrintTxnId) {
            window.printInvoice(currentPrintTxnId, 'urdu-freight');
            printModal.classList.add('hidden');
        }
    });
}

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

window.printInvoice = (txnId, type = 'normal') => {
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

    let printIframe = document.getElementById('print-iframe');
    if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'print-iframe';
        printIframe.style.position = 'absolute';
        printIframe.style.width = '0';
        printIframe.style.height = '0';
        printIframe.style.border = 'none';
        document.body.appendChild(printIframe);
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Print Invoice - ${txnId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        ${isUrdu ? '<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap" rel="stylesheet">' : ''}
        <style>
            body { font-family: ${isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', sans-serif"}; padding: 40px; color: #333; direction: ${isUrdu ? 'rtl' : 'ltr'}; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company-info h1 { margin: 0 0 10px 0; font-size: 28px; color: #4338ca; font-family: 'Inter', sans-serif; }
            .company-info p { margin: 0; color: #666; font-family: 'Inter', sans-serif; }
            .invoice-details { text-align: ${isUrdu ? 'left' : 'right'}; }
            .invoice-details h2 { margin: 0 0 10px 0; font-size: 24px; color: #666; text-transform: uppercase; }
            .invoice-details p { margin: 5px 0; font-size: 14px; }
            .billing-info { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .bill-to h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
            .bill-to p { margin: 5px 0; font-size: 16px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { padding: 12px 10px; text-align: ${isUrdu ? 'right' : 'left'}; background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 13px; text-transform: uppercase; }
            th.right { text-align: ${isUrdu ? 'left' : 'right'}; }
            th.center { text-align: center; }
            .totals { width: 300px; margin-${isUrdu ? 'right' : 'left'}: auto; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .total-row.final { border-bottom: none; border-top: 2px solid #333; font-weight: bold; font-size: 18px; margin-top: 10px; padding-top: 15px; }
            @media print {
                body { padding: 0; }
                @page { margin: 1cm; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <h1>TrackFlow</h1>
                <p>Inventory Management System</p>
            </div>
            <div class="invoice-details">
                <h2>${invoiceType}</h2>
                <p><strong>${t.ref}</strong> ${txnId}</p>
                <p><strong>${t.date}</strong> ${dateStr} ${timeStr}</p>
            </div>
        </div>
        
        <div class="billing-info">
            <div class="bill-to">
                <h3>${t.billedTo}</h3>
                <p>${personName}</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>${t.itemDesc}</th>
                    <th class="center">${t.qty}</th>
                    ${!isFreight ? `<th class="right">${t.price}</th>` : `<th class="right">${t.freight}</th>`}
                    <th class="right">${t.total}</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="totals">
            ${totalAmt > 0 ? `
            <div class="total-row final">
                <span>${t.totalAmount}</span>
                <span>${formatCurrency(totalAmt)}</span>
            </div>
            ` : ''}
            ${amountPaid > 0 && !isFreight ? `
            <div class="total-row final">
                <span>${t.amountPaid}</span>
                <span>${formatCurrency(amountPaid)}</span>
            </div>
            ` : ''}
        </div>
        
        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 14px;">
            <p>${t.thankYou}</p>
        </div>
    </body>
    </html>
    `;
    
    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    
    setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
    }, 250);
};

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

const editOptionsModal = document.getElementById('edit-options-modal');
const editFullBtn = document.getElementById('edit-full-btn');
const editQuickBtn = document.getElementById('edit-quick-btn');
const editOptionsCancelBtn = document.getElementById('edit-options-cancel-btn');

const quickEditModal = document.getElementById('quick-edit-modal');
const quickEditForm = document.getElementById('quick-edit-form');
const quickEditId = document.getElementById('quick-edit-id');
const quickEditPerson = document.getElementById('quick-edit-person');
const quickEditDate = document.getElementById('quick-edit-date');
const quickEditAmount = document.getElementById('quick-edit-amount');
const quickEditMethod = document.getElementById('quick-edit-method');
const quickEditCancelBtn = document.getElementById('quick-edit-cancel-btn');

let currentEditTxnId = null;

window.showEditOptionsModal = (txnId) => {
    currentEditTxnId = txnId;
    if (editOptionsModal) editOptionsModal.classList.remove('hidden');
};

if (editOptionsCancelBtn) {
    editOptionsCancelBtn.addEventListener('click', () => {
        editOptionsModal.classList.add('hidden');
        currentEditTxnId = null;
    });
}

if (editFullBtn) {
    editFullBtn.addEventListener('click', () => {
        if (currentEditTxnId) {
            localStorage.setItem('editTxnId', currentEditTxnId);
            window.location.href = 'index.html';
        }
    });
}

if (editQuickBtn) {
    editQuickBtn.addEventListener('click', () => {
        editOptionsModal.classList.add('hidden');
        if (currentEditTxnId) {
            const txns = transactions.filter(t => t.txnId === currentEditTxnId || t.id === currentEditTxnId);
            if (!txns.length) return;
            
            const firstTxn = txns[0];
            quickEditId.value = currentEditTxnId;
            quickEditPerson.value = firstTxn.personName || '';
            quickEditDate.value = firstTxn.date || new Date().toISOString().split('T')[0];
            
            let amountPaid = 0;
            let method = '-';
            txns.forEach(t => {
                if (t.type.startsWith('payment') || t.type === 'labour_payment') {
                    amountPaid += (t.quantity * t.price);
                    if (t.itemName.includes('/')) {
                        method = t.itemName.split('/')[1].trim();
                    }
                }
            });
            quickEditAmount.value = amountPaid || 0;
            quickEditMethod.value = method;
            
            quickEditModal.classList.remove('hidden');
        }
    });
}

if (quickEditCancelBtn) {
    quickEditCancelBtn.addEventListener('click', () => {
        quickEditModal.classList.add('hidden');
        currentEditTxnId = null;
    });
}

if (quickEditForm) {
    quickEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const txnId = quickEditId.value;
        const newPerson = quickEditPerson.value.trim();
        const newDate = quickEditDate.value;
        const newAmount = parseFloat(quickEditAmount.value) || 0;
        const newMethod = quickEditMethod.value;
        
        transactions = transactions.filter(t => {
            if (t.txnId === txnId || t.id === txnId) {
                if (t.type.startsWith('payment') || t.type === 'labour_payment') {
                    return false; 
                }
                t.personName = newPerson;
                t.date = newDate;
            }
            return true;
        });
        
        if (newAmount > 0) {
            const txns = transactions.filter(t => t.txnId === txnId || t.id === txnId);
            if (txns.length > 0) {
                const firstTxn = txns[0];
                let paymentType = 'payment_in';
                if (firstTxn.type === 'sale') paymentType = 'payment_in';
                else if (firstTxn.type === 'purchase') paymentType = 'payment_out';
                else if (firstTxn.type === 'labour_charge') paymentType = 'labour_payment';
                
                transactions.push({
                    id: crypto.randomUUID(),
                    txnId: txnId,
                    time: firstTxn.time,
                    type: paymentType,
                    date: newDate,
                    personName: newPerson,
                    itemName: `Payment / ${newMethod}`,
                    price: newAmount,
                    quantity: 1,
                    unit: '-',
                    freight: 0
                });
            }
        }
        
        localStorage.setItem('transactions', JSON.stringify(transactions));
        renderInvoices(invoiceSearch.value.trim());
        quickEditModal.classList.add('hidden');
        currentEditTxnId = null;
    });
}

