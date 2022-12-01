/* eslint-disable no-param-reassign */

/**
 * 
 * Takes in an addon and returns boolean to decide if addOn should used tiered math
 * 
 * @param {object} addOn 
 * @returns {boolean}
 */
export function isTieredAddOn (addOn) {
  return addOn.add_on_type === 'fixed' && addOn.tier_type !== 'flat';
}

/**
 *
 * Calculates amount on each tier row depending on isPercentage param and currency precision.
 *
 * When isPercentage = true (tiered_usage_percentage_add_ons)
 *
 * @param {number} unitsPerTier
 * @param {number} tierValue
 * @returns {number}
 *
 */
function calculateTotal (unitsPerTier, tierValue) {
  return unitsPerTier * tierValue;
}

/**
 *
 * generates an array of objects with each containing
 * the values relevant to an individual tier row.
 * will return a null in place of irrelevant (starting_quantity > selectedNumUnits) tier rows.
 *
 * @param {object} addOn
 * @param {int} selectedNumUnits
 * @param {string} currencyCode
 * @returns {array<object>}
 *
 */
export function getTieredPricingValues (
  addOn,
  selectedNumUnits,
  currencyCode,
) {
  const unformattedTiers = addOn.tiers; 
  return unformattedTiers?.map((tier, index) => {
    const isFirstTier = index === 0;
    const isLastTier = index === unformattedTiers.length - 1;
    const prevTier = isFirstTier ? null : unformattedTiers[index - 1];
    const tierEndingQuantity = tier.ending_quantity;
    const endingValue = isLastTier ? null : tierEndingQuantity;
    const tierCurrency = tier.currencies.find((tc) => tc.currency == currencyCode);
    const tierValue = tierCurrency.unit_amount;
    let startingValue;

    // const startingValue = isFirstTier ? 1 : prevTier.ending_quantity + 1;
    if (isFirstTier) {
      startingValue = 1;
    } else {
      startingValue = prevTier.ending_quantity + 1;
    }
    const floatSelectedNumUnits = parseFloat(selectedNumUnits);

    // if floatSelectedNumUnits is less than the startingValue of a tier DONT render it
    if (floatSelectedNumUnits < startingValue) {
      return null;
    }

    let unitAmount = 0;
    let unitsPerTier = null;

    switch (addOn.tier_type) {
    case 'tiered':
      // tier ranges are inclusive. e.g. when tier is 1-10 and floatSelectedNumUnits
      // is greater than or equal to 10, we want unitsPerTier to be 10,
      // so max - min + 1 (10 - 1 + 1 === 10)
      unitsPerTier = floatSelectedNumUnits >= tierEndingQuantity
        ? tierEndingQuantity - startingValue + 1
        : floatSelectedNumUnits - startingValue + 1;

      unitAmount = calculateTotal(unitsPerTier, tierValue);
      break;
    case 'volume':
      if (floatSelectedNumUnits <= tierEndingQuantity) {
        unitAmount = calculateTotal(floatSelectedNumUnits, tierValue);
      }
      break;
    case 'stairstep':
      if (selectedNumUnits && selectedNumUnits <= tierEndingQuantity) {
        unitAmount = tierValue;
      }
      break;
    default:
      break;
    }

    return {
      startingValue,
      endingValue,
      unitAmount,
      currencyCode,
      unitsPerTier,
    };
  });
}

/**
 *
 * returns the total estimated cost (unitAmount)
 * of a `tiered` | `volume` | `stairstep` pricing model
 *
 * @param {array} unformattedTiers [{ currency_code, ending_quantity, unit_amount}]
 * @param {int} selectedNumUnits
 * @param {string} currencyCode
 * @returns {object}
 *
 */
export function getTieredPricingTotal (
  addOn,
  selectedNumUnits,
  currencyCode,
) {
  const initialTieredPricingTotal = {
    unitAmount: 0,
  };

  return getTieredPricingValues(
    addOn,
    selectedNumUnits,
    currencyCode
  )?.reduce(
    (tieredPricingTotal, tier) => {
      if (tier) {
        tieredPricingTotal.unitAmount += tier.unitAmount;
      }
      return tieredPricingTotal;
    },
    initialTieredPricingTotal,
  );
}
