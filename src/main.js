/**
 * Функция для расчета выручки от покупки
 * @param {Object} purchase запись о покупке (элемент массива items из purchase_records)
 * @param {Object} _product карточка товара (элемент массива products)
 * @returns {number} выручка по этой позиции
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountDecimal = discount / 100;
    const fullPrice = sale_price * quantity;
    const revenue = fullPrice * (1 - discountDecimal);
    return revenue;
}

/**
 * Функция для расчета бонусного коэффициента
 * @param {number} index порядковый номер продавца в отсортированном массиве
 * @param {number} total общее число продавцов
 * @param {Object} seller карточка продавца
 * @returns {number} коэффициент бонуса (доля от прибыли)
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller

    if (index === 0) return profit * 0.15;          // 1 место
    if (index === 1 || index === 2) return profit * 0.10; // 2 и 3 место
    if (index === total - 1) return 0.0;   // последнее место
    return profit * 0.05;                           // все остальные
}

const options = {
    calculateRevenue: calculateSimpleRevenue,
    calculateBonus: calculateBonusByProfit
};

/**
 * Функция для анализа данных продаж
 * @param {Object} data исходные данные (sellers, products, purchase_records)
 * @param {Object} options объект с функциями calculateRevenue и calculateBonus
 * @returns {{revenue:number, top_products:Object[], bonus:number, name:string, sales_count:number, profit:number, seller_id:string}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error("Некорректные входные данные");
    }

    // Проверка наличия опций
    if (!options || typeof options !== "object") {
        throw new Error("Опции должны быть объектом");
    }

    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus
        || typeof calculateRevenue !== "function"
        || typeof calculateBonus !== "function"
    ) {
        throw new Error("Некорректные опции: нужны функции calculateRevenue и calculateBonus");
    }

    // Подготовка промежуточных данных
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация продавцов и товаров
    const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.id, s]));
    const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));

    // Расчет выручки и прибыли
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        let recordReveneu = 0;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;

            seller.profit += profit;
            recordReveneu += +revenue.toFixed(2);

            if (!seller.products_sold[item.sku]) seller.products_sold[item.sku] = 0;
            seller.products_sold[item.sku] += item.quantity;
        });

        seller.revenue += recordReveneu
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    const totalSellers = sellerStats.length;

    // Назначение бонусов и топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, totalSellers, seller);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Подготовка итогового отчета
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: +seller.sales_count,
        top_products: +seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
