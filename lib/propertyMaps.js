const standingsMap = {
    GB: 'gamesBehind',
    L: 'losses',
    PCT: 'winningPercentage',
    T: 'ties',
    TEAM: 'team',
    W: 'wins'
};

const statsMap = {
    AWAY: 'awayRecord',
    DIV: 'divisionalRecord',
    HOME: 'homeRecord',
    OWNER: 'owner',
    PA: 'pointsAgainst',
    PF: 'pointsScored',
    STREAK: 'winningStreak',
    TEAM: 'team'
};

module.exports = {
    standingsMap,
    statsMap
};
