"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Prediction } from "@/lib/types";
import { verifyPayment } from "@/lib/api";

// Paystack public key — must be set via NEXT_PUBLIC_PAYSTACK_KEY env var
const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_KEY;

function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).PaystackPop) return resolve();
    const SCRIPT_URL = "https://js.paystack.co/v2/inline.js";
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("Paystack timed out")); }, 10000);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onerror = () => reject(new Error("Could not load Paystack script."));
    s.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).PaystackPop) return resolve();
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error("PaystackPop not ready")); }, 6000);
    };
    document.head.appendChild(s);
  });
}

interface Props {
  prediction: Prediction;
  onSuccess?: (reference: string) => void;
}

export default function PaystackButton({ prediction, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await loadPaystack();
      const ref = `WW-${prediction._id}-${Date.now()}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const popup = new (window as any).PaystackPop();
      popup.newTransaction({
        key: PAYSTACK_KEY,
        email,
        amount: prediction.price * 100,
        currency: "GHS",
        ref,
        metadata: { predictionId: prediction._id, match: prediction.match },
        onSuccess: async (transaction: { reference: string }) => {
          try {
            const result = await verifyPayment(transaction.reference, prediction._id, email);
            onSuccess?.(result.reference);
          } catch {
            setError("Payment verified but access grant failed. Contact support with ref: " + transaction.reference);
            setLoading(false);
          }
        },
        onCancel: () => { setLoading(false); },
      });
    } catch (err) {
      setError((err as Error)?.message || "Failed to open payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-2 space-y-2">
      <input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-field text-xs py-2"
        onKeyDown={(e) => e.key === "Enter" && handlePay()}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading}
        className="btn-gold w-full flex items-center justify-center gap-2 text-xs py-2.5"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Processing...
          </>
        ) : (
          `Pay GHS ${prediction.price}`
        )}
      </button>
    </div>
  );
}
