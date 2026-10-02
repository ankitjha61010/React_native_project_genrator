/** react-native-razorpay ships no TypeScript types – the parts this app uses. */
declare module 'react-native-razorpay' {
  export interface RazorpayCheckoutOptions {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    prefill?: { email?: string; contact?: string; name?: string };
    theme?: { color?: string };
  }

  export interface RazorpaySuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    /** Rejects with `{ code, description }` (code 0 / 2: closed by the user). */
    open(options: RazorpayCheckoutOptions): Promise<RazorpaySuccess>;
  };
  export default RazorpayCheckout;
}
