export interface Valuation {
  value: number;
  currency: string;
}

export interface Balance {
  balance: number;
  currency: string;
  valuations: Valuation[];
}

export interface Balances {
  Balances: Balance[];
}
