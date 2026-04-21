const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

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

    console.log("Received:", username, password);

    // First check manager table
    db.query(
        `SELECT e.FirstName, e.EmployeeID 
         FROM employee e 
         JOIN manager m ON e.EmployeeID = m.EmployeeID 
         WHERE e.FirstName = ? AND CAST(e.EmployeeID AS CHAR) = ?`,
        [username, String(password)],
        (err, managerRows) => {
            if (err) {
                console.log("Manager query error:", err);
                return res.status(500).json({ error: err.message });
            }

            console.log("Manager rows:", managerRows);

            if (managerRows.length > 0) {
                return res.json({ username: managerRows[0].FirstName, role: "manager" });
            }

            // If not a manager, check regular employee
            db.query(
                `SELECT FirstName, EmployeeID FROM employee 
                 WHERE FirstName = ? AND CAST(EmployeeID AS CHAR) = ?`,
                [username, String(password)],
                (err, employeeRows) => {
                    if (err) {
                        console.log("Employee query error:", err);
                        return res.status(500).json({ error: err.message });
                    }

                    console.log("Employee rows:", employeeRows);

                    if (employeeRows.length > 0) {
                        return res.json({ username: employeeRows[0].FirstName, role: "employee" });
                    }

                    res.status(401).send("Invalid login");
                }
            );
        }
    );
});const PORT = process.env.PORT || 3000;

// update employee info
app.post('/update-employee', (req, res) => {
    const {
        EmployeeID, FirstName, LastName, DOB, Address,
        PhoneNum, Email, HireDate, Salary, DeptID, PositionID
    } = req.body;

    if (!EmployeeID) {
        return res.status(400).json({ message: 'EmployeeID is required.' });
    }

    const fields = { FirstName, LastName, DOB, Address, PhoneNum, Email, HireDate, Salary, DeptID, PositionID };
    const updates = Object.entries(fields).filter(([_, v]) => v !== undefined && v !== '');

    if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update.' });
    }

    const sql = `UPDATE employee SET ${updates.map(([k]) => `${k} = ?`).join(', ')} WHERE EmployeeID = ?`;
    const values = [...updates.map(([_, v]) => v), EmployeeID];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.log("Update error:", err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'No employee found with that ID.' });
        }
        res.json({ message: `Employee ${EmployeeID} updated successfully.` });
    });
});

// DELETE an employee and send separation notification
app.delete('/employees/:id', (req, res) => {
    const employeeId = req.params.id;

    db.query('SELECT Email, FirstName FROM employee WHERE EmployeeID = ?', [employeeId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (rows.length === 0) return res.status(404).json({ message: 'Employee not found.' });

        const { Email, FirstName } = rows[0];

        db.query('DELETE FROM employee WHERE EmployeeID = ?', [employeeId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Employee not found.' });

            resend.emails.send({
                from: 'onboarding@resend.dev',
                to: Email,
                subject: 'Employment Separation Notice',
                html: `<p>Dear ${FirstName},</p>
                       <p>This is a separation notification. You have been terminated from XYZ Company.</p>
                       <p>Please contact HR if you have any questions.</p>`
            }).catch(emailErr => console.error('Email failed:', emailErr));

            res.json({ message: `Employee ${employeeId} removed.` });
        });
    });
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});