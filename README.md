# Photo Viewer with Face Recognition

## Overview
A web-based local network application to display images in a smooth tile format with embedded face recognition capabilities to search and group images by people.

## Features
- **Gallery View**: Smooth masonry grid layout.
- **Face Recognition**: Automatically detects and groups faces.
- **People Search**: Filter images by recognized persons.
- **Local Network Access**: accessible from any device on the home network.

## Tech Stack
- **Backend**: Python, FastAPI, PostgreSQL, SQLModel, Face Recognition (`dlib`).
- **Frontend**: React, Vite, Styled Components (CSS Modules/Variables).
- **Tools**: `uv` (Python Package Manager), `npm`.

## Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL**
- **C++ Build Tools** (for compiling `dlib` on Windows/Linux)

## Setup Instructions

### 1. Repository Setup
```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Backend Setup
We use `uv` for fast python package management.

1.  **Install uv** (if not installed):
    ```powershell
    pip install uv
    # or
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```

2.  **Create Virtual Environment & Install Dependencies**:
    ```powershell
    cd backend
    uv venv
    uv pip install -r requirements.txt
    ```

3.  **Database Configuration**:
    - Ensure PostgreSQL is running and you have created a database (e.g., `photoviewer`).
    - Copy `.env.example` to `.env`:
        ```powershell
        cp ../.env.example ../.env
        ```
    - Edit `.env` with your PostgreSQL credentials:
        ```ini
        POSTGRES_USER=postgres
        POSTGRES_PASSWORD=password
        POSTGRES_SERVER=localhost
        POSTGRES_PORT=5432
        POSTGRES_DB=photoviewer
        ```

4.  **Run the Backend**:
    ```powershell
    # Windows
    .venv\Scripts\activate
    uvicorn main:app --reload
    ```

### 3. Frontend Setup
1.  **Install Dependencies**:
    ```powershell
    cd frontend
    npm install
    ```

2.  **Run Development Server**:
    ```powershell
    npm run dev
    ```

## Usage
- Open `http://localhost:5173` to view the app.
- To scan images:
    1. Ensure `PHOTOS_DIR` is set in `.env`.
    2. Trigger the scan via API (you can use `curl` or a browser):
       ```bash
       curl -X POST http://localhost:8000/scan
       ```
    *(A button in the UI will be added soon)*

## Troubleshooting
- **dlib installation fails**: Ensure you have CMake and C++ build tools installed.
