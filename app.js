const express = require("express");
const bodyParser = require('body-parser')
const port = 5000;
const app = express();
const cors = require('cors');
const pool = require('./db')

app.use(bodyParser.json());
app.use(cors());

// expose an endpoint "people"
app.get('/players', async (req, res) => {
    let conn;
    try {
        // establish a connection to MariaDB
        conn = await pool.getConnection();
        // create a new query
        var query = "select * from players";
        // execute the query and set the result to a new variable
        var rows = await conn.query(query);
        // return the results
        res.send(rows);
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.get('/reset', async (req, res) => {
    let conn;
    try {
        // establish a connection to MariaDB
        conn = await pool.getConnection();
        var query = `UPDATE players SET loses=0`;
        await conn.query(query);
        var query = `UPDATE players SET wins=0`;
        await conn.query(query);
        // return the results
        res.sendStatus(200);
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.get('/stats/:id', async (req, res) => {
    const { id } = req.params;

    let conn;
    try {
        // establish a connection to MariaDB
        conn = await pool.getConnection();
        var query = `SELECT id, name FROM players where id = ${id}`;
        const me = await conn.query(query);
        query = `SELECT id, name FROM players where id != ${id}`;
        const others = await conn.query(query);
        const func = () => {
            const promises = others.map(async (player) => {
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE winners LIKE "%${player.name}-${player.id}%";`;
                const teamWinCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE losers LIKE "%${player.name}-${player.id}%";`;
                const teamLoseCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE losers LIKE "%${player.name}-${player.id}%";`;
                const enemyWinCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE winners LIKE "%${player.name}-${player.id}%";`;
                const enemyLoseCount = await conn.query(query);
                return { player: player.name, teamWins: teamWinCount[0].count, teamLoses: teamLoseCount[0].count, enemyWins: enemyWinCount[0].count, enemyLoses: enemyLoseCount[0].count };
            });
            return Promise.all(promises);
        }
        const results = await func();
        return res.send(results);
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.post('/games', async (req, res) => {
    const { game_size, winners, losers, winning_side, winnerIds, loserIds } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        var query = `INSERT INTO games (game_size, winning_side, winners, losers) VALUES (${game_size}, "${winning_side}", "${winners}", "${losers}");`;
        const r = await conn.query(query);
        var query = `UPDATE players SET wins=wins+1 WHERE id in (${winnerIds});`;
        await conn.query(query);
        var query = `UPDATE players SET loses=loses+1 WHERE id in (${loserIds});`;
        await conn.query(query);
        var query = "select * from players";
        const result = await conn.query(query);
        // return the results
        res.send(result);
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.listen(port, () => {
    console.log(`Randomizer-api listening at http://localhost:${port}`);
});