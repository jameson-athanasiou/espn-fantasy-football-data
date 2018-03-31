const { JSDOM } = require('jsdom');
const { pick } = require('lodash');
const { rankingMap } = require('./propertyMaps');
const { fixPropertyNames } = require('./util');
const tableToJson = require('tabletojson');

const positionMap = {
    QB: 2,
    RB: 3,
    WR: 4,
    TE: 5,
    DL: 7,
    LB: 8,
    DB: 9,
    K: 10,
    DST: 11,
    'D/ST': 11
};

const getPlayerRankings = (week, position) => {
    const url = `https://fantasydata.com/nfl-stats/nfl-fantasy-football-stats.aspx?fs=5&stype=0&sn=0&scope=1&w=${week - 1}&ew=${week - 1}&s=&t=0&p=${positionMap[position]}&st=FantasyPointsHalfPointPpr&d=1&ls=&live=false&pid=false&minsnaps=4`;
    return new Promise((resolve, reject) => {
        JSDOM.fromURL(url).then((pageDom) => {
            const doc = pageDom.window.document;
            const table = doc.querySelector('.table');
            const tableJson = tableToJson.convert(table.outerHTML);
            const condensedObjects = tableJson[0].map(playerObject => pick(playerObject, ['Rk', 'Player', 'Fantasy Points']));
            const fixedObject = condensedObjects.map(playerObject => fixPropertyNames(playerObject, rankingMap));

            resolve(fixedObject);
        }, reject);
    });
};

module.exports = {
    getPlayerRankings
};
