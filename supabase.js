const SUPABASE_URL = 'https://mmozpyrukczlmwzcrkpj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wv0WBlZw-AzowPfWisusNg_NzoJd6c4';

// Wait for Supabase to be available before initializing
let supabaseClient = null;

const getSupabase = () => {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
};

window.syncTransactionsToCloud = async (localTransactions) => {
    try {
        const supabase = getSupabase();
        if (!supabase || !localTransactions || localTransactions.length === 0) return;
        
        const cloudMap = new Map();
        (window.cloudTransactions || []).forEach(t => cloudMap.set(t.id, t));
        
        const toUpsert = localTransactions.filter(t => {
            const cloudT = cloudMap.get(t.id);
            if (!cloudT) return true;
            return JSON.stringify(t) !== JSON.stringify(cloudT);
        });

        if (toUpsert.length === 0) return;

        // Chunk the data to avoid payload too large if thousands of transactions
        const dataToUpsert = toUpsert.map(t => ({
            id: t.id,
            txn_id: t.txnId,
            date: t.date,
            time: t.time || null,
            type: t.type,
            person_name: t.personName,
            item_name: t.itemName || null,
            price: t.price || 0,
            quantity: t.quantity || 1,
            unit: t.unit || '-',
            freight: t.freight || 0,
            delivered: t.delivered || false
        }));
        
        const { error } = await supabase.from('transactions').upsert(dataToUpsert);
        if (error) console.error('Supabase Sync Error (Transactions):', error);
    } catch (e) {
        console.error('Error in syncTransactionsToCloud:', e);
    }
};

window.syncItemsToCloud = async (localItems) => {
    try {
        const supabase = getSupabase();
        if (!supabase || !localItems || localItems.length === 0) return;

        const cloudMap = new Map();
        (window.cloudItems || []).forEach(i => cloudMap.set(i.id, i));

        const toUpsert = localItems.filter(i => {
            const cloudI = cloudMap.get(i.id);
            if (!cloudI) return true;
            return JSON.stringify(i) !== JSON.stringify(cloudI);
        });

        if (toUpsert.length === 0) return;

        const dataToUpsert = toUpsert.map(i => ({
            id: i.id,
            name: i.name,
            person_name: i.personName || null,
            stock: i.stock || 0,
            avg_rate: i.rate || 0,
            unit: i.unit || 'Kg'
        }));
        
        const { error } = await supabase.from('items').upsert(dataToUpsert);
        if (error) console.error('Supabase Sync Error (Items):', error);
    } catch (e) {
        console.error('Error in syncItemsToCloud:', e);
    }
};

window.deleteTransactionFromCloud = async (txnId) => {
    try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { error } = await supabase.from('transactions').delete().or(`txn_id.eq.${txnId},id.eq.${txnId}`);
        if (error) console.error('Supabase Delete Error:', error);
    } catch (e) {
        console.error('Error in deleteTransactionFromCloud:', e);
    }
};

window.deleteSpecificTransactionFromCloud = async (id) => {
    try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) console.error('Supabase Delete Specific Error:', error);
    } catch (e) {
        console.error('Error in deleteSpecificTransactionFromCloud:', e);
    }
};

window.deleteItemFromCloud = async (itemId) => {
    try {
        const supabase = getSupabase();
        if (!supabase) return;

        const { error } = await supabase.from('items').delete().eq('id', itemId);
        if (error) console.error('Supabase Delete Item Error:', error);
    } catch (e) {
        console.error('Error in deleteItemFromCloud:', e);
    }
};

window.fetchDataFromCloudAndRender = async (renderCallback) => {
    try {
        const supabase = getSupabase();
        if (!supabase) return;

        // Fetch transactions
        const { data: txns, error: txnsError } = await supabase.from('transactions').select('*');
        if (txnsError) throw txnsError;
        
        // Fetch items
        const { data: itms, error: itmsError } = await supabase.from('items').select('*');
        if (itmsError) throw itmsError;
        
        let shouldRender = false;
        
        if (txns) {
            const parsedTxns = txns.map(t => ({
                id: t.id,
                txnId: t.txn_id,
                date: t.date,
                time: t.time,
                type: t.type,
                personName: t.person_name,
                itemName: t.item_name,
                price: parseFloat(t.price) || 0,
                quantity: parseFloat(t.quantity) || 0,
                unit: t.unit,
                freight: parseFloat(t.freight) || 0,
                delivered: t.delivered
            }));
            if (JSON.stringify(window.cloudTransactions) !== JSON.stringify(parsedTxns)) {
                window.cloudTransactions = parsedTxns;
                shouldRender = true;
            }
        }
        
        if (itms) {
            const parsedItems = itms.map(i => ({
                id: i.id,
                name: i.name,
                stock: parseFloat(i.stock) || 0,
                rate: parseFloat(i.avg_rate) || 0,
                personName: i.person_name || '',
                unit: i.unit
            }));
            if (JSON.stringify(window.cloudItems) !== JSON.stringify(parsedItems)) {
                window.cloudItems = parsedItems;
                shouldRender = true;
            }
        }
        
        // Re-render the UI with the fresh data
        if (shouldRender && renderCallback) {
            renderCallback();
        }
        
        // Show a popup message once per day
        const today = new Date().toISOString().split('T')[0];
        const lastSyncDate = localStorage.getItem('lastSupabaseSyncDate');
        if (lastSyncDate !== today) {
            alert('Data has been successfully read and synced from Supabase.');
            localStorage.setItem('lastSupabaseSyncDate', today);
        }
    } catch (e) {
        console.error('Failed to sync from cloud:', e);
    }
};

window.setupRealtimeSync = (renderCallback) => {
    try {
        const supabase = getSupabase();
        if (!supabase) return;

        let syncTimeout = null;
        const debouncedSync = () => {
            if (syncTimeout) clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
                if (window.fetchDataFromCloudAndRender) {
                    window.fetchDataFromCloudAndRender(renderCallback);
                }
            }, 800); // Wait 800ms to batch rapid events
        };

        supabase
            .channel('public:transactions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
                debouncedSync();
            })
            .subscribe();

        supabase
            .channel('public:items')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, payload => {
                debouncedSync();
            })
            .subscribe();
    } catch (e) {
        console.error('Error setting up realtime sync:', e);
    }
};