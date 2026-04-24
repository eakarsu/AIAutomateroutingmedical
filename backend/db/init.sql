-- Drop tables if exist
DROP TABLE IF EXISTS ai_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS route_stops CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS visit_notes CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS medical_orders CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS nurses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nurses table
CREATE TABLE nurses (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  license_number VARCHAR(50),
  specialization VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  hire_date DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(10),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(10),
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  insurance_provider VARCHAR(100),
  insurance_id VARCHAR(50),
  primary_diagnosis TEXT,
  status VARCHAR(20) DEFAULT 'active',
  assigned_nurse_id INTEGER REFERENCES nurses(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Medical Orders table
CREATE TABLE medical_orders (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  ordering_physician VARCHAR(255),
  order_type VARCHAR(100) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'routine',
  status VARCHAR(30) DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  frequency VARCHAR(100),
  instructions TEXT,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Visits table
CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id INTEGER REFERENCES nurses(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  visit_type VARCHAR(100),
  status VARCHAR(30) DEFAULT 'scheduled',
  notes TEXT,
  vitals JSONB,
  ai_notes TEXT,
  address TEXT,
  lat DECIMAL(10, 7),
  lng DECIMAL(10, 7),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Visit Notes table
CREATE TABLE visit_notes (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
  nurse_id INTEGER REFERENCES nurses(id) ON DELETE SET NULL,
  note_type VARCHAR(50),
  content TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Schedules table
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  nurse_id INTEGER REFERENCES nurses(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  status VARCHAR(30) DEFAULT 'scheduled',
  territory VARCHAR(100),
  max_visits INTEGER DEFAULT 8,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Routes table
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  nurse_id INTEGER REFERENCES nurses(id) ON DELETE CASCADE,
  route_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'planned',
  total_distance DECIMAL(10, 2),
  total_duration INTEGER,
  optimization_score DECIMAL(5, 2),
  ai_suggestions TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Route Stops table
CREATE TABLE route_stops (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
  visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
  stop_order INTEGER,
  estimated_arrival TIME,
  estimated_departure TIME,
  distance_from_prev DECIMAL(10, 2),
  duration_from_prev INTEGER
);

-- Notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Logs table
CREATE TABLE ai_logs (
  id SERIAL PRIMARY KEY,
  feature VARCHAR(100),
  prompt TEXT,
  response TEXT,
  model VARCHAR(100),
  tokens_used INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
