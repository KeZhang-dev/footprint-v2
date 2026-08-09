# Footprint — Travel Journaling App

🔗 **Live Demo:** https://footprint-v2-client.onrender.com
🔗 **Repository:** https://github.com/KeZhang-dev/footprint-v2

## Introduction

Footprint is a full-stack travel journaling application where users log 
their trips, share them with a community, and engage through likes, 
comments, and favorites. Built with a React + TypeScript frontend and 
a .NET 10 Web API backend.

## Relation to the Theme: Gamification

Footprint incorporates gamification through a points and badge system: 
users earn 1 point for each public trip they publish. Reaching 3, 5, 
and 7 points unlocks Bronze, Silver, and Gold badges respectively. A 
leaderboard ranks the most active users by points, encouraging 
community sharing and engagement — directly reflecting the theme's 
goal of using game-design elements (points, badges, leaderboards) to 
drive motivation in a non-game application.

## What Makes This Project Unique

- **Social layer on top of journaling**: Discover feed, likes, saves, 
  and comments turn a personal journal into a shareable community 
  experience
- **Full RBAC admin panel**: Admins can view all registered users and 
  permanently delete accounts along with all their associated data 
  (trips, photos, likes, comments)
- **Persistent production deployment**: Full production deployment 
  with real data persistence across restarts, using a mounted 
  persistent disk for both the SQLite database and uploaded photos

## Advanced Features Implemented (3)

- [x] **Security Measures** — Password hashing (PBKDF2 via ASP.NET 
  Core Identity) + Role-Based Access Control (User/Admin roles, 
  admin-only endpoints protected with 403 Forbidden for unauthorized 
  access)
- [x] **State Management** — Zustand for authentication session state, 
  chosen after discovering React Context couldn't be accessed from 
  non-component code (e.g. API client functions)
- [x] **Dockerization** — Both API and client containerized with 
  Docker, orchestrated via docker-compose for local development, and 
  deployed to production using Docker on Render

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, React Router, 
  Zustand
- **Backend**: .NET 10 Web API, EF Core, SQLite, ASP.NET Core Identity
- **Testing**: xUnit (backend), Vitest + React Testing Library 
  (frontend)
- **Deployment**: Render (Docker-based Web Service + Static Site, with 
  a persistent disk for data storage)

## Running Locally

```bash
# Backend
cd API
dotnet run

# Frontend
cd client
npm install
npm run dev
```

## Running Tests

```bash
# Backend
cd API.Tests
dotnet test

# Frontend
cd client
npm test
```

## Demo Accounts

Test accounts (10 regular users + 1 admin) are provided separately in 
the submission form's "secrets/information for marking" field for 
evaluation purposes.

## Self-Reflection

If I had more time to polish this project, I would:

- Test the deployment pipeline much earlier in the development 
  process, rather than in the final hours — several late-stage issues 
  (a circular module import causing runtime bugs, ephemeral 
  filesystem data loss on the free hosting tier) could have been 
  investigated and fixed properly with more time to spare.
- Plan for database and file persistence in production from the very 
  start of the deployment strategy, rather than discovering the need 
  for a persistent disk only after losing test data.
- Add new features such as user-to-user messaging, to make it a truly 
  social platform.
- Add an AI Chat feature to help new users — for example, 
  automatically sending platform rules and answering simple questions 
  through an AI chatbot.
- Finally, fix a number of functional bugs — while the app currently 
  satisfies basic CRUD requirements, it's not yet a fully polished 
  product from a real-world perspective, and there are still many 
  features that need further validation and refinement.

## AI Usage

This project was developed with Claude Code as the primary AI 
development tool throughout. See the `/specs` folder for detailed 
prompts and development process documentation for each feature.
