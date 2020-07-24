import { RecurlyError } from './error';
import { TokenHandler } from './token';

export type BillingInfo = {
  name_on_account: string;
  routing_number?: string;
  account_number?: string;
  account_number_confirmation?: string;
  account_type?: string;
  sort_code?: string;
  type?: string;
  iban?: string;
  bsb_code?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
};

export type BankInfoOptions = {
  /**
   * The routing number for a bank (ex: ‘123456780’)
   */
  routingNumber: string;
};

export type BankInfoPayload = {
  /**
   * Bank institution name (ex: Bank of Recurly)
   */
  bank_name: string;
};

export type BankInfoHandler = (err: RecurlyError, bankInfo: BankInfoPayload) => void;

export type BankInfo = (bankInfoOptions: BankInfoOptions, BankInfoHandler: BankInfoHandler) => void;

export type BankAccount = {
  /**
   * @see {@link https://developers.recurly.com/reference/recurly-js/index.html#getting-a-token-1|Getting a token}
   */
  token: (data: HTMLFormElement | BillingInfo, tokenHandler: TokenHandler) => void;

  /**
   * @see {@link https://developers.recurly.com/reference/recurly-js/index.html#recurlybankaccountbankinfo|BankInfo}
   */
  bankInfo: BankInfo;
};
