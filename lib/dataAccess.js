const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { ESPN } = require('./constants');
const { LEAGUE_ID, SEASON_ID, REGULAR_SEASON_WEEKS } = require('./leagueConfig');

const getRowData = (row, identifier, isClassName) => {
    let returnValue = null;
    if (row) {
        const element = isClassName ? row.getElementsByClassName(identifier)[0] : row.getElementsByTagName(identifier)[0];
        if (element) {
            returnValue = element.innerHTML;
        }
    }

    return returnValue;
};

const getMatchup = (matchupTable, matchupsArray) => {
    const rows = matchupTable.rows;
    const matchup = [];
    for (let i = 0; i < rows.length; i++) {
        const teamData = {};

        if (i !== 2) {
            teamData.team = getRowData(rows[i], 'a');
            teamData.owner = getRowData(rows[i], 'owners', true);
            teamData.points = getRowData(rows[i], 'score', true);
            matchup.push(teamData);
        } else {
            const table = rows[i].getElementsByClassName('scoringDetails')[0];
            const lineCells = table.getElementsByClassName('playersPlayed');

            for (let k = 0; k < 2; k++) {
                const divs = lineCells[k].getElementsByTagName('div');
                for (let j = 0; j < divs.length; j++) {
                    const value = divs[j].innerHTML;
                    if (!divs[j].getAttribute('id')) {
                        matchup[k].line = value;
                    }
                }
            }
        }

        if (i === 1) {
            matchupsArray.push(matchup);
        }
    }
};

const getIndividualScoreBoard = (week) => {
    const url = `${ESPN.URL.SCOREBOARD}?leagueId=${LEAGUE_ID}&matchupPeriodId=${week}`;
    return new Promise((resolve, reject) => {
        JSDOM.fromURL(url).then((dom) => {
            const document = dom.window.document;
            const matchupTables = document.querySelectorAll('.ptsBased.matchup');
            const matchups = [];
            matchupTables.forEach(table => getMatchup(table, matchups));

            resolve({
                week,
                scoreboard: matchups
            });
        }, reject);
    });
};

const sortTable = (tableHtml) => {
    const items = [];
    const $ = cheerio.load(tableHtml);
    const table = $('table');
    const trs = $(table).find('tr');
    const headers = {};

    trs.each((i, row) => {
        const itemObj = {};

        $(row).find('td').each((j, cell) => {
            const value = $(cell).text().trim();

            if (value) {
                if (!i) {
                    headers[j] = value.split(',')[0];
                } else {
                    itemObj[headers[j]] = value.split(',')[0];
                }
            }
        });

        if (i) {
            items.push(itemObj);
        }
    });

    return items;
};

const getSeasonStandings = () => {
    const url = `${ESPN.URL.STANDINGS}?leagueId=${LEAGUE_ID}&seasonId=${SEASON_ID}`;

    return new Promise((resolve, reject) => {
        JSDOM.fromURL(url).then((dom) => {
            const document = dom.window.document;
            let table = document.querySelectorAll('table.tableBody')[0];
            table.deleteRow(0);
            table = `<table>${table.innerHTML}</table>`;
            const sortedTable = sortTable(table);

            resolve(sortedTable);
        }, reject);
    });
};

const getSeasonTeamStats = () => {
    const url = `${ESPN.URL.STANDINGS}?leagueId=${LEAGUE_ID}&seasonId=${SEASON_ID}`;

    return new Promise((resolve, reject) => {
        JSDOM.fromURL(url).then((dom) => {
            const document = dom.window.document;
            let standingsTable = document.querySelectorAll('table.tableBody')[1];
            standingsTable.deleteRow(0);
            standingsTable = `<table>${standingsTable.innerHTML}</table>`;
            const sortedTable = sortTable(standingsTable);

            sortedTable.forEach((teamStats) => {
                const teamString = teamStats.TEAM.split('(');
                const teamName = teamString[0];
                const owner = teamString[1];
                teamStats.TEAM = teamName.trim();
                teamStats.OWNER = owner.replace(')', '').trim();
            });

            resolve(sortedTable);
        }, reject);
    });
};

const getPlayersByTable = (table, startingIndex) => {
    const players = [];
    Array.from(table.rows).forEach((row, index) => {
        let name;
        let position;
        let points;

        if (index >= startingIndex) {
            name = row.cells[1].textContent;
            position = name.split(/\s/)[3];

            if (row.cells[2].innerHTML.match('BYE')) {
                points = row.cells[3].innerHTML;
            } else {
                points = row.cells[4].innerHTML;
            }

            const pointsNumber = parseInt(points, 10);
            points = Number.isNaN(pointsNumber) ? 0 : pointsNumber;

            if (name.match('D/ST')) {
                position = ('D/ST');
            }

            if (name && points) {
                name = name.replace(',', '').split(/\s/);
                name = `${name[0]} ${name[1]}`;
                position = position.replace(',', '');

                players.push({
                    position,
                    points,
                    name
                });
            }
        }
    });

    return players;
};

const getPlayersFromQuickBoxScore = (teamUrl, teamOptions) => new Promise((resolve, reject) => {
    JSDOM.fromURL(teamUrl, teamOptions).then((pageDom) => {
        const html = pageDom.serialize();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const teamBreakdowns = {};

        const tables = document.querySelectorAll('.playerTableTable');

        let teamName = tables[0].rows[0].cells[0].innerHTML;

        teamName = teamName.replace(' Box Score', '').trim();
        teamBreakdowns[teamName] = {};

        const team = teamBreakdowns[teamName];

        team.starters = getPlayersByTable(tables[0], 3);
        team.bench = getPlayersByTable(tables[1], 2);

        let teamNameTwo = tables[2].rows[0].cells[0].innerHTML;


        teamNameTwo = teamNameTwo.replace(' Box Score', '').trim();
        teamBreakdowns[teamNameTwo] = {};

        const teamTwo = teamBreakdowns[teamNameTwo];

        teamTwo.starters = getPlayersByTable(tables[2], 3);
        teamTwo.bench = getPlayersByTable(tables[3], 2);

        resolve(teamBreakdowns);
    }, reject);
});

const getStats = async () => ({
    stats: await getSeasonTeamStats()
});

const getStandings = async () => ({
    standings: await getSeasonStandings()
});

const getFullBoxScore = (gameNumber, weekNumber) => {
    const url = `http://games.espn.com/ffl/boxscorequick?leagueId=211640&teamId=${gameNumber}&scoringPeriodId=${weekNumber}&seasonId=2017&view=scoringperiod&version=quick`;
    const teamOptions = {
        method: 'GET'
    };

    return getPlayersFromQuickBoxScore(url, teamOptions);
};

const getPlayers = week => new Promise((resolve, reject) => {
    const promises = [];
    const result = [];
    for (let i = 1; i <= 9; i++) {
        if (i % 2) {
            const promise = getFullBoxScore(i, week);
            promises.push(promise);
            promise.then((data) => {
                result.push(data);
            });
        }
    }

    Promise.all(promises).then(() => {
        resolve(result);
    }, reject);
});

const getScoreBoard = (week) => {
    const scoreBoards = [];

    if (week) {
        scoreBoards.push(getIndividualScoreBoard(week));
    } else {
        for (let i = 1; i <= REGULAR_SEASON_WEEKS; i++) {
            scoreBoards.push(getIndividualScoreBoard(i));
        }
    }

    return Promise.all(scoreBoards);
};

module.exports = {
    getStats,
    getStandings,
    getPlayers,
    getFullBoxScore,
    getScoreBoard
};
