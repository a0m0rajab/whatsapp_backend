import { Client, Contact, NoAuth } from "whatsapp-web.js";
import express, { Application } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

interface ContactResult {
    name: string;
    date: Date | null;
    messageCount?: number;
    error?: string;
    id?: string;
    number?: string;
}


const app: Application = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Serve static frontend
let isProcessing = false;
io.on("connection", async (socket: Socket) => {
    // console.log("Client connected");
    const accessToken = socket.handshake.auth.accessToken;
    const refreshToken = socket.handshake.auth.refreshToken;
    // Validate the token (e.g., using Supabase or JWT verification)
    if (!accessToken || !refreshToken) {
        console.log("No token provided. Disconnecting...");
        socket.disconnect();
        return;
    }
    console.log("Auth token received:");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(
        supabaseUrl,
        anonKey
    );
    // connect supabase to user based on the token 
    const { data: user, error: userError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken // Assuming the same token is used for both access and refresh
    });
    console.log("Supabase session created:");
    if (userError || !user) {

        console.error("Failed to authenticate user:", userError);
        socket.emit("authError", "Authentication failed");
        socket.disconnect();
        return;
    }
    console.log("Client starting")
    const client = new Client({
        authStrategy: new NoAuth(),
        puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });
    console.log("Client created");

    client.on("qr", (qr: string) => {
        console.log("QR Code regenerated");
        socket.emit("qrCode", qr);
    });

    socket.on("auth", () => {
        console.log("Client authenticated");
    }
    );
    socket.on("disconnect", () => {
        console.log('isProcessing:', isProcessing);
        if (!isProcessing) client.destroy();
        console.log("Client disconnected");
    });

    client.on('ready', async () => {
        isProcessing = true;
        socket.emit("hideQrCode");
        // socket.emit('qrCode', 'Ready, syncing');
        console.log('\n✅ WhatsApp client is ready!\n');
        await waitForSyncComplete(client);
        // socket.emit('qrCode', 'Sync completed, starting contact processing');
        const contacts: Contact[] = (await client.getContacts()); //.slice(0, 1000); // Limit to 1000 contacts for performance
        console.log(`👥 Found ${contacts.length} contacts. Processing...\n`);

        const results: ContactResult[] = [];
        const length = contacts.length;
        // console.log(`👥 Found ${length} contacts. Processing...\n`);
        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const contactId = contact.id._serialized; // Get the serialized ID
            const contactNumber = contact.number; // Get the contact number
            const name = contact.name || contact.pushname || contact.number || "Unknown";
            // process.stdout.write(`🔄 [${i + 1}/${contacts.length}] ${name}... `);
            // console.log(`🔄 [${i + 1}/${length}] ${name}... `);
            // make it percentage based
            const percentage = ((i + 1) / length * 100).toFixed(2);
            // process.stdout.write(` (${percentage}%) `);
            // console.log(` (${percentage}%) `);
            // Emit progress to the frontend
            socket.emit("progress", { length, i, percentage: `${percentage}%` });

            // socket.emit("progress", { name, percentage: `${percentage}%` });
            try {
                const chat = await contact.getChat();
                const chatSynced = await chat.syncHistory();
                // console.log(`✅ Chat synced: ${chatSynced}`);
                const messages = await chat.fetchMessages({
                    limit: 100,
                });
                if (messages.length > 0) {
                    const lastMessage = messages[0];
                    const date = new Date(lastMessage.timestamp * 1000);
                    results.push({ name, date, messageCount: messages.length, id: contactId, number: contactNumber });
                    // console.log(`✅ Last contacted: ${date.toLocaleString()}`);
                } else {
                    results.push({ name, date: null, messageCount: 0, id: contactId, number: contactNumber });
                    // console.log('📭 No message history');
                }
            } catch (err: any) {
                results.push({ name, date: null, error: err.message, id: contactId, number: contactNumber });
                // console.log(`⚠️  Error: ${err.message}`);
            }
        }

        // Sort by latest date
        results.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
        // create Supabase Client for service Role Key


        // add results to Supabase in batchs 

        // Output summary
        // console.log('\n📋 Sorted Contact Summary:\n');
        // for (const result of results) {
        //     if (result.date) {
        //         // console.log(`📞 ${result.name}: ${result.date.toLocaleString()} , Messages: ${result.messageCount || 0}`);
        //     } else if (result.error) {
        //         // // console.log(`⚠️  ${result.name}: Error - ${result.error}`);
        //     } else {
        //         // // console.log(`📭 ${result.name}: No message history`);
        //     }
        // }
        const chunkArray = (arr, size) =>
            arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);
        console.log(`\n📊 Total contacts processed: ${results.length}`);
        for (const chunk of chunkArray(results, 1000)) {
            const { data, error } = await supabase.from('contacts').insert(chunk);
            if (error) {
                console.error('Error inserting contacts:', error);
            }
        }
        // console.log(`\n📊 Total contacts processed: ${results.length}`);
        console.log('✅ All contacts processed successfully!\n');
        await client.logout();
        console.log('Logging out and destroying client...');
        await client.destroy();
        console.log('Client destroyed');
        isProcessing = false;
        // process.exit();
    });

    client.initialize();
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

async function waitForSyncComplete(
    client: Client,
    options = { checkInterval: 1000, stableChecks: 3, maxWaitTime: 30000 }
): Promise<void> {
    // console.log('⏳ Waiting for WhatsApp to finish syncing chats...');

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
            // console.log(`✅ WhatsApp sync complete. ${currentCount} chats loaded.`);
            return;
        }

        // if (Date.now() - startTime > options.maxWaitTime) {
        //     console.warn(`⚠️ Timeout: Sync may not be fully complete. Chats loaded: ${currentCount}`);
        //     return;
        // }

        await sleep(options.checkInterval);
    }
}