import { Client, Contact, NoAuth } from "whatsapp-web.js";
import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";


interface ContactResult {
    name: string;
    date: Date | null;
    error?: string;
}


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

    client.on('ready', async () => {
        console.log('\n✅ WhatsApp client is ready!\n');
        await waitForSyncComplete(client);
        const contacts: Contact[] = await client.getContacts();
        console.log(`👥 Found ${contacts.length} contacts. Processing...\n`);

        const results: ContactResult[] = [];

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const name = contact.name || contact.pushname || contact.number;
            process.stdout.write(`🔄 [${i + 1}/${contacts.length}] ${name}... `);

            try {
                const chat = await contact.getChat();
                const messages = await chat.fetchMessages({ limit: 1 });

                if (messages.length > 0) {
                    const lastMessage = messages[0];
                    const date = new Date(lastMessage.timestamp * 1000);
                    results.push({ name, date });
                    console.log(`✅ Last contacted: ${date.toLocaleString()}`);
                } else {
                    results.push({ name, date: null });
                    console.log('📭 No message history');
                }
            } catch (err: any) {
                results.push({ name, date: null, error: err.message });
                console.log(`⚠️  Error: ${err.message}`);
            }
        }

        // Sort by latest date
        results.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

        // Output summary
        console.log('\n📋 Sorted Contact Summary:\n');
        for (const result of results) {
            if (result.date) {
                console.log(`📞 ${result.name}: ${result.date.toLocaleString()}`);
            } else if (result.error) {
                console.log(`⚠️  ${result.name}: Error - ${result.error}`);
            } else {
                console.log(`📭 ${result.name}: No message history`);
            }
        }
        console.log(`\n📊 Total contacts processed: ${results.length}`);
        console.log('✅ All contacts processed successfully!\n');
        process.exit();
    });

    client.initialize();
});

const PORT: number = 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

async function waitForSyncComplete(
    client: Client,
    options = { checkInterval: 1000, stableChecks: 3, maxWaitTime: 30000 }
): Promise<void> {
    console.log('⏳ Waiting for WhatsApp to finish syncing chats...');

    let previousCount = 0;
    let stableCount = 0;
    const startTime = Date.now();

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    while (true) {
        const chats = await client.getChats();
        const currentCount = chats.length;

        if (currentCount === previousCount) {
            stableCount++;
        } else {
            stableCount = 0;
        }

        previousCount = currentCount;

        if (stableCount >= options.stableChecks) {
            console.log(`✅ WhatsApp sync complete. ${currentCount} chats loaded.`);
            return;
        }

        // if (Date.now() - startTime > options.maxWaitTime) {
        //     console.warn(`⚠️ Timeout: Sync may not be fully complete. Chats loaded: ${currentCount}`);
        //     return;
        // }

        await sleep(options.checkInterval);
    }
}