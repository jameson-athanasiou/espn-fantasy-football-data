const cheerio = require('cheerio');
const request = require('request');
const { JSDOM } = require('jsdom');
const constants = require('./constants');
const leagueConfig = require('./leagueConfig');

module.exports = {
    async getStandings() {
        return {
          standings: await this.getSeasonStandings()
        }
    },

    async getStats() {
        return {
          stats: await this.getSeasonTeamStats()
        }
    },

    getPlayers(week) {
        return new Promise((resolve, reject) => {
            const promises = [];
            const result = [];
            for (let i = 1; i <= 9; i++) {
                if (i%2) {
                    const promise = this.getFullBoxScore(i, week);
                    promises.push(promise);
                    promise.then(data => {
                        result.push(data);
                    });
                }
            }

            Promise.all(promises).then(() => {
                resolve(result);
            }, reject);
        });
    },

    getFullBoxScore(gameNumber, weekNumber) {
        const url = `http://games.espn.com/ffl/boxscorequick?leagueId=211640&teamId=${gameNumber}&scoringPeriodId=${weekNumber}&seasonId=2017&view=scoringperiod&version=quick`;
        const teamOptions = {
            method: 'GET'
        };

        return this.getPlayersFromQuickBoxScore(url, teamOptions);
    },

    getTeam() {
        const teamUrl = 'http://games.espn.com/ffl/clubhouse?leagueId=211640&teamId=1&seasonId=2017';
        const teamOptions = {
            method: 'GET'
        };

        return this._getPlayersFromTable(teamUrl, teamOptions);
    },

    getMembers() {
        const url = `${constants.ESPN.URL.MEMBERS}?leagueId=${leagueConfig.LEAGUE_ID}`;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let table = document.getElementsByClassName('tableBody')[0];
                table = '<table>' + table.innerHTML + '</table>';
                const sortedTable = this._sortTable(table);

                resolve(sortedTable);
            }, reject);
        });
    },

    getScoreBoard(week) {
        const scoreBoards = [];

        if (week) {
            scoreBoards.push(this._getIndividualScoreBoard(week));
        } else {
            for (let i = 1; i <= leagueConfig.REGULAR_SEASON_WEEKS; i++) {
                scoreBoards.push(this._getIndividualScoreBoard(i));
            }
        }

        return Promise.all(scoreBoards);
    },

    _getIndividualScoreBoard(week) {
        const url = `${constants.ESPN.URL.SCOREBOARD}?leagueId=${leagueConfig.LEAGUE_ID}&matchupPeriodId=${week}`;
        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let matchupTables = document.querySelectorAll('.ptsBased.matchup');
                const matchups = [];
                matchupTables.forEach((table, i) => {
                    return this._getMatchup(table, matchups);
                });

                resolve({
                    week,
                    scoreboard: matchups
                });
            }, reject);
        });
    },

    _getMatchup(matchupTable, matchupsArray) {
        const rows = matchupTable.rows;
        let matchup = [];
        for (let i = 0; i < rows.length; i++) {
            const teamData = {};

            if (i !== 2) {
                teamData.team = this._getRowData(rows[i], 'a');
                teamData.owner = this._getRowData(rows[i], 'owners', true);
                teamData.points = this._getRowData(rows[i], 'score', true);
                matchup.push(teamData);
            } else {
                // get line
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
            i === 1 && matchupsArray.push(matchup);
        }
    },

    _getRowData(row, identifier, isClassName) {
        let returnValue = null;
        if (row) {
            const element = isClassName ? row.getElementsByClassName(identifier)[0] : row.getElementsByTagName(identifier)[0];
            element && (returnValue = element.innerHTML);
        }

        return returnValue;
    },

    getSeasonStandings() {
        const url = `${constants.ESPN.URL.STANDINGS}?leagueId=${leagueConfig.LEAGUE_ID}&seasonId=${leagueConfig.SEASON_ID}`;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let table = document.querySelectorAll('table.tableBody')[0];
                table.deleteRow(0);
                table = '<table>' + table.innerHTML + '</table>';
                const sortedTable = this._sortTable(table);

                resolve(sortedTable);
            }, reject);
        });
    },

    getSeasonTeamStats() {
        const url = `${constants.ESPN.URL.STANDINGS}?leagueId=${leagueConfig.LEAGUE_ID}&seasonId=${leagueConfig.SEASON_ID}`;

        return new Promise((resolve, reject) => {
            JSDOM.fromURL(url).then(dom => {
                const document = dom.window.document;
                let standingsTable = document.querySelectorAll('table.tableBody')[1];
                standingsTable.deleteRow(0);
                standingsTable = '<table>' + standingsTable.innerHTML + '</table>';
                const sortedTable = this._sortTable(standingsTable);

                sortedTable.map(teamStats => {
                    const teamString = teamStats.TEAM.split('(');
                    const teamName = teamString[0];
                    const owner = teamString[1];
                    teamStats.TEAM = teamName.trim();
                    teamStats.OWNER = owner.replace(')', '').trim();
                });

                resolve(sortedTable);
            }, reject);
        });
    },

    _sortTable(tableHtml) {
        const items = [];
        const columnHeadings = [];
        const $ = cheerio.load(tableHtml);
        const table = $('table');
        const trs = $(table).find('tr');
        const headers = {};

        trs.each(function(i, row) {
            const itemObj = {};

            $(row).find('td').each(function(j, cell) {
                var value = $(cell).text().trim();

                if (value) {
                    if (!i) {
                        headers[j] = value.split(',')[0];
                    } else {
                        itemObj[headers[j]] = value.split(',')[0];
                    }
                }
          });


          i && items.push(itemObj);

        });

        return items;
    },

    _getPlayersFromTable(teamUrl, teamOptions) {
        return new Promise((resolve, reject) => {
            const players = [];

            JSDOM.fromURL(teamUrl, teamOptions).then(pageDom => {
                const html = pageDom.serialize();

                const dom = new JSDOM(html);
                const document = dom.window.document;

                let table = document.querySelector('.playerTableTable');
                table.deleteRow(0);
                table = '<table>' + table.innerHTML + '</table>';

                var jsonResponse = [],
                    alreadySeen = [];

                const $ = cheerio.load(table);
                const theTable = $('table');

                var columnHeadings = [];

                var trs = $(theTable).find('tr');

                const headers = {};

                trs.each(function(i, row) {
                    const playerObject = {};

                    $(row).find('td').each(function(j, cell) {
                        var value = $(cell).text().trim();

                        if (value) {
                            if (!i) {
                                headers[j] = value.split(',')[0];
                            } else {
                                playerObject[headers[j]] = value.split(',')[0];
                            }
                        }
                  });


                  i && players.push(playerObject);

              });

              resolve(players);
          });


        });
  },

    _scrapePlayerInfo(teamUrl, teamOptions) {
        return new Promise((resolve, reject) => {
            const players = [];

            request(teamUrl, (err, res, body) => {
                const $ = cheerio.load(body);
                const nameTokens = $('h3').filter('.team-name');
                var playerRows = $('.pncPlayerRow');
                var active = false;

                playerRows.each((i, row) => {

                   const player = {};

                   const position = $(row).find('.playerSlot')[0];
                   if (position && position.children[0]) {
                       player.position = position.children[0].data;
                   }

                   const nameNode = $(row).find('.playertablePlayerName')[0];
                   player.playerId = nameNode.children[0].attribs.playerId;
                   player.name = nameNode.children[0].children[0].data;

                   const dataNodes = $(row).find('.playertableData');
                   player.positionRank = dataNodes[0].children[0].data;
                   const pointNodes = $(row).find('.playertableStat.appliedPoints');
                   player.points = pointNodes[0].children[0].data;
                   player.average = pointNodes[1].children[0].data;
                   players.push(player);
                });
                resolve(players);

            });
        });
    },

    getPlayersFromQuickBoxScore(teamUrl, teamOptions) {
        return new Promise((resolve, reject) => {
            JSDOM.fromURL(teamUrl, teamOptions).then(pageDom => {
                const html = pageDom.serialize();
                const dom = new JSDOM(html);
                const document = dom.window.document;

                const teamBreakdowns = {};

                let tables = document.querySelectorAll('.playerTableTable');

                let teamName = tables[0].rows[0].cells[0].innerHTML;
                debugger;
                teamName = teamName.replace(' Box Score', '').trim();
                teamBreakdowns[teamName] = {};

                const team = teamBreakdowns[teamName];

                team.starters = this.getPlayersByTable(tables[0], 3);
                team.bench = this.getPlayersByTable(tables[1], 2);

                let teamNameTwo = tables[2].rows[0].cells[0].innerHTML;

                debugger;
                teamNameTwo = teamNameTwo.replace(' Box Score', '').trim();
                teamBreakdowns[teamNameTwo] = {};

                const teamTwo = teamBreakdowns[teamNameTwo];

                teamTwo.starters = this.getPlayersByTable(tables[2], 3);
                teamTwo.bench = this.getPlayersByTable(tables[3], 2);

                resolve(teamBreakdowns);
            }, reject);
        });
    },

    getPlayersByTable(table, startingIndex) {
        const players = [];
        Array.from(table.rows).forEach((row, index) => {
            let name, position, points;
            if (index >= startingIndex) {
                name = row.cells[1].textContent;
                position = name.split(/\s/)[3];

                if (row.cells[2].innerHTML.match('BYE')) {
                    points = row.cells[3].innerHTML;
                } else {
                    points = row.cells[4].innerHTML;
                }

                points = isNaN(points) ? 0 : parseInt(points, 10);

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
    },

    getPlayersFromBoxScore(url, options) {
        return new Promise((resolve, reject) => {
            const starters = {
                offensive: {},
                defensive: {},
                other: {},
            };

            const bench = {
                offensive: {},
                defensive: {},
                other: {},
            };

            JSDOM.fromURL(url, options).then(pageDom => {
                let players = {};
                const html = pageDom.serialize();

                const dom = new JSDOM(html);
                const document = dom.window.document;

                const teamGroups = document.querySelector('div[style="width: 100%; margin-bottom: 40px; clear: both;"]');
                const tables = teamGroups.getElementsByTagName('table');

               for(let i = 0; i < tables.length; i++) {
                   let playerType = null;
                   const table = tables.item(i);
                    debugger;

                   for (let j = 0; j < table.rows.length; j++) {
                       const row = table.rows.item(j);
                       const categoryRowIndex = i === 0 ? 1 : 0;
                       if (j === categoryRowIndex) {
                           playerType = this.getPlayerType(row);
                           const startOrBench = playerType[0];
                           const offOrDef = playerType[1];

                           const startOrBenchObject = players[startOrBench] || {};
                           startOrBenchObject[offOrDef] = {};



                           //players[startOrBench] = players[startOrBench] || startOrBenchObject;
                       }
                   }
               }

               debugger;

                console.info(teamGroups);

                resolve(teamGroups);

                resolve();

            });


        });
    },

    getPlayerType(row) {
        const text = row.cells[0].innerHTML;
        const split = text.split(':');
        const playerType = split[1].trim().split(' ');
        return [this.toTypeCase(split[0]), this.toTypeCase(playerType[0])];
    },

    toTypeCase(text) {
        let formattedText = text.trim();
        const firstLetter = formattedText.charAt(0);
        const word = formattedText.toLowerCase();
        return `${firstLetter}${word.substr(1)}`;
    }


};
