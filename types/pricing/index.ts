import Emitter = require('../emitter');
import { CheckoutPricingInstance } from './checkout';
import { SubscriptionPricingInstance } from './subscription';

type PricingEvent =
  | 'change'
  | 'set.subscription'
  | 'set.plan'
  | 'set.addon'
  | 'set.adjustment'
  | 'set.address'
  | 'set.shippingAddress'
  | 'set.tax'
  | 'set.coupon'
  | 'unset.coupon'
  | 'error.coupon'
  | 'set.gift_card'
  | 'unset.gift_card';

export interface PricingInstance<PricingPromise> extends Emitter<PricingEvent> {
  reprice: (done: VoidFunction) => PricingPromise;
  remove: (opts: any, done: VoidFunction) => PricingPromise;
  reset: VoidFunction;
}

type Pricing = {
  Checkout: () => CheckoutPricingInstance;
  Subscription: () => SubscriptionPricingInstance;
};

export default Pricing;
