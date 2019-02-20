const auth = require('./auth');
const geocoder = require('./ya.geocoder');
const playground = require('./playground');

module.exports = {
    ...auth,
    ...geocoder,
    ...playground
}