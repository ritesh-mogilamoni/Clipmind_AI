# ClipMind AI

ClipMind AI is a video management and processing web application designed for content creators. It provides user authentication, video uploads with automatic metadata extraction (via FFmpeg), and a dashboard to manage your video library.

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router, Axios
- **Backend**: Python, FastAPI, SQLAlchemy, PyJWT, Passlib, FFmpeg
- **Databases**: PostgreSQL (relational metadata & auth), MongoDB (document/unstructured storage)
- **Containers**: Docker Compose for local database instances

---

## Project Structure

```text
ClipMind_AI/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (auth, videos)
│   │   ├── core/           # Security, auth dependencies, config
│   │   ├── db/             # Postgres & Mongo connections and models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Video processing & FFmpeg helpers
│   ├── uploads/            # Storage location for uploaded videos
│   ├── create_tables.py    # Database table initializer script
│   ├── req.http            # HTTP request samples for testing
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Backend environment configuration
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios HTTP client configuration
│   │   ├── context/        # Auth state context provider
│   │   ├── pages/          # Login, Signup, Dashboard pages
│   │   └── App.jsx         # App router configuration
│   ├── package.json
│   └── vite.config.js
├── postman/                # API collections & specs
├── docker-compose.yml      # Local Postgres & MongoDB setup
└── .gitignore
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Docker Desktop** (for running PostgreSQL and MongoDB easily)
- **FFmpeg** (installed and added to system PATH for video metadata extraction)

---

### Step 1: Start Databases with Docker

Run the following command from the project root directory to launch PostgreSQL and MongoDB:

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port `5432`
- **MongoDB** on port `27017`

---

### Step 2: Set Up the Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file inside the `backend` folder (or copy from the example below):
   ```env
   DATABASE_URL=postgresql://clipmind:clipmind@localhost:5432/clipmind_db
   MONGO_URI=mongodb://localhost:27017
   JWT_SECRET=your_super_secret_jwt_key
   JWT_ALGORITHM=HS256
   ```

5. Initialize the PostgreSQL database tables:
   ```bash
   python create_tables.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend server will run at `http://127.0.0.1:8000`. You can test the interactive API docs at `http://127.0.0.1:8000/docs`.

---

### Step 3: Set Up the Frontend

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

The frontend application will be running at `http://localhost:5173`.

---

## API Summary

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/health` | Server health check | No |
| `GET` | `/health/db` | PostgreSQL & MongoDB connection test | No |
| `POST` | `/auth/signup` | Register a new user | No |
| `POST` | `/auth/login` | Login and receive a JWT token | No |
| `GET` | `/auth/me` | Fetch current user details | Yes |
| `POST` | `/videos/upload` | Upload a video file (MP4, MOV, AVI, WEBM, MKV) | Yes |
| `GET` | `/videos/` | List all videos uploaded by current user | Yes |
| `GET` | `/videos/{id}` | Get details of a specific video | Yes |

---

## Quick Notes & Tips

- **FFmpeg requirement**: If video upload metadata extraction fails, ensure `ffmpeg` and `ffprobe` are accessible from your terminal (`ffmpeg -version`).
- **Swagger Docs**: FastAPI auto-generates interactive API documentation at `http://127.0.0.1:8000/docs`.
