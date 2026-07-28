// Shared TypeScript types for the entire app

export interface Prediction {
  _id: string;
  match: string;
  league: string;
  odds: string;
  oddsCategory: "2+" | "5+" | "10+" | "20+";
  price: number;
  content?: string;
  bookingCode?: string;
  tips?: string[];
  imageUrl?: string;
  proofImageUrl?: string;           // result screenshot — shown in history
  previewImageUrl?: string | null;  // blurred preview shown on locked cards
  startDay?: string;
  endDay?: string;
  date: string;
  status: "active" | "completed";
  result: "win" | "loss" | null;
  createdAt: string;
  updatedAt?: string;
}

export interface Payment {
  reference: string;
  email: string;
  amount: number;
  expiresAt: string;
}

export interface UnlockData {
  prediction: Prediction;
  payment: Payment;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface RecentActivity {
  _id: string;
  email: string;
  amount: number;
  status: "success" | "pending" | "failed";
  currency: string;
  predictionTitle: string;
  createdAt: string;
  provider?: string;
}

export interface PaymentRecord {
  _id: string;
  reference: string;
  email: string;
  amount: number;
  status: "success" | "pending" | "failed";
  currency: string;
  predictionTitle: string;
  expiresAt: string;
  createdAt: string;
  provider?: string;
}
