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
- **Billing**: Invoice generation and payment tracking with comprehensive discount system
- **Discounts**: Role-based discount application with percentage/fixed amount support and removal capability
- **Notifications**: System alerts and reminders

### Core Features
1. **Customer Management**: Add, edit, search, and track customer information
2. **Pet Registration**: Manage pet profiles with photos and medical records
3. **Appointment Scheduling**: Calendar-based booking with service selection
4. **Service Catalog**: Define grooming services with flexible pricing
5. **Inventory Tracking**: Monitor product usage and stock levels
6. **Billing System**: Generate invoices and track payments with comprehensive discount management
7. **Discount Management**: Role-based discount application (percentage/fixed amount) with removal capability
8. **Dashboard Analytics**: Business insights and performance metrics

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

## Recent Changes (July 2025)

### Complete Razorpay Integration & Payment System Streamlining (July 9, 2025)
- ✅ **Razorpay Integration Complete**: Full online payment processing with order creation, payment verification, and bill status updates
- ✅ **Security Implementation**: Server-side payment signature verification and secure API endpoints with authentication
- ✅ **Frontend Integration**: Razorpay checkout modal with proper branding and customer details pre-filled
- ✅ **Payment Flow**: Complete workflow from "Process Online Payment" button to automatic bill status update after successful payment
- ✅ **Payment Options Streamlined**: Removed redundant payment methods (UPI QR, UPI ID, Card, Net Banking, Wallet, Bank Transfer) since Razorpay handles all online payments
- ✅ **Simplified UI**: Clean payment dialog with only two options: "Online Payment (Razorpay)" for all digital payments and "Cash Payment" for in-person transactions
- ✅ **User Experience**: Clear descriptions showing Razorpay covers "UPI, Cards, Net Banking, Wallets - All secure online payments"
- ✅ **Production Ready**: Integration uses existing Razorpay API keys and follows Indian payment standards

### Comprehensive Discount System Implementation (July 9, 2025)
- ✅ **Discount Data Corruption Fixed**: Resolved critical bug where frontend was sending only percentage value instead of full DiscountApplication object
- ✅ **Root Cause Resolution**: Fixed callback in BillingPage.tsx that was extracting `discount.percentage || 0` instead of passing complete object
- ✅ **Backend Discount Handling**: Enhanced updateBill method to properly handle both discount application and removal
- ✅ **Discount Removal Feature**: Added complete discount removal functionality with `discount: null` support
- ✅ **Smart UI Updates**: Implemented dynamic button switching between "Discount" and "Remove Discount" based on current state
- ✅ **Visual Indicators**: Added discount amount display in bill table Amount column with percentage icon
- ✅ **Type Safety**: Updated function signatures to use proper DiscountApplication type instead of any
- ✅ **User Experience**: Added comprehensive success messages and automatic bill refresh after discount changes
- ✅ **Complete Lifecycle**: Full discount workflow now functional - apply, display, modify, and remove discounts

### Comprehensive Authentication & Role Management Fix (July 9, 2025)
- ✅ **Data Structure Audit**: Completed comprehensive audit of authentication and role management system
- ✅ **User Synchronization**: Fixed Google Auth to Firestore sync - 4 missing users added to users collection  
- ✅ **Role Inconsistency Fix**: Resolved 3 role mismatches between Firebase Auth custom claims and Firestore
- ✅ **Collection Standardization**: Merged duplicate role collections into single `role-definitions` collection
- ✅ **Authentication Routes**: Updated all auth code to use standardized `role-definitions` collection
- ✅ **Future User Creation**: Implemented user sync service to handle new Google Auth user creation
- ✅ **Admin Role Priority**: Fixed authentication middleware to properly recognize admin users
- ✅ **Permission System**: Enhanced role-based access control with proper validation
- ✅ **Role Update API Fix**: Resolved `admin.auth is not a function` error by fixing Firebase Admin imports
- ✅ **Permission Synchronization**: Applied one-time fix to synchronize all 6 users' permissions correctly
- ✅ **Admin User Display**: Fixed admin user showing as "staff" - now properly displays "admin" role
- ✅ **Role Management Complete**: Dropdown role updates now work without errors for all users

### Rollback & GitHub Sync System
- ✅ **Rollback Manager**: Comprehensive backup system with timestamped restore points
- ✅ **GitHub Sync Tools**: Automated scripts for repository synchronization
- ✅ **Project Documentation**: Complete README.md with technical specifications
- ✅ **License & Standards**: MIT license and development guidelines
- ✅ **Current Rollback Point**: `rollback-2025-07-09T13-07-44-150Z` (created July 9, 2025)

### GitHub Repository Status
- **Repository**: https://github.com/sunilnayak84/GroomITManager
- **Current Branch**: live-june01-features
- **Sync Status**: Ready for manual sync (Git lock restrictions in place)
- **Files Ready**: All project files prepared for GitHub synchronization

### Enhanced Development Tools
- **Rollback Commands**: `npm run rollback` for creating restore points
- **GitHub Sync**: `node sync-github.js` for repository updates
- **Multi-strategy Deployment**: Various deployment options available
- **Documentation**: Comprehensive guides for development and deployment