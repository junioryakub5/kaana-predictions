import axios from "axios";
import { ApiResponse, Prediction, UnlockData, RecentActivity, PaymentRecord } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ─── Public Predictions ───────────────────────────────────────────────────────

export async function getActivePredictions(category?: string): Promise<Prediction[]> {
  const params = category && category !== "all" ? { category } : {};
  const res = await api.get<ApiResponse<Prediction[]>>("/predictions", { params });
  return res.data.data;
}

export async function getHistoryPredictions(): Promise<Prediction[]> {
  const res = await api.get<ApiResponse<Prediction[]>>("/predictions/history");
  return res.data.data;
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export async function initiatePayment(
  email: string,
  predictionId: string
): Promise<{ reference: string; accessCode: string; authorizationUrl: string }> {
  const res = await api.post("/payment/initiate", { email, predictionId });
  return res.data;
}

export async function verifyPayment(
  reference: string,
  predictionId: string,
  email: string
): Promise<{ reference: string; accessToken: string }> {
  const res = await api.post("/payment/verify", { reference, predictionId, email });
  return res.data;
}

// ─── Access ───────────────────────────────────────────────────────────────────

export async function getUnlockedPrediction(reference: string): Promise<UnlockData> {
  const res = await api.get(`/access/${reference}`);
  const raw = res.data.data;
  // Backend returns the prediction directly — wrap it into UnlockData shape
  return {
    prediction: raw,
    payment: { reference, email: "", amount: raw.price || 0, expiresAt: "" },
  };
}

export async function restoreAccess(
  email: string,
  predictionId: string
): Promise<UnlockData> {
  const res = await api.post<ApiResponse<UnlockData>>("/payment/restore", {
    email,
    predictionId,
  });
  return res.data.data;
}

// ─── Flutterwave (Nigeria) ────────────────────────────────────────────────────

export async function flwInitiatePayment(
  email: string,
  predictionId: string
): Promise<{ reference: string; paymentLink: string; amount: number; currency: string; amountGHS: number }> {
  const res = await api.post("/payment/flw/initiate", { email, predictionId });
  return res.data;
}

export async function flwVerifyPayment(
  reference: string,
  predictionId: string,
  email: string,
  transaction_id?: string | number,
  amount?: number,
  currency?: string,
): Promise<{ reference: string; accessToken: string }> {
  const res = await api.post("/payment/flw/verify", { reference, predictionId, email, transaction_id, amount, currency });
  return res.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** Upload a File to Cloudinary via the backend — returns the CDN URL */
export async function adminUploadImage(token: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await api.post<{ success: boolean; url: string }>("/upload", formData, {
    headers: adminHeaders(token), // Do NOT set Content-Type manually — axios auto-sets it with the multipart boundary
    timeout: 60000,
  });
  return res.data.url;
}

export async function adminGetPredictions(token: string): Promise<Prediction[]> {
  const res = await api.get<ApiResponse<Prediction[]>>("/admin/predictions", {
    headers: adminHeaders(token),
  });
  return res.data.data;
}

export async function adminCreatePrediction(
  token: string,
  data: Partial<Prediction>
): Promise<Prediction> {
  const res = await api.post<ApiResponse<Prediction>>("/admin/predictions", data, {
    headers: adminHeaders(token),
  });
  return res.data.data;
}

export async function adminUpdatePrediction(
  token: string,
  id: string,
  data: Partial<Prediction>
): Promise<Prediction> {
  const res = await api.put<ApiResponse<Prediction>>(`/admin/predictions/${id}`, data, {
    headers: adminHeaders(token),
  });
  return res.data.data;
}

export async function adminDeletePrediction(token: string, id: string): Promise<void> {
  await api.delete(`/admin/predictions/${id}`, { headers: adminHeaders(token) });
}

export async function adminGetStats(token: string): Promise<{
  totalSlips: number;
  activeSlips: number;
  completedSlips: number;
  totalRevenue: number;
  totalSales: number;
  recentActivity: RecentActivity[];
  ghanaRevenue: number;
  nigeriaRevenue: number;
  ghanaSales: number;
  nigeriaSales: number;
  todayRevenue?: number;
  todayGhanaRevenue?: number;
  todayNigeriaRevenue?: number;
  todaySales?: number;
  weekRevenue?: number;
  weekSales?: number;
  monthRevenue?: number;
  monthSales?: number;
  totalWins?: number;
  totalLosses?: number;
}> {
  const res = await api.get("/admin/stats", { headers: adminHeaders(token) });
  return res.data.data;
}

export async function adminGetPayments(
  token: string,
  page = 1
): Promise<{ data: PaymentRecord[]; total: number; pages: number }> {
  const res = await api.get("/admin/payments", {
    params: { page, limit: 15 },
    headers: adminHeaders(token),
  });
  return { data: res.data.data, total: res.data.total, pages: res.data.pages };
}
