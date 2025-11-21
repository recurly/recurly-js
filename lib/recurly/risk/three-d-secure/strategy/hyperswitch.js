import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

export default class HyperswitchStrategy extends ThreeDSecureStrategy {
  static strategyName = 'hyperswitch';

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  /**
   * Extract redirect parameters from the action token
   *
   * @return {Object|undefined} Redirect parameters or undefined if not available
   */
  get hyperswitchRedirectParams () {
    const threeDSecureParams = this.actionToken.three_d_secure.params;

    const redirectParams = threeDSecureParams.redirect;
    if (!redirectParams) return undefined;

    return {
      redirect_url: redirectParams.url,
      creq: redirectParams.data?.creq,
    };
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

    // We need to guarantee that we have a redirect_url and creq to proceed
    // if it does not exist, we cannot continue
    if (this.hyperswitchRedirectParams?.redirect_url && this.hyperswitchRedirectParams?.creq) {
      this.redirect();
    } else {
      const cause = 'We could not determine an authentication method';
      this.threeDSecure.error('3ds-auth-error', { cause });
    }
  }

  /**
   * Constructs a redirect frame
   */
  redirect () {
    const { hyperswitchRedirectParams, container, threeDSecure } = this;
    const { recurly } = threeDSecure.risk;

    const payload = {
      three_d_secure_action_token_id: this.actionToken.id,
      ...hyperswitchRedirectParams
    };

    this.frame = recurly.Frame({
      container,
      defaultEventName: 'hyperswitch-3ds-challenge',
      path: '/three_d_secure/start',
      payload,
      type: Frame.TYPES.WINDOW
    })
      .on('error', cause => threeDSecure.error('3ds-auth-error', { cause }))
      .on('done', results => this.emit('done', results));
  }

  /**
   * Removes DOM elements
   */
  remove () {
    const { frame } = this;
    if (frame) frame.destroy();
    super.remove();
  }
}
