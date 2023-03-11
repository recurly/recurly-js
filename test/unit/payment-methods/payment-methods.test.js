/* eslint-disable no-undef */
import assert from "assert";
import { initRecurly, stubPromise, apiTest, assertDone, nextTick } from "../support/helpers";
import {} from "../support/fixtures";
import dom from '../../../lib/util/dom';

// apiTest(requestMethod => {
describe.only("Recurly.PaymentMethods", () => {
  let sandbox;
  let recurly;
  let paymentMethods;
  let params;

  before(stubPromise);

  beforeEach(function () {
    this.timeout = 2000;
  });

  beforeEach((done) => {
    sandbox = sinon.createSandbox();
    recurly = initRecurly({
      // cors: requestMethod === 'cors'
    });
    recurly.ready(done);
    params = {
      allowedPaymentMethods: ['boleto'],
      blockedPaymentMethods: ['iDeal'],
      currency: 'USD',
      amount: 100,
      countryCode: 'US',
      locale: 'en-US',
      publicKey: '123',
      containerSelector: 'my-div',
    };
  });

  afterEach(() => {
    recurly.destroy();
    sandbox.restore();
  });

  describe("start", () => {
    const requiredFields = [
      'allowedPaymentMethods',
      'currency',
      'countryCode',
      'amount',
      'publicKey',
      'containerSelector',
    ];

    requiredFields.forEach(field => {
      describe(`when missing the required field "${field}"`, () => {
        beforeEach(() => {
          delete params[field];
        });

        it('emits an error', done => {
          paymentMethods = recurly.PaymentMethods(params);
          paymentMethods.on('error', err => assertDone(done, () => {
            assert.ok(err);
            assert.equal(err.code, 'payment-methods-config-missing');
            assert.equal(err.message, `Missing Payment Method configuration option: '${field}'`);
          }));
          paymentMethods.start();
        });

        it('does not make any request to RA', done => {
          sandbox.stub(recurly.request, 'get').resolves({ });
          paymentMethods = recurly.PaymentMethods(params);
          paymentMethods.start()
            .finally(() => assertDone(done, () => {
              assert.equal(recurly.request.get.called, false);
            }));
        });
      });
    });

    it("make a GET /js/v1/payment-methods/list with the needed params", (done) => {
      sandbox.stub(recurly.request, 'get').resolves({ });
      paymentMethods = recurly.PaymentMethods(params);

      paymentMethods.start()
        .then(() => assertDone(done, () => {
          assert.equal(recurly.request.get.called, true);
          assert.deepEqual(recurly.request.get.getCall(0).args[0], "/payment-methods/list");
          assert.deepEqual(recurly.request.get.getCall(0).args[1], {
            allowedPaymentMethods: ['boleto'],
            blockedPaymentMethods: ['iDeal'],
            currency: 'USD',
            amount: 100,
            countryCode: 'US',
            locale: 'en-US',
            channel: 'Web',
          });
        }))
        .catch((err) => done(err));
    });

    context('when RA responds with an unsupported Gateway', () => {
      let response;

      beforeEach(() => {
        response = {
          gatewayType: 'braintree',
          paymentMethodData: 'payment-method-data',
        };
      });

      it('emits an error', done => {
        sandbox.stub(recurly.request, 'get').resolves(response);
        paymentMethods = recurly.PaymentMethods(params);
        paymentMethods.on('error', err => assertDone(done, () => {
          assert.ok(err);
          assert.equal(err.code, 'payment-methods-not-available');
          assert.equal(err.message, 'Payment Methods are not available');
        }));
        paymentMethods.start();
      });
    });

    context('when RA responds with Adyen', () => {
      let response;

      beforeEach(() => {
        response = {
          gatewayType: 'adyen',
          paymentMethodData: 'payment-method-data',
        };
      });

      it('load the js and css libraries', done => {
        sandbox.stub(recurly.request, 'get').resolves(response);
        sandbox.stub(dom, 'loadScript').resolves({});
        sandbox.stub(dom, 'loadStyle').resolves({});
        paymentMethods = recurly.PaymentMethods(params);

        paymentMethods.start()
          .finally(() => assertDone(done, () => {
            assert.equal(dom.loadScript.getCall(0).args[0], 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.31.1/adyen.js');
            assert.equal(dom.loadStyle.getCall(0).args[0], 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.31.1/adyen.css');
          }));
      });

      context('when fails loading any external lib', () => {
        beforeEach(() => {
          sandbox.stub(dom, 'loadScript').rejects(new Error('no internet connection available'));
          sandbox.stub(dom, 'loadStyle').resolves({});
        });

        it('emits an error', done => {
          sandbox.stub(recurly.request, 'get').resolves(response);
          paymentMethods = recurly.PaymentMethods(params);
          paymentMethods.on('error', err => assertDone(done, () => {
            assert.ok(err);
            assert.equal(err.toString(), 'Error: no internet connection available');
          }));
          paymentMethods.start();
        });
      });

      context('when success loading all the libs', () => {
        let webComponent;
        let dropIn;
        let checkout;

        beforeEach(() => {
          sandbox.stub(recurly.request, 'get').resolves(response);
          sandbox.stub(dom, 'loadScript').resolves({});
          sandbox.stub(dom, 'loadStyle').resolves({});

          webComponent = { handleAction: sandbox.stub().resolves({  }) };
          dropIn = { mount: sandbox.stub().returns(webComponent) };
          checkout = { create: sandbox.stub().returns(dropIn) };
          window.AdyenCheckout = sandbox.stub().resolves(checkout);
        });

        afterEach(() => {
          delete window.AdyenCheckout;
        });

        it('initialize the dropin component with the provided params', done => {
          paymentMethods = recurly.PaymentMethods(params);
          paymentMethods.start()
            .finally(() => assertDone(done, () => {
              assert.equal(window.AdyenCheckout.called, true);
              const adyenCheckoutArgs = window.AdyenCheckout.getCall(0).args[0];
              assert.equal(adyenCheckoutArgs.clientKey, '123');
              assert.equal(adyenCheckoutArgs.locale, 'en-US');
              assert.equal(adyenCheckoutArgs.countryCode, 'US');
              assert.equal(adyenCheckoutArgs.paymentMethodsResponse, 'payment-method-data');
              assert.equal(adyenCheckoutArgs.environment, 'test');
              assert.equal(adyenCheckoutArgs.showPayButton, false);
              assert.equal(adyenCheckoutArgs.amount, 100);
              assert.ok(adyenCheckoutArgs.onChange);
              assert.ok(adyenCheckoutArgs.onSubmit);

              assert.equal(checkout.create.called, true);
              assert.equal(checkout.create.getCall(0).args[0], 'dropin');

              assert.equal(dropIn.mount.called, true);
              assert.equal(dropIn.mount.getCall(0).args[0], 'my-div');
            }));
        });

        const validateTokenization = submit => {
          it("make a POST /js/v1/payment-methods/tokenize with the needed params", done => {
            sandbox.stub(recurly.request, 'post').resolves({ });
            submit();

            nextTick(() => assertDone(done, () => {
              assert.equal(recurly.request.post.called, true);
              assert.deepEqual(recurly.request.post.getCall(0).args[0], "/payment-methods/tokenize");
              assert.deepEqual(recurly.request.post.getCall(0).args[1], {
                currency: 'USD',
                amount: 100,
                countryCode: 'US',
                locale: 'en-US',
                channel: 'Web',
                paymentMethodData: 'boleto-state',
              });
            }));
          });

          context('when success with a token', () => {
            beforeEach(() => {
              sandbox.stub(recurly.request, 'post').resolves({ data: 'payment-token' });
              submit();
            });

            it('emit the token', done => {
              paymentMethods.on('token', token => assertDone(done, () => {
                assert.equal(token.data, 'payment-token');
              }));
            });

            it('does not emit any error', done => {
              paymentMethods.on('error', err => done(err));
              nextTick(() => done());
            });
          });

          context('when fails', () => {
            beforeEach(() => {
              sandbox.stub(recurly.request, 'post').rejects('token-error');
              submit();
            });

            it('emits an error', done => {
              paymentMethods.on('error', err => assertDone(done, () => {
                assert.equal(err.toString(), 'token-error');
              }));
            });

            it('does not emit any token', done => {
              paymentMethods.on('token', () => done('error'));
              nextTick(() => done());
            });
          });
        };

        context('when submit from the web component', () => {
          beforeEach(done => {
            paymentMethods = recurly.PaymentMethods(params);
            paymentMethods.start()
              .finally(done);
          });

          validateTokenization(() => {
            const { onSubmit } = window.AdyenCheckout.getCall(0).args[0];
            onSubmit([{ data: 'boleto-state' }]);
          });
        });

        context('when tokenize from the payment method instance', () => {
          beforeEach(done => {
            paymentMethods = recurly.PaymentMethods(params);
            paymentMethods.start()
              .finally(done);
          });

          validateTokenization(() => {
            const { onChange } = window.AdyenCheckout.getCall(0).args[0];
            onChange([{ data: 'boleto-state-2' }]);
            onChange([{ data: 'boleto-state' }]);

            paymentMethods.tokenize();
          });
        });

        context('when tokenize and purchase with the token', () => {
          beforeEach(done => {
            paymentMethods = recurly.PaymentMethods(params);
            paymentMethods.start()
              .finally(() => {
                const { onChange } = window.AdyenCheckout.getCall(0).args[0];
                onChange([{ data: 'boleto-state' }]);

                paymentMethods.tokenize();
                done();
              });
          });

          context('and call to handlePaymentAction with a paymentResponse with an action', () => {
            let paymentResponse;

            beforeEach(() => {
              paymentResponse = { action: 'RedirectShopper' };
            });

            it('calls the web component handle action', done => {
              paymentMethods.handlePaymentAction(paymentResponse)
                .finally(() => assertDone(done, () => {
                  assert.equal(webComponent.handleAction.getCall(0).args[0], 'RedirectShopper');
                }));
            });
          });

          context('and call to handlePaymentAction with a paymentResponse without an action', () => {
            let paymentResponse;

            beforeEach(() => {
              paymentResponse = { };
            });

            it('does not call the web component handle action', () => {
              paymentMethods.handlePaymentAction(paymentResponse)
                .finally(() => assertDone(done, () => {
                  assert.equal(webComponent.handleAction.called, false);
                }));
            });
          });
        });
      });
    });
  });
});
// });
