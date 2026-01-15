/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}    
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции

    const { discount, sale_price, quantity} = purchase;
    const discountNumber = (Number(discount) || 0) / 100;
    const price = Number(sale_price) || 0;
    const count = Number(quantity) || 0;
    const nonDiscountPrice = price * count;
    const discountPrice = nonDiscountPrice * (1 - discountNumber);

    return Math.round(Math.max(0, discountPrice) * 100) / 100;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    const { profit } = seller;
    const saleProfit = Math.max(0, Number(profit) || 0);
    let indexRate = 0;

    if (index === 0) {
        indexRate = 0.15;
    } else if (index === 1 || index === 2) {
        indexRate = 0.1;
    } else if (index === total - 1) {
       indexRate = 0;
    } else {
        indexRate = 0.05;
    }
    return Math.round(saleProfit * indexRate * 100) / 100;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data || typeof data !== 'object') {
        return [];
    }

    const sellers = Array.isArray(data.sellers) ? data.sellers : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const purchaseRecords = Array.isArray(data.purchase_records) ? data.purchase_records : [];

    // @TODO: Проверка наличия опций

    const settings = options && typeof options === 'object' ? options : [];
    const calculateRevenue = typeof settings.calculateRevenue === 'function' ? settings.calculateRevenue : calculateSimpleRevenue;
    const calculateBonus = typeof settings.calculateBonus === 'function' ? settings.calculateBonus : calculateBonusByProfit;
    const topNumber = Number.isFinite(settings.topNumber) ? Math.max(1, Math.floor(settings.topNumber)) : 10;

    // @TODO: Подготовка промежуточных данных для сбора статистики

    const sellerStatistic = {};

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    
    for (const i of sellers) {
        const sellerId = i && i.id;
        if (!sellerId) {
            continue;
        }

        sellerStatistic[sellerId] = {
            seller_id: sellerId,
            name: `${i.first_name || ''} ${i.last_name || ''}`.trim(),
            revenue: 0,
            profit: 0,
            sales_count: 0,
            _product: { }
        };
    }

    const productBySku = {};

    for (const i of products) {
        if (i && i.sku) productBySku[i.sku] = i;
    }

    // @TODO: Расчет выручки и прибыли для каждого продавца

    for (const received of purchaseRecords) {
        if (!received || !received.seller_id) {
            continue;
        }

        const sellerId = received.seller_id;    

        if (!sellerStatistic[sellerId]) {
            sellerStatistic[sellerId] = {
                seller_id: sellerId,
                name: sellerId,
                revenue: 0,
                profit: 0,
                sales_count: 0,
                _product: {}
            };
        }

        const stat = sellerStatistic[sellerId];
        stat.sales_count += 1;
        const items = Array.isArray(received.items) ? received.items : [];

        for (const item of items) {
            if (!item || !item.sku) {
                continue;
            }

            const product = productBySku[item.sku];
            const revenue = Number(calculateRevenue(item, product)) || 0;
            const quantity = Number(item.quantity) || 0;
            const purchasePrice = product ? (Number(product.purchase_price) || 0) : 0;
            const cost = purchasePrice * quantity;
            const profit = revenue - cost;

            stat.revenue += revenue;
            stat.profit += profit;
            stat._product[item.sku] = (stat._product[item.sku] || 0) + quantity;
        }
    }

    const sellersArray = Object.values(sellerStatistic).map((i) => {
    const topProducts = Object.entries(i._product)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, topNumber );
    return {
        seller_id: i.seller_id,
        name: i.name,
        revenue: Math.round(i.revenue * 100) / 100,
        profit: Math.round(i.profit * 100) / 100,
        sales_count: i.sales_count,
        top_products: topProducts,
        bonus: 0
        };
    });


    // @TODO: Сортировка продавцов по прибыли

    sellersArray.sort((a, b) => {
        if (b.profit !== a.profit) {
            return b.profit - a.profit;
        }
        if (b.revenue !== a.revenue) {
            return b.revenue - a.revenue;
        }
        if (b.sales_count !== a.sales_count) {
            return b.sales_count - a.sales_count;
        }
        return String(a.seller_id).localeCompare(String(b.seller_id));
    });

    // @TODO: Назначение премий на основе ранжирования

    const total = sellersArray.length;
    for (let i = 0; i < total; i++) {
        sellersArray[i].bonus = Number(calculateBonus(i, total, sellersArray[i])) || 0;
    }

    // @TODO: Подготовка итоговой коллекции с нужными полями
 
    return sellersArray;
}