# Real-Time Collaborative Canvas Drawing Application

This is a full-stack web application that allows multiple users to draw on a shared canvas in real-time. It's built with the MERN stack (MongoDB, Express, React, Node.js) and uses WebSockets for instant communication.

## Features

- Real-time, multi-user collaboration on a shared canvas.
- User authentication with JWT (JSON Web Tokens).
- Drawing tools: Brush and Eraser.
- Customizable brush color and width.
- Persistence of drawings: Canvas state is saved and loaded from the database.
- Ability to save a snapshot of the canvas.

## Tech Stack

- **Frontend**: React 18, Konva.js, Socket.io-client, Axios, React Router
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB Atlas with Mongoose ORM
- **Authentication**: JWT + bcrypt
- **Dev Tools**: nodemon, dotenv

## Project Folder Structure

```
project-root/
├─ backend/
│  ├─ src/
│  │  ├─ models/        # User, CanvasSession
│  │  ├─ routes/        # auth routes
│  │  ├─ controllers/   # auth logic
│  │  ├─ index.js       # Server entry point
│  ├─ .env
│  ├─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ components/    # CanvasBoard, Toolbar
│  │  ├─ contexts/      # SocketContext
│  │  ├─ pages/         # LoginPage, RegisterPage
│  │  ├─ App.jsx
│  ├─ package.json
├─ README.md
```

## Setup and Installation

### Prerequisites

- Node.js (v14 or later)
- npm
- A MongoDB Atlas account and connection string

### Backend Setup

1.  **Navigate to the backend directory:**
    ```sh
    cd backend
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    The `backend/.env` file has been pre-filled with your MongoDB URI. The `JWT_SECRET` can be changed for better security.

4.  **Start the server:**
    ```sh
    npm run dev
    ```
    The backend server will start on `http://localhost:5000`.

### Frontend Setup

1.  **Navigate to the frontend directory:**
    ```sh
    cd ../frontend
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Start the React development server:**
    ```sh
    npm start
    ```
    The frontend will open in your browser at `http://localhost:3000`.

## API Documentation

### Authentication Endpoints

- **`POST /api/auth/register`**: Register a new user.
  - **Request Body**:
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "yourpassword"
    }
    ```
  - **Response**:
    ```json
    {
      "_id": "...",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "token": "..."
    }
    ```

- **`POST /api/auth/login`**: Log in an existing user.
  - **Request Body**:
    ```json
    {
      "email": "john.doe@example.com",
      "password": "yourpassword"
    }
    ```
  - **Response**: Returns the same structure as registration, with a new JWT.

## WebSocket Events

The real-time communication is handled by Socket.io with the following events:

- **`connection`**: A user connects to the socket server. Authenticated via JWT in the connection handshake.

- **`join-room` (client to server)**: A user requests to join a drawing room.
  - **Payload**: `{ roomId: '...' }`

- **`load-canvas` (server to client)**: The server sends the existing canvas state (strokes and snapshot) to a newly joined user.
  - **Payload**: `{ strokes: [...], snapshot: '...' }`

- **`draw-stroke` (client to server)**: A user sends a new stroke to the server.
  - **Payload**: `{ roomId: '...', stroke: { ... } }`

- **`remote-stroke` (server to clients)**: The server broadcasts a new stroke to all other users in the room.
  - **Payload**: `{ ... }` (the stroke object)

- **`save-snapshot` (client to server)**: A user sends a base64 snapshot of the canvas to be saved.
  - **Payload**: `{ roomId: '...', snapshotBase64: '...' }`

- **`user-joined` / `user-left` (server to clients)**: The server notifies clients when a user joins or leaves the room.

## Database Schema

### `users` Collection

- `name`: `String`
- `email`: `String` (unique)
- `password`: `String` (hashed)

### `canvassessions` Collection

- `roomId`: `String` (unique)
- `owner`: `String` (User ID)
- `strokes`: `Array` of `Stroke` objects
  - `userId`: `String`
  - `tool`: `String` ('brush', 'eraser')
  - `color`: `String`
  - `width`: `Number`
  - `points`: `Array` of `Number`
- `snapshot`: `String` (Base64 encoded image)
- `updatedAt`: `Date`

## Troubleshooting

### Backend not starting
```bash
# Kill existing processes
lsof -ti:5001 | xargs kill -9

# Start backend
cd backend
node src/index.js
```

### Real-time not working
1. Check backend is running: `lsof -i :5001`
2. Check browser console for socket connection
3. Verify both users are in same room (check Room ID on canvas)
4. Refresh both browsers

### Testing Real-Time Collaboration
1. **Browser 1**: Login → Create Room → Copy Room ID
2. **Browser 2**: Login (different user) → Rooms → Paste Room ID → Join
3. Draw in Browser 1 → Should appear instantly in Browser 2

## How to Use

### Step 1: Start Backend
```bash
cd backend
node src/index.js
```
You should see:
```
🔄 Attempting MongoDB connection...
🚀 Server running on port 5001
📡 Socket.io ready for connections
✅ MongoDB connected!
```

### Step 2: Start Frontend
```bash
cd frontend
npm start
```
Opens at `http://localhost:3001`

### Step 3: Test Collaboration
1. Open two browser windows
2. Register/Login with different users in each
3. User 1: Create room → Copy Room ID
4. User 2: Join room with that ID
5. Draw in both windows - changes appear instantly!
