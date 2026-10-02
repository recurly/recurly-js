import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';

export default class HyperswitchStrategy extends ThreeDSecureStrategy {
  static strategyName = 'hyperswitch';

  // Device data collection must complete (or fail) within this window; the 3DS server
  // integration guide prescribes ~15s as the fallback. Completion is otherwise detected by the
  // hidden iframe navigating away from about:blank -- cross-origin access throws a SecurityError,
  // which we treat as success. There is no postMessage handshake.
  static DDC_TIMEOUT = 15000;

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  /**
   * Extract device data collection inputs from the action token
   *
   * Present only on the Hyperswitch external-3DS invoke flow: the server surfaces the
   * three_ds_method_details plus the payment_id so the browser can run the
   * hidden-iframe fingerprinting step and report the threeDSMethod completion indicator
   * (EMVCo Y/N/U) back through the action-result token. When absent, the token carries a
   * challenge or frictionless redirect instead and the existing redirect flow applies.
   *
   * @return {Object|undefined} DDC inputs or undefined if not an invoke token
   */
  get methodInputs () {
    const params = this.actionToken.three_d_secure.params;
    if (!params.threeDSMethodUrl) return undefined;

    return {
      threeDSMethodUrl: params.threeDSMethodUrl,
      threeDSMethodData: params.threeDSMethodData,
      threeDSMethodKey: params.threeDSMethodKey || 'threeDSMethodData',
      submission: params.threeDSMethodDataSubmission !== false,
      paymentId: params.payment_id || params.paymentId,
    };
  }

  /**
   * Extract redirect parameters from the action token
   *
   * Reads `redirect_url` and `creq` from either a flat or nested location, since both
   * shapes occur. `creq` is optional -- present for card-based 3DS challenges, absent for
   * wallet redirects (e.g. GCash), and absent for frictionless (the form POST simply carries
   * no challenge data).
   *
   * @return {Object|undefined} Redirect parameters or undefined if not available
   */
  get hyperswitchRedirectParams () {
    const threeDSecureParams = this.actionToken.three_d_secure.params;
    const nestedRedirect = threeDSecureParams.redirect;

    const redirectUrl = threeDSecureParams.redirect_url || nestedRedirect?.url;
    if (!redirectUrl) return undefined;

    const params = { redirect_url: redirectUrl };
    const creq = threeDSecureParams.creq || nestedRedirect?.data?.creq;
    if (creq) params.creq = creq;

    return params;
  }

  /**
   * Provides the target DOM element for which we will apply
   * fingerprint detection, challenge flows, and results
   *
   * @param {HTMLElement} element
   */
  attach (element) {
    super.attach(element);

    // Invoke flow: device data collection happens in the merchant page context, then the
    // concern completes with the method completion indicator -- the application resubmits,
    // the 3DS authentication call runs server-side, and a second action token carries the
    // challenge or frictionless redirect through the standard redirect flow below.
    if (this.methodInputs) {
      this.deviceDataCollection();
      return;
    }

    // We need to guarantee that we have a redirect_url to proceed;
    // creq is optional (absent for wallet redirects like GCash, and for frictionless
    // -- the form POST simply carries no challenge data).
    // if redirect_url does not exist, we cannot continue
    if (this.hyperswitchRedirectParams?.redirect_url) {
      this.redirect();
    } else {
      const cause = 'We could not determine an authentication method';
      this.threeDSecure.error('3ds-auth-error', { cause });
    }
  }

  /**
   * Runs the 3DS method (device data collection) step: submits a hidden form POST carrying
   * threeDSMethodData to three_ds_method_url, targeting a hidden iframe. Fingerprinting runs
   * invisibly in the background without navigating the page away.
   */
  deviceDataCollection () {
    const inputs = this.methodInputs;

    if (!inputs.submission) {
      this.completeDDC('U');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.name = 'threeDSMethodFrame';
    iframe.style.display = 'none';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = inputs.threeDSMethodUrl;
    form.target = 'threeDSMethodFrame';
    const input = document.createElement('input');
    input.name = inputs.threeDSMethodKey;
    input.value = inputs.threeDSMethodData;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();

    let settled = false;
    const finish = compInd => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timeout);
      iframe.remove();
      this.completeDDC(compInd);
    };
    const probe = () => {
      if (settled) return;
      try {
        if (iframe.contentWindow.location.href !== 'about:blank') finish('Y');
      } catch (e) {
        // Cross-origin access to the iframe after it navigated away from about:blank --
        // the method URL responded, so fingerprinting completed.
        finish('Y');
      }
    };
    const poll = setInterval(probe, 100);
    const timeout = setTimeout(() => finish('N'), this.constructor.DDC_TIMEOUT);
  }

  /**
   * Completes the concern with the threeDSMethod completion indicator; the application stores
   * it on the transaction and the resubmission triggers the server-side 3DS authentication leg.
   *
   * @param {String} compInd EMVCo 3DS method completion indicator: "Y" (completed), "N"
   *                         (timeout/error), "U" (skipped)
   */
  completeDDC (compInd) {
    this.emit('done', {
      comp_ind: compInd,
      payment_id: this.methodInputs?.paymentId,
    });
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
