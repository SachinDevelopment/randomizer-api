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


app.get('/win/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        // establish a connection to MariaDB
        conn = await pool.getConnection();
        // create a new query
        var query = `UPDATE players SET wins=wins+1 WHERE id=${id}`;
        // execute the query and set the result to a new variable
        await conn.query(query);
        // return the results
        res.sendStatus(200);
    } catch (err) {
        throw err;
    } finally {
        if (conn) return conn.release();
    }
});

app.get('/lose/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        // establish a connection to MariaDB
        conn = await pool.getConnection();
        // create a new query
        var query = `UPDATE players SET loses=loses+1 WHERE id=${id}`;
        // execute the query and set the result to a new variable
        await conn.query(query);
        // return the results
        res.sendStatus(200);
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

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});