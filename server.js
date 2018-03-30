const bodyParser = require('body-parser');
const express = require('express');
const dataAccess = require('./lib/dataAccess');

const app = express();
const http = require('http').Server(app);

const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/standings', async (req, res) => {
    const data = await dataAccess.getStandings();
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});

app.get('/stats', async (req, res) => {
    const data = await dataAccess.getStats();
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});

app.get('/scoreboard', async (req, res) => {
    const data = await dataAccess.getScoreBoard();
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});

app.get('/players', async (req, res) => {
    const data = await dataAccess.getPlayers(4, 1);
    if (data) {
        res.status(200).send(data);
    } else {
        res.send(200).send({});
    }
});


http.listen(port);
console.log(`Server listening on port ${port}`); // eslint-disable-line no-console
