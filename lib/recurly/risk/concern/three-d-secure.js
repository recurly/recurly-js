import AdyenStrategy from './three-d-secure/strategy/adyen';
import RiskConcern from './concern';

export function factory (options) {
  return new ThreeDSecureConcern({ risk: this, ...options });
}

class ThreeDSecureConcern extends RiskConcern {
  constructor ({ risk, actionToken }) {
    super({ risk });
    this.fromToken(actionToken);
  }

  fromToken (actionToken) {
    this.recurly.request('GET', `/token/${actionToken}`, (err, actionProfile) => {
      if (err) return this.error(err);

      // For now we are scaffolding with just the AdyenStrategy.
      // Later, we will parse the actionProfile to determine the strategy
      // to use
      this.strategy = new AdyenStrategy(this);
      this.ready = true;
      this.emit('ready');
    });
  }

  attach (container) {
    const { ready } = this;
    const perform = () => this.strategy.attach(container)
    if (!ready) this.once('ready', perform);
    else perform();
  }
}
