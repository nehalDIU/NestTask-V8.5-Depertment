# 🎯 NestTask - University Academic Management System

[![Version](https://img.shields.io/badge/version-8.5-blue.svg)](https://github.com/your-repo/nesttask)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49.4-green.svg)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple.svg)](https://web.dev/progressive-web-apps/)

A modern, role-based academic task management system designed specifically for university environments. NestTask provides comprehensive task management, routine scheduling, and administrative tools with department-wise organization and real-time collaboration features.

## ✨ Key Features

### 🎓 **Academic-Focused Design**
- **Department-wise Organization**: CSE, SWE, and other departments with batch and section management
- **Role-based Access Control**: Students, Section Admins, and Super Admins with appropriate permissions
- **University Email Integration**: Secure authentication with @diu.edu.bd email validation

### 📱 **Modern User Experience**
- **Progressive Web App (PWA)**: Install on mobile devices for native app experience
- **Real-time Updates**: Live synchronization using Supabase subscriptions
- **Offline Support**: Continue working without internet connection
- **Push Notifications**: Firebase Cloud Messaging for task reminders and updates

### 🔧 **Comprehensive Task Management**
- **Task Categories**: Assignments, Presentations, Quizzes, Projects, and Final Exams
- **Due Date Tracking**: Visual indicators for overdue, in-progress, and completed tasks
- **File Attachments**: Support for documents, images, and other materials
- **Analytics Dashboard**: Task completion statistics and performance insights

### 👥 **Multi-level Administration**
- **Student Dashboard**: View section-specific tasks and routines
- **Section Admin Panel**: Manage users and tasks within assigned sections
- **Super Admin Control**: Full system administration and cross-department management

## 🛠️ Technology Stack

### **Frontend**
- **React 18.3.1** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, utility-first styling
- **Framer Motion** for smooth animations and transitions

### **Backend & Database**
- **Supabase** for authentication, real-time database, and row-level security
- **PostgreSQL** with structured schema for departments, batches, sections, and users
- **Firebase** for push notifications and cloud messaging

### **UI Components & Libraries**
- **Radix UI** for accessible, unstyled components
- **Lucide React** for consistent iconography
- **React Router DOM** for client-side routing
- **React Hook Form** for efficient form handling
- **Chart.js & Recharts** for data visualization

### **Development Tools**
- **ESLint & TypeScript ESLint** for code quality
- **Workbox** for service worker and caching strategies
- **Rollup Plugin Visualizer** for bundle analysis

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Supabase account** for database and authentication
- **Firebase account** for push notifications (optional)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/nesttask.git
cd nesttask
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase Configuration (for push notifications)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

### 4. Database Setup
1. Create a new Supabase project
2. Run the SQL migrations from `supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Set up the required tables: departments, batches, sections, users, tasks, routines

### 5. Start Development Server
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## 📖 Usage Guide

### **For Students**
1. **Sign Up**: Register with your university email (@diu.edu.bd)
2. **Select Department**: Choose your department, batch, and section
3. **View Tasks**: Access tasks assigned to your section
4. **Track Progress**: Monitor due dates and completion status
5. **Access Routines**: View class schedules and academic calendar

### **For Section Admins**
1. **Access Admin Panel**: Navigate to the admin dashboard
2. **Manage Users**: View and manage students in your section
3. **Create Tasks**: Add assignments, quizzes, and projects
4. **Set Routines**: Create and update class schedules
5. **Monitor Analytics**: Track section performance and engagement

### **For Super Admins**
1. **System Overview**: Access comprehensive dashboard
2. **Manage Departments**: Create and organize academic departments
3. **User Administration**: Promote/demote users across all sections
4. **Global Analytics**: View system-wide statistics and reports

## 📁 Project Structure

```
nesttask/
├── public/                 # Static assets and PWA files
│   ├── icons/             # App icons for different sizes
│   ├── manifest.json      # PWA manifest
│   └── service-worker.js  # Service worker for offline support
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── admin/        # Admin-specific components
│   │   ├── auth/         # Authentication components
│   │   ├── task/         # Task management components
│   │   └── ui/           # Base UI components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Main application pages
│   ├── services/         # API and business logic
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── lib/              # External library configurations
├── supabase/             # Database migrations and functions
└── docs/                 # Additional documentation
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run clean-dev        # Clean cache and start dev server

# Building
npm run build           # Build for production
npm run vercel-build    # Build for Vercel deployment

# Code Quality
npm run lint            # Run ESLint
npm run preview         # Preview production build

# Analysis
npm run analyze         # Analyze bundle size
```

## 🌐 Deployment

### **Vercel (Recommended)**
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### **Manual Deployment**
1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your hosting provider
3. Configure environment variables on your hosting platform

For detailed deployment instructions, see [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

## 🤝 Contributing

We welcome contributions to NestTask! Please follow these guidelines:

### **Getting Started**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### **Code Standards**
- Follow TypeScript best practices
- Use ESLint configuration provided
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

### **Reporting Issues**
- Use GitHub Issues for bug reports
- Provide detailed reproduction steps
- Include environment information
- Add screenshots for UI issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via [GitHub Issues](https://github.com/your-repo/nesttask/issues)
- **Email**: nehalindex002@gmail.com
- **University**: Daffodil International University (DIU)

## 🙏 Acknowledgments

- **Daffodil International University** for the academic context and requirements
- **Supabase** for providing excellent backend-as-a-service
- **Vercel** for seamless deployment and hosting
- **Open Source Community** for the amazing tools and libraries

---

**Built with ❤️ for the academic community**
