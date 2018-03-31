const bodyParser = require('body-parser');
const express = require('express');
const {
    getStandings,
    getStats,
    getScoreBoard,
    getPlayers
} = require('./lib/dataAccess');

const app = express();
const http = require('http').Server(app);

const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/standings', async (req, res) => {
    const data = await getStandings();
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});

app.get('/stats', async (req, res) => {
    const data = await getStats();
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});

app.get('/scoreboard', async (req, res) => {
    const data = await getScoreBoard();
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});

app.get('/players', async (req, res) => {
    const week = req.query.week;
    if (week) {
        const data = await getPlayers(week);
        if (data) {
            res.status(200).send(data);
        } else {
            res.status(200).send({});
        }
    } else {
        res.status(500).send({
            message: 'You must specify a week number in the request query'
        });
    }
});

http.listen(port);
console.log(`Server listening on port ${port}`); // eslint-disable-line no-console
