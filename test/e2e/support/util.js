/**
 *  Created by atom on 01/31/2020
 * 
 *  Common support functions
 */

module.exports = {
    getPublicToken: getPublicToken,
    setUrlPath: setUrlPath,
    setIframeUrl: setIframeUrl,
    submitForm: submitForm,
    checkFormOutputText: checkFormOutputText,
    styleConfigurations: styleConfigurations
    
 }


/**
 * Returns the publicToken base on the process.env.NODE_ENV.
 *
 * @param {String} env
 * @return {String} token
 */
 function getPublicToken (env) {
    return 'ewr1-zfJT5nPe1qW7jihI32LIRH'
}

/**
 * Returns the formatted URL Path.
 *
 * @param {String} token
 * @return {String} path
 */
function setUrlPath (token) {
    return `e2e?config=${JSON.stringify(token)}`
}

/**
 * Returns the iFrame src in an url.
 *
 * @param {String} path
 * @param {String} iframe
 */
 async function setIframeUrl(path, iframe) {

    await browser.url(path)
    await $(iframe)
    await browser.switchToFrame(0)
  }


/**
 * Submit the final request.
 *
 * @param {String} firstname
 * @param {String} lastname
 * @param {button} submit
 */
  async function submitForm(frmFN, frmLN, frmSubmit, dataFN, dataLN) {

    await browser.switchToParentFrame()
    await (await $(frmFN)).setValue(dataFN)
    await (await $(frmLN)).setValue(dataLN)
    await (await $(frmSubmit)).click()
  }


/**
 * Returns the form output message.
 *
 * @param {String} output
 * @param {String} text
 * @param {millisecond} waittime
 */
  async function checkFormOutputText(output, text, waittime) {
    await browser.waitUntil(() => {
        return !!~$(output).getText().indexOf(text);
    }, waittime);

  }


  /**
 * Returns the form output message.
 *
 * @param {String} output
 * @param {String} text
 * @param {millisecond} waittime
 */
  async function checkFormResponseCode(output, code, waittime) {
    await browser.waitUntil(() => {
        return !!~$(output).getText().indexOf(text);
    }, waittime);

}

async function styleConfigurations(config, property) {
    await browser.switchToFrame(null);
       return await browser.execute(function(config, property) {
         recurly.configure(config);
       }, config, property);
     }
/*
     async function styleFontColor(color) {
        await browser.switchToFrame(null);
           return await browser.execute(function(color) {
             recurly.configure({
               fields: {
                 card: {
                   style: {
                     fontColor: color
                   }
                 }
               }
             });
           }, color);
         }

    async function configureRecurly (opts = {}) {
        console.log('configureRecurly', opts);
      
        return await browser.executeAsync(function (opts, done) {
          recurly.configure(opts);
          recurly.ready(function () {
            done();
          });
        }, opts);
      }
      */
