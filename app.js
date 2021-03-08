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
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE winners LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
                const teamWinCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE losers LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
                const teamLoseCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE losers LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
                const enemyWinCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE winners LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
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

app.get('/aramStats/:id', async (req, res) => {
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
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE winners LIKE "%${player.name}-${player.id}%" and map="Howling Abyss";`;
                const teamWinCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE losers LIKE "%${player.name}-${player.id}%" and map="Howling Abyss";`;
                const teamLoseCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE losers LIKE "%${player.name}-${player.id}%" and map="Howling Abyss";`;
                const enemyWinCount = await conn.query(query);
                query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%") AS sub WHERE winners LIKE "%${player.name}-${player.id}%" and map="Howling Abyss";`;
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
    const { map, game_size, winners, losers, winning_side, winnerIds, loserIds, blue, red, date } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();

        var query = `INSERT INTO games (game_size, winning_side, winners, losers, blue, red, date, map) VALUES (${game_size}, "${winning_side}", "${winners}", "${losers}",  "${blue}", "${red}", "${date}", "${map}");`;
        await conn.query(query);

        if (map === 'Howling Abyss') {
            var query = `UPDATE players SET aram_wins=aram_wins+1 WHERE id in (${winnerIds});`;
            await conn.query(query);

            var query = `UPDATE players SET aram_loses=aram_loses+1 WHERE id in (${loserIds});`;
            await conn.query(query);

            var query = `UPDATE players SET aram_winrate=Round(aram_wins/(aram_loses+aram_wins)*100,0) WHERE aram_loses != 0 and aram_wins != 0;`;
            await conn.query(query);
        } else {
            var query = `UPDATE players SET wins=wins+1 WHERE id in (${winnerIds});`;
            await conn.query(query);

            var query = `UPDATE players SET loses=loses+1 WHERE id in (${loserIds});`;
            await conn.query(query);

            var query = `UPDATE players SET winrate=Round(wins/(loses+wins)*100,0) WHERE loses != 0 and wins != 0;`;
            await conn.query(query);
        }

        res.sendStatus(200);
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.get('/games', async (req, res) => {
    const { page, limit } = req.query;
    let conn;
    try {
        conn = await pool.getConnection();
        var query = `select * from games where red is not null order by id desc limit ${limit || 1000} offset ${page*limit-limit || 0};`;
        var games = await conn.query(query);
       
        var query = `select count(*) as count from games where red is not null`;
        var total = await conn.query(query);
        
        res.send({total: total[0].count, games});
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.post('/setRole', async (req, res) => {
    const { id, role } = req.body;
    let conn;
    try {
        // establish a connection to MariaDB
        conn = await pool.getConnection();
        // create a new query
        var query = `UPDATE players SET role="${role}" WHERE id = ${id};`;
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

app.listen(port, () => {
    console.log(`Randomizer-api listening at http://localhost:${port}`);
});