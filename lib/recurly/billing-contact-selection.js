import { ADDRESS_FIELDS, NON_ADDRESS_FIELDS } from './token';

export const FORM_BILLING_CONTACT = 'form';
export const WALLET_BILLING_CONTACT = 'wallet';

export const BILLING_CONTACT_SOURCES = [
  FORM_BILLING_CONTACT,
  WALLET_BILLING_CONTACT,
];

export function isValidBillingContactSelectionOrder (order) {
  if (!Array.isArray(order)) return false;
  if (order.length < 1 || order.length > BILLING_CONTACT_SOURCES.length) return false;
  if (!order.every(source => BILLING_CONTACT_SOURCES.includes(source))) return false;
  return new Set(order).size === order.length;
}

export function hasAddressData (address) {
  return Object.values(address ?? {}).some(Boolean);
}

export function resolveBillingAddress ({ order, form, wallet }) {
  const sources = {
    [FORM_BILLING_CONTACT]: form,
    [WALLET_BILLING_CONTACT]: wallet,
  };

  for (const source of order) {
    const address = sources[source];
    if (hasAddressData(address)) return { ...address };
  }

  return {};
}

export function partitionAddressFields (values = {}) {
  const partition = { address: {}, nonAddress: {} };
  for (const field of ADDRESS_FIELDS) {
    if (field in values) partition.address[field] = values[field];
  }
  for (const field of NON_ADDRESS_FIELDS) {
    if (field in values) partition.nonAddress[field] = values[field];
  }
  return partition;
}
