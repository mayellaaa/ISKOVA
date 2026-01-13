# ISKOVA Lab Booking System

A simple, clean computer lab reservation system built with vanilla HTML, CSS, and JavaScript.

## 📁 Project Structure

```
iskova-labs/
├── index.html              # Homepage (entry point)
├── config.json            # Configuration file
├── README.md              # Project documentation
│
├── assets/                # Images, logos, backgrounds
│   └── logo.svg
│
├── css/                   # Stylesheets
│   └── styles.css         # Main stylesheet
│
├── js/                    # JavaScript files
│   └── script.js          # Main application logic
│
└── pages/                 # All other HTML pages
    ├── login.html         # User login
    ├── register.html      # User registration
    ├── forgot-password.html  # Password reset
    ├── dashboard.html     # User dashboard with booking history
    ├── labs.html          # Labs listing with search/filter
    ├── availability.html  # Calendar view
    ├── reserve.html       # New booking form
    ├── manage.html        # Manage existing bookings
    └── confirmation.html  # Booking confirmation with QR code
```

## 🚀 Features

- **User Authentication** - Login, register, and password reset
- **Lab Browsing** - View all available labs with filtering
- **Booking System** - Reserve labs with date/time selection
- **Dashboard** - View booking history and statistics
- **Calendar** - Check availability by month
- **QR Codes** - Get QR codes for confirmed bookings
- **Contact Form** - Get in touch with support

## 🎨 Design

- Clean, modern burgundy/dark theme
- Responsive layout
- Poppins font from Google Fonts
- No external dependencies or frameworks

## 💾 Data Storage

Uses browser localStorage for:
- User sessions (`iskova.user`)
- Booking data (`iskova.reservations`)
- Temporary booking info (`lastBooking`)

## 🔧 Setup

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No build process or dependencies required!

## 📄 Pages Overview

| Page | Purpose |
|------|---------|
| `index.html` | Landing page with hero section |
| `pages/login.html` | User login form |
| `pages/register.html` | New user registration |
| `pages/dashboard.html` | User's booking management center |
| `pages/labs.html` | Browse all computer labs |
| `pages/availability.html` | Calendar view of availability |
| `pages/reserve.html` | Create new booking |
| `pages/confirmation.html` | Booking confirmation screen |
| `pages/contact.html` | Contact form |

## 🛠️ Technologies

- HTML5
- CSS3 (with CSS Variables)
- Vanilla JavaScript (ES6+)
- LocalStorage API

## 📱 Browser Support

Works on all modern browsers that support:
- ES6 JavaScript
- CSS Grid/Flexbox
- LocalStorage

---

**ISKOVA Lab Booking System** - Simple, Fast, Effective
