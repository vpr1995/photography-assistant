<div align="center">
  <h1>📸 Photography Assistant</h1>
  <p>
    <strong>AI-powered feedback for film photographers</strong><br>
    Fullstack app: Go backend (AWS Bedrock) + React/Vite frontend
  </p>
</div>

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

---

## Overview

Photography Assistant is a web application that helps beginner film photographers improve their skills. Users can upload a photo, and the app provides friendly, beginner-focused feedback using AI (AWS Bedrock). The feedback covers composition, lighting, subject, strengths, and practical suggestions.

## Features
- Upload and analyze film photos (JPEG)
- AI-powered feedback tailored for beginners
- Simple, supportive language (no jargon)
- Practical tips for film photography
- Modern, responsive UI
- Secure backend with AWS Bedrock integration

## Tech Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, OpenCV.js, AWS Amplify UI, Lucide Icons
- **Backend:** Go, Gin, AWS SDK (Bedrock)
- **Cloud:** AWS Bedrock (Llama 4 model)

## Project Structure
```
photography-assistant/
├── backend/         # Go backend (API server)
│   ├── main.go      # Main entrypoint
│   ├── go.mod       # Go module file
│   └── go.sum       # Go dependencies
├── web/             # React/Vite frontend
│   ├── src/         # Source code
│   │   ├── components/   # React components
│   │   ├── main.tsx      # App entrypoint
│   │   └── index.css     # Global styles
│   ├── public/      # Static assets
│   ├── package.json # Frontend dependencies
│   └── vite.config.ts    # Vite config
└── README.md        # Project documentation
```

## Setup & Installation

### Prerequisites
- Go >= 1.21
- Node.js >= 20
- AWS account with Bedrock access
- Yarn or npm

### Backend
1. **Configure AWS credentials:**
   - Set up your AWS credentials (see [AWS docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)).
   - Ensure Bedrock access is enabled for your account.
2. **Install dependencies:**
   ```bash
   cd backend
   go mod tidy
   ```
3. **Run the server:**
   ```bash
   go run main.go
   ```
   - The server runs on port `8080` by default (configurable via `PORT` env variable).

### Frontend
1. **Install dependencies:**
   ```bash
   cd web
   npm install
   ```
2. **Start development server:**
   ```bash
   npm run dev
   ```
   - The app runs on `http://localhost:5173` by default.

## Usage
1. Start both backend and frontend servers.
2. Open the frontend in your browser.
3. Receive AI-powered feedback and suggestions.

## API Reference

### Health Check
- **GET** `/health`
  - Returns `{ "status": "healthy" }`

### Analyze Photo
- **POST** `/analyze`
  - **Request Body:**
    ```json
    {
      "image": "<base64-encoded JPEG>"
    }
    ```
  - **Response:**
    ```json
    {
      "score": 7,
      "composition": "...",
      "lighting": "...",
      "subject": "...",
      "strengths": ["..."],
      "suggestions": ["...", "...", "..."]
    }
    ```
  - **Errors:**
    - `400`: Invalid request or image data
    - `500`: Analysis failed (Bedrock/API error)

## Environment Variables

### Backend
- `AWS_REGION` (default: `us-east-1`)
- `PORT` (default: `8080`)
- AWS credentials (see [AWS docs](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html))

## Contributing

Contributions are welcome! Please open issues or pull requests for bug fixes, features, or improvements.

1. Fork the repo
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

This project is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

## Credits
- AWS Bedrock (Llama 4 model)
- Gin (Go web framework)
- React, Vite, Tailwind CSS
- OpenCV.js, Lucide Icons
- [Your Name or Organization]

---

> _For questions or support, open an issue or contact the maintainer._
