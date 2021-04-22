const express = require("express");
const bodyParser = require("body-parser");
const port = 5000;
const app = express();
const cors = require("cors");
const pool = require("./db");

// ratings constants
const k = 50;
const diff = 800;

// Season info
const currentSeason = 2;
const previousSeason = currentSeason - 1;
const seasonStartDate = "2021-03-25";

app.use(bodyParser.json());
app.use(cors());

app.get("/players", async (req, res) => {
  let conn;
  try {
    // establish a connection to MariaDB
    conn = await pool.getConnection();
    // create a new query
    var query = `select p.*,prev.rating as prev_rating,prev.aram_rating as prev_aram_rating from players p left join players_season_${previousSeason} prev on p.id=prev.id`;
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

app.get("/player/:id/stats", async (req, res) => {
  const { id } = req.params;
  let conn;
  try {
    conn = await pool.getConnection();

    var query = `select name from players where id = ${id};`;
    var [nameResult] = await conn.query(query);
    var { name } = nameResult;

    var playerquery = `select * from players where id = ${id};`;
    var [player] = await conn.query(playerquery);

    query = `select count(*) as count from games where (red rlike "${id}-Jungle-[^,]+-${name}-${id}" or blue rlike "${id}-Jungle-[^,]+-${name}-${id}") and map="Summoner's Rift" and date > "${seasonStartDate}" ;`;
    var [srJungle] = await conn.query(query);

    query = `select count(*) as count from games where (red rlike "${id}-Lane-[^,]+-${name}-${id}" or blue rlike "${id}-Lane-[^,]+-${name}-${id}") and map="Summoner's Rift" and date > "${seasonStartDate}" ;`;
    var [srLane] = await conn.query(query);

    query = `select count(*) as count from games where (red rlike "${id}-Fill-[^,]+-${name}-${id}" or blue rlike "${id}-Fill-[^,]+-${name}-${id}") and map="Summoner's Rift" and date > "${seasonStartDate}";`;
    var [srFill] = await conn.query(query);

    query = `select count(*) as count from games where (red rlike "${id}-Fill-[^,]+-${name}-${id}" or blue rlike "${id}-Fill-[^,]+-${name}-${id}") and map="Howling Abyss" and date > "${seasonStartDate}";`;
    var [haFill] = await conn.query(query);

    query = `select count(*) as count from games where ((red rlike "${id}-Lane-[^,]+-${name}-${id}" and winning_side="red") or (blue rlike "${id}-Lane-[^,]+-${name}-${id}" and winning_side="blue")) and map="Summoner's Rift" and date > "${seasonStartDate}";`;
    var [laneWins] = await conn.query(query);
    const laneWR = srLane.count
      ? Number((laneWins.count / srLane.count) * 100).toFixed(0)
      : 0;

    query = `select count(*) as count from games where ((red rlike "${id}-Jungle-[^,]+-${name}-${id}" and winning_side="red") or (blue rlike "${id}-Jungle-[^,]+-${name}-${id}" and winning_side="blue")) and map="Summoner's Rift" and date > "${seasonStartDate}";`;
    console.log("a", query);
    var [jungleWins] = await conn.query(query);
    const jungleWR = srJungle.count
      ? Number((jungleWins.count / srJungle.count) * 100).toFixed(0)
      : 0;

    let srChampsQuery = `select blue,red from games where (red rlike "${id}-[^,]+-[^,]+-${name}-${id}" or blue rlike "${id}-[^,]+-[^,]+-${name}-${id}") and map="Summoner's Rift" and date > "${seasonStartDate}";`;
    var srChamps = await conn.query(srChampsQuery);
    console.log("srChampsQuery", srChampsQuery);
    srChamps = srChamps.slice(0, srChamps.length);
    srChamps = srChamps.map(
      (c) =>
        c.red.match(`${id}.*-(.*)-${name}-${id}`) ||
        c.blue.match(`${id}.*-(.*)-${name}-${id}`)
    );
    srChamps = srChamps.map((c) => c[1]);
    srChamps = [...new Set(srChamps)];

    let haChampsQuery = `select blue,red from games where (red rlike "${id}-[^,]+-[^,]+-${name}-${id}" or blue rlike "${id}-[^,]+-[^,]+-${name}-${id}") and map="Howling Abyss" and date > "${seasonStartDate}";`;
    var haChamps = await conn.query(haChampsQuery);

    haChamps = haChamps.slice(0, haChamps.length);
    haChamps = haChamps.map(
      (c) =>
        c.red.match(`${id}.*-(.*)-${name}-${id}`) ||
        c.blue.match(`${id}.*-(.*)-${name}-${id}`)
    );
    haChamps = haChamps.map((c) => c[1]);
    haChamps = [...new Set(haChamps)];
    const func = () => {
      const promises = srChamps.map(async (champ) => {
        let query = `select count(*) as count from games where ((red rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="red") or (blue rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="blue")) and map="Summoner's Rift" and date > "${seasonStartDate}";`;
        const wins = await conn.query(query);
        query = `select count(*) as count from games where ((red rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="blue") or (blue rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="red")) and map="Summoner's Rift" and date > "${seasonStartDate}";`;
        const loses = await conn.query(query);
        return {
          name: champ,
          count: wins[0].count + loses[0].count,
          wins: wins[0].count,
          loses: loses[0].count,
        };
      });

      return Promise.all(promises);
    };

    const func2 = () => {
      const promises = haChamps.map(async (champ) => {
        let query = `select count(*) as count from games where ((red rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="red") or (blue rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="blue")) and map="Howling Abyss" and date > "${seasonStartDate}";`;
        const wins = await conn.query(query);
        query = `select count(*) as count from games where ((red rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="blue") or (blue rlike "${id}-[^,]+-${champ}-${name}-${id}" and winning_side="red")) and map="Howling Abyss" and date > "${seasonStartDate}";`;
        const loses = await conn.query(query);
        return {
          name: champ,
          count: wins[0].count + loses[0].count,
          wins: wins[0].count,
          loses: loses[0].count,
        };
      });

      return Promise.all(promises);
    };

    const srChampWrArr = await func();
    const haChampWrArr = await func2();

    res.send({
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
      },
    });
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});

app.get("/player/:id/map/:map/games", async (req, res) => {
  const { id, map } = req.params;
  let mapF = "";
  if (map === "SR") {
    mapF = "Summoner's Rift";
  } else if (map === "HA") {
    mapF = "Howling Abyss";
  }

  const { page, limit } = req.query;
  let conn;
  try {
    conn = await pool.getConnection();
    var query = `select name from players where id = ${id};`;
    var [nameResult] = await conn.query(query);
    var { name } = nameResult;
    var query = `select * from games where (red rlike "${id}-[^,]+-[^,]+-${name}-${id}" or blue rlike "${id}-[^,]+-[^,]+-${name}-${id}") and date > "${seasonStartDate}" and  map="${mapF}" order by id desc limit ${
      limit || 1000
    } offset ${page * limit - limit || 0};`;
    var rows = await conn.query(query);

    var query = `select count(*) as count from games where (red rlike "${id}-[^,]+-[^,]+-${name}-${id}" or blue rlike "${id}-[^,]+-[^,]+-${name}-${id}") and date > "${seasonStartDate}" and map="${mapF}";`;
    var total = await conn.query(query);

    rows = rows.map((row) => {
      const redPlayers = row.red.split(",");
      const bluePlayers = row.blue.split(",");

      let winner = false;

      if (row.winning_side === "blue") {
        winner = bluePlayers.some((element) => {
          const [, , , player] = element.split("-");
          return player === name;
        });
      }

      if (row.winning_side === "red") {
        winner = redPlayers.some((element) => {
          const [, , , player] = element.split("-");
          return player === name;
        });
      }
      const ratingChange = winner ? row.winner_rating : row.loser_rating;
      const redTeam = redPlayers.map((player) => {
        const [id, role, champ, playerName] = player.split("-");
        return { id, role, player: playerName, champ };
      });

      const blueTeam = bluePlayers.map((player) => {
        const [id, role, champ, playerName] = player.split("-");
        return { id, role, player: playerName, champ };
      });

      const { champ: myChamp } = [...redTeam, ...blueTeam].find(
        (e) => e.player === name
      );

      return {
        id: row.id,
        map: row.map,
        date: row.date,
        blue: blueTeam,
        red: redTeam,
        winner,
        myChamp,
        playerName: name,
        ratingChange,
      };
    });

    res.send({ total: total[0].count, games: rows });
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});
app.get("/stats/:id", async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    // establish a connection to MariaDB
    conn = await pool.getConnection();
    var query = `SELECT id, name FROM players where id = ${id}`;
    const me = await conn.query(query);
    query = `SELECT id, name FROM players where id != ${id}`;
    const others = await conn.query(query);
    const winrate = (wins, games) => {
      if (games === 0) return 0;
      return Math.round((wins * 100) / games);
    };
    const func = () => {
      const promises = others.map(async (player) => {
        query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%" and date > "${seasonStartDate}") AS sub WHERE winners LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
        const teamWinCount = await conn.query(query);
        query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%" and date > "${seasonStartDate}") AS sub WHERE losers LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
        const teamLoseCount = await conn.query(query);
        query = `SELECT count(*) as count from (SELECT * FROM games WHERE winners LIKE "%${me[0].name}-${me[0].id}%" and date > "${seasonStartDate}") AS sub WHERE losers LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
        const enemyWinCount = await conn.query(query);
        query = `SELECT count(*) as count from (SELECT * FROM games WHERE losers LIKE "%${me[0].name}-${me[0].id}%" and date > "${seasonStartDate}") AS sub WHERE winners LIKE "%${player.name}-${player.id}%" and map="Summoner's Rift";`;
        const enemyLoseCount = await conn.query(query);
        return {
          id: player.id,
          name: player.name,
          teamWins: teamWinCount[0].count,
          teamLoses: teamLoseCount[0].count,
          teamCount: teamWinCount[0].count + teamLoseCount[0].count,
          teamWinrate: winrate(
            teamWinCount[0].count,
            teamWinCount[0].count + teamLoseCount[0].count
          ),
          enemyWins: enemyWinCount[0].count,
          enemyLoses: enemyLoseCount[0].count,
          enemyCount: enemyWinCount[0].count + enemyLoseCount[0].count,
          enemyWinrate: winrate(
            enemyWinCount[0].count,
            enemyWinCount[0].count + enemyLoseCount[0].count
          ),
        };
      });
      return Promise.all(promises);
    };
    const results = await func();
    return res.send(results);
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});

app.get("/aramStats/:id", async (req, res) => {
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
        return {
          player: player.name,
          teamWins: teamWinCount[0].count,
          teamLoses: teamLoseCount[0].count,
          enemyWins: enemyWinCount[0].count,
          enemyLoses: enemyLoseCount[0].count,
        };
      });
      return Promise.all(promises);
    };
    const results = await func();
    return res.send(results);
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});

app.post("/games", async (req, res) => {
  const {
    map,
    game_size,
    winners,
    losers,
    winning_side,
    winnerIds,
    loserIds,
    blue,
    red,
    date,
  } = req.body;
  let conn;
  try {
    conn = await pool.getConnection();
    if (map === "Howling Abyss") {
      var query = `UPDATE players SET aram_wins=aram_wins+1 WHERE id in (${winnerIds});`;
      await conn.query(query);

      var query = `UPDATE players SET aram_loses=aram_loses+1 WHERE id in (${loserIds});`;
      await conn.query(query);

      var query = `UPDATE players SET aram_winrate=Round(aram_wins/(aram_loses+aram_wins)*100,0) WHERE aram_loses+aram_wins != 0;`;
      await conn.query(query);

      // NEW
      var query = `select sum(aram_rating) as winnerSum from players where id in (${winnerIds});`;
      let [winnerResult] = await conn.query(query);
      let { winnerSum } = winnerResult;
      winnerSum /= game_size;

      var query = `select sum(aram_rating) as loserSum from players where id in (${loserIds});`;
      let [loserResult] = await conn.query(query);
      let { loserSum } = loserResult;
      loserSum /= game_size;

      const probability1 =
        1 / (1 + Math.pow(10, (loserSum - winnerSum) / diff));
      const probability2 =
        1 / (1 + Math.pow(10, (winnerSum - loserSum) / diff));
      const winnerRating = k * (1 - probability1);
      const loserRating = k * (0 - probability2);

      var query = `update players set aram_rating=aram_rating+${winnerRating} where id in (${winnerIds});`;
      await conn.query(query);
      var query = `update players set aram_rating=aram_rating+${loserRating} where id in (${loserIds});`;
      await conn.query(query);
      var query = `INSERT INTO games (game_size, winning_side, winners, losers, blue, red, date, map, winner_rating, loser_rating) VALUES (${game_size}, "${winning_side}", "${winners}", "${losers}",  "${blue}", "${red}", "${date}", "${map}",${winnerRating},${loserRating});`;
      await conn.query(query);
    } else {
      var query = `UPDATE players SET wins=wins+1 WHERE id in (${winnerIds});`;
      await conn.query(query);

      var query = `UPDATE players SET loses=loses+1 WHERE id in (${loserIds});`;
      await conn.query(query);

      var query = `UPDATE players SET winrate=Round(wins/(loses+wins)*100,0) WHERE loses+wins != 0;`;
      await conn.query(query);

      // NEW
      var query = `select sum(rating) as winnerSum from players where id in (${winnerIds});`;
      let [winnerResult] = await conn.query(query);
      let { winnerSum } = winnerResult;
      winnerSum /= game_size;

      var query = `select sum(rating) as loserSum from players where id in (${loserIds});`;
      let [loserResult] = await conn.query(query);
      let { loserSum } = loserResult;
      loserSum /= game_size;

      const probability1 =
        1 / (1 + Math.pow(10, (loserSum - winnerSum) / diff));
      const probability2 =
        1 / (1 + Math.pow(10, (winnerSum - loserSum) / diff));
      const winnerRating = k * (1 - probability1);
      const loserRating = k * (0 - probability2);

      var query = `update players set rating=rating+${winnerRating} where id in (${winnerIds});`;
      await conn.query(query);
      var query = `update players set rating=rating+${loserRating} where id in (${loserIds});`;
      await conn.query(query);
      var query = `INSERT INTO games (game_size, winning_side, winners, losers, blue, red, date, map, winner_rating, loser_rating) VALUES (${game_size}, "${winning_side}", "${winners}", "${losers}",  "${blue}", "${red}", "${date}", "${map}",${winnerRating},${loserRating});`;
      await conn.query(query);
    }

    res.sendStatus(200);
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});

app.get("/games", async (req, res) => {
  const { page, limit } = req.query;
  let conn;
  try {
    conn = await pool.getConnection();
    var query = `select * from games where red is not null and date > "2021-03-06" order by id desc limit ${
      limit || 1000
    } offset ${page * limit - limit || 0};`;
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

app.post("/player", async (req, res) => {
  const { name } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    var query = `insert into players (name,wins,loses,winrate,aram_wins,aram_loses,aram_winrate,rating,aram_rating) values ("${name}",0,0,0,0,0,0,1500,1500);`;
    var result = await conn.query(query);

    res.sendStatus(200);
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});

app.post("/setRatings", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    var query = `select max(id) as count from games;`;
    var [result] = await conn.query(query);
    const { count } = result;
    var query = `update players set rating=1500;`;
    await conn.query(query);
    var query = `update players set aram_rating=1500;`;
    await conn.query(query);
    for (let i = 144; i <= count; i++) {
      var query = `select * from games where id = ${i};`;
      var [result] = await conn.query(query);

      if (!result) {
      } else {
        if (result.map === "Summoner's Rift") {
          let winners = result.winners.split(",");
          winners = winners.map((w) => Number(w.split("-")[1]));
          let losers = result.losers.split(",");
          losers = losers.map((l) => Number(l.split("-")[1]));
          const teamSize = losers.length;
          winners = winners.toString();
          losers = losers.toString();

          //winners
          var query = `select sum(rating) as winnerSum from players where id in (${winners});`;
          let [winnerResult] = await conn.query(query);
          let { winnerSum } = winnerResult;
          winnerSum /= teamSize;

          //losers
          var query = `select sum(rating) as loserSum from players where id in (${losers});`;
          let [loserResult] = await conn.query(query);
          let { loserSum } = loserResult;
          loserSum /= teamSize;

          const probability1 =
            1 / (1 + Math.pow(10, (loserSum - winnerSum) / diff));
          const probability2 =
            1 / (1 + Math.pow(10, (winnerSum - loserSum) / diff));
          const winnerRating = k * (1 - probability1);
          const loserRating = k * (0 - probability2);

          var query = `update players set rating=rating+${winnerRating} where id in (${winners});`;
          await conn.query(query);
          var query = `update players set rating=rating+${loserRating} where id in (${losers});`;
          await conn.query(query);
          var query = `update games set winner_rating=${winnerRating},loser_rating=${loserRating} where id = ${i};`;
          await conn.query(query);
        } else {
          let winners = result.winners.split(",");
          winners = winners.map((w) => Number(w.split("-")[1]));
          let losers = result.losers.split(",");
          losers = losers.map((l) => Number(l.split("-")[1]));
          const teamSize = losers.length;
          winners = winners.toString();
          losers = losers.toString();

          //winners
          var query = `select sum(aram_rating) as winnerSum from players where id in (${winners});`;
          let [winnerResult] = await conn.query(query);
          let { winnerSum } = winnerResult;
          winnerSum /= teamSize;

          //losers
          var query = `select sum(aram_rating) as loserSum from players where id in (${losers});`;
          let [loserResult] = await conn.query(query);
          let { loserSum } = loserResult;
          loserSum /= teamSize;

          const probability1 =
            1 / (1 + Math.pow(10, (loserSum - winnerSum) / diff));
          const probability2 =
            1 / (1 + Math.pow(10, (winnerSum - loserSum) / diff));
          const winnerRating = k * (1 - probability1);
          const loserRating = k * (0 - probability2);

          var query = `update players set aram_rating=aram_rating+${winnerRating} where id in (${winners});`;
          await conn.query(query);
          var query = `update players set aram_rating=aram_rating+${loserRating} where id in (${losers});`;
          await conn.query(query);
          var query = `update games set winner_rating=${winnerRating},loser_rating=${loserRating} where id = ${i};`;
          await conn.query(query);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    throw err;
  } finally {
    if (conn) return conn.release();
  }
});

// app.post('/aramRating', async (req, res) => {

//     let conn;
//     try {
//         conn = await pool.getConnection();
//         var query = `update players set aram_rating=1500;`;
//         await conn.query(query);
//         for (let i = 145; i < 201; i++) {
//             console.log('i', i);
//             var query = `select * from games where id = ${i} and map="Howling Abyss";`;
//             var [result] = await conn.query(query);

//             if (result) {
//                 console.log('result not skipped', i)
//                 let winners = result.winners.split(',');
//                 winners = winners.map(w => Number(w.split('-')[1]));
//                 let losers = result.losers.split(',');
//                 losers = losers.map(l => Number(l.split('-')[1]));
//                 const teamSize = losers.length;
//                 winners = winners.toString();
//                 losers = losers.toString();

//                 //winners
//                 var query = `select sum(aram_rating) as winnerSum from players where id in (${winners});`;
//                 let [winnerResult] = await conn.query(query);
//                 let { winnerSum } = winnerResult;
//                 winnerSum /= teamSize;

//                 //losers
//                 var query = `select sum(aram_rating) as loserSum from players where id in (${losers});`;
//                 let [loserResult] = await conn.query(query);
//                 let { loserSum } = loserResult;
//                 loserSum /= teamSize;

//                 const k = 40;
//                 const diff = 1000;

//                 const probability1 = (1 / (1 + Math.pow(10, (loserSum - winnerSum) / diff)));
//                 const probability2 = (1 / (1 + Math.pow(10, (winnerSum - loserSum) / diff)));
//                 const winnerRating = k * (1 - probability1);
//                 const loserRating = k * (0 - probability2);

//                 var query = `update players set aram_rating=aram_rating+${winnerRating} where id in (${winners});`;
//                 await conn.query(query);
//                 var query = `update players set aram_rating=aram_rating+${loserRating} where id in (${losers});`;
//                 await conn.query(query);
//                 var query = `update games set winner_rating=${winnerRating},loser_rating=${loserRating} where id = ${i};`;
//                 await conn.query(query);
//             }
//         }
//         res.sendStatus(200);
//     } catch (err) {
//         throw err;
//     } finally {
//         if (conn) return conn.release();
//     }

// });

app.listen(port, () => {
  console.log(`Randomizer-api listening at http://localhost:${port}`);
});
