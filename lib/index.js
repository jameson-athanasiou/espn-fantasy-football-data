const {
    getStats,
    getStandings,
    getPlayers,
    getFullBoxScore,
    getScoreBoard
} = require('./dataAccess');
const {
    getPlayerRankings
} = require('./playerRankingAccess');

module.exports = {
    getStats,
    getStandings,
    getPlayers,
    getFullBoxScore,
    getScoreBoard,
    getPlayerRankings
};
