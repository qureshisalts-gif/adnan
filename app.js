// State
let transactions = [];
let items = [];

// DOM Elements
const txnType = document.getElementById('txn-type');
const txnDate = document.getElementById('txn-date');
const txnPerson = document.getElementById('txn-person');

const itemSelect = document.getElementById('item-select');
const itemQty = document.getElementById('item-qty');
const itemRateMain = document.getElementById('item-rate-main');
const itemUnitMain = document.getElementById('item-unit-main');
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

const getUniquePersons = () => {
    const persons = [];
    const sortedAsc = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));

    sortedAsc.forEach(t => {
        if (t.personName) {
            const name = t.personName.trim();
            if (!persons.find(p => p.toLowerCase() === name.toLowerCase())) {
                persons.push(name);
            }
        }
    });

    // Also include persons defined in items
    items.forEach(item => {
        if (item.personName) {
            const name = item.personName.trim();
            if (!persons.find(p => p.toLowerCase() === name.toLowerCase())) {
                persons.push(name);
            }
        }
    });

    persons.sort((a, b) => {
        const getNum = (name) => {
            const m = name.match(/^(\d+)\s*-/);
            return m ? parseInt(m[1], 10) : 999999;
        };
        return getNum(a) - getNum(b);
    });

    return persons;
};

const resolvePersonName = (inputVal) => {
    if (!inputVal) return '';
    const val = inputVal.toLowerCase().trim();
    const persons = getUniquePersons();
    
    // 1. Exact match
    const exactMatch = persons.find(p => p.toLowerCase() === val);
    if (exactMatch) return exactMatch;

    // 2. Exact clean name match (when selected from datalist)
    const exactCleanMatches = persons.filter(p => {
        const cleanName = p.replace(/^\d+\s*-\s*/, '').trim().toLowerCase();
        return cleanName === val;
    });
    if (exactCleanMatches.length === 1) return exactCleanMatches[0];

    // 3. Exact number match (e.g. input "3" matches "3 - afzal")
    if (/^\d+$/.test(val)) {
        const numberMatches = persons.filter(p => {
            const match = p.match(/^(\d+)/);
            return match && match[1] === val;
        });
        if (numberMatches.length === 1) return numberMatches[0];
    }

    // 3. Name prefix match (e.g. input "nazir" or "n" matches "4 - nazir")
    const alphaMatches = persons.filter(p => {
        const cleanName = p.replace(/^\d+\s*-\s*/, '').trim().toLowerCase();
        return cleanName.startsWith(val);
    });
    if (alphaMatches.length === 1) return alphaMatches[0];

    // 4. Fallback substring match if exactly one match
    const subMatches = persons.filter(p => p.toLowerCase().includes(val));
    if (subMatches.length === 1) return subMatches[0];

    return inputVal;
};

const migratePersonNames = () => {
    let modified = false;
    const personsMap = new Map();

    const allPersons = [];
    transactions.forEach(t => { if (t.personName && t.personName.toLowerCase() !== 'cash customer') allPersons.push(t.personName.trim()); });
    items.forEach(i => { if (i.personName && i.personName.toLowerCase() !== 'cash customer') allPersons.push(i.personName.trim()); });

    const uniqueCleanNames = Array.from(new Set(allPersons.map(name => {
        return name.replace(/^\d+\s*-\s*/, '').toLowerCase();
    })));

    uniqueCleanNames.sort((a, b) => {
        const getNum = (cleanName) => {
            const originalName = allPersons.find(name => name.replace(/^\d+\s*-\s*/, '').toLowerCase() === cleanName);
            const match = originalName.match(/^(\d+)\s*-/);
            return match ? parseInt(match[1], 10) : 999999;
        };
        return getNum(a) - getNum(b);
    });

    let counter = 1;
    uniqueCleanNames.forEach(cleanName => {
        const originalName = allPersons.find(name => name.replace(/^\d+\s*-\s*/, '').toLowerCase() === cleanName);
        const baseName = originalName.replace(/^\d+\s*-\s*/, '');
        const formatted = `${counter} - ${baseName}`;
        personsMap.set(cleanName, formatted);
        counter++;
    });

    transactions.forEach(t => {
        if (t.personName && t.personName.toLowerCase() !== 'cash customer') {
            const cleanBase = t.personName.trim().replace(/^\d+\s*-\s*/, '').toLowerCase();
            const target = personsMap.get(cleanBase);
            if (target && t.personName !== target) {
                t.personName = target;
                modified = true;
            }
        }
    });

    items.forEach(i => {
        if (i.personName && i.personName.toLowerCase() !== 'cash customer') {
            const cleanBase = i.personName.trim().replace(/^\d+\s*-\s*/, '').toLowerCase();
            const target = personsMap.get(cleanBase);
            if (target && i.personName !== target) {
                i.personName = target;
                modified = true;
            }
        }
    });

    if (modified) {
        if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
        if (window.syncItemsToCloud) window.syncItemsToCloud(items);
    }
};

const attachCustomAutocomplete = (inputEl) => {
    inputEl.removeAttribute('list');

    if (inputEl._autocompleteAttached) return;
    
    let wrapper = inputEl.parentNode;
    if (wrapper.style.position !== 'relative' && wrapper.style.position !== 'absolute') {
        wrapper.style.position = 'relative';
    }

    let listEl = inputEl.nextElementSibling;
    if (!listEl || !listEl.classList.contains('custom-autocomplete-list')) {
        listEl = document.createElement('ul');
        listEl.className = 'custom-autocomplete-list';
        listEl.style.position = 'absolute';
        listEl.style.top = '100%';
        listEl.style.left = '0';
        listEl.style.right = '0';
        listEl.style.backgroundColor = 'white';
        listEl.style.border = '1px solid #ddd';
        listEl.style.borderRadius = '4px';
        listEl.style.maxHeight = '200px';
        listEl.style.overflowY = 'auto';
        listEl.style.zIndex = '1000';
        listEl.style.listStyle = 'none';
        listEl.style.padding = '0';
        listEl.style.margin = '4px 0 0 0';
        listEl.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        listEl.style.display = 'none';
        
        inputEl.parentNode.insertBefore(listEl, inputEl.nextSibling);
    }

    const renderList = () => {
        const persons = getUniquePersons();
        const val = inputEl.value.toLowerCase().trim();
        const isAlpha = val.length > 0 && /^[a-z]/i.test(val);

        listEl.innerHTML = '';
        
        let matches = persons.filter(p => {
            if (!val) return true;
            const cleanName = p.replace(/^\d+\s*-\s*/, '').trim().toLowerCase();
            
            if (isAlpha) {
                return cleanName.startsWith(val);
            } else {
                return p.toLowerCase().startsWith(val);
            }
        });

        if (matches.length === 0) {
            listEl.style.display = 'none';
            return;
        }

        const added = new Set();
        matches.forEach(name => {
            const cleanName = name.replace(/^\d+\s*-\s*/, '').trim();
            const displayValue = isAlpha ? cleanName : name;

            if (!added.has(displayValue)) {
                added.add(displayValue);
                const li = document.createElement('li');
                li.textContent = displayValue;
                li.style.padding = '8px 12px';
                li.style.cursor = 'pointer';
                li.style.borderBottom = '1px solid #eee';
                li.style.fontSize = '14px';
                li.style.color = '#333';

                li.addEventListener('mouseover', () => li.style.backgroundColor = '#f3f4f6');
                li.addEventListener('mouseout', () => li.style.backgroundColor = 'transparent');

                li.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    inputEl.value = displayValue;
                    listEl.style.display = 'none';
                    inputEl.dispatchEvent(new Event('change'));
                    inputEl.dispatchEvent(new Event('input'));
                });

                listEl.appendChild(li);
            }
        });
        
        listEl.style.display = 'block';
    };

    inputEl.addEventListener('focus', renderList);
    inputEl.addEventListener('input', renderList);
    inputEl.addEventListener('blur', () => {
        setTimeout(() => listEl.style.display = 'none', 150);
    });
    
    inputEl._autocompleteAttached = true;
};

const initPersonDatalist = () => {
    if (txnPerson) attachCustomAutocomplete(txnPerson);
    const legerPerson = document.getElementById('leger-person');
    if (legerPerson) attachCustomAutocomplete(legerPerson);
};

const attachItemAutocomplete = (itemSearchEl, itemSelectEl) => {
    let wrapper = itemSearchEl.parentNode;
    if (wrapper.style.position !== 'relative' && wrapper.style.position !== 'absolute') {
        wrapper.style.position = 'relative';
    }

    let listEl = itemSearchEl.nextElementSibling;
    if (!listEl || !listEl.classList.contains('custom-autocomplete-list')) {
        listEl = document.createElement('ul');
        listEl.className = 'custom-autocomplete-list';
        listEl.style.position = 'absolute';
        listEl.style.top = '100%';
        listEl.style.left = '0';
        listEl.style.right = '0';
        listEl.style.backgroundColor = 'white';
        listEl.style.border = '1px solid #ddd';
        listEl.style.borderRadius = '4px';
        listEl.style.maxHeight = '200px';
        listEl.style.overflowY = 'auto';
        listEl.style.zIndex = '1000';
        listEl.style.listStyle = 'none';
        listEl.style.padding = '0';
        listEl.style.margin = '4px 0 0 0';
        listEl.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        listEl.style.display = 'none';
        
        itemSearchEl.parentNode.insertBefore(listEl, itemSearchEl.nextSibling);
    }

    const renderList = () => {
        const val = itemSearchEl.value.toLowerCase().trim();
        const isAlpha = val.length > 0 && /^[a-z]/i.test(val);
        listEl.innerHTML = '';
        
        const options = Array.from(itemSelectEl.options).filter(opt => opt.value !== "");
        
        let matches = options.filter(opt => {
            if (!val) return true;
            const itemName = (opt.getAttribute('data-name') || '').toLowerCase();
            
            if (isAlpha) {
                return itemName.startsWith(val);
            } else {
                return opt.textContent.toLowerCase().startsWith(val);
            }
        });

        if (matches.length === 0) {
            listEl.style.display = 'none';
            return;
        }

        matches.forEach(opt => {
            const li = document.createElement('li');
            li.textContent = opt.textContent;
            li.style.padding = '8px 12px';
            li.style.cursor = 'pointer';
            li.style.borderBottom = '1px solid #eee';
            li.style.fontSize = '14px';
            li.style.color = '#333';

            li.addEventListener('mouseover', () => li.style.backgroundColor = '#f3f4f6');
            li.addEventListener('mouseout', () => li.style.backgroundColor = 'transparent');

            li.addEventListener('mousedown', (e) => {
                e.preventDefault();
                itemSelectEl.value = opt.value;
                itemSearchEl.value = opt.textContent;
                listEl.style.display = 'none';
                itemSelectEl.dispatchEvent(new Event('change'));
            });

            listEl.appendChild(li);
        });
        
        listEl.style.display = 'block';
    };

    itemSearchEl.addEventListener('focus', () => {
        itemSearchEl.value = '';
        renderList();
    });
    itemSearchEl.addEventListener('input', renderList);
    itemSearchEl.addEventListener('blur', () => {
        setTimeout(() => {
            listEl.style.display = 'none';
            if (itemSelectEl.selectedIndex >= 0) {
                itemSearchEl.value = itemSelectEl.options[itemSelectEl.selectedIndex].textContent;
            }
        }, 150);
    });

    itemSelectEl.addEventListener('change', () => {
        if (itemSelectEl.selectedIndex >= 0) {
            itemSearchEl.value = itemSelectEl.options[itemSelectEl.selectedIndex].textContent;
        }
    });
};

// Initialize / Update Items Dropdown (Supports multiple items per person!)
const updateItemsDropdown = (selectedPerson = '') => {
    if (!itemSelect) return;

    const searchStr = (selectedPerson || '').trim().toLowerCase();
    const cleanSearchStr = searchStr.replace(/^\d+\s*-\s*/, '').trim();
    const prevSelectedId = itemSelect.value;

    itemSelect.innerHTML = '<option value="">Select an item...</option>';

    let personItems = [];
    let otherItems = [];

    items.forEach(item => {
        const rawPerson = (item.personName || '').trim().toLowerCase();
        const cleanPerson = rawPerson.replace(/^\d+\s*-\s*/, '').trim();

        const isMatch = searchStr && (
            rawPerson === searchStr ||
            rawPerson.startsWith(`${searchStr} -`) ||
            cleanPerson === cleanSearchStr
        );

        if (isMatch) {
            personItems.push(item);
        } else {
            otherItems.push(item);
        }
    });

    if (searchStr && personItems.length > 0) {
        const personGroup = document.createElement('optgroup');
        personGroup.label = `Items for ${selectedPerson}`;
        personItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.unit || 'Kg'}) - Rs. ${item.rate}`;
            option.setAttribute('data-rate', item.rate);
            option.setAttribute('data-name', item.name);
            option.setAttribute('data-unit', item.unit || 'Kg');
            option.setAttribute('data-person', (item.personName || '').toLowerCase());
            personGroup.appendChild(option);
        });
        itemSelect.appendChild(personGroup);

        // Removed 'All Other Items' group per user request

        // Auto-select the first item belonging to this person if previous selection not among person's items
        const prevMatch = personItems.find(i => i.id === prevSelectedId);
        if (prevMatch) {
            itemSelect.value = prevMatch.id;
        } else {
            itemSelect.value = personItems[0].id;
        }
        itemSelect.dispatchEvent(new Event('change'));
    } else {
        let globalIndex = 1;
        items.forEach(item => {
            if (item.personName) return; // Only show simple/global items when no person is matched

            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${globalIndex} - ${item.name} (${item.unit || 'Kg'}) - Rs. ${item.rate}`;
            option.setAttribute('data-rate', item.rate);
            option.setAttribute('data-name', item.name);
            option.setAttribute('data-unit', item.unit || 'Kg');
            option.setAttribute('data-person', '');
            itemSelect.appendChild(option);
            globalIndex++;
        });

        if (prevSelectedId) {
            itemSelect.value = prevSelectedId;
            itemSelect.dispatchEvent(new Event('change'));
        }
    }
};

const initItemsDropdown = () => {
    updateItemsDropdown(txnPerson ? txnPerson.value : '');
    const itemSearch = document.getElementById('item-search');
    if (itemSearch && itemSelect) {
        attachItemAutocomplete(itemSearch, itemSelect);
    }
};

// ----- NEW CART SYSTEM -----
let currentCart = [];

const calculateItemStock = (itemName, personName = null) => {
    let stockIn = 0;
    let stockOut = 0;
    transactions.forEach(t => {
        if (t.itemName === itemName) {
            if (personName) {
                const tPerson = (t.personName || '').replace(/^\d+\s*-\s*/, '').toLowerCase();
                const iPerson = personName.replace(/^\d+\s*-\s*/, '').toLowerCase();
                if (tPerson !== iPerson) return;
            }
            let qtyInKg = t.quantity;
            const u = (t.unit || '').toLowerCase();
            if (u === 'mun' || u === 'bag (40kg)') qtyInKg = t.quantity * 40;
            else if (u === 'bag (50kg)') qtyInKg = t.quantity * 50;

            if (t.type === 'purchase') stockIn += qtyInKg;
            else if (t.type === 'sale') stockOut += qtyInKg;
        }
    });
    return { stockIn, stockOut, currentStock: stockIn - stockOut };
};

const renderStockSummary = (itemName, personName = null) => {
    if (!itemName) {
        stockSummaryList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; font-size: 0.9rem; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">Search for an item or person to view stock summary</td></tr>`;
        return;
    }
    const { stockIn, stockOut, currentStock } = calculateItemStock(itemName, personName);
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
        let runningTotal = 0;
        currentCart.forEach(item => {
            const amount = (item.qty * item.rate) + item.freight;
            itemsTotal += amount;
            runningTotal += amount;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${item.itemName}</span>
                        <span style="color: var(--text-secondary); font-size: 0.9em;">${formatCurrency(item.rate)}</span>
                    </div>
                    ${item.freight > 0 ? `<div style="font-size: 0.8em; color: var(--text-secondary); margin-top: 4px;">+ Freight: ${formatCurrency(item.freight)}</div>` : ''}
                </td>
                <td>${item.qty} ${item.unit}</td>
                <td>${formatCurrency(amount)}</td>
                <td>${formatCurrency(runningTotal)}</td>
                <td style="display: flex; gap: 8px;">
                    <button class="icon-btn text-blue" onclick="editCartItem('${item.id}')" title="Edit Item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn text-red" onclick="removeFromCart('${item.id}')" title="Remove Item">
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

window.editCartItem = (id) => {
    const item = currentCart.find(i => i.id === id);
    if (!item) return;

    if (item.itemName === 'Freight Charges') {
        freightChargesInput.value = item.rate;
    } else {
        // Select item in dropdown
        for (let i = 0; i < itemSelect.options.length; i++) {
            if (itemSelect.options[i].getAttribute('data-name') === item.itemName) {
                itemSelect.selectedIndex = i;
                break;
            }
        }
        itemQty.value = item.qty;
        itemRateMain.value = item.rate;
        if (itemUnitMain) itemUnitMain.value = item.unit;
        if (item.freight > 0) freightChargesInput.value = item.freight;
    }

    removeFromCart(id);
    updateItemTotals();
};


// Update Item Totals (Live Calculation)
const updateItemTotals = () => {
    const qty = parseFloat(itemQty.value) || 0;
    const freight = parseFloat(freightChargesInput.value) || 0;

    let rate = parseFloat(itemRateMain.value) || 0;
    let unit = itemUnitMain ? itemUnitMain.value : 'Kg';

    let name = '';
    let personName = '';
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
        name = selectedOption.getAttribute('data-name');
        personName = selectedOption.getAttribute('data-person');
    }

    renderStockSummary(name, personName);

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

itemSelect.addEventListener('change', () => {
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    if (selectedOption.value) {
        let dr = selectedOption.getAttribute('data-rate');
        itemRateMain.value = (dr === '0' || !dr) ? '' : dr;
        if (itemUnitMain) itemUnitMain.value = selectedOption.getAttribute('data-unit') || 'Kg';
    } else {
        itemRateMain.value = '';
        if (itemUnitMain) itemUnitMain.value = 'Kg';
    }
    updateItemTotals();
});
itemQty.addEventListener('input', updateItemTotals);
itemRateMain.addEventListener('input', updateItemTotals);
freightChargesInput.addEventListener('input', updateItemTotals);
finAmountPaid.addEventListener('input', updateRemainingBalance);

finPaymentMethod.addEventListener('change', () => {
    const container = document.getElementById('bank-name-container');
    if (finPaymentMethod.value === 'Bank') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        const finBankName = document.getElementById('fin-bank-name');
        if (finBankName) finBankName.value = '';
    }
});

const calculatePersonBalance = (personName) => {
    if (!personName) return 0;

    const searchStr = personName.trim().toLowerCase();
    const cleanSearchStr = searchStr.replace(/^\d+\s*-\s*/, '').trim();
    const sortedAsc = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));

    let bal = 0;
    sortedAsc.forEach(t => {
        const rawName = (t.personName || '').trim().toLowerCase();
        const cleanName = rawName.replace(/^\d+\s*-\s*/, '').trim();

        const isMatch = searchStr && (
            rawName === searchStr ||
            rawName.startsWith(`${searchStr} -`) ||
            cleanName === cleanSearchStr
        );

        if (isMatch) {
            // Exclude the transaction currently being edited to avoid double counting
            if (window.currentEditTxnId && (t.txnId === window.currentEditTxnId || t.id === window.currentEditTxnId)) {
                return;
            }
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



// Render Person History
const renderHistory = (filterText = '') => {
    if (!filterText) {
        historySection.classList.add('hidden');
        return;
    }

    historySection.classList.remove('hidden');
    historyPersonName.textContent = filterText;
    historyList.innerHTML = '';

    const searchStr = filterText.trim().toLowerCase();
    const cleanSearchStr = searchStr.replace(/^\d+\s*-\s*/, '').trim();

    const filteredTransactions = transactions.filter(t => {
        const name = (t.personName || '').trim().toLowerCase();
        const cleanName = name.replace(/^\d+\s*-\s*/, '').trim();
        const isAutoPayment = t.itemName && t.itemName.startsWith('Payment /');

        const isMatch = searchStr && (
            name === searchStr ||
            name.startsWith(`${searchStr} -`) ||
            cleanName === cleanSearchStr
        );

        // Hide zero-amount payments (used only to store payment method for sales)
        if (t.type.startsWith('payment') && t.price === 0) {
            return false;
        }

        return isMatch;
    });

    if (filteredTransactions.length === 0) {
        historyEmptyState.classList.remove('hidden');
        historyList.parentElement.classList.add('hidden');
    } else {
        historyEmptyState.classList.add('hidden');
        historyList.parentElement.classList.remove('hidden');

        const sortedTransactionsAsc = [...filteredTransactions].sort((a, b) => {
            const isAPrev = a.itemName === 'Previous Balance';
            const isBPrev = b.itemName === 'Previous Balance';
            if (isAPrev && !isBPrev) return -1;
            if (!isAPrev && isBPrev) return 1;
            return new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id);
        });

        let currentBalance = 0;
        sortedTransactionsAsc.forEach(t => {
            const total = (t.quantity * t.price) + (parseFloat(t.freight) || 0);
            if (t.type === 'sale') currentBalance += total;
            else if (t.type === 'purchase') currentBalance -= total;
            else if (t.type === 'payment_out') currentBalance += total;
            else if (t.type === 'payment_in') currentBalance -= total;
            else if (t.type === 'labour_charge') currentBalance -= total;
            else if (t.type === 'labour_payment') currentBalance += total;

            t._runningBalance = currentBalance;
        });

        const seenTxnIds = new Set();

        sortedTransactionsAsc.forEach(t => {
            const row = document.createElement('tr');
            const total = t.quantity * t.price;
            const badgeClass = t.type === 'sale' ? 'badge-sale' : 'badge-purchase';
            let displayType = t.type;
            if (t.itemName === 'Previous Balance') {
                displayType = 'leger payment';
            }

            let displayQty = `${t.quantity} <span style="font-size: 0.85em; color: var(--text-secondary);" data-i18n="${(t.unit || 'Kg').replace(/ /g, '_').replace(/[()]/g, '').toLowerCase()}">${t.unit || 'Kg'}</span>`;
            let displayRate = formatCurrency(t.price);
            let displayPayment = '-';
            let displayAmount = formatCurrency(total);
            let displayLegerPayment = '-';

            if (displayType === 'leger payment') {
                displayQty = '-';
                displayRate = '-';
                displayLegerPayment = formatCurrency(total);
                displayPayment = '-';
                displayAmount = '-';
            } else if (t.type === 'payment_in' || t.type === 'payment_out' || t.itemName?.startsWith('Payment /')) {
                displayQty = '-';
                displayRate = '-';
                displayPayment = formatCurrency(total);
                displayAmount = '-';
            }

            row.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="history-row-checkbox" checked style="cursor:pointer;"></td>
                <td>${new Date(t.date).toLocaleDateString('en-GB')}</td>
                <td><span class="type-badge ${badgeClass}" data-i18n="${displayType.replace(' ', '_')}">${displayType}</span></td>
                <td>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        ${t.itemName === 'Previous Balance' 
                            ? '<span data-i18n="prev_balance">Previous Balance</span>'
                            : t.itemName.startsWith('Payment /') 
                                ? `<span data-i18n="payment_slash">Payment / </span><span data-i18n="${t.itemName.split('/')[1].trim().toLowerCase()}">${t.itemName.split('/')[1].trim()}</span>` 
                                : `<span data-i18n="${t.itemName.replace(/ /g, '_').toLowerCase()}">${t.itemName}</span>`}
                        ${displayRate !== '-' ? `<span style="color: var(--text-secondary); font-size: 0.9em;">${displayRate}</span>` : ''}
                    </div>
                </td>
                <td>${displayQty}</td>
                <td>${displayLegerPayment}</td>
                <td>${displayPayment}</td>
                <td>${displayAmount}</td>
                <td>${formatCurrency(t._runningBalance)}</td>
                <td class="invoice-cell" style="width: 120px;">
                <div style="display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end;">
                    <label class="delivery-toggle" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; margin: 0;">
                        <input type="checkbox" onchange="toggleHistoryDelivery('${t.txnId || t.id}', this.checked)" ${t.delivered ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        <span class="status-text ${t.delivered ? 'status-delivered' : 'status-pending'}" style="color: ${t.delivered ? 'var(--green)' : 'var(--red)'}; font-weight: 600; font-size: 0.8rem;">
                            ${t.delivered ? 'Delivered' : 'Pending'}
                        </span>
                    </label>
                    <button class="action-icon text-blue" style="background: none; border: none; color: #3b82f6; cursor: pointer;" onclick="editHistoryTransaction('${t.txnId || t.id}')" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="action-icon text-red" style="background: none; border: none; color: var(--red); cursor: pointer;" onclick="deleteHistoryTransaction('${t.txnId || t.id}')" title="Delete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>`;
            seenTxnIds.add(t.txnId);
            historyList.appendChild(row);

            if (t.freight && parseFloat(t.freight) > 0) {
                const fRow = document.createElement('tr');
                fRow.innerHTML = `
                <td style="text-align: center;"><input type="checkbox" class="history-row-checkbox" checked style="cursor:pointer;"></td>
                <td>${new Date(t.date).toLocaleDateString('en-GB')}</td>
                <td><span class="type-badge ${badgeClass}" data-i18n="${t.type.replace(' ', '_')}">${t.type}</span></td>
                <td style="color: var(--text-secondary);" data-i18n="freight_charges">Freight Charges</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>${formatCurrency(t.freight)}</td>
                <td>-</td>
                <td class="invoice-cell"></td>
                `;
                historyList.appendChild(fRow);
            }
        });
    }
};

window.editHistoryTransaction = (txnId) => {
    localStorage.setItem('editTxnId', txnId);
    window.location.reload();
};

window.deleteHistoryTransaction = (txnId) => {
    showConfirm('Delete Invoice', 'Are you sure you want to delete this entire invoice?', 'Delete', 'var(--red)', () => {
        transactions = transactions.filter(t => t.txnId !== txnId && t.id !== txnId);
        if (window.deleteTransactionFromCloud) window.deleteTransactionFromCloud(txnId);
        renderHistory(txnPerson.value.trim());

        // Also update items totals if necessary
        updateItemTotals();
    });
};

window.toggleHistoryDelivery = (txnId, isDelivered) => {
    let changed = false;
    transactions = transactions.map(t => {
        if (t.txnId === txnId || t.id === txnId) {
            t.delivered = isDelivered;
            changed = true;
        }
        return t;
    });
    if (changed) {
        if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);
        renderHistory(txnPerson.value.trim());
    }
};

txnPerson.addEventListener('change', (e) => {
    const resolved = resolvePersonName(e.target.value);
    if (resolved !== e.target.value) {
        e.target.value = resolved;
        e.target.dispatchEvent(new Event('input'));
    }
});

txnPerson.addEventListener('input', (e) => {
    const name = e.target.value.trim();
    renderHistory(name);

    const bal = calculatePersonBalance(name);
    finPrevBalance.value = bal.toFixed(2);
    updateItemTotals();

    // Update items dropdown and filter/auto-select items assigned to this person
    updateItemsDropdown(name);
});

addToListBtn.addEventListener('click', () => {
    const selectedOption = itemSelect.options[itemSelect.selectedIndex];
    const freight = parseFloat(freightChargesInput.value) || 0;

    if (!selectedOption.value) {
        if (freight > 0) {
            currentCart.push({
                id: crypto.randomUUID(),
                itemName: 'Freight Charges',
                rate: freight,
                qty: 1,
                unit: '-',
                freight: 0
            });
            itemSelect.value = '';
            itemQty.value = '';
            if (itemRateMain) itemRateMain.value = '';
            freightChargesInput.value = '';
            renderCart();
            return;
        } else {
            showAlert('Error', 'Please select an item first or enter freight charges.');
            return;
        }
    }

    const itemName = selectedOption.getAttribute('data-name');
    const rate = parseFloat(itemRateMain.value) || 0;
    const unit = itemUnitMain ? itemUnitMain.value : (selectedOption.getAttribute('data-unit') || 'Kg');
    const qty = parseFloat(itemQty.value);

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
    itemQty.value = '';
    itemRateMain.value = '';
    if (itemUnitMain) itemUnitMain.value = 'Kg';
    freightChargesInput.value = '';
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
    let personName = txnPerson.value.trim();

    if (!personName) {
        showAlert('Error', 'Please enter a Person Name.');
        return;
    }

    const hasPrefix = /^\d+\s*-/.test(personName);
    if (!hasPrefix) {
        const persons = getUniquePersons();
        const existing = persons.find(p => p.toLowerCase().replace(/^\d+\s*-\s*/, '') === personName.toLowerCase());
        if (existing) {
            personName = existing;
        } else {
            let maxNum = 0;
            persons.forEach(p => {
                const match = p.match(/^(\d+)\s*-/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            });
            personName = `${maxNum + 1} - ${personName}`;
        }
    }
    txnPerson.value = personName;

    const amountPaid = parseFloat(finAmountPaid.value) || 0;
    let paymentMethod = finPaymentMethod.value;
    if (paymentMethod === 'Bank') {
        const finBankName = document.getElementById('fin-bank-name');
        if (finBankName && finBankName.value.trim()) {
            paymentMethod = `Bank (${finBankName.value.trim()})`;
        }
    }

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

    // 2. If Amount Paid > 0 or a Payment Method is selected, record a Payment
    if (amountPaid > 0 || paymentMethod !== '-') {
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

    if (window.syncTransactionsToCloud) window.syncTransactionsToCloud(transactions);

    // Reset Form
    currentCart = [];
    renderCart();

    if (txnDate._flatpickr) {
        txnDate._flatpickr.setDate(new Date());
    } else {
        txnDate.value = new Date().toISOString().split('T')[0];
    }
    if (itemSelect) {
        itemSelect.value = '';
        itemSelect.dispatchEvent(new Event('change'));
    }
    if (itemQty) itemQty.value = '';
    if (itemRateMain) itemRateMain.value = '';
    if (freightChargesInput) freightChargesInput.value = '';

    finAmountPaid.value = '';
    finPaymentMethod.value = '-';
    const finBankName = document.getElementById('fin-bank-name');
    if (finBankName) finBankName.value = '';
    const finBankNameContainer = document.getElementById('bank-name-container');
    if (finBankNameContainer) finBankNameContainer.style.display = 'none';

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
    initPersonDatalist(); // update dropdown
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

function getUrduItemName(itemName, isUrdu) {
    if (!itemName) return '-';
    if (!isUrdu) return itemName;
    try {
        let cleanName = String(itemName).trim();
        cleanName = cleanName.replace(/^\d+\s*-\s*/, ''); // strip prefix just in case
        const key = cleanName.replace(/\s+/g, '_').toLowerCase();
        
        const dict = (typeof window.translations !== 'undefined' && window.translations.ur) 
            ? window.translations.ur 
            : ((typeof translations !== 'undefined' && translations.ur) ? translations.ur : null);
            
        if (dict) {
            if (dict[key]) return dict[key];
            
            const relaxedKey = cleanName.replace(/[^a-z0-9]/gi, '').toLowerCase();
            for (let k in dict) {
                if (k.replace(/[^a-z0-9]/gi, '').toLowerCase() === relaxedKey) {
                    return dict[k];
                }
            }
        }
    } catch(e) {}
    return itemName;
};

window.copyInvoiceImage = async (txnId, type = 'normal') => {
    const txns = transactions.filter(t => t.txnId === txnId || t.id === txnId);
    if (!txns.length) return;

    const firstTxn = txns[0];
    const dateObj = new Date(firstTxn.date);
    const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
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
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${getUrduItemName(t.itemName, isUrdu)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${qty} <span style="font-size: 0.85em; color: #666;">${t.unit || 'Kg'}</span></td>
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
                    <h1 style="margin: 0 0 10px 0; font-size: 28px; color: #4338ca; font-family: ${isUrdu ? "'Noto Nastaliq Urdu', serif" : "'Inter', sans-serif"};">${isUrdu ? 'قریشی سالٹس' : 'Qureshi Salts'}</h1>
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
                    <p style="margin: 5px 0; font-size: 16px; font-weight: 600;">${getUrduItemName(personName, isUrdu)}</p>
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
migratePersonNames();
initItemsDropdown();
initPersonDatalist();

const editTxnId = localStorage.getItem('editTxnId');
if (editTxnId) {
    const editTxns = transactions.filter(t => t.txnId === editTxnId || t.id === editTxnId);
    if (editTxns.length > 0) {
        const firstTxn = editTxns.find(t => !t.type.includes('payment')) || editTxns[0];

        txnType.value = (firstTxn.type.includes('payment')) ? 'sale' : firstTxn.type;
        txnDate.value = firstTxn.date;
        txnPerson.value = firstTxn.personName || '';
        updateItemsDropdown(firstTxn.personName || '');

        editTxns.forEach(t => {
            if (t.type.startsWith('payment') || t.type === 'labour_payment') {
                finAmountPaid.value = t.price;
                if (t.itemName.includes('/')) {
                    const methodString = t.itemName.split('/')[1].trim();
                    if (methodString.startsWith('Bank (')) {
                        finPaymentMethod.value = 'Bank';
                        const bankName = methodString.replace('Bank (', '').replace(')', '').trim();
                        const finBankName = document.getElementById('fin-bank-name');
                        if (finBankName) finBankName.value = bankName;
                        const container = document.getElementById('bank-name-container');
                        if (container) container.style.display = 'block';
                    } else {
                        finPaymentMethod.value = methodString;
                        const container = document.getElementById('bank-name-container');
                        if (container) container.style.display = 'none';
                    }
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

migratePersonNames();
updateItemTotals();
renderCart();

if (window.fetchDataFromCloudAndRender) {
    const renderCallback = () => {
        transactions = window.cloudTransactions || [];
        items = window.cloudItems || [];

        migratePersonNames();

        updateItemTotals();
        renderCart();
        
        if (typeof txnPerson !== 'undefined' && txnPerson) {
            renderHistory(txnPerson.value.trim());
            initPersonDatalist();
        }
    };

    window.fetchDataFromCloudAndRender(renderCallback);
    
    if (window.setupRealtimeSync) {
        window.setupRealtimeSync(renderCallback);
    }
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
const legerDate = document.getElementById('leger-date');

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

    const updateBalanceOnInput = () => {
        const name = legerPerson.value.trim();
        if (!name) {
            legerCurrentBalance.value = '';
            legerNewBalance.value = '';
            legerAmount.value = '0';
            return;
        }
        const currentBal = calculatePersonBalance(name);
        legerCurrentBalance.value = currentBal.toFixed(2);
        updateNewBalance();
    };

    const onPersonChange = () => {
        const resolved = resolvePersonName(legerPerson.value);
        if (resolved !== legerPerson.value) {
            legerPerson.value = resolved;
        }
        updateBalanceOnInput();
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

    legerPerson.addEventListener('input', updateBalanceOnInput);
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
        if (legerDate) legerDate.value = new Date().toISOString().split('T')[0];
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
        const selectedDate = (legerDate && legerDate.value) ? legerDate.value : new Date().toISOString().split('T')[0];

        if (!name) return;

        const trueBal = calculatePersonBalance(name);
        const adjustment = enteredCurrentBal - trueBal;

        let hasChanges = false;

        if (Math.abs(adjustment) > 0.001) {
            const adjTxn = {
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                txnId: 'TXN-' + Date.now(),
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                date: selectedDate,
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
                date: selectedDate,
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

            if (typeof renderHistory === 'function' && typeof txnPerson !== 'undefined' && txnPerson) renderHistory(txnPerson.value.trim());
            if (typeof updateItemTotals === 'function') updateItemTotals();
        }

        legerModal.classList.add('hidden');
    });
}

// Download Statement Logic
const downloadStatementBtn = document.getElementById('download-statement-btn');
if (downloadStatementBtn) {
    downloadStatementBtn.addEventListener('click', () => {
        const personName = document.getElementById('history-person-name').textContent;
        let printIframe = document.getElementById('print-statement-iframe');
        if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'print-statement-iframe';
            printIframe.style.position = 'absolute';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = 'none';
            document.body.appendChild(printIframe);
        }

        const allRows = document.querySelectorAll('#history-list tr');
        allRows.forEach(row => {
            const cb = row.querySelector('.history-row-checkbox');
            if (cb && !cb.checked) {
                row.dataset.originalDisplay = row.style.display || '';
                row.style.display = 'none';
            }
        });

        const tableHtml = document.querySelector('#person-history-section .table-container').innerHTML;

        allRows.forEach(row => {
            const cb = row.querySelector('.history-row-checkbox');
            if (cb && !cb.checked) {
                row.style.display = row.dataset.originalDisplay || '';
            }
        });

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Statement - ${personName}</title>
    <style>
        body { font-family: sans-serif; padding: 20px; color: #333; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #555; }
        td:first-child, th:first-child { display: none !important; } /* Hide Checkbox column */
        @media print {
            body { padding: 0; margin: 1cm; }
            .action-icon, button, svg { display: none !important; }
            td:last-child, th:last-child { display: none !important; } /* Hide Actions column */
        }
    </style>
</head>
<body>
    <h2>Statement for: ${personName}</h2>
    ${tableHtml}
</body>
</html>`;

        const doc = printIframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        }, 500);
    });
}

const handleExportStatement = async (actionType, targetLang) => {
    const originalLang = window.currentLang;
    
    // Temporarily switch language if needed to translate headers
    if (originalLang !== targetLang) {
        window.currentLang = targetLang;
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }
    
    const personName = document.getElementById('history-person-name').textContent;
    
    const allRows = document.querySelectorAll('#history-list tr');
    allRows.forEach(row => {
        const cb = row.querySelector('.history-row-checkbox');
        if (cb && !cb.checked) {
            row.dataset.originalDisplay = row.style.display || '';
            row.style.display = 'none';
        }
    });

    const tableHtml = document.querySelector('#person-history-section .table-container').innerHTML;

    allRows.forEach(row => {
        const cb = row.querySelector('.history-row-checkbox');
        if (cb && !cb.checked) {
            row.style.display = row.dataset.originalDisplay || '';
        }
    });

    if (originalLang !== targetLang) {
        window.currentLang = originalLang;
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    if (actionType === 'download') {
        let printIframe = document.getElementById('print-statement-iframe');
        if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'print-statement-iframe';
            printIframe.style.position = 'absolute';
            printIframe.style.width = '0';
            printIframe.style.height = '0';
            printIframe.style.border = 'none';
            document.body.appendChild(printIframe);
        }
        
        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Statement - ${personName}</title>
    <style>
        body { font-family: sans-serif; padding: 20px; color: #333; direction: ${targetLang === 'ur' ? 'rtl' : 'ltr'}; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #555; }
        td:first-child, th:first-child { display: none !important; }
        @media print {
            body { padding: 0; margin: 1cm; }
            .action-icon, button, svg { display: none !important; }
            td:last-child, th:last-child { display: none !important; }
        }
    </style>
</head>
<body>
    <h2>${targetLang === 'ur' ? getUrduItemName(personName, true) + ' کی تاریخ' : 'Statement for: ' + personName}</h2>
    ${tableHtml}
</body>
</html>`;
        const doc = printIframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
        }, 500);
    } else if (actionType === 'copy') {
        const copyDiv = document.createElement('div');
        copyDiv.style.position = 'absolute';
        copyDiv.style.left = '-9999px';
        copyDiv.style.top = '0';
        copyDiv.style.width = '800px';
        copyDiv.style.backgroundColor = '#ffffff';
        copyDiv.style.padding = '30px';
        copyDiv.style.color = '#333';
        copyDiv.style.fontFamily = 'sans-serif';
        copyDiv.style.direction = targetLang === 'ur' ? 'rtl' : 'ltr';
        document.body.appendChild(copyDiv);

        const html = `
        <div style="background-color: #ffffff; padding: 20px; direction: ${targetLang === 'ur' ? 'rtl' : 'ltr'};">
            <h2 style="text-align: center; margin-bottom: 20px; color: #333; font-size: 24px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">${targetLang === 'ur' ? getUrduItemName(personName, true) + ' کی تاریخ' : 'Statement for: ' + personName}</h2>
            <style>
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; color: #333; }
                th, td { padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: left; }
                th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; font-size: 12px; color: #555; }
                td:last-child, th:last-child { display: none !important; }
                td:first-child, th:first-child { display: none !important; }
                .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
                .bg-green-100 { background-color: #dcfce7; color: #166534; }
                .bg-red-100 { background-color: #fee2e2; color: #991b1b; }
            </style>
            ${tableHtml}
        </div>`;

        copyDiv.innerHTML = html;

        if (typeof html2canvas === 'undefined') {
            showAlert('Error', 'html2canvas library is not loaded. Cannot copy image.');
            document.body.removeChild(copyDiv);
        } else {
            try {
                const canvas = await html2canvas(copyDiv, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        showAlert('Error', 'Failed to generate image blob.');
                        document.body.removeChild(copyDiv);
                    } else {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            if (typeof showAlert !== 'undefined') showAlert('Success', 'Statement image copied to clipboard!');
                            else alert('Statement image copied to clipboard!');
                        } catch (err) {
                            console.error('Failed to copy image: ', err);
                            if (typeof showAlert !== 'undefined') showAlert('Error', 'Failed to copy image to clipboard.');
                            else alert('Failed to copy image to clipboard.');
                        } finally {
                            document.body.removeChild(copyDiv);
                        }
                    }
                }, 'image/png');
            } catch (err) {
                console.error('Error with html2canvas:', err);
                if (typeof showAlert !== 'undefined') showAlert('Error', 'Error generating image.');
                else alert('Error generating image.');
                document.body.removeChild(copyDiv);
            }
        }
    }
    
    // Switch back
    if (originalLang !== targetLang) {
        window.currentLang = originalLang;
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }
};

const setupExportBtn = (id, action, lang) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => handleExportStatement(action, lang));
};

setupExportBtn('copy-statement-en-btn', 'copy', 'en');
setupExportBtn('copy-statement-ur-btn', 'copy', 'ur');
setupExportBtn('download-statement-en-btn', 'download', 'en');
setupExportBtn('download-statement-ur-btn', 'download', 'ur');

document.addEventListener('change', (e) => {
    if (e.target.id === 'select-all-history') {
        const isChecked = e.target.checked;
        const checkboxes = document.querySelectorAll('.history-row-checkbox');
        checkboxes.forEach(cb => cb.checked = isChecked);
    }
});
