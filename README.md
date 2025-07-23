# WhatsApp Backend

This project is a backend application for managing WhatsApp Web client interactions using `whatsapp-web.js`, `Socket.IO`, and `Supabase`. It provides real-time communication between the frontend and backend, allowing users to authenticate, sync chats, and send/receive messages.

## Features

- **WhatsApp Web Integration**: Uses `whatsapp-web.js` to interact with WhatsApp Web.
- **Real-Time Communication**: Implements `Socket.IO` for real-time updates between the client and server.
- **Authentication**: Integrates with Supabase for user authentication and session management.
- **Chat Syncing**: Syncs chat history and processes messages.
- **QR Code Generation**: Displays QR codes for WhatsApp Web login.
- **Progress Updates**: Provides real-time progress updates during chat syncing.

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Supabase account and project

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/a0m0rajab/whatsapp_backend.git
   cd whatsapp_backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SERVICE_ROLE_KEY=your-service-role-key
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Usage

### Frontend

- Open the `index.html` file in a browser.
- The frontend connects to the backend via WebSocket and displays real-time updates.

Note: to use this file, you need to disable the authentication from the index.ts file

### Backend

- The backend listens for WebSocket connections and handles events such as QR code generation, chat syncing, and progress updates.
- Authentication is managed using Supabase tokens.

## Project Structure

```
whatsapp_backend/
├── index.ts          # Main backend logic
├── index.html        # Frontend interface
├── .env              # Environment variables
├── package.json      # Project metadata and dependencies
└── README.md         # Project documentation
```

## API Endpoints

### WebSocket Events

#### `auth`

- **Description**: Authenticates the user using Supabase tokens.
- **Payload**:
  ```json
  {
    "token": "your-access-token"
  }
  ```

#### `qrCode`

- **Description**: Sends the QR code for WhatsApp Web login.

#### `progress`

- **Description**: Sends progress updates during chat syncing.
- **Payload**:
  ```json
  {
    "percentage": "50%",
    "length": 100,
    "i": 50
  }
  ```

## Dependencies

- `whatsapp-web.js`: For WhatsApp Web client interactions.
- `socket.io`: For real-time communication.
- `supabase`: For authentication and database management.
- `dotenv`: For environment variable management.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## Acknowledgments

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Socket.IO](https://socket.io/)
- [Supabase](https://supabase.com/)
