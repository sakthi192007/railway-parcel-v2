# Railway Parcel Management System

Full-stack academic project using **Java Spring Boot + Oracle Database + React**.

## Features
- Manage Customers, Trains and Parcels
- Display parcel details with customer/train information using JOIN
- Find trains carrying more parcels than the average using a subquery
- Oracle stored procedure: `BOOK_PARCEL`
- Oracle stored function: `CALCULATE_PARCEL_CHARGE`
- Oracle trigger: automatically inserts into `PARCEL_TRACKING` after parcel status update
- REST API with Spring Boot
- React frontend

## Project structure
```
railway-parcel-management/
├── database/
│   └── railway_parcel_management.sql
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/railway/parcel/...
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/...
```

## 1. Database setup (Oracle 21c/XE)
Run `database/railway_parcel_management.sql` in SQL Developer or SQL*Plus.

The script creates:
- CUSTOMERS
- TRAINS
- PARCELS
- PARCEL_TRACKING
- procedure BOOK_PARCEL
- function CALCULATE_PARCEL_CHARGE
- trigger TRG_PARCEL_STATUS_TRACKING
- sample data and required queries

## 2. Backend setup
Edit `backend/src/main/resources/application.properties` with your Oracle username/password.

Example:
```
spring.datasource.url=jdbc:oracle:thin:@localhost:1521/XEPDB1
spring.datasource.username=SYSTEM
spring.datasource.password=YOUR_PASSWORD
```

Then:
```
cd backend
mvn spring-boot:run
```
Backend: `http://localhost:8080`

## 3. Frontend setup
```
cd frontend
npm install
npm run dev
```
Frontend: `http://localhost:5173`

## Main APIs
- GET `/api/customers`
- POST `/api/customers`
- GET `/api/trains`
- GET `/api/trains/above-average`
- POST `/api/trains`
- GET `/api/parcels`
- POST `/api/parcels/book`
- PUT `/api/parcels/{id}/status`
- GET `/api/parcels/{id}/tracking`

## Demo flow
1. Open the React dashboard.
2. View customers, trains and parcels.
3. Book a parcel from the Book Parcel form.
4. The backend calls the Oracle procedure `BOOK_PARCEL`.
5. The charge is calculated by `CALCULATE_PARCEL_CHARGE`.
6. Update parcel status.
7. The Oracle trigger automatically inserts the old/new status into `PARCEL_TRACKING`.
8. Open the tracking section to see the generated history.

## Important academic concepts
### JOIN
`PARCELS` joins with `CUSTOMERS` and `TRAINS` to show a complete parcel view.

### Subquery
The `above-average` query compares each train's parcel count against the average parcel count across trains.

### Procedure
`BOOK_PARCEL` inserts a parcel and calculates its charge.

### Function
`CALCULATE_PARCEL_CHARGE(weight, distance)` returns a numeric charge.

### Trigger
`TRG_PARCEL_STATUS_TRACKING` fires after a parcel status changes and creates a tracking record.
