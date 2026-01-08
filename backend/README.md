# Backend Setup Guide

This backend powers the Gmail IMAP Viewer application.

## Prerequisites

* Node.js (LTS recommended)
* MySQL Server
* npm


## 1. Create MySQL Database

Login to MySQL:
```bash
mysql -u root -p
```

Enter your MySQL root password, then create the database:
```sql
CREATE DATABASE gmail_imap_viewer;
```

## 2. Run One-Time Search Index Script

This script adds required FULLTEXT search indexes to the database.
Run this only once after the database is created.
```bash
node add-search-indexes.js
```

## 3. Configure Environment Variables

Create a `.env` file in the backend root directory and configure it using the provided example:
```bash
cp .env.example .env
```

Update the values in `.env` according to your local setup (database credentials, ports, etc.).

## 4. Start the Backend Server

Navigate to the backend directory:
```bash
cd backend
```

Start the development server:
```bash
npm run dev
```

The backend should now be running successfully 

## Notes
* Ensure MySQL is running before starting the backend
* Re-run the index script only if the database is recreated