require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const app = express();
const { v4: uuidv4 } = require("uuid");
const emailjs = require("@emailjs/nodejs");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: "No token" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const [rows] = await db.query(
            "SELECT * FROM users WHERE id = ?",
            [decoded.id]
        );

        if (!rows.length) {
            return res.status(401).json({
                error: "User not found"
            });
        }

        req.user = rows[0];

        next();
    } catch (e) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }
};
const activeUserMiddleware = (req, res, next) => {
    if (req.user.is_blocked) {
        return res.status(403).json({
            error: "User blocked"
        });
    }

    next();
};
app.use(cors());
app.use(express.json());

let db;

async function startServer() {
    try {
        db = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,

            port: 10040,

            ssl: {
                ca: fs.readFileSync("./certificates/ca.pem")
            },

            waitForConnections: true,
            connectionLimit: 10
        });

        console.log("MySQL connected");


        app.get("/", (req, res) => {
            res.json({ message: "API running" });
        });


        app.get("/users", async (req, res) => {
            try {
                const [users] = await db.query(`
                    SELECT
                        id,
                        name,
                        info,
                        email,
                        status,
                        is_blocked,
                        last_login_time,
                        last_activity_time
                    FROM users
                `);

                res.json(users);
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Failed to fetch users" });
            }
        });

        app.get("/me", authMiddleware, async (req, res) => {
            const [rows] = await db.query(
                `SELECT
                    id,
                    name,
                    info,
                    email,
                    status,
                    is_blocked,
                    last_login_time,
                    last_activity_time
                FROM users
                WHERE id = ?`,
                [req.user.id]
            );

            res.json(rows[0]);
        });
        
        app.post("/register", async (req, res) => {
            try {
                const { name, info, email, password } = req.body;

                const hashedPassword = await bcrypt.hash(password, 10);
                const verificationToken = uuidv4();

                let result;

                try {
                    [result] = await db.query(
                        `
                        INSERT INTO users
                        (
                            name,
                            info,
                            email,
                            password_hash,
                            status,
                            is_blocked,
                            verification_token,
                            last_login_time,
                            last_activity_time
                        )
                        VALUES
                        (
                            ?, ?, ?, ?,
                            'unverified',
                            FALSE,
                            ?,
                            NOW(),
                            NOW()
                        )
                        `,
                        [
                            name,
                            info || null,
                            email,
                            hashedPassword,
                            verificationToken
                        ]
                    );
                } catch (err) {
                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(409).json({ error: "Email already exists" });
                    }
                    throw err;
                }

                const token = jwt.sign(
                    {
                        id: result.insertId,
                        email
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: "7d" }
                );

                emailjs.send(
                    process.env.EMAILJS_SERVICE_ID,
                    process.env.EMAILJS_TEMPLATE_ID,
                    {
                        user_name: name,
                        email,
                        verification_link: `${process.env.REACT_APP_API_URL}/verify/${verificationToken}`
                    },
                    {
                        publicKey: process.env.EMAILJS_PUBLIC_KEY,
                        privateKey: process.env.EMAILJS_PRIVATE_KEY
                    }
                ).catch(console.error);

                return res.status(201).json({
                    token,
                    user: {
                        id: result.insertId,
                        name,
                        info,
                        email,
                        status: "unverified"
                    }
                });

            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Registration failed" });
            }
        });

        app.get("/verify/:token", async (req, res) => {
            try {
                const { token } = req.params;

                const [rows] = await db.query(
                    `
                    SELECT id
                    FROM users
                    WHERE verification_token = ?
                    `,
                    [token]
                );

                if (!rows.length) {
                    return res.status(400).send(
                        "Invalid verification link"
                    );
                }

                await db.query(
                    `
                    UPDATE users
                    SET
                        status = 'active',
                        verification_token = NULL
                    WHERE verification_token = ?
                    `,
                    [token]
                );

                res.send(
                    "Email verified successfully. You may now login."
                );

            } catch (error) {
                console.error(error);

                res.status(500).send(
                    "Verification failed"
                );
            }
        });

        app.post("/login", async (req, res) => {
            try {
                const { email, password } = req.body;

                const [rows] = await db.query(
                    "SELECT * FROM users WHERE email = ?",
                    [email]
                );

                if (!rows.length) {
                    return res.status(401).json({ message: "Invalid credentials" });
                }

                const user = rows[0];

                if (user.is_blocked) {
                    return res.status(403).json({ message: "User is blocked" });
                }


                const ok = await bcrypt.compare(password, user.password_hash);

                if (!ok) {
                    return res.status(401).json({ message: "Invalid credentials" });
                }

                const token = jwt.sign(
                    { id: user.id, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: "7d" }
                );

                await db.query(
                    `UPDATE users SET last_login_time = NOW() WHERE id = ?`,
                    [user.id]
                );

                return res.json({
                    token,
                    user
                });

            } catch (err) {
                console.error(err);
                return res.status(500).json({ error: "Login failed" });
            }
        });

        app.put("/users/block", authMiddleware, activeUserMiddleware, async (req, res) => {
            try {
                const { ids } = req.body;

                await db.query(
                    `UPDATE users SET is_blocked = TRUE WHERE id IN (?)`,
                    [ids]
                );

                res.json({ message: "Users blocked" });

            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Block failed" });
            }
        });

        app.put("/users/unblock", authMiddleware, activeUserMiddleware, async (req, res) => {
            try {
                const { ids } = req.body;

                await db.query(
                    `UPDATE users SET is_blocked = FALSE WHERE id IN (?)`,
                    [ids]
                );

                res.json({ message: "Users unblocked" });

            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Unblock failed" });
            }
        });

        app.delete("/users", authMiddleware, activeUserMiddleware, async (req, res) => {
            try {
                const { ids } = req.body;

                await db.query(
                    `DELETE FROM users WHERE id IN (?)`,
                    [ids]
                );

                res.json({ message: "Users deleted" });

            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Delete failed" });
            }
        });

        app.delete("/users/unverified", authMiddleware, activeUserMiddleware, async (req, res) => {
            try {

                await db.query(
                    `DELETE FROM users WHERE status = ?`,
                    ["unverified"]
                );

                res.json({ message: "Users deleted" });

            } catch (error) {
                console.error(error);
                res.status(500).json({ error: "Delete failed" });
            }
        });

        // START SERVER 
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT}`);
        });

    } catch (err) {
        console.error("DB connection failed:", err);
    }
}

startServer();