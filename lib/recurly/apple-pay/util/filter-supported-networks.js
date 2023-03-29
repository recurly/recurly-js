const VERSION_NETWORK_ADDED = {
  'elo': 5,
  'mada': 5,
  'mir': 11,
  'girocard': 11,
  'dankort': 13,
  'bancomat': 14,
  'bancontact':14,
};

/**
 * Filters out the supported networks on the client.
 *
 * @param {Array[String]} requested supported networks
 * @return {Array[String]} actually supported networks
 * @private
 */
export default function filterSupportedNetworks (supportedNetworks) {
  return supportedNetworks.filter(network => {
    const versionAdded = VERSION_NETWORK_ADDED[network];
    if (versionAdded === undefined) return true;
    return window.ApplePaySession.supportsVersion(versionAdded);
  });
}
