import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:test');

export default class TestStrategy extends ThreeDSecureStrategy {
  constructor (...args) {
    super(...args);
    debug('Using test strategy');
  }

  get shouldFingerprint () {
    return this.actionToken.three_d_secure.challenge_type === 'fingerprint';
  }

  get shouldChallenge () {
    return this.actionToken.three_d_secure.challenge_type === 'challenge';
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

    this.whenReady(() => {
      if (this.shouldFingerprint) {
        this.emit('done', { type: 'fingerprint', success: true });
      } else if (this.shouldChallenge) {
        // TODO: Present a challenge mock
        const success = true;
        this.emit('done', { type: 'challenge', success });
      }
    });
  }
}
