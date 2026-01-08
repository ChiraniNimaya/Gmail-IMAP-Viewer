# Frontend Setup Guide

This frontend is the user interface for the Gmail IMAP Viewer application.

## Prerequisites

* Node.js (LTS recommended)
* npm

## 1. Install Dependencies

Install required Node.js packages:

```bash
npm install
```

## 2. Configure Environment Variables

Create a `.env` file in the frontend root directory using the example file provided:
```bash
cp .env.example .env
```

Update the values in `.env` as needed (API URLs, ports, etc.).

## 3. Start the Frontend Application

Navigate to the frontend directory:
```bash
cd frontend
```

Start the development server:
```bash
npm run dev
```

The frontend application should now be running and accessible in your browser 🚀

## Notes
* Ensure the backend server is running before using the frontend
* Restart the dev server if you make changes to the `.env` file