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
    
    console.log("Received username:", username);
    console.log("Received password:", password);
    console.log("Password type:", typeof password);

    const [rows] = await db.execute(
        "SELECT FirstName, EmployeeID FROM employee WHERE FirstName = ?",
        [username]
    );
    
    console.log("Database rows found:", rows);

    if (rows.length > 0) {
        console.log("DB password:", rows[0].EmployeeID);
        console.log("DB password type:", typeof rows[0].EmployeeID);
    }

    if (rows.length > 0 && String(rows[0].EmployeeID) === String(password)) {
        res.json({ username: rows[0].FirstName });
    } else {
        res.status(401).send("Invalid login");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});