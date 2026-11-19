export type PriceColumn = {
  key: string;
  label: string;
};

export type PriceItem = {
  id: string;
  name: string;
  prices: Record<string, string>;
};

export type PriceTopic = {
  id: string;
  title: string;
  icon: string;
  columns: PriceColumn[];
  items: PriceItem[];
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
};
