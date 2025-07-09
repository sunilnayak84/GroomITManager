# GroomIT Manager

A comprehensive pet grooming and walking business management platform for the Indian market.

## Features

- 🐕 **Pet Management**: Detailed pet profiles with temperament tracking
- 📅 **Appointment Scheduling**: Advanced calendar-based booking system
- 👥 **Customer Management**: Complete customer relationship management
- 💰 **Billing & Payments**: Integrated billing with multiple payment options
- 📊 **Analytics Dashboard**: Business insights and performance metrics
- 🏢 **Multi-role Access**: Manager, staff, and customer portals
- 📱 **Mobile Responsive**: Works seamlessly on all devices

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Radix UI** components with Tailwind CSS
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **FullCalendar** for appointment scheduling

### Backend
- **Node.js** with Express.js
- **Firebase Authentication** for secure user management
- **Firebase Firestore** for real-time data storage
- **Firebase Storage** for file uploads
- **WebSocket** support for real-time updates

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project setup

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/groomit-manager.git
   cd groomit-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration
   - Configure other environment variables

4. **Start development servers**
   ```bash
   npm run dev
   ```

### Development Scripts

- `npm run dev` - Start both frontend and backend development servers
- `npm run build` - Build the application for production
- `npm run deploy` - Deploy to production
- `npm test` - Run tests

## Project Structure

```
groomit-manager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript type definitions
│   └── package.json
├── server/                # Express backend
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic services
│   └── types/           # Backend type definitions
├── scripts/              # Build and deployment scripts
└── package.json
```

## Deployment

The application supports multiple deployment strategies:

1. **Replit Deployment** (Recommended for development)
2. **Firebase Hosting** with Functions
3. **Traditional cloud hosting** (AWS, GCP, etc.)

See `DEPLOYMENT.md` for detailed deployment instructions.

## Features Overview

### Customer Management
- Complete customer profiles with contact information
- Pet registration with photos and medical records
- Service history and preferences tracking
- Loyalty points and rewards system

### Appointment Scheduling
- Calendar-based booking interface
- Service selection with duration and pricing
- Groomer assignment and availability management
- Automated reminders and notifications

### Pet Temperament Tracking
- Detailed temperament profiles for each pet
- Behavioral notes and handling instructions
- Photo documentation of pets
- Medical and dietary restrictions tracking

### Billing & Payments
- Automated invoice generation
- Multiple payment method support
- Service packages and discounts
- Payment history and reporting

### Analytics & Reporting
- Business performance metrics
- Revenue tracking and forecasting
- Customer retention analytics
- Service popularity insights

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, email support@groomit.com or join our Discord community.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with modern React and Node.js ecosystem
- Powered by Firebase for authentication and real-time data
- UI components from Radix UI and styled with Tailwind CSS
- Calendar functionality powered by FullCalendar
