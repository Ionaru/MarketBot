export interface INamesData {
  category: string;
  id: number;
  name: string;
}

export interface ITypeIDs {
  [index: number]: ISDEObject;
}

export interface ISDEObject {
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
    de?: string;
    en?: string;
    fr?: string;
    ja?: string;
    ru?: string;
    zh?: string;
  };
  portionSize: 1;
  published: boolean;
  volume: number;
  itemID: number;
}

export interface IMarketData {
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
  item: string;
  region: string;
  limit: number;
  // system: string;
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
