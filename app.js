const express = require("express");
const bodyParser = require('body-parser')
const port = 5000;
const app = express();
const cors = require('cors');
const pool = require('./db')

app.use(bodyParser.json());
app.use(cors());

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

app.get('/player/:id/stats', async (req, res) => {

    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();

        var query = `select name from players where id = ${id};`;
        var [nameResult] = await conn.query(query);
        var { name } = nameResult;

        var playerquery = `select * from players where id = ${id};`;
        var [player] = await conn.query(playerquery);

        query = `select count(*) as count from games where (red like "%${id}-Jungle-%-${name}-${id}%" or blue like "%${id}-Jungle-%-${name}-${id}%") and map="Summoner's Rift";`;
        var [srJungle] = await conn.query(query);

        query = `select count(*) as count from games where (red like "%${id}-Lane-%-${name}-${id}%" or blue like "%${id}-Lane-%-${name}-${id}%") and map="Summoner's Rift";`;
        var [srLane] = await conn.query(query);

        query = `select count(*) as count from games where (red like "%${id}-Fill-%-${name}-${id}%" or blue like "%${id}-Fill-%-${name}-${id}%") and map="Summoner's Rift";`;
        var [srFill] = await conn.query(query);

        query = `select count(*) as count from games where (red like "%${id}-Fill-%-${name}-${id}%" or blue like "%${id}-Fill-%-${name}-${id}%") and map="Howling Abyss";`;
        var [haFill] = await conn.query(query);

        query = `select count(*) as count from games where ((red like "%${id}-Lane-%-${name}-${id}%" and winning_side="red") or (blue like "%${id}-Lane-%-${name}-${id}%" and winning_side="blue")) and map="Summoner's Rift";`;
        var [laneWins] = await conn.query(query);
        const laneWR = srLane.count ? Number(laneWins.count / srLane.count * 100).toFixed(0) : 0;
        
        query = `select count(*) as count from games where ((red like "%${id}-Jungle-%-${name}-${id}%" and winning_side="red") or (blue like "%${id}-Jungle-%-${name}-${id}%" and winning_side="blue")) and map="Summoner's Rift";`;
        var [jungleWins] = await conn.query(query);
        const jungleWR = srJungle.count ? Number(jungleWins.count / srJungle.count * 100).toFixed(0) : 0;


        let srChampsQuery = `select blue,red from games where (red like "%${id}%${id}%" or blue like "%${id}%${id}%") and map="Summoner's Rift";`;
        var srChamps = await conn.query(srChampsQuery);

        srChamps = srChamps.slice(0, srChamps.length);
        srChamps = srChamps.map((c) => c.red.match(`${id}.*-(.*)-${name}-${id}`) || c.blue.match(`${id}.*-(.*)-${name}-${id}`));
        srChamps = srChamps.map(c => c[1]);
        srChamps = [...new Set(srChamps)];

        let haChampsQuery = `select blue,red from games where (red like "%${id}%${id}%" or blue like "%${id}%${id}%") and map="Howling Abyss";`;
        var haChamps = await conn.query(haChampsQuery);

        haChamps = haChamps.slice(0, haChamps.length);
        haChamps = haChamps.map((c) => c.red.match(`${id}.*-(.*)-${name}-${id}`) || c.blue.match(`${id}.*-(.*)-${name}-${id}`));
        haChamps = haChamps.map(c => c[1]);
        haChamps = [...new Set(haChamps)];

        const func = () => {
            const promises = srChamps.map(async (champ) => {
                let query = `select count(*) as count from games where ((red like "%${id}-%-${champ}-${name}-${id}%" and winning_side="red") or (blue like "%${id}-%-${champ}-${name}-${id}%" and winning_side="blue")) and map="Summoner's Rift";`;
                const wins = await conn.query(query);
                query = `select count(*) as count from games where ((red like "%${id}-%-${champ}-${name}-${id}%" and winning_side="blue") or (blue like "%${id}-%-${champ}-${name}-${id}%" and winning_side="red")) and map="Summoner's Rift";`;
                const loses = await conn.query(query);
                return { name: champ, count: wins[0].count + loses[0].count, wins: wins[0].count, loses: loses[0].count, };
            })

            return Promise.all(promises);
        }

        const func2 = () => {
            const promises = haChamps.map(async (champ) => {
                let query = `select count(*) as count from games where ((red like "%${id}-%-${champ}-${name}-${id}%" and winning_side="red") or (blue like "%${id}-%-${champ}-${name}-${id}%" and winning_side="blue")) and map="Howling Abyss";`;
                const wins = await conn.query(query);
                query = `select count(*) as count from games where ((red like "%${id}-%-${champ}-${name}-${id}%" and winning_side="blue") or (blue like "%${id}-%-${champ}-${name}-${id}%" and winning_side="red")) and map="Howling Abyss";`;
                const loses = await conn.query(query);
                return { name: champ, count: wins[0].count + loses[0].count, wins: wins[0].count, loses: loses[0].count };
            })

            return Promise.all(promises);
        }

        const srChampWrArr = await func();
        const haChampWrArr = await func2();

        res.send(
            {
                ...player,
                sr: {
                    lane: srLane.count,
                    laneWR,
                    jungle: srJungle.count,
                    jungleWR,
                    fill: srFill.count,
                    champs: srChampWrArr,
                },
                ha: {
                    fill: haFill.count,
                    champs: haChampWrArr,
                }
            });
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.get('/player/:id/games', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        var query = `select name from players where id = ${id};`;
        var [nameResult] = await conn.query(query);
        var { name } = nameResult;

        var query = `select * from games where (red like "%${id}-%-${id}%" or blue like "%${id}-%-${id}%") order by id desc;`;
        var rows = await conn.query(query);
        rows = rows.map(row => {
            const redPlayers = row.red.split(',');
            const bluePlayers = row.blue.split(',');

            let winner = false;

            if (row.winning_side === "blue") {
                winner = bluePlayers.some(element => {
                    const [, , , player] = element.split('-');
                    return player === name;
                });
            }

            if (row.winning_side === "red") {
                winner = redPlayers.some(element => {
                    const [, , , player] = element.split('-');
                    return player === name;
                });
            }

            const redTeam = redPlayers.map(player => {
                const [id, role, champ, playerName] = player.split('-')
                return { id, role, player: playerName, champ };
            });

            const blueTeam = bluePlayers.map(player => {
                const [id, role, champ, playerName] = player.split('-')
                return { id, role, player: playerName, champ };
            });

            const { champ: myChamp } = [...redTeam, ...blueTeam].find((e) => e.player === name);

            return { id: row.id, map: row.map, date: row.date, blue: blueTeam, red: redTeam, winner, myChamp, playerName: name };
        })

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
        var query = `select * from games where red is not null and date > "2021-03-06" order by id desc limit ${limit || 1000} offset ${page * limit - limit || 0};`;
        var games = await conn.query(query);

        var query = `select count(*) as count from games where red is not null and date > "2021-03-06"`;
        var total = await conn.query(query);

        res.send({ total: total[0].count, games });
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.listen(port, () => {
    console.log(`Randomizer-api listening at http://localhost:${port}`);
});