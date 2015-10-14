
/**
 * Hydro configuration
 *
 * @param {Hydro} hydro
 */

module.exports = function(hydro) {
  hydro.set({
    suite: 'equals',
    timeout: 500,
    plugins: [
      require('hydro-chai'),
      require('hydro-bdd')
    ],
    chai: {
      chai: require('chai'),
      styles: ['should'],
      stack: true
    }
  })
}
