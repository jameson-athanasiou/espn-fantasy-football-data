const { mapKeys } = require('lodash');

const fixPropertyNames = (obj, map) => mapKeys(obj, (value, key) => map[key]);

module.exports = {
    fixPropertyNames
};
