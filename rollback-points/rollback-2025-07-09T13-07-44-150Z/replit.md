# GroomIT Manager - Replit Development Guide

## Overview

GroomIT Manager is a comprehensive pet grooming management system built with React frontend and Express backend. The application manages customers, pets, appointments, services, inventory, and billing for pet grooming businesses. It uses Firebase for authentication and data storage, with a modern tech stack optimized for business operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Calendar**: FullCalendar for appointment scheduling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore (NoSQL document database)
- **File Storage**: Firebase Storage for images and documents
- **API Design**: RESTful API with JSON responses

## Key Components

### Data Models
- **Customers**: Contact information, preferences, and history
- **Pets**: Pet details linked to customers with breed, age, and medical notes
- **Services**: Grooming services with pricing and duration
- **Appointments**: Scheduled grooming sessions with services and status tracking
- **Inventory**: Product tracking with usage monitoring
- **Billing**: Invoice generation and payment tracking
- **Notifications**: System alerts and reminders

### Core Features
1. **Customer Management**: Add, edit, search, and track customer information
2. **Pet Registration**: Manage pet profiles with photos and medical records
3. **Appointment Scheduling**: Calendar-based booking with service selection
4. **Service Catalog**: Define grooming services with flexible pricing
5. **Inventory Tracking**: Monitor product usage and stock levels
6. **Billing System**: Generate invoices and track payments
7. **Dashboard Analytics**: Business insights and performance metrics

## Data Flow

### Authentication Flow
1. User login through Firebase Authentication
2. JWT token validation for API requests
3. Role-based access control (admin, staff, customer)
4. Session management with automatic token refresh

### Appointment Workflow
1. Customer selection or creation
2. Pet selection from customer's pets
3. Service selection with pricing calculation
4. Time slot selection from available groomer schedules
5. Appointment confirmation and notification
6. Status updates throughout the grooming process
7. Completion and billing generation

### Data Synchronization
- Real-time updates using Firebase listeners
- Optimistic updates for better user experience
- Conflict resolution for concurrent edits
- Offline capability with sync on reconnection

## External Dependencies

### Core Dependencies
- **Firebase**: Authentication, Firestore database, and file storage
- **Radix UI**: Accessible component library
- **TanStack Query**: Server state management and caching
- **Tailwind CSS**: Utility-first CSS framework
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Form state management
- **FullCalendar**: Appointment scheduling interface

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and enhanced developer experience
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting

## Deployment Strategy

### Development Environment
- Vite development server on port 5173 (client)
- Express server on port 3001 (API)
- Hot module replacement for fast development cycles
- Concurrent development servers with live reload

### Production Deployment
- **Build Process**: Client built to static files, server bundled with esbuild
- **Hosting**: Designed for Replit deployment with multiple deployment strategies
- **Environment Configuration**: Production environment variables for Firebase
- **Static File Serving**: Express serves client build files
- **API Routes**: RESTful endpoints with proper error handling

### Deployment Configurations
Multiple deployment approaches are available:
1. **Standard Deployment**: Full-stack application with API and frontend
2. **Frontend-Only Deployment**: Static site deployment for client-only features
3. **Firebase Hosting**: Alternative hosting with Firebase Functions for API

The application includes several deployment scripts and configurations to handle different deployment scenarios, with robust fallback mechanisms for various hosting environments.

### Database Configuration
While the application currently uses Firebase Firestore, the architecture supports migration to PostgreSQL with Drizzle ORM if needed for enhanced relational data management.