# 🧭 Routine Assist App  
**Smart Class Routine Management System for Students, Teachers & Departments**  
📍 **Live Site:** [https://diu-routine-assist-bd.vercel.app/](https://diu-routine-assist-bd.vercel.app/)

> ⚠️ **Disclaimer:**  
> This repository contains the **frontend (Next.js)** portion of the Routine Assist application and is shared publicly **for academic and portfolio demonstration purposes only**.  
> The **backend, database, and confidential configurations** are private to maintain data security and intellectual property protection.  
> For full functionality, visit the **live deployed site** linked above.

---

## 🧠 Overview
**Routine Assist** is a web application that automates and simplifies **class routine management** for **students**, **teachers**, and **department administrators**.  
It ensures real-time scheduling, room availability, and teacher coordination — all managed from a single, centralized dashboard.

---

## 🎯 Key Features

### 👨‍🎓 Students
- View **batch-wise**, **section-wise**, and **day/week-wise** routines  
- Search by **teacher name**, **batch**, or **section**  
- Export or download class routines in one click  
- Check **empty classrooms** before booking  

### 👨‍🏫 Teachers
- View **personalized daily and weekly teaching schedules**  
- Search for classes by **batch, section, or room**  
- **Book available rooms** for makeup or extra classes  

### 🏫 Admin / Department
- Create, update, and manage **department-wide routines**  
- Approve or reject **room booking requests**  
- Upload, replace, and version-control routine files  
- Manage **teacher and student access** privileges  

---

## ⚙️ Tech Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | Next.js 16 (React Framework) |
| **Styling** | Tailwind CSS |
| **Database** | MongoDB Atlas |
| **Backend / API** | Next.js API Routes (Private) |
| **Authentication** | OTP-based secure login |
| **Deployment** | Vercel |
| **Utilities** | Dynamic Search • Filter Queries • Responsive Design |

---

## 🔐 Authentication
- OTP verification ensures **secure access** for students and teachers  
- Role-based access control (RBAC) manages permissions for all user types  
- Admins oversee user approvals, scheduling, and booking management  

---

## 🧩 System Workflow

1. **Login via OTP** — verifies student/teacher identity  
2. **Search Routine** — by batch, section, or teacher name  
3. **Access Dashboard:**  
   - 🧑‍🎓 *Students* → View/export routines  
   - 🧑‍🏫 *Teachers* → Check schedule / book rooms  
4. **Admin Panel:**  
   - Approve or reject bookings  
   - Upload/replace routine files  

---

## 🚀 Core Functionalities

| Module | Description |
|---------|--------------|
| 🗓️ **Routine Management** | Create and manage class schedules |
| 🏫 **Room Booking** | Real-time empty room search and approval system |
| 👥 **Teacher Directory** | Search and view teacher schedules |
| 📘 **Routine Export** | Export class routines in PDF/CSV |
| 🧾 **Admin Dashboard** | Centralized academic management hub |

---

## 💡 Impact
Routine Assist eliminates manual scheduling work and ensures smooth coordination between departments, teachers, and students.  
It improves **accuracy**, **efficiency**, and **real-time accessibility**, making university routine management effortless.

---

## 📁 Project Structure

<pre style="white-space: pre-wrap; word-wrap: break-word;">

routine-assist/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Student routine page
│   ├── teacher/            # Teacher dashboard
│   ├── admin/              # Admin control panel
│   ├── api/                # API route handlers
│   └── ...                 # Additional feature routes
├── components/             # Reusable UI components
├── public/                 # Static assets (images, icons)
├── styles/                 # Tailwind CSS and global styles
├── utils/                  # Helper and configuration files
├── .env.example            # Example environment variables
├── .gitignore
└── README.md

</pre>

---

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_API_URL=https://api.routineassistbd.com
NEXT_PUBLIC_DEPARTMENT=DIU-CSE
