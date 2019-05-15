import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';

const debug = require('debug')('recurly:risk:three-d-secure:test');

export default class TestStrategy extends ThreeDSecureStrategy {
  static CHALLENGE_TEMPLATE = `
    <div>
      <p>Mock 3DS Challenge</p>
      <button data-recurly="3ds-mock-succeed">Succeed</button>
      <button data-recurly="3ds-mock-fail">Fail</button>
    </div>
  `;

  constructor (...args) {
    super(...args);
    debug('Using test strategy');
  }

  get shouldFingerprint () {
    return this.actionToken.three_d_secure.params.challengeType === 'fingerprint';
  }

  get shouldChallenge () {
    return this.actionToken.three_d_secure.params.challengeType === 'challenge';
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

    const { shouldFingerprint, shouldChallenge } = this;

    if (shouldFingerprint) {
      this.emit('done', { type: 'fingerprint', success: true });
    } else if (shouldChallenge) {
      this.challenge().done(success => this.emit('done', { type: 'challenge', success }));
    }
  }

  challenge () {
    return new Promise((resolve, reject) => {
      const { container } = this;
      const { CHALLENGE_TEMPLATE } = this.constructor;

      container.innerHTML = CHALLENGE_TEMPLATE;

      const succeed = container.querySelector('[data-recurly="3ds-mock-succeed"]');
      const fail = container.querySelector('[data-recurly="3ds-mock-fail"]');
      const done = success => event => {
        event.preventDefault();
        resolve(success);
      };

      succeed.addEventListener('click', done(true));
      fail.addEventListener('click', done(false));
    });
  }
}
