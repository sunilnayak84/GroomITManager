import Razorpay from 'razorpay';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export interface RazorpayOrder {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  created_at: number;
}

export interface RazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not found in environment variables');
    }

    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    logger.info('[RAZORPAY] Service initialized successfully');
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(
    amount: number,
    currency: string = 'INR',
    receiptId: string,
    notes?: Record<string, string>
  ): Promise<RazorpayOrder> {
    try {
      logger.info('[RAZORPAY] Creating order:', { amount, currency, receiptId });

      const orderOptions = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: receiptId,
        notes: notes || {},
      };

      const order = await this.razorpay.orders.create(orderOptions);
      
      logger.info('[RAZORPAY] Order created successfully:', order.id);
      return order;
    } catch (error) {
      logger.error('[RAZORPAY] Error creating order:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    try {
      logger.info('[RAZORPAY] Verifying payment signature for order:', orderId);

      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === signature;
      
      logger.info('[RAZORPAY] Payment signature verification:', { 
        orderId, 
        paymentId, 
        isValid 
      });
      
      return isValid;
    } catch (error) {
      logger.error('[RAZORPAY] Error verifying payment signature:', error);
      return false;
    }
  }

  /**
   * Fetch payment details
   */
  async getPayment(paymentId: string) {
    try {
      logger.info('[RAZORPAY] Fetching payment details:', paymentId);
      
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      logger.info('[RAZORPAY] Payment details fetched successfully');
      return payment;
    } catch (error) {
      logger.error('[RAZORPAY] Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Fetch order details
   */
  async getOrder(orderId: string) {
    try {
      logger.info('[RAZORPAY] Fetching order details:', orderId);
      
      const order = await this.razorpay.orders.fetch(orderId);
      
      logger.info('[RAZORPAY] Order details fetched successfully');
      return order;
    } catch (error) {
      logger.error('[RAZORPAY] Error fetching order details:', error);
      throw error;
    }
  }
}

export const razorpayService = new RazorpayService();