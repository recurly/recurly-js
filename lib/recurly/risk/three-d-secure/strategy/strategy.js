import ReadinessEmitter from '../../../../util/readiness-emitter';

export default class ThreeDSecureStrategy extends ReadinessEmitter {
  attach (container) {
    this.container = container;
  }

  remove () {}

  fingerprint () {}

  challenge () {}
}
