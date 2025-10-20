const EXCHANGES_URL = "https://api.coinlore.net/api/exchanges/";
const MARKETS_URL = `https://api.coinlore.net/api/coin/markets/?id=90`; 
const URL_COINS = `https://api.coinlore.net/api/tickers/`;

let exchangesData = [],
    coinsData = [],
    chartCoins,
    chartExchanges;


const el = (id) => document.getElementById(id);

const toggleSpinner = (id, show) => {
    const spinner = el(id);
    if (spinner) {
        spinner.classList.toggle('d-none', !show);
    }
};

const getColorPalette = (count) => {
    const base = [
        "#06d6a0", "#4cc9f0", "#f72585", "#ffd166", "#48bfe3", 
        "#8338ec", "#ff7b00", "#80ed99", "#00f5d4", "#a2d2ff",
        "#ef476f", "#06b6d4", "#22c55e", "#f59e0b", "#38bdf8",
    ];
    return Array.from({ length: count }, (_, i) => base[i % base.length]);
};

const fmtUSD = (n, fractionDigits = 2) => {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const num = parseFloat(n);
    if (num >= 1e12) return "$" + (num / 1e12).toFixed(2) + "T";
    if (num >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return "$" + (num / 1e3).toFixed(2) + "K";
    
    return "$" + num.toLocaleString('en-US', { maximumFractionDigits: fractionDigits });
};

// --- Gráfico de Monedas (Top 10 Coins) ---

function renderCoinChart(dataTop) {
    const labels = dataTop.map((x) => x.symbol); 
    const prices = dataTop.map((x) => parseFloat(x.price_usd));
    const colors = getColorPalette(labels.length);
    const ctx = el("chartCoin").getContext("2d");

    if (chartCoins) chartCoins.destroy();

    chartCoins = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Precio (USD)",
                data: prices,
                backgroundColor: colors.map((c) => c + "cc"),
                borderColor: colors,
                borderWidth: 1.5,
            }, ],
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: "#c2c8d6", callback: (v) => fmtUSD(v, 0) },
                    grid: { color: "rgba(255,255,255,0.06)" },
                },
                y: {
                    ticks: { color: "#c2c8d6" },
                    grid: { color: "rgba(255,255,255,0.06)" },
                },
            },
            plugins: { legend: { labels: { color: "#d6dbea" } } },
        },
    });
}


function renderExchangeChart(dataTop) {
    const labels = dataTop.map((x) => x.name); 
    const volumes = dataTop.map((x) => parseFloat(x.volume_usd));
    const colors = getColorPalette(labels.length);
    const ctx = el("chartExchanges").getContext("2d");

    if (chartExchanges) chartExchanges.destroy();

    chartExchanges = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Volumen (USD)",
                data: volumes,
                backgroundColor: colors.map((c) => c + "cc"),
                borderColor: colors,
                borderWidth: 1.5,
            }, ],
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: "#c2c8d6", callback: (v) => fmtUSD(v) },
                    grid: { color: "rgba(255,255,255,0.06)" },
                },
                y: {
                    ticks: { color: "#c2c8d6" },
                    grid: { color: "rgba(255,255,255,0.06)" },
                },
            },
            plugins: { legend: { labels: { color: "#d6dbea" } } },
        },
    });
}



const getTotalExchanges = (data) => data.length;


const getAveragePrice = (data) => {
    const prices = data.map(coin => parseFloat(coin.price_usd));
    
    const validPrices = prices.filter(price => !isNaN(price) && price > 0);

    const total = validPrices.reduce((acc, price) => acc + price, 0);

    return validPrices.length > 0 ? total / validPrices.length : 0;
};


const getMostExpensiveCoin = (data) => {
    return data.reduce((max, current) => {
        const currentPrice = parseFloat(current.price_usd);
        const maxPrice = parseFloat(max.price_usd || 0);
        
        return currentPrice > maxPrice ? current : max;
    }, { name: "N/A", symbol: "", price_usd: 0 }); 
};


const getTop10Coins = (data) => {
    return [...data]
        .sort((a, b) => parseFloat(b.price_usd) - parseFloat(a.price_usd))
        .slice(0, 10);
};


const getTop10Exchanges = (data) => {
    const validData = data.filter(e => e.name && parseFloat(e.volume_usd) > 0);
    
    return [...validData]
        .sort((a, b) => parseFloat(b.volume_usd) - parseFloat(a.volume_usd))
        .slice(0, 10);
};

function renderTable(data, tableId, type = 'coin') {
    const tableBody = el(tableId);
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const rows = data.map((item, index) => {
        let cells = '';
        if (type === 'coin') {
            const price = parseFloat(item.price_usd);
            const change = parseFloat(item.percent_change_24h);
            const priceBTC = parseFloat(item.price_btc); 
            
            const changeClass = change > 0 ? 'text-success' : (change < 0 ? 'text-danger' : 'text-light');

            cells = `
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.symbol}</td>
                <td>${fmtUSD(price, 4)}</td>
                <td class="${changeClass}">${change ? change.toFixed(2) + '%' : '—'}</td>
                <td>${priceBTC ? priceBTC.toFixed(8) : '—'}</td> <!-- Muestra Price BTC con 8 decimales -->
            `;
        } else if (type === 'exchange') {
            const volume = parseFloat(item.volume_usd);
            const price = parseFloat(item.price);
            
            const pairDisplay = item.pair || '—';

            cells = `
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${pairDisplay}</td>
                <td>${fmtUSD(volume)}</td>
                <td>${fmtUSD(price, 4)}</td>
            `;
        }
        return `<tr role="row">${cells}</tr>`;
    }).join(''); 

    tableBody.innerHTML = rows;
}

function setupSearch(inputId, tableBodyId, allData, type = 'coin') {
    const inputElement = el(inputId);
    if (!inputElement) return;

    inputElement.removeEventListener('keyup', inputElement.searchHandler);

    inputElement.searchHandler = (event) => {
        const searchTerm = event.target.value.toLowerCase().trim();

        const filteredData = allData.filter(item => {
            if (type === 'coin') {
                return (item.name && item.name.toLowerCase().includes(searchTerm)) || 
                       (item.symbol && item.symbol.toLowerCase().includes(searchTerm));
            } else if (type === 'exchange') {
                return (item.name && item.name.toLowerCase().includes(searchTerm)) || 
                       (item.pair && item.pair.toLowerCase().includes(searchTerm));
            }
            return false;
        });

        renderTable(filteredData, tableBodyId, type);
    };
    
    inputElement.addEventListener('keyup', inputElement.searchHandler);
}


let refresh = async () => {
    toggleSpinner("spinCoin", true);
    toggleSpinner("spinExchanges", true);

    try {
        const resCoins = await axios.get(URL_COINS);
        coinsData = resCoins.data.data;

        const resExchanges = await axios.get(MARKETS_URL);
        exchangesData = resExchanges.data;

        const totalExchanges = getTotalExchanges(exchangesData);
        el("totalExchanges").textContent = totalExchanges;

        const avgPrice = getAveragePrice(coinsData);
        el("avgPrice").textContent = fmtUSD(avgPrice);

        const mostExpensive = getMostExpensiveCoin(coinsData);
        el("mostExpensiveCoin").innerHTML = `
            <span class="stat-value">${fmtUSD(mostExpensive.price_usd, 2)}</span> 
            <br><small class="stat-label">(${mostExpensive.name} / ${mostExpensive.symbol})</small>
        `;
        
        const top10Coins = getTop10Coins(coinsData);
        renderCoinChart(top10Coins);

        const top10Exchanges = getTop10Exchanges(exchangesData);
        renderExchangeChart(top10Exchanges); 

        renderTable(coinsData, "cryptoTableBody", 'coin');
        renderTable(exchangesData, "exchangeTableBody", 'exchange');

        setupSearch("searchCoin", "cryptoTableBody", coinsData, 'coin');
        setupSearch("searchExchange", "exchangeTableBody", exchangesData, 'exchange');

    } catch (error) {
        console.error("Error al cargar los datos:", error);
    } finally {
        toggleSpinner("spinCoin", false);
        toggleSpinner("spinExchanges", false);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    refresh();
    
    el("btnReload") && el("btnReload").addEventListener("click", () => refresh());
});
