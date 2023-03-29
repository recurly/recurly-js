/**
 * A type that indicates the time a payment occurs in a transaction.
 */
export type ApplePayPaymentTiming =
 | 'immediate'
 | 'recurring';

/**
 * A type that indicates calendrical units, such as year, month, day, and hour.
 */
export type ApplePayRecurringPaymentDateUnit =
  | 'year'
  | 'month';

/**
 * Field names for requesting contact information in a payment request.
 */
export type ApplePayContactField =
  | 'email'
  | 'name'
  | 'phone'
  | 'postalAddress'
  | 'phoneticName';

export type ApplePayLineItem = {
  /**
   * A required value that’s a short, localized description of the line item.
   */
  label: string;

  /**
   * A required value that’s the monetary amount of the line item.
   */
  amount: string;

  /**
   * The time that the payment occurs as part of a successful transaction.
   */
  paymentTiming?: ApplePayPaymentTiming;

  /**
   * The date of the first payment.
   */
  recurringPaymentStartDate?: Date;

  /**
   * The amount of time — in calendar units, such as day, month, or year — that represents a fraction of the total payment interval.
   */
  recurringPaymentIntervalUnit?: ApplePayRecurringPaymentDateUnit;

  /**
   * The number of interval units that make up the total payment interval.
   */
  recurringPaymentIntervalCount?: number;

  /**
   * The date of the final payment.
   */
  recurringPaymentEndDate?: Date;
};

export type ApplePayPaymentRequest = {
  /**
   * Total cost to display in the Apple Pay payment sheet. Required if `options.pricing` is not provided.
   */
  total: ApplePayLineItem;

  /**
   * The fields of shipping information the user must provide to fulfill the order.
   */
  requiredShippingContactFields?: ApplePayContactField[];

  /**
   * A set of line items that explain recurring payments and additional charges and discounts.
   */
  lineItems?: ApplePayLineItem[];
};
