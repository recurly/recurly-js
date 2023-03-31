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

/**
 * Contact information fields to use for billing and shipping contact information.
 */
export type ApplePayPaymentContact = {
  /**
   * A phone number for the contact.
   */
  phoneNumber?: string;
  /**
   * An email address for the contact.
   */
  emailAddress?: string;
  /**
   * The contact’s given (first) name.
   */
  givenName?: string;
  /**
   * The contact’s family (last) name.
   */
  familyName?: string;
  /**
   * The street portion of the address for the contact.
   */
  addressLines?: string[];
  /**
   * The city for the contact.
   */
  locality?: string;
  /**
   * The zip code or postal code for the contact.
   */
  postalCode?: string;
  /**
   * The state for the contact.
   */
  administrativeArea?: string;
  /**
   * The contact’s two-letter ISO 3166 country code.
   */
  countryCode?: string;
};

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
   * Billing contact information for the user.
   */
  billingContact?: ApplePayPaymentContact;

  /**
   * The payment networks the merchant supports. Only selects those networks that intersect with the merchant's
   * payment gateways configured in Recurly.
   */
  supportedNetworks?: string;

  /**
   * The fields of shipping information the user must provide to fulfill the order.
   */
  requiredShippingContactFields?: ApplePayContactField[];

  /**
   * Shipping contact information for the user.
   */
  shippingContact?: ApplePayPaymentContact;

  /**
   * A set of line items that explain recurring payments and additional charges and discounts.
   */
  lineItems?: ApplePayLineItem[];
};
