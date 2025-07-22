import { Client, NoAuth } from "whatsapp-web.js";
import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";

const app: Application = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve static frontend

io.on("connection", (socket: Socket) => {
    console.log("Client connected");

    const client = new Client({
        authStrategy: new NoAuth(),
        puppeteer: { headless: true },
    });

    client.on("qr", (qr: string) => {
        console.log("QR Code regenerated");
        socket.emit("qrCode", qr);
    });

    client.on("ready", () => {
        console.log("WhatsApp client is ready!");
        socket.emit("clientReady");
    });

    client.initialize();
});

const PORT: number = 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});