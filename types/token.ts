import RecurlyError from './error';
import { ElementsInstance } from './elements';
import Address from './address';

type TokenPayload = {
  id: string;
  type: string;
};

type CustomerData = Address;

export type TokenHandler = (error: RecurlyError | null, token: TokenPayload) => void;

type HostedFieldToken = (form: HTMLFormElement | CustomerData, second: TokenHandler) => void;

type ElementsToken = (elements: ElementsInstance, second: HTMLFormElement | CustomerData, third: TokenHandler) => void;

type Token = HostedFieldToken & ElementsToken;

export default Token;
