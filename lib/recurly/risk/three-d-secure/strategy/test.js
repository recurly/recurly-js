import Promise from 'promise';
import ThreeDSecureStrategy from './strategy';
import { TYPE } from '../../../frame';

const debug = require('debug')('recurly:risk:three-d-secure:test');

export default class TestStrategy extends ThreeDSecureStrategy {
  static strategyName = 'test';

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
    return new Promise(() => {
      const { container, actionToken, threeDSecure } = this;
      const { recurly } = threeDSecure.risk;

      recurly.Frame({
        type: TYPE.IFRAME,
        path: '/three_d_secure/mock',
        payload: { three_d_secure_action_token_id: actionToken.id },
        container
      })
        .on('error', err => this.error(err))
        .on('done', results => {
          if (results.success) this.emit('done', results);
          else this.error(results);
        });
    });
  }

  error (cause) {
    this.emit('error', { cause });
    this.threeDSecure.error('3ds-auth-error', { cause });
  }
}
