// Procurement Types

export type SupplierCategory =
  | 'LUMBER'
  | 'CONCRETE'
  | 'ROOFING'
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'HVAC'
  | 'APPLIANCES'
  | 'FIXTURES'
  | 'FLOORING'
  | 'PAINT'
  | 'GENERAL';

export type POStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'PARTIAL'
  | 'CANCELLED';

export interface SupplierCreateInput {
  name: string;
  category: SupplierCategory;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: number;
  creditLimit?: number;
  volumeDiscounts?: Array<{
    threshold: number;
    discountPct: number;
  }>;
  isBackup?: boolean;
}

export interface SupplierUpdateInput {
  name?: string;
  category?: SupplierCategory;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  avgLeadTime?: number;
  onTimeRate?: number;
  qualityRating?: number;
  paymentTerms?: number;
  creditLimit?: number;
  volumeDiscounts?: Array<{
    threshold: number;
    discountPct: number;
  }>;
  isBackup?: boolean;
}

export interface POItem {
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrderCreateInput {
  buildId: string;
  supplierId: string;
  items: POItem[];
  expectedDelivery?: Date;
  notes?: string;
}

export interface PurchaseOrderUpdateInput {
  status?: POStatus;
  items?: POItem[];
  expectedDelivery?: Date;
  deliveredAt?: Date;
  notes?: string;
}

export interface MaterialPriceQuery {
  material: string;
  category?: SupplierCategory;
  region?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MaterialPriceRecord {
  material: string;
  category: SupplierCategory;
  region: string;
  price: number;
  unit: string;
  source: string;
  recordedAt: Date;
}

export interface PriceForecast {
  material: string;
  currentPrice: number;
  forecastedPrice: number;
  confidenceLow: number;
  confidenceHigh: number;
  recommendation: 'LOCK_NOW' | 'WAIT' | 'MONITOR';
  factors: string[];
  forecastDays: number;
}

export interface ConsolidatedOrderRequest {
  buildIds: string[];
  category: SupplierCategory;
}

export interface ConsolidatedOrderItem {
  material: string;
  totalQty: number;
  unitPrice: number;
  total: number;
  builds: string[];
}

export interface ConsolidatedOrder {
  supplierId: string;
  supplierName: string;
  items: ConsolidatedOrderItem[];
  subtotal: number;
  volumeDiscount: number;
  total: number;
  recommendedOrderDate: Date;
  projectedSavings: number;
}
