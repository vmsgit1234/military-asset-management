// Import the necessary tools to build our server, connect to the database, and secure it.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';

// ==========================================
// 1. DATABASE CONFIGURATION
// ==========================================
const { Pool } = pg;
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
    process.exit(1);
}

app.use(helmet());
app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No token provided." });
    }

    // Verify the token using our secret key
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Access Denied: Invalid or expired token." });
        }
        req.user = user;
        next();
    });
};

// Route: User Login
// Endpoint: POST /api/auth/login
app.listen(PORT, () => {
    console.log(`Military Asset Management Server is running on port ${PORT}`);
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Check if the user exists in the database
        const userQuery = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userQuery.rows.length === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = userQuery.rows[0];

        // 2. Verify the password
        const isMatch = (password === user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // 3. Generate the JSON Web Token (JWT)
        const token = jwt.sign(
            { id: user.id, role: user.role, baseId: user.base_id },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 4. Send the token back to the frontend
        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                baseId: user.base_id
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.status(200).json({
        message: "You have accessed a protected route!",
        yourData: req.user 
    });
});

// ==========================================
// 3. STEP 4: ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access Denied: Insufficient authorization level." });
        }
        next();
    };
};

const enforceBaseScope = (req, res, next) => {
    if (req.user.role === 'BASE_COMMANDER') {
        req.query.baseId = req.user.baseId; 
        if (req.body.baseId) {
            req.body.baseId = req.user.baseId;
        }
    }
    next();
};

// ==========================================
// 4. STEP 5: CORE BUSINESS LOGIC (Purchases & Transfers)
// ==========================================

app.post('/api/inventory/purchase', 
    authenticateToken, 
    authorizeRoles('ADMIN', 'LOGISTICS_OFFICER'), 
    async (req, res) => {
    
    try {
        const { baseId, equipmentTypeId, quantity } = req.body;
        const userId = req.user.id;

        if (!baseId || !equipmentTypeId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: "Invalid purchase data." });
        }

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // 1. Insert the purchase record
            const purchaseQuery = `
                INSERT INTO purchases (base_id, equipment_type_id, quantity) 
                VALUES ($1, $2, $3) RETURNING id;
            `;
            const purchaseRes = await client.query(purchaseQuery, [baseId, equipmentTypeId, quantity]);

            // 2. Log the action in the audit table
            const auditQuery = `
                INSERT INTO audit_logs (user_id, action, details) 
                VALUES ($1, 'PURCHASE', $2);
            `;
            const details = `Purchased ${quantity} items (Type ID: ${equipmentTypeId}) for Base #${baseId}`;
            await client.query(auditQuery, [userId, details]);

            await client.query('COMMIT');
            res.status(201).json({ message: "Purchase recorded successfully", purchaseId: purchaseRes.rows[0].id });
            
        } catch (dbError) {
            await client.query('ROLLBACK');
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Purchase Error:", error);
        res.status(500).json({ message: "Internal server error during purchase." });
    }
});

// Route: Transfer Assets Between Bases
app.post('/api/inventory/transfer', 
    authenticateToken, 
    enforceBaseScope, 
    async (req, res) => {
    
    const client = await db.connect();
    
    try {
        const { sourceBaseId, destinationBaseId, equipmentTypeId, quantity } = req.body;
        const userId = req.user.id;

        if (!sourceBaseId || !destinationBaseId || !equipmentTypeId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: "Invalid transfer data." });
        }

        // If Base Commander, ensure they are only transferring FROM their own base
        if (req.user.role === 'BASE_COMMANDER' && req.user.baseId !== sourceBaseId) {
            return res.status(403).json({ message: "Commanders can only initiate transfers from their assigned base." });
        }

        await client.query('BEGIN');

        // 1. Insert Transfer Record
        const transferQuery = `
            INSERT INTO transfers (source_base_id, destination_base_id, equipment_type_id, quantity, initiated_by) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id;
        `;
        const transferRes = await client.query(transferQuery, [sourceBaseId, destinationBaseId, equipmentTypeId, quantity, userId]);

        // 2. Log Action in Audit Table
        const auditQuery = `
            INSERT INTO audit_logs (user_id, action, details) 
            VALUES ($1, 'TRANSFER', $2);
        `;
        const details = `Transferred ${quantity} items (Type ID: ${equipmentTypeId}) from Base #${sourceBaseId} to Base #${destinationBaseId}`;
        await client.query(auditQuery, [userId, details]);

        await client.query('COMMIT'); 
        res.status(201).json({ message: "Transfer completed successfully", transferId: transferRes.rows[0].id });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error("Transfer Error:", error);
        res.status(500).json({ error: "Transfer failed: " + error.message });
    } finally {
        client.release();
    }
});