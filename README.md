# 🏏 IPL Mega Auction Arena

A broadcast-grade, real-time multiplayer IPL Mega Auction simulator and Progressive Web App (PWA) built with React, Vite, Node.js, Express, Socket.io, and MongoDB.

## ✨ Features
- **Broadcast-Grade Visuals**: Sleek dark studio aesthetic with gold accents, glowing timers, and live franchise badges.
- **Real-Time Multiplayer Bidding**: Millisecond-accurate socket updates, increment pills (`+0.20`, `+0.50`, `+1.00`, `+2.00`), purse validation, and anti-snipe countdown extensions.
- **Smart AI Franchise Bots**: Automated bidding algorithms that evaluate squad budget, player tier, and roster gaps.
- **Squad Strength & Playing XI Evaluator**: Instant role analytics, rating meters (Batting, Bowling, Fielding, Overall), and best Playing XI calculations.
- **PWA Ready**: Installable on Android, iOS, and Desktop with offline asset caching and full-screen standalone mode.

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.
