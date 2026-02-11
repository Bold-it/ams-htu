# HTU Accreditation Monitoring System

## Project Overview

This is the Accreditation Monitoring System developed for the Quality Assurance Unit at Ho Technical University. The system helps track and monitor programme accreditation status, expiry dates, and send timely reminders.

## Technology Stack

This project is built with:

- **Frontend**: Vite, React, TypeScript, shadcn-ui, Tailwind CSS
- **Backend**: Node.js, Express, MySQL
- **Email**: Resend API

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL database
- (Optional) Resend API key for email functionality

### Installation

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd acreditation
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Configure database**
   - Update `backend/.env` with your MySQL credentials
   - Run database setup:
     ```bash
     npm run db:setup
     ```

5. **Configure environment variables**
   
   Edit `backend/.env`:
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=htu_accreditation
   RESEND_API_KEY=your_resend_key (optional)
   FRONTEND_URL=http://localhost:8080
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend (in a new terminal)**
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Open your browser and go to: `http://localhost:8080`

## Features

- 📊 Dashboard with real-time metrics
- 📋 Accreditation tracking and management
- 📅 Expiry date monitoring
- 📧 Email reminders (with Resend integration)
- 📤 Excel file upload for bulk import
- 📈 Visual charts and timeline
- 🔍 Search and filter capabilities

## Documentation

Detailed documentation is available in the `docs/` folder:
- Backend setup guide
- API documentation
- Email configuration
- Deployment instructions

## License

Copyright © 2026 Ho Technical University. All rights reserved.

## Support

For questions or support, contact the HTU Quality Assurance Unit.
