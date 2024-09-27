/* eslint-disable no-undef */
import assert from 'assert';
import { initRecurly, assertDone, nextTick } from '../support/helpers';
import dom from '../../../lib/util/dom';

describe('Recurly.AlternativePaymentMethods', () => {
  let sandbox;
  let recurly;
  let paymentMethods;
  let params;

  beforeEach(function () {
    this.timeout = 2000;
  });

  beforeEach((done) => {
    sandbox = sinon.createSandbox();
    recurly = initRecurly();
    recurly.ready(done);
    params = {
      allowedPaymentMethods: ['boleto'],
      blockedPaymentMethods: ['iDeal'],
      currency: 'USD',
      amount: 100,
      countryCode: 'US',
      locale: 'en-US',
      containerSelector: 'my-div',
      adyen: {
        publicKey: '123',
      },
      returnURL: 'https://merchant-website.test/completed',
    };
  });

  afterEach(() => {
    recurly.destroy();
    sandbox.restore();
  });

  describe("start", () => {
    describe('validations', () => {
      const requiredFields = [
        'allowedPaymentMethods',
        'currency',
        'countryCode',
        'amount',
        'containerSelector',
        'adyen.publicKey',
      ];

      const assertValidationError = missingField => {
        it('emits an error', done => {
          paymentMethods = recurly.AlternativePaymentMethods(params);
          paymentMethods.on('error', err => assertDone(done, () => {
            assert.ok(err);
            assert.equal(err.code, 'payment-methods-config-missing');
            assert.equal(err.message, `Missing Payment Method configuration option: '${missingField}'`);
          }));
          paymentMethods.start();
        });

        it('does not make any request to RA', done => {
          sandbox.stub(recurly.request, 'get').resolves({ });
          paymentMethods = recurly.AlternativePaymentMethods(params);
          paymentMethods.start()
            .finally(() => assertDone(done, () => {
              assert.equal(recurly.request.get.called, false);
            }));
        });
      };

      context('when does not includes any gateway config', () => {
        beforeEach(() => {
          ['adyen'].forEach(gatewayType => {
            delete params[gatewayType];
          });
        });

        assertValidationError('adyen');
      });

      requiredFields.forEach(field => {
        describe(`when missing the required field "${field}"`, () => {
          const deleteNestedField = (field, obj) => {
            let currentObj = obj;
            const keysPath = field.split('.');

            for (let i = 0; i < keysPath.length; i++) {
              if (i == keysPath.length -1) {
                delete currentObj[keysPath[i]];
              }

              currentObj = currentObj[keysPath[i]];
            }
          };

          beforeEach(() => {
            deleteNestedField(field, params);
          });

          assertValidationError(field);
        });
      });
    });

    describe('destroy', () => {
      it('removes the web component', done => {
        paymentMethods = recurly.AlternativePaymentMethods(params);
        paymentMethods.start()
          .then(() => {
            paymentMethods.destroy();
            assert.equal(paymentMethods.webComponent, undefined);
          })
          .finally(done);
      });
    });

    it("make a GET /js/v1/payment_methods/list with the needed params", (done) => {
      sandbox.stub(recurly.request, 'get').resolves({ });
      paymentMethods = recurly.AlternativePaymentMethods(params);

      paymentMethods.start()
        .then(() => assertDone(done, () => {
          assert.equal(recurly.request.get.called, true);
          assert.deepEqual(recurly.request.get.getCall(0).args[0].route, "/payment_methods/list");
          assert.deepEqual(recurly.request.get.getCall(0).args[0].data, {
            allowedPaymentMethods: ['boleto'],
            blockedPaymentMethods: ['iDeal'],
            currency: 'USD',
            amount: 100,
            countryCode: 'US',
            locale: 'en-US',
            channel: 'Web',
            allowedGatewayTypes: ['adyen'],
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
        paymentMethods = recurly.AlternativePaymentMethods(params);
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
        paymentMethods = recurly.AlternativePaymentMethods(params);

        paymentMethods.start()
          .finally(() => assertDone(done, () => {
            assert.equal(dom.loadScript.getCall(0).args[0], 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.44.0/adyen.js');
            assert.equal(dom.loadStyle.getCall(0).args[0], 'https://checkoutshopper-live.adyen.com/checkoutshopper/sdk/5.44.0/adyen.css');
          }));
      });

      context('when fails loading any external lib', () => {
        beforeEach(() => {
          sandbox.stub(dom, 'loadScript').rejects(new Error('no internet connection available'));
          sandbox.stub(dom, 'loadStyle').resolves({});
        });

        it('emits an error', done => {
          sandbox.stub(recurly.request, 'get').resolves(response);
          paymentMethods = recurly.AlternativePaymentMethods(params);
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
          paymentMethods = recurly.AlternativePaymentMethods(params);
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
              assert.ok(adyenCheckoutArgs.onError);

              assert.equal(checkout.create.called, true);
              assert.equal(checkout.create.getCall(0).args[0], 'dropin');

              assert.equal(dropIn.mount.called, true);
              assert.equal(dropIn.mount.getCall(0).args[0], 'my-div');
            }));
        });

        context('when a billingAddress is specified', () => {
          beforeEach((done) => {
            paymentMethods = recurly.AlternativePaymentMethods(params);
            paymentMethods.start().finally(done);
          });

          it('sends billingAddress when tokenizing', (done) => {
            sandbox.stub(recurly.request, 'post').resolves({});

            const billingAddress = {
              address1: '123 Main St',
              address2: 'Suite 701',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94105',
              country: 'US',
            };

            const { onChange } = window.AdyenCheckout.getCall(0).args[0];
            onChange({ data: { myState: 1 }, isValid: true });

            paymentMethods.submit({ billingAddress });

            nextTick(() => assertDone(done, () => {
              assert.equal(recurly.request.post.called, true);
              assert.deepEqual(recurly.request.post.getCall(0).args[0].route, '/payment_methods/token');
              assert.deepEqual(recurly.request.post.getCall(0).args[0].data, {
                currency: 'USD',
                amount: 100,
                countryCode: 'US',
                locale: 'en-US',
                channel: 'Web',
                paymentMethodData: { myState: 1 },
                gatewayType: 'adyen',
                returnURL: 'https://merchant-website.test/completed',
                billingAddress: billingAddress,
              });
            }));
          });
        });

        const validateTokenization = submit => {
          it('make a POST /js/v1/payment_methods/token with the needed params', done => {
            sandbox.stub(recurly.request, 'post').resolves({ });
            submit();

            nextTick(() => assertDone(done, () => {
              assert.equal(recurly.request.post.called, true);
              assert.deepEqual(recurly.request.post.getCall(0).args[0].route, '/payment_methods/token');
              assert.deepEqual(recurly.request.post.getCall(0).args[0].data, {
                currency: 'USD',
                amount: 100,
                countryCode: 'US',
                locale: 'en-US',
                channel: 'Web',
                paymentMethodData: { myState: 2 },
                gatewayType: 'adyen',
                returnURL: 'https://merchant-website.test/completed',
                billingAddress: undefined,
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

        context('when the component errors', () => {
          beforeEach(done => {
            paymentMethods = recurly.AlternativePaymentMethods(params);
            paymentMethods.start()
              .finally(done);
          });

          it('emits an error', done => {
            paymentMethods.on('error', err => assertDone(done, () => {
              assert.equal(err.toString(), 'something goes wrong');
            }));

            const { onError } = window.AdyenCheckout.getCall(0).args[0];
            onError('something goes wrong');
          });
        });

        context('when submit from the web component', () => {
          beforeEach(done => {
            paymentMethods = recurly.AlternativePaymentMethods(params);
            paymentMethods.start()
              .finally(done);
          });

          validateTokenization(() => {
            const { onSubmit } = window.AdyenCheckout.getCall(0).args[0];
            onSubmit({ data: { myState: 2 } });
          });
        });

        context('when submit from the payment method instance', () => {
          beforeEach(done => {
            paymentMethods = recurly.AlternativePaymentMethods(params);
            paymentMethods.start()
              .finally(done);
          });

          it('emits the validation results', done => {
            paymentMethods.on('valid', valid => assertDone(done, () => {
              assert.equal(valid, true);
            }));

            const { onChange } = window.AdyenCheckout.getCall(0).args[0];
            onChange({ data: { myState: 3 }, isValid: true });
          });
        });

        context('when change the form inputs', () => {
          beforeEach(done => {
            paymentMethods = recurly.AlternativePaymentMethods(params);
            paymentMethods.start()
              .finally(done);
          });

          validateTokenization(() => {
            const { onChange } = window.AdyenCheckout.getCall(0).args[0];
            onChange({ data: { myState: 3 } });
            onChange({ data: { myState: 2 } });

            paymentMethods.submit();
          });
        });

        context('when submit and purchase with the token', () => {
          beforeEach(done => {
            paymentMethods = recurly.AlternativePaymentMethods(params);
            paymentMethods.start()
              .finally(() => {
                const { onChange } = window.AdyenCheckout.getCall(0).args[0];
                onChange({ data: { myState: 2 } });

                paymentMethods.submit();
                done();
              });
          });

          context('and call to handleAction with a paymentResponse with an action', () => {
            let paymentResponse;

            beforeEach(() => {
              paymentResponse = { action: 'RedirectShopper' };
            });

            it('calls the web component handle action', done => {
              paymentMethods.handleAction(paymentResponse)
                .finally(() => assertDone(done, () => {
                  assert.deepEqual(webComponent.handleAction.getCall(0).args[0], { action: 'RedirectShopper' });
                }));
            });
          });
        });
      });
    });
  });
});
