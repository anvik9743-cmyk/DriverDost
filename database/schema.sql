-- DriverDost PostgreSQL schema (production) — 13 core tables
CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, email TEXT UNIQUE, role TEXT CHECK (role IN ('customer','driver','admin')) NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE driver_profiles (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), experience_years INT, languages TEXT[], approval_status TEXT DEFAULT 'pending', reliability_score NUMERIC DEFAULT 0, transmissions TEXT[]);
CREATE TABLE driver_verifications (id SERIAL PRIMARY KEY, driver_id INT REFERENCES driver_profiles(id), verification_type TEXT, status TEXT, expiry_date DATE, verified_at TIMESTAMPTZ);
CREATE TABLE driver_availability (driver_id INT PRIMARY KEY REFERENCES driver_profiles(id), available_status BOOLEAN DEFAULT false, last_location GEOGRAPHY(POINT), updated_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE vehicles (id SERIAL PRIMARY KEY, customer_id INT REFERENCES users(id), registration_number TEXT, vehicle_details TEXT, transmission TEXT);
CREATE TABLE bookings (id SERIAL PRIMARY KEY, customer_id INT REFERENCES users(id), driver_id INT REFERENCES driver_profiles(id), pickup TEXT NOT NULL, destination TEXT, service_type TEXT, hours NUMERIC, status TEXT DEFAULT 'REQUESTED', total INT, driver_earnings INT, platform_commission INT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE booking_events (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), event_type TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE vehicle_inspections (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), stage TEXT CHECK (stage IN ('pre_trip','post_trip')), inspection_data JSONB, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE payments (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), amount INT, payment_status TEXT, gateway_ref TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE driver_payouts (id SERIAL PRIMARY KEY, driver_id INT REFERENCES driver_profiles(id), booking_id INT REFERENCES bookings(id), amount INT, payout_status TEXT);
CREATE TABLE reviews (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), customer_rating INT, driver_rating INT, comment TEXT);
CREATE TABLE incidents (id SERIAL PRIMARY KEY, booking_id INT REFERENCES bookings(id), incident_type TEXT, status TEXT DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE notifications (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), notification_type TEXT, status TEXT, created_at TIMESTAMPTZ DEFAULT now());
-- Booking state machine: REQUESTED -> SEARCHING_FOR_DRIVER -> DRIVER_ASSIGNED -> DRIVER_ARRIVING
-- -> DRIVER_ARRIVED -> TRIP_STARTED -> TRIP_COMPLETED -> PAYMENT_COMPLETED | CANCELLED
