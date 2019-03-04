const auth = require('./auth');
const geocoder = require('./ya.geocoder');
const playground = require('./playground');
const ui = require('./UI');

module.exports = {
    ...auth,
    ...geocoder,
    ...playground,
    ...ui
}