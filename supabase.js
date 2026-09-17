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
        
        // Chunk the data to avoid payload too large if thousands of transactions
        const dataToUpsert = localTransactions.map(t => ({
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

        const dataToUpsert = localItems.map(i => ({
            id: i.id,
            name: i.name,
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

        const { error } = await supabase.from('transactions').delete().eq('txn_id', txnId);
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
            const localTxns = JSON.parse(localStorage.getItem('transactions')) || [];
            
            const cloudTxnMap = {};
            txns.forEach(t => {
                cloudTxnMap[t.id] = {
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
                };
            });
            
            // Merge: Keep local txns that aren't in the cloud yet
            const mergedTxns = localTxns.map(localT => {
                if (cloudTxnMap[localT.id]) {
                    const cloudT = cloudTxnMap[localT.id];
                    delete cloudTxnMap[localT.id];
                    return cloudT;
                }
                return localT; 
            });
            
            Object.values(cloudTxnMap).forEach(cloudT => {
                mergedTxns.push(cloudT);
            });
            
            if (JSON.stringify(localTxns) !== JSON.stringify(mergedTxns)) {
                localStorage.setItem('transactions', JSON.stringify(mergedTxns));
                if (typeof window.transactions !== 'undefined') window.transactions = mergedTxns;
                shouldRender = true;
            }
        }
        
        if (itms) {
            const localItms = JSON.parse(localStorage.getItem('items')) || [];
            
            const cloudItmMap = {};
            itms.forEach(i => {
                cloudItmMap[i.id] = i;
            });
            
            const mergedItms = localItms.map(localI => {
                if (cloudItmMap[localI.id]) {
                    const i = cloudItmMap[localI.id];
                    delete cloudItmMap[localI.id];
                    return {
                        id: i.id,
                        name: i.name,
                        stock: parseFloat(i.stock) || 0,
                        rate: localI.rate !== undefined ? localI.rate : (parseFloat(i.avg_rate) || 0),
                        personName: localI.personName || '',
                        unit: i.unit
                    };
                }
                return localI;
            });
            
            Object.values(cloudItmMap).forEach(i => {
                mergedItms.push({
                    id: i.id,
                    name: i.name,
                    stock: parseFloat(i.stock) || 0,
                    rate: parseFloat(i.avg_rate) || 0,
                    personName: '',
                    unit: i.unit
                });
            });
            
            if (JSON.stringify(localItms) !== JSON.stringify(mergedItms)) {
                localStorage.setItem('items', JSON.stringify(mergedItms));
                if (typeof window.items !== 'undefined') window.items = mergedItms;
                shouldRender = true;
            }
        }
        
        // Re-render the UI with the fresh data
        if (shouldRender && renderCallback) {
            renderCallback();
        }
        
    } catch (e) {
        console.error('Failed to sync from cloud:', e);
    }
};
