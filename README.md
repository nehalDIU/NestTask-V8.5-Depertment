# 🎯 NestTask

<div align="center">

![NestTask Logo](https://img.shields.io/badge/NestTask-v8.5-blue?style=for-the-badge&logo=task&logoColor=white)

**A Modern University Academic Management System**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-FF6B6B?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)

[🚀 Live Demo](https://your-demo-url.com) • [📖 Documentation](./docs) • [🐛 Report Bug](https://github.com/your-repo/issues) • [✨ Request Feature](https://github.com/your-repo/issues)

</div>

---

## ✨ Features

### 🎓 **Academic Management**
- **Department-Based Organization** - CSE, SWE, and more departments
- **Batch & Section Management** - Organized by academic batches and sections
- **Task Assignment & Tracking** - Create, assign, and monitor academic tasks
- **Class Routine Management** - Digital class schedules and timetables

### 👥 **Role-Based Access Control**
- **Students** - View section-specific tasks and routines
- **Section Admins** - Manage users and content within their section
- **Super Admins** - Full system administration capabilities

### 🔔 **Smart Notifications**
- **Push Notifications** - Firebase Cloud Messaging integration
- **Real-time Updates** - Instant task and routine notifications
- **Email Notifications** - Important updates via email

### 📱 **Modern User Experience**
- **Progressive Web App** - Install on any device
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Mode** - Adaptive theme support
- **Offline Support** - Works without internet connection

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center"><strong>Frontend</strong></td>
<td align="center"><strong>Backend</strong></td>
<td align="center"><strong>Database</strong></td>
<td align="center"><strong>Tools</strong></td>
</tr>
<tr>
<td>

- React 18.3.1
- TypeScript 5.5.3
- Vite 5.4.2
- Tailwind CSS 3.4.1
- Framer Motion 12.0.6

</td>
<td>

- Supabase
- Edge Functions
- Row Level Security
- Real-time Subscriptions

</td>
<td>

- PostgreSQL
- Supabase Auth
- Real-time Database
- File Storage

</td>
<td>

- ESLint
- Prettier
- Workbox (PWA)
- Firebase FCM

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Firebase account (for notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nesttask.git
   cd nesttask
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_VAPID_KEY=your-vapid-key
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```
nesttask/
├── 📁 src/
│   ├── 📁 components/          # Reusable UI components
│   ├── 📁 pages/              # Application pages
│   ├── 📁 hooks/              # Custom React hooks
│   ├── 📁 services/           # API services
│   ├── 📁 types/              # TypeScript type definitions
│   ├── 📁 utils/              # Utility functions
│   └── 📁 lib/                # Third-party integrations
├── 📁 public/                 # Static assets
├── 📁 supabase/               # Database migrations & functions
│   ├── 📁 functions/          # Edge functions
│   └── 📁 migrations/         # Database migrations
└── 📁 docs/                   # Documentation
```

---

## 🔐 Authentication & Authorization

### User Roles

| Role | Permissions | Access Level |
|------|-------------|--------------|
| **Student** | View tasks & routines | Section-specific |
| **Section Admin** | CRUD operations for section | Section management |
| **Super Admin** | Full system access | Global administration |

### Email Validation
- Only `@diu.edu.bd` email addresses are accepted
- Automatic role assignment based on department and section

---

## 📱 PWA Features

- **Installable** - Add to home screen on any device
- **Offline Support** - Works without internet connection
- **Background Sync** - Sync data when connection is restored
- **Push Notifications** - Receive updates even when app is closed

---

## 🔔 Notification System

### Setup Firebase Cloud Messaging

1. Follow the [FCM Setup Guide](./FCM_SETUP_GUIDE.md)
2. Configure your Firebase project
3. Update environment variables
4. Deploy Supabase edge functions

### Notification Features

- **Automatic Permission Request** - After successful login
- **Task Reminders** - Due date notifications
- **System Announcements** - Important updates
- **Real-time Updates** - Instant task assignments

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Ensure Supabase and Firebase configurations are correct

3. **Build Settings**
   ```bash
   # Build Command
   npm run build
   
   # Output Directory
   dist
   ```

### Other Platforms

- **Netlify** - Use `npm run build` and deploy `dist` folder
- **Firebase Hosting** - Configure `firebase.json` and deploy
- **GitHub Pages** - Use GitHub Actions for automated deployment

---

## 🧪 Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

---

## 📊 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: Optimized with code splitting
- **Load Time**: < 2s on 3G networks
- **PWA Score**: 100/100

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the amazing backend platform
- [Firebase](https://firebase.google.com/) for push notification services
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Lucide React](https://lucide.dev/) for beautiful icons

---

<div align="center">

**Made with ❤️ for DIU Students**

[⭐ Star this repo](https://github.com/your-repo) • [🐛 Report Issues](https://github.com/your-repo/issues) • [💬 Discussions](https://github.com/your-repo/discussions)

</div>
