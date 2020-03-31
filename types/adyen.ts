import Emitter from './emitter';

type AdyenOptions = {
  invoiceUuid: string;
  countryCode?: string;
  shopperLocale?: string;
  skinCode?: string;
};

type AdyenEvent = 'token' | 'error';

interface AdyenInstance extends Emitter<AdyenEvent> {
  start: (adyenOptions: AdyenOptions) => void;
}

type Adyen = (adyenOptions?: AdyenOptions) => AdyenInstance;

export default Adyen;
