const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

console.log({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
});

const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: Number(process.env.MYSQLPORT),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 
app.get('/', (req, res) => {
    res.send('API is working!');
});

// 
app.get('/users', (req, res) => {
    db.query(`
        SELECT 
            EmployeeID,
            CONCAT(FirstName, ' ', LastName) AS username,
            EmployeeID AS password
        FROM employee
    `, (err, result) => {
        if (err) {
            console.log("MYSQL ERROR:", err);
            return res.status(500).json({
                fatal: true,
                error: err.message
            });
        }
        res.json(result);
    });
});// 

app.post("/users/login", async (req, res) => {
    const { username, password } = req.body;

    const [rows] = await db.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password]
    );

    if (rows.length > 0) {
        res.json({ username: rows[0].username });
    } else {
        res.status(401).send("Invalid login");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});