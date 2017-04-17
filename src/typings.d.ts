export interface SDEObject {
    basePrice: number;
    description: {
        de: string;
        en: string;
        fr: string;
        ja: string;
        ru: string;
        zh: string;
    };
    groupID: number;
    iconID: number;
    marketGroupID: number;
    name: {
        de: string;
        en: string;
        fr: string;
        ja: string;
        ru: string;
        zh: string;
    };
    portionSize: 1;
    published: boolean;
    volume: number;
    itemID: number;
}

export interface MarketData {
    order_id: number;
    type_id: number;
    location_id: number;
    volume_total: number;
    volume_remain: number;
    min_volume: number;
    price: number;
    is_buy_order: boolean;
    duration: number;
    issued: string;
    range: string;
}

export interface PriceData {
    forQuery: {
        bid: boolean;
        types: Array<number>;
        regions: Array<number>;
        systems: Array<number>;
        hours: number;
        minq: number;
    };
    volume: number;
    wavg: number;
    avg: number;
    variance: number;
    stdDev: number;
    median: number;
    fivePercent: number;
    max: number;
    min: number;
    highToLow: boolean;
    generated: number;
}

export interface ParsedMessage {
    item: string;
    region: string;
    limit: number;
    // system: string;
}
