# 🏥 MediTrack — Smart Pharmacy & Inventory Management System (Frontend)

**Live Site:** [https://meditrack-v1.vercel.app](https://meditrack-v1.vercel.app)

> ⚠️ **Disclaimer:**  
> This repository contains only the **frontend (Next.js)** portion of the MediTrack system and is shared publicly **for portfolio and demonstration purposes only**.  
> The **backend, API, and database configurations** are **kept private** for confidentiality and data security reasons.  
> For full functionality, please visit the **live deployed site** linked above.

---

## 🧠 Overview

**MediTrack** is a **Role-Based Pharmacy Management Web Application** designed to streamline the workflow of pharmacies, staff, and administrators through a **modern, intuitive, and responsive interface**.  
It provides a central platform for managing inventories, invoices, staff, and overall pharmacy operations.

This repository holds the **frontend** built using **Next.js**, deployed on **Vercel**, and integrated with a secure backend API hosted on AWS EC2.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend Framework** | Next.js (React 18) |
| **Styling** | Tailwind CSS + DaisyUI |
| **State Management** | React Hooks / Context API |
| **API Handling** | Fetch / Axios connected to private Express.js API |
| **Authentication** | JWT + Role-Based Access |
| **Deployment** | Vercel |
| **Hosting (Backend)** | AWS EC2 (private) |

---

## 👥 User Roles & Dashboards

MediTrack provides **four distinct dashboards**, each with custom access permissions and UI:

| Role | Description |
|------|--------------|
| 🧑‍💼 **Admin** | Manages all pharmacies, oversees inventory, tracks invoices, and monitors platform usage. |
| 🏪 **Pharmacy Owner** | Creates and manages their pharmacy’s inventory, staff, and billing system. |
| 👨‍🔧 **Staff** | Handles sales, inventory updates, and daily pharmacy operations assigned by owners. |
| 👥 **General User** | Views products from multiple pharmacies, searches items, and filters by price/category. |

---

## 🧩 Key Features

### 🔹 Role-Based Access Control
Different dashboards and permissions based on user type — Admin, Pharmacy, Staff, or General User.

### 🔹 Centralized Inventory Management
Admins monitor all inventories, while pharmacies maintain independent stock control.

### 🔹 Pharmacy-Specific CRUD Operations
Pharmacy owners can add, edit, or remove medicines, categories, and suppliers independently.

### 🔹 Invoice & Billing System
Integrated billing section that automatically updates stock and tracks revenue.

### 🔹 Advanced Product Search & Filter
Users can explore available medicines across pharmacies by category, name, or price.

### 🔹 Staff Management
Pharmacy owners can add staff accounts, assign permissions, and monitor their activities.

### 🔹 Secure Authentication
JWT-based login system with session persistence and secure token storage.

### 🔹 Responsive Design
Fully responsive on mobile, tablet, and desktop devices for seamless accessibility.

---

## 🖥️ Project Structure

