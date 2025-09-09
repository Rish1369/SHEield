const config = require('./config');
const cors = require('cors');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// --- Import all routers here ---
const contactsRouter = require('./routes/contacts');
const alertsRouter = require('./routes/alerts'); 
const { handleAudioWS } = require('./controllers/audioWsController');

// MongoDB connection function
async function connectDB() {
    const uri = config.mongodb.uri;
    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    }
}

connectDB();
const app = express();
const PORT = config.server.port;

// --- Configure CORS ---
const corsOptions = {
  origin: '*', 
  methods: ["GET", "POST", "PUT", "DELETE"]
};
app.use(cors(corsOptions));
app.use(express.json());

// --- Ensure uploads folder exists ---
const uploadsDir = path.join(__dirname, '../uploads');
try {
    // --- ✅ CORRECTED LINE ---
    if (!fs.existsSync(uploadsDir)) { // Fixed the typo "uploadsD ir"
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Uploads folder created:', uploadsDir);
    } else {
        console.log('Uploads folder already exists:', uploadsDir);
    }
} catch (err) {
    console.error('Error creating uploads folder:', err);
}

// --- Create HTTP and WebSocket servers ---
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/audio' });

wss.on('connection', handleAudioWS);

// --- Mount all routers here ---
app.get('/', (req, res) => {
    res.send('Audio WebSocket server running');
});
app.use('/api/contacts', contactsRouter);
app.use('/api/alerts', alertsRouter); 

// --- Start the server ---
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
