const translations = {
    en: {
        "nav_admin": "Admin Panel",
        "nav_invoices": "Invoices",
        "nav_back": "Back to main panal",
        "nav_tracker": "Back to Tracker",
        "btn_urdu": "اردو",
        "dash_title": "Business Dashboard",
        "add_new_item": "Add New Item",
        "item_name": "Item Name",
        "item_placeholder": "e.g. Rice, Wheat...",
        "rate": "Rate (Price)",
        "unit": "Unit",
        "btn_add_item": "Add Item",
        "stock_overview": "Stock Overview",
        "search_items": "Search items...",
        "th_item": "Item",
        "th_rate": "Rate",
        "th_unit": "Unit",
        "th_stockin": "Stock In",
        "th_stockout": "Stock Out",
        "th_currentstock": "Current Stock",
        "th_action": "Action",
        "no_items": "No items found.",
        "edit_item": "Edit Item",
        "rate_pkr": "Rate (PKR)",
        "save_changes": "Save Changes",
        "txn_details": "Transaction Details",
        "txn_type": "Type",
        "sale": "Sale",
        "purchase": "Purchase",
        "date": "Date",
        "person_name": "Person Name",
        "person_placeholder": "e.g. John Doe",
        "history_for": "History for:",
        "th_date": "Date",
        "th_type": "Type",
        "th_qty": "Qty",
        "th_total": "Total",
        "th_balance": "Balance",
        "no_past_txns": "No past transactions found for this person.",
        "select_item": "Select an item...",
        "quantity": "Quantity",
        "financials": "Financials",
        "items_total": "Items Total",
        "prev_balance": "Previous Balance",
        "grand_total": "Grand Total Amount",
        "amount_paid": "Amount Paid",
        "payment_method": "Payment Method",
        "cash": "Cash",
        "bank": "Bank Transfer",
        "cheque": "Cheque",
        "remaining_balance": "Remaining Balance",
        "save_txn": "Save Transaction",
        "txn_ledger": "Transaction Ledger",
        "search_person": "Search Person Name...",
        "dialog_notice": "Notice",
        "dialog_cancel": "Cancel",
        "dialog_ok": "OK",
        "th_person": "Person Name",
        "th_pay_method": "Payment Method",
        "th_total_amt": "Total Amt",
        "th_amt_paid": "Amount Paid",
        "th_remaining": "Remaining",
        "th_actions": "Actions",
        "page_invoices": "Invoices",
        "delivery_checklist": "Delivery Checklist",
        "status": "Delivery Status"
    },
    ur: {
        "nav_admin": "ایڈمن پینل",
        "nav_invoices": "رسیدیں",
        "nav_back": "مین پینل پر واپس",
        "nav_tracker": "ٹریکر پر واپس",
        "btn_urdu": "EN",
        "dash_title": "بزنس ڈیش بورڈ",
        "add_new_item": "نیا آئٹم شامل کریں",
        "item_name": "آئٹم کا نام",
        "item_placeholder": "مثلا چاول، گندم...",
        "rate": "قیمت",
        "unit": "یونٹ",
        "btn_add_item": "آئٹم شامل کریں",
        "stock_overview": "اسٹاک کا جائزہ",
        "search_items": "آئٹمز تلاش کریں...",
        "th_item": "آئٹم",
        "th_rate": "قیمت",
        "th_unit": "یونٹ",
        "th_stockin": "اسٹاک ان",
        "th_stockout": "اسٹاک آؤٹ",
        "th_currentstock": "موجودہ اسٹاک",
        "th_action": "عمل",
        "no_items": "کوئی آئٹم نہیں ملا۔",
        "edit_item": "ترمیم کریں",
        "rate_pkr": "قیمت",
        "save_changes": "محفوظ کریں",
        "txn_details": "لین دین کی تفصیلات",
        "txn_type": "قسم",
        "sale": "فروخت",
        "purchase": "خریداری",
        "date": "تاریخ",
        "person_name": "شخص کا نام",
        "person_placeholder": "مثلا علی",
        "history_for": "کی تاریخ:",
        "th_date": "تاریخ",
        "th_type": "قسم",
        "th_qty": "مقدار",
        "th_total": "کل",
        "th_balance": "بیلنس",
        "no_past_txns": "ماضی کا کوئی لین دین نہیں ملا۔",
        "select_item": "ایک آئٹم منتخب کریں...",
        "quantity": "مقدار",
        "financials": "مالیات",
        "items_total": "آئٹمز کا کل",
        "prev_balance": "پچھلا بیلنس",
        "grand_total": "کل رقم",
        "amount_paid": "ادا شدہ رقم",
        "payment_method": "ادائیگی کا طریقہ",
        "cash": "نقد",
        "bank": "بینک",
        "cheque": "چیک",
        "remaining_balance": "بقایا رقم",
        "save_txn": "لین دین محفوظ کریں",
        "txn_ledger": "لین دین کا لیجر",
        "search_person": "شخص تلاش کریں...",
        "dialog_notice": "نوٹس",
        "dialog_cancel": "منسوخ",
        "dialog_ok": "ٹھیک ہے",
        "page_invoices": "رسیدیں",
        "delivery_checklist": "ترسیل کی فہرست",
        "status": "ترسیل کی حیثیت"
    }
};

let currentLang = localStorage.getItem('lang') || 'en';

const applyTranslations = () => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ur' ? 'rtl' : 'ltr';

    // Update simple text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = translations[currentLang][key];
            } else if (el.tagName === 'OPTION') {
                el.textContent = translations[currentLang][key];
            } else {
                // If it contains a child icon, preserve the icon
                const icon = el.querySelector('svg');
                if (icon) {
                    el.innerHTML = '';
                    el.appendChild(icon);
                    el.appendChild(document.createTextNode(' ' + translations[currentLang][key]));
                } else {
                    el.textContent = translations[currentLang][key];
                }
            }
        }
    });

    // Specific button for language toggle
    document.querySelectorAll('#lang-toggle-btn').forEach(btn => {
        btn.textContent = translations[currentLang]['btn_urdu'];
    });
};

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();

    document.querySelectorAll('#lang-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLang = currentLang === 'en' ? 'ur' : 'en';
            localStorage.setItem('lang', currentLang);
            applyTranslations();
        });
    });
});
