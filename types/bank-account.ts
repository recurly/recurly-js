import RecurlyError from './error';
import { TokenHandler } from './token';

type BillingInfo = {
  routing_number: string;
  account_number: string;
  account_number_confirmation: string;
  account_type: string;
  iban?: string;
  name_on_account: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
};

type BankInfoOptions = {
  routingNumber: string;
};

type BankInfoPayload = {
  bank_name: string;
};

type BankInfoHandler = (err: RecurlyError, bankInfo: BankInfoPayload) => void;

type BankInfo = (bankInfoOptions: BankInfoOptions, BankInfoHandler: BankInfoHandler) => void;

type BankAccount = {
  token: (data: HTMLFormElement | BillingInfo, tokenHandler: TokenHandler) => void;
  bankInfo: BankInfo;
};

export default BankAccount;
