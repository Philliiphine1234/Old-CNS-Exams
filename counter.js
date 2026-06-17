// ─── UNIQUE VISITOR COUNTER ──────────────────────────────────────────
// Uses free CountAPI (countapi.xyz) – with fallback to localStorage only.

const COUNTER_NAMESPACE = 'cns-quiz';
const TOTAL_KEY = 'total';
const UNIQUE_KEY = 'unique';
const STORAGE_KEY = 'cns_visitor_counted';

// ─── Helper: update the display ──────────────────────────────────────
function updateCounterDisplay(total, unique) {
    const totalEl = document.getElementById('totalVisitors');
    const uniqueEl = document.getElementById('uniqueVisitors');
    if (totalEl) totalEl.textContent = total;
    if (uniqueEl) uniqueEl.textContent = unique;
}

// ─── Helper: get from localStorage if API fails ──────────────────────
function getLocalCounts() {
    const total = parseInt(localStorage.getItem('cns_total_visits') || '0');
    const unique = parseInt(localStorage.getItem('cns_unique_visits') || '0');
    return { total, unique };
}

function setLocalCounts(total, unique) {
    localStorage.setItem('cns_total_visits', String(total));
    localStorage.setItem('cns_unique_visits', String(unique));
}

// ─── Core: fetch, increment, display ─────────────────────────────────
async function updateVisitorCounter() {
    // First, show local counts while loading
    const local = getLocalCounts();
    updateCounterDisplay(local.total, local.unique);

    try {
        // 1. Check if we have a counter on the API
        let totalValue = 0;
        let uniqueValue = 0;
        let apiAvailable = true;

        try {
            // Get current counts
            const totalRes = await fetch(`https://api.countapi.xyz/get/${COUNTER_NAMESPACE}/${TOTAL_KEY}`);
            const uniqueRes = await fetch(`https://api.countapi.xyz/get/${COUNTER_NAMESPACE}/${UNIQUE_KEY}`);

            if (totalRes.ok && uniqueRes.ok) {
                const totalData = await totalRes.json();
                const uniqueData = await uniqueRes.json();
                totalValue = totalData.value || 0;
                uniqueValue = uniqueData.value || 0;
            } else {
                apiAvailable = false;
            }
        } catch (e) {
            apiAvailable = false;
        }

        // If API is down, just use localStorage
        if (!apiAvailable) {
            const localData = getLocalCounts();
            const alreadyCounted = localStorage.getItem(STORAGE_KEY);
            let newTotal = localData.total + 1;
            let newUnique = localData.unique;
            if (!alreadyCounted) {
                newUnique = localData.unique + 1;
                localStorage.setItem(STORAGE_KEY, 'true');
            }
            setLocalCounts(newTotal, newUnique);
            updateCounterDisplay(newTotal, newUnique);
            return;
        }

        // 2. API is available – increment total
        let currentTotal = totalValue;
        let currentUnique = uniqueValue;

        // Increment total
        try {
            const incTotalRes = await fetch(`https://api.countapi.xyz/hit/${COUNTER_NAMESPACE}/${TOTAL_KEY}`);
            if (incTotalRes.ok) {
                const incTotalData = await incTotalRes.json();
                currentTotal = incTotalData.value || currentTotal + 1;
            }
        } catch (e) {
            // If hit fails, just increment locally
            currentTotal = totalValue + 1;
        }

        // Increment unique only if not counted before
        const alreadyCounted = localStorage.getItem(STORAGE_KEY);
        if (!alreadyCounted) {
            try {
                const incUniqueRes = await fetch(`https://api.countapi.xyz/hit/${COUNTER_NAMESPACE}/${UNIQUE_KEY}`);
                if (incUniqueRes.ok) {
                    const incUniqueData = await incUniqueRes.json();
                    currentUnique = incUniqueData.value || currentUnique + 1;
                }
                localStorage.setItem(STORAGE_KEY, 'true');
            } catch (e) {
                // If hit fails, increment locally
                currentUnique = uniqueValue + 1;
                localStorage.setItem(STORAGE_KEY, 'true');
            }
        }

        // 3. Update display
        updateCounterDisplay(currentTotal, currentUnique);

        // 4. Sync localStorage (so it works offline too)
        setLocalCounts(currentTotal, currentUnique);

    } catch (error) {
        console.warn('Visitor counter error:', error);
        // Fallback: use localStorage
        const localData = getLocalCounts();
        const alreadyCounted = localStorage.getItem(STORAGE_KEY);
        let newTotal = localData.total + 1;
        let newUnique = localData.unique;
        if (!alreadyCounted) {
            newUnique = localData.unique + 1;
            localStorage.setItem(STORAGE_KEY, 'true');
        }
        setLocalCounts(newTotal, newUnique);
        updateCounterDisplay(newTotal, newUnique);
    }
}

// ─── Run when the page loads ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', updateVisitorCounter);

// ─── Also run immediately if DOM is already loaded ──────────────────
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateVisitorCounter();
}
