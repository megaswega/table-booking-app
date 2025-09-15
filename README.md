# Table Booking App

A simple full-stack web application for managing restaurant table reservations.  
The app provides an interactive table layout (lower terrace), allows creating and canceling bookings, and shows a daily overview of reservations.

## ✨ Features

- 📅 **Daily reservations**: Book tables for the current day only  
- 🍽️ **Interactive layout**: Visual grid of tables (big = 4 seats, small = 2 seats)  
- 🕒 **Live time display**: Always shows current date & time  
- ✅ **Create bookings**: Select tables, set number of people, name, and time  
- ❌ **Cancel bookings**: Cancel directly from table popup  
- 📋 **Reservations sheet**: View all of today’s bookings in a list  
- 📱 **Responsive design**: Works on tablets and desktop browsers  

## 📂 Project Structure

.
├── server.js       # Node.js server (HTTP + REST API + static serving)
├── db.json         # JSON file for storing tables & bookings (auto-created)
├── public/
│   ├── index.html  # Main UI
│   ├── app.js      # Frontend logic
│   └── style.css   # Styling

## 🔌 API Endpoints

- `GET /api/tables` → List all tables with booking info  
- `GET /api/bookings` → List all bookings  
- `POST /api/bookings` → Create a new booking  
- `DELETE /api/bookings/:id` → Cancel a booking  

## 🚀 Getting Started

### 1. Clone or download
bash
git clone https://github.com/yourname/table-booking-app.git
cd table-booking-app

2. Install dependencies

⚠️ This app uses only built-in Node.js modules (no external dependencies).
Just ensure you have Node.js 14+ installed.

3. Run the server

node server.js

Server will start at:
👉 http://localhost:3000

4. Open the app

In your browser, go to http://localhost:3000.

📖 Usage Notes
	•	Tables layout: Two rows, repeating pattern Big, Big, Small
	•	Booking hours: Only between 11:00 – 22:30
	•	Auto-free expired: Past reservations are automatically cleared every minute
	•	Persistence: Data stored in db.json (auto-created on first run)

🔮 Roadmap
	•	Add upper terrace support
	•	Enable multi-day reservations
	•	Authentication for staff/admin access
	•	Export reservations list

📝 License

This project is open source under the MIT License.
Feel free to use and modify it for your own needs.
