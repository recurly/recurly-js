import { Emitter } from './emitter';

export type BankRedirectEvent = 'token' | 'banks' | 'error';

export type PaymentMethodType = 'ideal';

export type BankRedirectOptions = {
  /**
   * Token Payment method type.
   */
  payment_method_type: PaymentMethodType;

  /**
   * Issuer Id for iDeal Payment methods.
   */
  issuer_id?: string;
};

export type LoadBankOptions = {
  /**
   * Token Payment method type.
   */
  payment_method_type: PaymentMethodType;
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
