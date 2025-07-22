// server.js
const whatsappWebJs = require("whatsapp-web.js");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve static frontend

io.on("connection", (socket) => {
    console.log("Client connected");
    const client = new whatsappWebJs.Client({
        authStrategy: new whatsappWebJs.NoAuth(),
        puppeteer: { headless: true },
    });
    client.on("qr", (qr) => {
        console.log("QR Code regenerated");
        socket.emit("qrCode", qr);
    });
    client.on("ready", () => {
        console.log("WhatsApp client is ready!");
        socket.emit("clientReady");
    });
    client.initialize();
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
