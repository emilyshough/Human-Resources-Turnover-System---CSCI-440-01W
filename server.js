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
app.post("/users/login", (req, res) => {
    const { username, password } = req.body;

    // First check manager table
    db.query(
        `SELECT e.FirstName, e.EmployeeID 
         FROM employee e 
         JOIN manager m ON e.EmployeeID = m.EmployeeID 
         WHERE e.FirstName = ? AND e.EmployeeID = ?`,
        [username, password],
        (err, managerRows) => {
            if (err) return res.status(500).json({ error: err.message });

            if (managerRows.length > 0) {
                return res.json({ username: managerRows[0].FirstName, role: "manager" });
            }

            // If not a manager, check regular employee
            db.query(
                "SELECT FirstName, EmployeeID FROM employee WHERE FirstName = ? AND EmployeeID = ?",
                [username, password],
                (err, employeeRows) => {
                    if (err) return res.status(500).json({ error: err.message });

                    if (employeeRows.length > 0) {
                        return res.json({ username: employeeRows[0].FirstName, role: "employee" });
                    }

                    res.status(401).send("Invalid login");
                }
            );
        }
    );
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});