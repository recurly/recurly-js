import { Emitter } from './emitter';

export type BankRedirectEvent = 'token' | 'banks' | 'error';

export type PaymentMethodType = 'ideal';

export type BankRedirectOptions = {
  /**
   * Token Payment method type.
   */
  paymentMethodType: PaymentMethodType;

  /**
   * Issuer Id for iDeal Payment methods.
   */
  issuerId?: string;

  /**
   * Invoice Uuid from PendingPurchase
   */
  invoiceUuid: string;
};

export type LoadBankOptions = {
  /**
   * Token Payment method type.
   */
  paymentMethodType: PaymentMethodType;
};

export interface BankRedirectInstance extends Emitter<BankRedirectEvent> {
  /**
   * Start the BankRedirect Payment Modal.
   */
  start: (data: BankRedirectOptions) => void;

  /**
   * Load the banks.
   */
  loadBanks: (data: LoadBankOptions, attachTo?: string) => void;
}

export type BankRedirect = () => BankRedirectInstance;
