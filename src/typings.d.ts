export interface IParsedMessage {
    content: string;
    item: string;
    region: string;
    limit: number;
    system: string;
}

export interface ICitadelData {
    [id: number]: {
        typeId: number;
        name: string;
        regionId: number;
        location: {
            y: number;
            x: number;
            z: number;
        };
        typeName: string;
        systemId: number;
        lastSeen: string;
        systemName: string;
        //noinspection ReservedWordAsName
        public: boolean;
        firstSeen: string;
        regionName: string;
    };
}

export interface IEVEPraisalData {
    appraisal: {
        created: number,
        items: [
            {
                meta: {
                    bpc: boolean,
                },
                name: string;
                prices: {
                    all: {
                        avg: number;
                        max: number;
                        median: number;
                        min: number;
                        order_count: number;
                        percentile: number;
                        stddev: number;
                        volume: number;
                    },
                    buy: {
                        avg: number;
                        max: number;
                        median: number;
                        min: number;
                        order_count: number;
                        percentile: number;
                        stddev: number;
                        volume: number;
                    },
                    sell: {
                        avg: number;
                        max: number;
                        median: number;
                        min: number;
                        order_count: number;
                        percentile: number;
                        stddev: number;
                        volume: number;
                    },
                    strategy: string;
                    updated: string;
                },
                quantity: number;
                typeID: number;
                typeName: string;
                typeVolume: number;
            }
        ],
        kind: string;
        market_name: string;
        raw: string;
        totals: {
            buy: number;
            sell: number;
            volume: number;
        },
        unparsed: {},
    }
}
