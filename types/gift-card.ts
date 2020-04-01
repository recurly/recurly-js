import RecurlyError from './error';

type GiftCardOptions = {
  code: string;
};

type GiftCardResult = {
  currency: string;
  unit_amount: number;
};

type Done = (error: RecurlyError, result: GiftCardResult) => void;

type GiftCard = (giftCardOptions: GiftCardOptions, done: Done) => void;

export default GiftCard;
