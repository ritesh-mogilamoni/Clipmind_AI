# ClipMind AI

ClipMind AI is an AI-powered video management and intelligence platform designed for content creators, educators, and teams. It provides end-to-end video processing including automatic speech-to-text transcription, executive summarization, key moment timestamp extraction, topic keyword indexing, user authentication, and interactive analytics dashboards.

---

## Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (Graphite and Gold dark theme styling)
- **Icons**: Lucide React
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **State Management**: React Context API (`AuthContext`)

### Backend
- **Framework**: Python, FastAPI
- **Database ORM**: SQLAlchemy
- **Security**: PyJWT, Passlib (Bcrypt hashing), HTTP Bearer Authentication
- **Media Processing**: FFmpeg & FFprobe

### Database & Infrastructure
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose

---

## Key Features

- **Public Showcase & Landing Page**: Public access page highlighting platform capabilities for unauthenticated users.
- **Authentication & User Management**: Role-based access control supporting Administrator, Content Creator, Educator, and Student/Viewer roles.
- **Video Ingestion & Processing**: Drag-and-drop video upload with automatic FFmpeg duration, resolution, format, and bitrate extraction.
- **AI Processing Pipeline**:
  - **Speech-to-Text Transcription**: Automated audio extraction and transcript generation with timestamps.
  - **Summarization**: Generation of concise short summaries and detailed key takeaways.
  - **Key Moments Extraction**: Automated detection of critical scene timestamps and scene descriptions.
  - **Keyword Indexing**: Extraction of primary topics and metadata tags.
- **Interactive Studio Dashboard**:
  - HTML5 video playback synced with key moments.
  - Filterable video library by search, category, and status.
  - Editable transcripts for content creators and educators.
  - Export capabilities in TXT and JSON formats.
- **Analytics & System Metrics**: Real-time platform usage metrics, user activity logs, and administrative controls.

---

## Project Structure

```text
ClipMind_AI/
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers (auth, videos, analytics)
│   │   ├── core/           # Security, dependencies, and configuration
│   │   ├── db/             # Database connection, schemas, and models
│   │   ├── schemas/        # Pydantic request and response models
│   │   ├── services/       # Video processing, transcription, summarization
│   │   └── main.py         # FastAPI application entry point
│   ├── uploads/            # Video storage directory
│   ├── create_tables.py    # Database initialization script
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Backend environment configuration
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios HTTP client
│   │   ├── app/            # Next.js App Router (layout, page, login, signup, dashboard)
│   │   ├── components/     # Reusable Studio components (DashboardPage)
│   │   ├── context/        # Auth state context provider
│   │   └── index.css       # Global styles, keyframes, and Tailwind imports
│   ├── package.json        # Frontend dependencies and Next.js scripts
│   ├── next.config.mjs     # Next.js configuration
│   └── postcss.config.mjs  # Tailwind CSS v4 PostCSS configuration
├── docker-compose.yml      # Local PostgreSQL container setup
└── README.md
```

---

## Getting Started

### Prerequisites

Ensure the following tools are installed on your environment:
- Node.js (v18 or higher)
- Python (v3.10 or higher)
- Docker Desktop (for containerized PostgreSQL)
- FFmpeg (installed and configured in system PATH)

---

### Step 1: Launch PostgreSQL Database

Run Docker Compose from the project root directory:

```bash
docker-compose up -d
```

This starts PostgreSQL on port `5432`.

---

### Step 2: Set Up and Start Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file inside the `backend` folder:
   ```env
   DATABASE_URL=postgresql://clipmind:clipmind@localhost:5432/clipmind_db
   JWT_SECRET=your_super_secret_jwt_key
   JWT_ALGORITHM=HS256
   ```

5. Initialize PostgreSQL database tables:
   ```bash
   python create_tables.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend server will run at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

---

### Step 3: Set Up and Start Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

The frontend application will be available at `http://localhost:3000`.

---

## API Summary

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `GET` | `/health` | Server health check | No |
| `GET` | `/health/db` | Database connectivity test | No |
| `POST` | `/auth/signup` | Register a new user | No |
| `POST` | `/auth/login` | Authenticate user and issue JWT | No |
| `GET` | `/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/auth/users` | List all registered users | Yes |
| `POST` | `/videos/upload` | Upload a new video file | Yes |
| `GET` | `/videos/` | List accessible videos | Yes |
| `GET` | `/videos/{id}` | Get metadata for a specific video | Yes |
| `GET` | `/videos/{id}/file` | Stream video file content | No |
| `POST` | `/videos/{id}/process` | Trigger AI transcription & summary workflow | Yes |
| `PUT` | `/videos/{id}/transcript` | Update transcript content | Yes |
| `GET` | `/videos/{id}/export` | Export transcript and notes (TXT/JSON) | Yes |
| `POST` | `/videos/{id}/bookmark` | Bookmark video or key moment | Yes |
| `DELETE` | `/videos/{id}` | Delete video and associated records | Yes |
| `GET` | `/analytics/dashboard` | Fetch dashboard analytics and recent activity | Yes |
| `GET` | `/analytics/admin/users` | Fetch administrator system stats | Yes (Admin) |

---

## Notes & Troubleshooting

- **FFmpeg Verification**: Verify system installation by executing `ffmpeg -version` and `ffprobe -version` in your terminal.
- **Interactive Documentation**: FastAPI provides Swagger UI at `http://127.0.0.1:8000/docs` and ReDoc at `http://127.0.0.1:8000/redoc`.
