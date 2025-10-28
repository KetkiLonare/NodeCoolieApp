// app.js
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { translate } from "@vitalets/google-translate-api";

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------
// MySQL Configuration
// ---------------------------
const DB_CONFIG = {
    host: "13.200.16.252",
    user: "Dev",
    password: "Dev@2024",
    database: "test",
};

let pool;

// ---------------------------
// Database Initialization
// ---------------------------
async function initDB() {
    try {
        // 1️⃣ Connect without DB first
        const tempPool = await mysql.createConnection({
            host: DB_CONFIG.host,
            user: DB_CONFIG.user,
            password: DB_CONFIG.password,
        });

        // 2️⃣ Create database if not exists
        await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
        console.log(`✅ Database '${DB_CONFIG.database}' verified or created.`);
        await tempPool.end();

        // 3️⃣ Now connect to that database
        pool = await mysql.createPool(DB_CONFIG);
        console.log("✅ Connected to MySQL and selected DB:", DB_CONFIG.database);

        // 4️⃣ Create table if not exists
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        country VARCHAR(100) DEFAULT 'India',
        state VARCHAR(100),
        city VARCHAR(100),
        luggage_weight FLOAT,
        arrival_time VARCHAR(50),
        service_type VARCHAR(100),
        helper VARCHAR(255),
        fare FLOAT,
        timestamp VARCHAR(100)
      )
    `;
        await pool.query(createTableQuery);
        console.log("✅ Table 'bookings' verified or created.");
    } catch (err) {
        console.error("❌ DB Initialization Error:", err);
        process.exit(1);
    }
}

await initDB();

// ---------------------------
// Booking Endpoint
// ---------------------------
app.post("/book", async (req, res) => {
    try {
        const data = req.body;
        const fare = 30 + data.luggage_weight * 2.5;
        const helper = `Assigned Helper ${data.city?.slice(0, 2).toUpperCase()}`;
        const timestamp = new Date().toISOString();

        const sql = `
      INSERT INTO bookings 
      (name, country, state, city, luggage_weight, arrival_time, service_type, helper, fare, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            data.name,
            data.country || "India",
            data.state,
            data.city,
            data.luggage_weight,
            data.arrival_time,
            data.service_type,
            helper,
            fare,
            timestamp,
        ];

        await pool.query(sql, values);
        res.json({ status: "success", ...data, helper, fare, timestamp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------
// Fetch All Bookings
// ---------------------------
app.get("/bookings", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM bookings ORDER BY id DESC");
        res.json({ bookings: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------
// Translation Endpoint
// ---------------------------
app.post("/translate", async (req, res) => {
    try {
        const { text, source = "auto", target } = req.body;
        const result = await translate(text, { from: source, to: target });
        res.json({ translatedText: result.text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------
// Start Server
// ---------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
