const auth = require('./auth');
const geocoder = require('./ya.geocoder');

module.exports = {
    ...auth,
    ...geocoder
}