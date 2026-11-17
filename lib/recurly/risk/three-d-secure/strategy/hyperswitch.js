import ThreeDSecureStrategy from './strategy';
import { Frame } from '../../../frame';
import uid from '../../../../util/uid';

export default class HyperswitchStrategy extends ThreeDSecureStrategy {
  static strategyName = 'hyperswitch';

  // DDC must complete (or fail) within this window; the vendor guide prescribes ~15s.
  static DDC_TIMEOUT = 15000;

  constructor (...args) {
    super(...args);
    this.markReady();
  }

  /**
   * DDC inputs when the action token is invoke-shaped; undefined otherwise.
   *
   * @return {Object|undefined}
   */
  get methodInputs () {
    const params = this.actionToken.three_d_secure.params;
    if (!params.threeDSMethodUrl && params.threeDSMethodDataSubmission === undefined) return undefined;

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

    // Invoke flow: DDC runs here, the application resubmits with the completion indicator,
    // and a second action token carries the challenge or frictionless redirect below.
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
   * Runs the 3DS method (device data collection) step: hidden-iframe form POST of
   * threeDSMethodData. The iframe and timers are owned by the strategy so remove()
   * can tear them down.
   */
  deviceDataCollection () {
    if (this.ddc) return;
    const inputs = this.methodInputs;

    if (!inputs.submission) {
      this.completeDDC('U');
      return;
    }

    // Defensive: a submission-true token with no method url has nothing to POST (a vendor
    // contract violation) -- report "U" rather than submitting a form to an empty target.
    if (!inputs.threeDSMethodUrl) {
      this.completeDDC('U');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.name = `threeDSMethodFrame-${uid()}`;
    iframe.style.display = 'none';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = inputs.threeDSMethodUrl;
    form.target = iframe.name;
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
      this.teardownDDC();
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
    this.ddc = {
      iframe,
      poll: setInterval(probe, 100),
      timeout: setTimeout(() => finish('N'), this.constructor.DDC_TIMEOUT),
    };
  }

  /**
   * Cancels any running device data collection and removes its iframe.
   */
  teardownDDC () {
    if (!this.ddc) return;
    clearInterval(this.ddc.poll);
    clearTimeout(this.ddc.timeout);
    this.ddc.iframe.remove();
    this.ddc = null;
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
   * Removes DOM elements and cancels any running device data collection.
   */
  remove () {
    this.teardownDDC();
    const { frame } = this;
    if (frame) frame.destroy();
    super.remove();
  }
}
