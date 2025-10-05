# Plagiarism Checker

A comprehensive plagiarism detection system with both local file comparison and AI-powered web source checking capabilities.

## Features

- **Local File Comparison**: Compare two documents directly for similarity
- **AI-Powered Web Search**: Check documents against web sources using semantic similarity
- **Real-time Results**: Get instant plagiarism scores and detailed reports
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS
- **Backend API**: FastAPI-based Python backend with C++ performance optimization

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for development and building
- Tailwind CSS for styling
- Shadcn/ui component library
- React Router for navigation
- Supabase for authentication

### Backend
- FastAPI (Python) for API server
- C++ binary for high-performance text comparison
- Sentence Transformers for semantic similarity
- Web scraping for source checking

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Plagiarism
   ```

2. **Install Backend Dependencies**
   ```bash
   cd Back-end
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../Front-end
   npm install
   ```

### Running the Application

#### Option 1: Use the provided scripts
- **Windows**: Run `start-dev.bat`
- **Linux/Mac**: Run `./start-dev.sh`

#### Option 2: Manual startup

1. **Start the Backend Server**
   ```bash
   cd Back-end
   python main.py
   ```
   The backend will be available at `http://localhost:8000`

2. **Start the Frontend Development Server**
   ```bash
   cd Front-end
   npm run dev
   ```
   The frontend will be available at `http://localhost:8080`

## Usage

1. **Authentication**: Sign up or log in to access the plagiarism checker
2. **Upload Files**: Upload your document(s) for checking
3. **Choose Check Type**:
   - **Local Check**: Compare with another uploaded file
   - **AI Check**: Search the web for similar content
4. **View Results**: Get detailed plagiarism scores and source matches

## API Endpoints

### POST `/check`
Check for plagiarism between documents.

**Parameters:**
- `mode`: "local" or "ai"
- `fileA`: First document file (required)
- `fileB`: Second document file (for local mode)
- `textB`: Text content (alternative to fileB)

**Response:**
```json
{
  "overallScore": 85.5,
  "localScore": 90.0,
  "aiScore": 80.0,
  "webScore": 75.0,
  "webSources": [...],
  "highlights": [...]
}
```

## Configuration

### Backend Environment Variables
- `SERPAPI_KEY`: For web search functionality (optional)
- `BING_API_KEY`: Alternative to SerpAPI (optional)
- `WEIGHT_LOCAL`: Weight for local comparison (default: 0.5)
- `WEIGHT_AI`: Weight for AI similarity (default: 0.3)
- `WEIGHT_WEB`: Weight for web sources (default: 0.2)

### Frontend Configuration
- Backend URL can be configured in `Front-end/src/services/api.ts`
- Default: `http://localhost:8000`

## Development

### Frontend Development
```bash
cd Front-end
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Backend Development
```bash
cd Back-end
python main.py       # Start development server
python -m pytest    # Run tests (if available)
```

## Project Structure

```
Plagiarism/
├── Front-end/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── hooks/           # Custom React hooks
│   └── package.json
├── Back-end/                 # Python backend
│   ├── main.py              # FastAPI application
│   ├── checker.py           # Main plagiarism logic
│   ├── ai_checker.py        # AI similarity functions
│   ├── bin/                 # C++ binary for performance
│   └── requirements.txt
├── docs/                    # Documentation
└── README.md
```

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure Python dependencies are installed
   - Check if port 8000 is available
   - Verify the backend server is running

2. **Frontend Build Errors**
   - Run `npm install` to install dependencies
   - Check Node.js version (requires 18+)
   - Clear node_modules and reinstall if needed

3. **CORS Issues**
   - Backend is configured to allow all origins in development
   - For production, update CORS settings in `main.py`

### Performance Notes

- The C++ binary provides high-performance text comparison
- AI similarity checking may take longer for large documents
- Web source checking requires internet connection and API keys

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation at `http://localhost:8000/docs`
3. Create an issue in the repository