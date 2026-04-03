// ============================================================
// Core domain types — derived from the DB schema but used
// across components and API routes.
// ============================================================

export type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor";
export type ItemCategory =
  | "electronics"
  | "furniture"
  | "clothing"
  | "appliances"
  | "tools"
  | "sports"
  | "books"
  | "vehicles"
  | "jewelry"
  | "art"
  | "collectibles"
  | "other";

export interface Item {
  id: number;
  name: string;
  description: string | null;
  category: ItemCategory;
  condition: ItemCondition;
  purchaseDate: string | null;
  purchasePrice: number | null;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  location: string | null;
  notes: string | null;
  photos: string[]; // JSON-encoded array of file paths
  createdAt: string;
  updatedAt: string;
}

export interface MarketValueEntry {
  id: number;
  itemId: number;
  source: string;
  price: number;
  currency: string;
  url: string | null;
  confidence: number; // 0–1
  fetchedAt: string;
}

export interface MaintenanceRecord {
  id: number;
  itemId: number;
  title: string;
  description: string | null;
  type: "diy" | "professional";
  scheduledDate: string | null;
  completedDate: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
}

export interface RentalListing {
  id: number;
  itemId: number;
  pricePerDay: number;
  currency: string;
  availableFrom: string;
  availableTo: string | null;
  description: string | null;
  contactInfo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- API response types ----

export interface MarketValueResult {
  source: string;
  price: number;
  currency: string;
  url: string | null;
  confidence: number;
  error?: string;
}

export interface MarketValueSummary {
  itemId: number;
  results: MarketValueResult[];
  averagePrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  fetchedAt: string;
}

export interface DashboardStats {
  totalItems: number;
  totalPurchaseValue: number;
  totalEstimatedValue: number;
  totalDepreciation: number;
  deprecationRate: number;
  activeRentals: number;
  itemsByCategory: { category: string; count: number }[];
  recentlyAdded: Item[];
  staleItems: Item[]; // not used in 6+ months (based on notes/date)
  recommendations: Recommendation[];
}

export interface Recommendation {
  itemId: number;
  itemName: string;
  type: "sell" | "rent" | "service" | "insure";
  reason: string;
  priority: "high" | "medium" | "low";
}

// ---- API pagination ----
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
