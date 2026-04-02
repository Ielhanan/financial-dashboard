export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export interface ListStock {
  symbol: string;
  position: number;
}

export interface WatchList {
  id: string;
  name: string;
  created_at: string;
  stocks: ListStock[];
}
