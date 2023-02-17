/* eslint-disable no-param-reassign */
import find from 'component-find';

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
    const prevTier = isFirstTier ? null : unformattedTiers[index - 1];
    const tierEndingQuantity = tier.ending_quantity;
    const tierCurrency = tier.currencies.filter((tc) => { return tc.currency_code === currencyCode; })[0];

    if (tierCurrency === undefined) {
      return null;
    }

    const tierValue = tierCurrency.unit_amount;
    let startingValue;

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

      unitAmount = unitsPerTier * tierValue;
      break;
    case 'volume':
      if (floatSelectedNumUnits <= tierEndingQuantity) {
        unitAmount = floatSelectedNumUnits * tierValue;
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

    return unitAmount;
  });
}

/**
 *
 * returns the total estimated cost (unitAmount)
 * of a `tiered` | `volume` | `stairstep` pricing model
 *
 * @param {object} addOn
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
  const initialUnitAmount = 0;

  return getTieredPricingValues(
    addOn,
    selectedNumUnits,
    currencyCode
  )?.reduce(
    (unitAmount, tierAmount) => {
      if (tierAmount) {
        unitAmount += tierAmount;
      }
      return unitAmount;
    },
    initialUnitAmount,
  );
}

/**
 * returns the unit amount for a tiered pricing model in the current tier based on selectedNumUnits
 * @param {object} addOn
 * @param {int} selectedNumUnits
 * @param {string} currencyCode
 * @returns number
 */
export function getTieredPricingUnitAmount (addOn, selectedNumUnits, currencyCode) {
  const tier = find(addOn.tiers, (tier) => (selectedNumUnits || 1) <= tier.ending_quantity);
  return find(tier.currencies, (currency) => currency.currency_code === currencyCode).unit_amount;
}
