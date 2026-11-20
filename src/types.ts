export type PriceColumn = {
  key: string;
  label: string;
};

export type PriceItem = {
  id: string;
  name: string;
  tamilName?: string;
  group?: "clothing" | "household";
  active?: boolean;
  sortOrder?: number;
  prices: Record<string, string>;
};

export type PriceTopic = {
  id: string;
  title: string;
  icon: string;
  active?: boolean;
  sortOrder?: number;
  columns: PriceColumn[];
  items: PriceItem[];
};

export type LaundryService = {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  sortOrder: number;
  topicId: string;
  priceKey: string;
};

export type Catalog = {
  business: {
    name: string;
    tagline: string;
    phone: string;
    address: string;
    tamilAddress: string;
    doorDelivery: string;
  };
  topics: PriceTopic[];
  services?: LaundryService[];
};
