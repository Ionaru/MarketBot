export interface IEVEMarketerData {
    'buy': IPriceData;
    'sell': IPriceData;
}

export interface IPriceData {
    forQuery: {
        bid: boolean;
        types: number[];
        regions: number[];
        systems: number[];
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
