const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

// TEST ROUTE
app.get('/', (req, res) => {
    res.send('API is working!');
});

// GET USERS (employee login data)
app.get('/users', (req, res) => {
    db.query(`
        SELECT 
            FirstName AS username,
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
}); // 

// Login Route
app.post("/users/login", async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await db.execute(
        "SELECT * FROM employee WHERE FirstName = ? AND EmployeeID = ?",
        [username, String(password)]
    );
    if (rows.length > 0) {
        res.json({ username: rows[0].FirstName });
    } else {
        res.status(401).send("Invalid login");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});