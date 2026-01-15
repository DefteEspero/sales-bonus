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
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id, tax_profit}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных

    if (!data || typeof data !== 'object' || data === null) {
        throw new Error('Некорректные данные: data должен быть объектом');
    }

    // Проверка обязательных полей в data

    if (!Array.isArray(data.sellers)) {
        throw new Error('Некорректные данные: sellers должен быть массивом');
    }
    if (!Array.isArray(data.products)) {
        throw new Error('Некорректные данные: products должен быть массивом');
    }
    if (!Array.isArray(data.purchase_records)) {
        throw new Error('Некорректные данные: purchase_records должен быть массивом');
    }

    // Проверка обязательных полей в data

    if (!Array.isArray(data.sellers)) {
        throw new Error('Некорректные данные: sellers должен быть массивом');
    }
    if (!Array.isArray(data.products)) {
        throw new Error('Некорректные данные: products должен быть массивом');
    }
    if (!Array.isArray(data.purchase_records)) {
        throw new Error('Некорректные данные: purchase_records должен быть массивом');
    }

    const sellers = Array.isArray(data.sellers) ? data.sellers : [];
    const products = Array.isArray(data.products) ? data.products : [];
    const purchaseRecords = Array.isArray(data.purchase_records) ? data.purchase_records : [];

    // Проверка на пустые массивы
    
    if (data.sellers.length === 0) {
        throw new Error('Некорректные данные: sellers не должен быть пустым');
    }
    if (data.products.length === 0) {
        throw new Error('Некорректные данные: products не должен быть пустым');
    }
    if (data.purchase_records.length === 0) {
        throw new Error('Некорректные данные: purchase_records не должен быть пустым');
    }

    // @TODO: Проверка наличия опций

    if (!options || typeof options !== 'object') {
        throw new Error('Некорректные опции: options должен быть объектом');
    }

    const settings = options && typeof options === 'object' ? options : {};
    const calculateRevenue = typeof settings.calculateRevenue === 'function' ? settings.calculateRevenue : calculateSimpleRevenue;
    const calculateBonus = typeof settings.calculateBonus === 'function' ? settings.calculateBonus : calculateBonusByProfit;
    const topNumber = Number.isFinite(settings.topNumber) ? Math.max(1, Math.floor(settings.topNumber)) : 10;

    if (typeof options.calculateRevenue !== 'function' || typeof options.calculateBonus !== 'function') {
        throw new Error('Некорректные опции: calculateRevenue и calculateBonus должны быть функциями');
    }

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
            const price = Number(item.sale_price) || 0;
            const discount = (Number(item.discount) || 0) / 100;
            const purchasePrice = product ? (Number(product.purchase_price) || 0) : 0;
            const revenueRaw = Math.max(0, price * quantity * (1 - discount));
            const cost = purchasePrice * quantity;
            const profit = revenueRaw - cost;

            stat.revenue += revenue;
            stat.profit += profit;
            stat._product[item.sku] = (stat._product[item.sku] || 0) + quantity;
        }
    }

    const sellersArray = Object.values(sellerStatistic).map((i) => {
    const topProducts = Object.entries(i._product)
        .map(([sku, quantity]) => ({ sku, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, topNumber);

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