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

/** Returned from the ESI with historic market data for a single item in a single region */
export interface IHistoryData {
  /** Date of the historic data */
  date: string;

  /** Amount of completed transactions */
  order_count: number;

  /** Amount of items traded hands */
  volume: number;

  /** ?? */
  highest: number;

  /** Average price of the item during the day */
  average: number;

  /** ?? */
  lowest: number;
}

export interface IGroup {
  group_id: number;
  name: string;
  published: boolean;
  category_id: number;
  types: number[];
}

export interface IMarketGroup {
  market_group_id: number;
  name: string;
  description: boolean;
  types: number[];
  parent_group_id?: number;
}

export interface ICategory {
  category_id: number;
  name: string;
  published: boolean;
  types: number[];
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
