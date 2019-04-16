export default class AdyenStrategy {
  constructor ({ threeDSecure }) {
    this.threeDSecure = threeDSecure;
    this.getBrowserInfo();
    // TODO: Act on fingerprint action
    // TODO: Act on challenge action
  }

  /**
   * TODO: build browser info
   */
  getBrowserInfo () {
    this.browserInfo = {};
  }
}
