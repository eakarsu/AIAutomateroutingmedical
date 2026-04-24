-- Seed Users
INSERT INTO users (email, password, full_name, role) VALUES
('admin@homehealth.com', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9JqH5J5L5FXkF5J5L5FXkF5J5L', 'Admin User', 'admin'),
('manager@homehealth.com', '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkf9JqH5J5L5FXkF5J5L5FXkF5J5L', 'Sarah Manager', 'manager');

-- Seed Nurses (15+)
INSERT INTO nurses (first_name, last_name, email, phone, license_number, specialization, status, hire_date, address, city, state, zip, lat, lng) VALUES
('Emily', 'Johnson', 'emily.j@homehealth.com', '(555) 101-0001', 'RN-2024-001', 'Cardiac Care', 'active', '2022-03-15', '123 Oak Street', 'Austin', 'TX', '78701', 30.2672, -97.7431),
('Michael', 'Chen', 'michael.c@homehealth.com', '(555) 101-0002', 'RN-2024-002', 'Wound Care', 'active', '2021-07-20', '456 Maple Ave', 'Austin', 'TX', '78702', 30.2550, -97.7282),
('Sarah', 'Williams', 'sarah.w@homehealth.com', '(555) 101-0003', 'RN-2024-003', 'Pediatric Care', 'active', '2023-01-10', '789 Pine Road', 'Austin', 'TX', '78703', 30.2900, -97.7560),
('David', 'Martinez', 'david.m@homehealth.com', '(555) 101-0004', 'RN-2024-004', 'Geriatric Care', 'active', '2020-11-05', '321 Elm Blvd', 'Austin', 'TX', '78704', 30.2400, -97.7600),
('Jessica', 'Brown', 'jessica.b@homehealth.com', '(555) 101-0005', 'RN-2024-005', 'Diabetic Care', 'active', '2022-06-18', '654 Cedar Lane', 'Austin', 'TX', '78705', 30.3050, -97.7450),
('Robert', 'Taylor', 'robert.t@homehealth.com', '(555) 101-0006', 'RN-2024-006', 'Respiratory Care', 'active', '2021-09-22', '987 Birch Drive', 'Austin', 'TX', '78731', 30.3500, -97.7600),
('Amanda', 'Davis', 'amanda.d@homehealth.com', '(555) 101-0007', 'RN-2024-007', 'Post-Surgical', 'active', '2023-04-12', '147 Walnut St', 'Austin', 'TX', '78745', 30.2100, -97.7800),
('James', 'Wilson', 'james.w@homehealth.com', '(555) 101-0008', 'RN-2024-008', 'Palliative Care', 'on_leave', '2020-02-28', '258 Ash Court', 'Austin', 'TX', '78748', 30.1900, -97.8000),
('Maria', 'Garcia', 'maria.g@homehealth.com', '(555) 101-0009', 'RN-2024-009', 'Physical Therapy', 'active', '2022-08-14', '369 Poplar Way', 'Austin', 'TX', '78749', 30.2200, -97.8300),
('Christopher', 'Anderson', 'chris.a@homehealth.com', '(555) 101-0010', 'RN-2024-010', 'Mental Health', 'active', '2021-12-01', '741 Spruce Rd', 'Austin', 'TX', '78750', 30.3800, -97.7400),
('Jennifer', 'Thomas', 'jennifer.t@homehealth.com', '(555) 101-0011', 'RN-2024-011', 'Oncology', 'active', '2023-02-20', '852 Cypress Ave', 'Austin', 'TX', '78751', 30.3100, -97.7200),
('Daniel', 'Jackson', 'daniel.j@homehealth.com', '(555) 101-0012', 'RN-2024-012', 'IV Therapy', 'active', '2020-05-10', '963 Willow Lane', 'Austin', 'TX', '78752', 30.3200, -97.7100),
('Lisa', 'White', 'lisa.w@homehealth.com', '(555) 101-0013', 'RN-2024-013', 'Wound Care', 'inactive', '2019-08-25', '174 Hickory Dr', 'Austin', 'TX', '78753', 30.3400, -97.6900),
('Kevin', 'Harris', 'kevin.h@homehealth.com', '(555) 101-0014', 'RN-2024-014', 'Cardiac Care', 'active', '2022-10-30', '285 Magnolia Ct', 'Austin', 'TX', '78754', 30.3600, -97.6700),
('Rachel', 'Clark', 'rachel.c@homehealth.com', '(555) 101-0015', 'RN-2024-015', 'Geriatric Care', 'active', '2023-06-05', '396 Redwood Blvd', 'Austin', 'TX', '78756', 30.3150, -97.7350),
('Steven', 'Lewis', 'steven.l@homehealth.com', '(555) 101-0016', 'RN-2024-016', 'Pediatric Care', 'active', '2021-04-15', '507 Sycamore St', 'Austin', 'TX', '78757', 30.3500, -97.7300);

-- Seed Patients (15+)
INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, city, state, zip, lat, lng, insurance_provider, insurance_id, primary_diagnosis, status, assigned_nurse_id) VALUES
('John', 'Smith', '1945-03-12', 'Male', '(555) 201-0001', 'john.s@email.com', '100 River Road', 'Austin', 'TX', '78701', 30.2650, -97.7400, 'Medicare', 'MED-001', 'Congestive Heart Failure', 'active', 1),
('Dorothy', 'Miller', '1938-07-22', 'Female', '(555) 201-0002', 'dorothy.m@email.com', '200 Lake Drive', 'Austin', 'TX', '78702', 30.2580, -97.7300, 'Aetna', 'AET-002', 'Type 2 Diabetes', 'active', 5),
('William', 'Moore', '1952-11-08', 'Male', '(555) 201-0003', 'william.m@email.com', '300 Hill Street', 'Austin', 'TX', '78703', 30.2850, -97.7500, 'BlueCross', 'BC-003', 'COPD', 'active', 6),
('Margaret', 'Taylor', '1940-02-28', 'Female', '(555) 201-0004', 'margaret.t@email.com', '400 Valley Blvd', 'Austin', 'TX', '78704', 30.2450, -97.7550, 'United Health', 'UH-004', 'Post Hip Replacement', 'active', 7),
('Robert', 'Anderson', '1948-09-15', 'Male', '(555) 201-0005', 'robert.a@email.com', '500 Mountain View', 'Austin', 'TX', '78705', 30.3000, -97.7500, 'Medicare', 'MED-005', 'Chronic Wound - Left Leg', 'active', 2),
('Helen', 'Thomas', '1935-06-03', 'Female', '(555) 201-0006', 'helen.t@email.com', '600 Sunset Ave', 'Austin', 'TX', '78731', 30.3450, -97.7650, 'Humana', 'HUM-006', 'Alzheimers Disease', 'active', 4),
('Charles', 'Jackson', '1950-12-20', 'Male', '(555) 201-0007', 'charles.j@email.com', '700 Sunrise Blvd', 'Austin', 'TX', '78745', 30.2150, -97.7750, 'Cigna', 'CIG-007', 'Post Knee Surgery', 'active', 7),
('Patricia', 'White', '1942-04-10', 'Female', '(555) 201-0008', 'patricia.w@email.com', '800 Park Lane', 'Austin', 'TX', '78748', 30.1950, -97.7950, 'Medicare', 'MED-008', 'Hypertension', 'active', 1),
('Richard', 'Harris', '1955-08-30', 'Male', '(555) 201-0009', 'richard.h@email.com', '900 Garden Road', 'Austin', 'TX', '78749', 30.2250, -97.8250, 'Aetna', 'AET-009', 'Diabetic Wound Care', 'active', 2),
('Barbara', 'Martin', '1947-01-17', 'Female', '(555) 201-0010', 'barbara.m@email.com', '1000 Forest Way', 'Austin', 'TX', '78750', 30.3750, -97.7450, 'BlueCross', 'BC-010', 'Osteoporosis', 'active', 4),
('Thomas', 'Garcia', '1943-05-25', 'Male', '(555) 201-0011', 'thomas.g@email.com', '1100 Creek Path', 'Austin', 'TX', '78751', 30.3050, -97.7250, 'United Health', 'UH-011', 'Lung Cancer - Palliative', 'active', 8),
('Nancy', 'Robinson', '1958-10-12', 'Female', '(555) 201-0012', 'nancy.r@email.com', '1200 Meadow Lane', 'Austin', 'TX', '78752', 30.3250, -97.7050, 'Medicare', 'MED-012', 'Post Stroke Recovery', 'active', 9),
('James', 'Clark', '1960-03-08', 'Male', '(555) 201-0013', 'james.c@email.com', '1300 Prairie Drive', 'Austin', 'TX', '78753', 30.3350, -97.6950, 'Humana', 'HUM-013', 'Multiple Sclerosis', 'active', 10),
('Susan', 'Lewis', '1937-12-01', 'Female', '(555) 201-0014', 'susan.l@email.com', '1400 Orchard Road', 'Austin', 'TX', '78754', 30.3550, -97.6750, 'Cigna', 'CIG-014', 'Heart Arrhythmia', 'active', 1),
('George', 'Walker', '1949-07-19', 'Male', '(555) 201-0015', 'george.w@email.com', '1500 Vineyard Way', 'Austin', 'TX', '78756', 30.3100, -97.7400, 'Medicare', 'MED-015', 'Chronic Back Pain', 'active', 9),
('Betty', 'Hall', '1944-11-14', 'Female', '(555) 201-0016', 'betty.h@email.com', '1600 Harvest Lane', 'Austin', 'TX', '78757', 30.3450, -97.7350, 'BlueCross', 'BC-016', 'Type 1 Diabetes', 'active', 5);

-- Seed Medical Orders (15+)
INSERT INTO medical_orders (patient_id, ordering_physician, order_type, description, priority, status, start_date, end_date, frequency, instructions) VALUES
(1, 'Dr. James Peterson', 'Skilled Nursing', 'Heart failure monitoring and medication management', 'high', 'active', '2024-01-15', '2024-07-15', '3x per week', 'Monitor weight daily, check BP and HR each visit, assess for edema'),
(2, 'Dr. Lisa Wong', 'Skilled Nursing', 'Diabetes management and insulin adjustment', 'routine', 'active', '2024-02-01', '2024-08-01', '2x per week', 'Check blood glucose, adjust insulin per sliding scale, foot exam each visit'),
(3, 'Dr. Robert Kim', 'Respiratory Therapy', 'COPD management and oxygen therapy', 'high', 'active', '2024-01-20', '2024-07-20', '3x per week', 'Assess oxygen levels, nebulizer treatment, breathing exercises'),
(4, 'Dr. Sarah Chen', 'Physical Therapy', 'Post hip replacement rehabilitation', 'urgent', 'active', '2024-03-01', '2024-06-01', '4x per week', 'ROM exercises, gait training, strengthen hip abductors'),
(5, 'Dr. Michael Davis', 'Wound Care', 'Chronic wound treatment left lower extremity', 'high', 'active', '2024-02-15', '2024-08-15', '3x per week', 'Debride wound, apply silver alginate, measure wound dimensions'),
(6, 'Dr. Patricia Adams', 'Skilled Nursing', 'Alzheimers disease monitoring and care', 'routine', 'active', '2024-01-10', '2024-12-31', '2x per week', 'Cognitive assessment, medication compliance, safety evaluation'),
(7, 'Dr. Sarah Chen', 'Physical Therapy', 'Post knee surgery rehabilitation', 'urgent', 'active', '2024-03-10', '2024-06-10', '4x per week', 'Knee ROM exercises, quad strengthening, ice therapy'),
(8, 'Dr. James Peterson', 'Skilled Nursing', 'Hypertension monitoring', 'routine', 'active', '2024-02-20', '2024-08-20', '1x per week', 'Monitor BP, medication review, diet counseling'),
(9, 'Dr. Michael Davis', 'Wound Care', 'Diabetic wound care bilateral feet', 'high', 'active', '2024-03-05', '2024-09-05', '3x per week', 'Clean and dress wounds, offloading assessment, vascular check'),
(10, 'Dr. Lisa Wong', 'Skilled Nursing', 'Osteoporosis management', 'routine', 'active', '2024-02-10', '2024-08-10', '1x per week', 'Fall risk assessment, calcium/vitamin D compliance, bone density follow up'),
(11, 'Dr. Robert Kim', 'Palliative Care', 'Lung cancer palliative care', 'high', 'active', '2024-01-05', '2024-12-31', '3x per week', 'Pain management, symptom assessment, emotional support'),
(12, 'Dr. Patricia Adams', 'Physical Therapy', 'Post stroke rehabilitation', 'urgent', 'active', '2024-03-15', '2024-09-15', '4x per week', 'Speech exercises, fine motor skills, balance training'),
(13, 'Dr. James Peterson', 'Skilled Nursing', 'MS symptom management', 'routine', 'active', '2024-02-25', '2024-08-25', '2x per week', 'Fatigue management, spasticity assessment, injection training'),
(14, 'Dr. Lisa Wong', 'Cardiac Care', 'Heart arrhythmia monitoring', 'high', 'active', '2024-03-01', '2024-09-01', '2x per week', 'ECG monitoring, medication compliance, activity tolerance'),
(15, 'Dr. Michael Davis', 'Physical Therapy', 'Chronic back pain management', 'routine', 'active', '2024-02-05', '2024-08-05', '2x per week', 'Core strengthening, stretching program, pain assessment'),
(16, 'Dr. Sarah Chen', 'Skilled Nursing', 'Type 1 diabetes insulin pump management', 'high', 'active', '2024-03-20', '2024-09-20', '2x per week', 'Insulin pump site care, glucose monitoring, carb counting review');

-- Seed Visits (15+)
INSERT INTO visits (patient_id, nurse_id, visit_date, start_time, end_time, visit_type, status, notes, address, lat, lng) VALUES
(1, 1, CURRENT_DATE, '08:00', '08:45', 'Skilled Nursing', 'scheduled', 'Regular cardiac monitoring visit', '100 River Road, Austin, TX', 30.2650, -97.7400),
(2, 5, CURRENT_DATE, '09:00', '09:45', 'Skilled Nursing', 'scheduled', 'Diabetes check and insulin adjustment', '200 Lake Drive, Austin, TX', 30.2580, -97.7300),
(3, 6, CURRENT_DATE, '08:30', '09:15', 'Respiratory Therapy', 'scheduled', 'COPD assessment and nebulizer', '300 Hill Street, Austin, TX', 30.2850, -97.7500),
(4, 7, CURRENT_DATE, '10:00', '11:00', 'Physical Therapy', 'in_progress', 'Hip rehab session - week 3', '400 Valley Blvd, Austin, TX', 30.2450, -97.7550),
(5, 2, CURRENT_DATE, '08:00', '08:45', 'Wound Care', 'completed', 'Wound measurement and dressing change', '500 Mountain View, Austin, TX', 30.3000, -97.7500),
(6, 4, CURRENT_DATE, '09:30', '10:15', 'Skilled Nursing', 'scheduled', 'Cognitive assessment and med check', '600 Sunset Ave, Austin, TX', 30.3450, -97.7650),
(7, 7, CURRENT_DATE, '11:30', '12:30', 'Physical Therapy', 'scheduled', 'Knee rehab - ROM focus', '700 Sunrise Blvd, Austin, TX', 30.2150, -97.7750),
(8, 1, CURRENT_DATE, '10:00', '10:30', 'Skilled Nursing', 'scheduled', 'BP monitoring and med review', '800 Park Lane, Austin, TX', 30.1950, -97.7950),
(9, 2, CURRENT_DATE, '09:30', '10:15', 'Wound Care', 'scheduled', 'Diabetic foot wound care', '900 Garden Road, Austin, TX', 30.2250, -97.8250),
(10, 4, CURRENT_DATE, '11:00', '11:45', 'Skilled Nursing', 'scheduled', 'Fall risk evaluation', '1000 Forest Way, Austin, TX', 30.3750, -97.7450),
(11, 8, CURRENT_DATE, '08:00', '09:00', 'Palliative Care', 'completed', 'Pain management and comfort care', '1100 Creek Path, Austin, TX', 30.3050, -97.7250),
(12, 9, CURRENT_DATE, '09:00', '10:00', 'Physical Therapy', 'in_progress', 'Speech and motor exercises', '1200 Meadow Lane, Austin, TX', 30.3250, -97.7050),
(13, 10, CURRENT_DATE, '10:30', '11:15', 'Skilled Nursing', 'scheduled', 'MS symptom check', '1300 Prairie Drive, Austin, TX', 30.3350, -97.6950),
(14, 1, CURRENT_DATE, '11:30', '12:15', 'Cardiac Care', 'scheduled', 'ECG and medication review', '1400 Orchard Road, Austin, TX', 30.3550, -97.6750),
(15, 9, CURRENT_DATE, '11:00', '11:45', 'Physical Therapy', 'scheduled', 'Back exercises and assessment', '1500 Vineyard Way, Austin, TX', 30.3100, -97.7400),
(16, 5, CURRENT_DATE, '11:00', '11:45', 'Skilled Nursing', 'scheduled', 'Insulin pump check', '1600 Harvest Lane, Austin, TX', 30.3450, -97.7350);

-- Seed Schedules (15+)
INSERT INTO schedules (nurse_id, schedule_date, shift_start, shift_end, status, territory, max_visits, notes) VALUES
(1, CURRENT_DATE, '07:30', '16:00', 'active', 'Downtown Austin', 6, 'Cardiac patients priority'),
(2, CURRENT_DATE, '07:30', '16:00', 'active', 'East Austin', 5, 'Wound care supplies loaded'),
(3, CURRENT_DATE, '08:00', '16:30', 'scheduled', 'West Austin', 6, 'Pediatric visits'),
(4, CURRENT_DATE, '07:30', '16:00', 'active', 'North Austin', 5, 'Geriatric assessments'),
(5, CURRENT_DATE, '08:00', '16:30', 'active', 'Central Austin', 6, 'Diabetes management day'),
(6, CURRENT_DATE, '07:30', '16:00', 'active', 'South Austin', 5, 'Respiratory equipment check'),
(7, CURRENT_DATE, '08:00', '17:00', 'active', 'South Austin', 7, 'PT heavy schedule'),
(8, CURRENT_DATE, '07:00', '15:30', 'active', 'East Austin', 4, 'Palliative care focus'),
(9, CURRENT_DATE, '08:00', '16:30', 'active', 'North Austin', 6, 'PT and rehab visits'),
(10, CURRENT_DATE, '09:00', '17:30', 'active', 'Central Austin', 5, 'Mental health assessments'),
(11, CURRENT_DATE, '07:30', '16:00', 'scheduled', 'West Austin', 5, 'Oncology follow-ups'),
(12, CURRENT_DATE, '08:00', '16:30', 'scheduled', 'Downtown Austin', 6, 'IV therapy rounds'),
(1, CURRENT_DATE + 1, '07:30', '16:00', 'scheduled', 'Downtown Austin', 6, 'Follow up visits'),
(2, CURRENT_DATE + 1, '07:30', '16:00', 'scheduled', 'East Austin', 5, 'New wound assessments'),
(5, CURRENT_DATE + 1, '08:00', '16:30', 'scheduled', 'Central Austin', 6, 'Diabetes education day'),
(7, CURRENT_DATE + 1, '08:00', '17:00', 'scheduled', 'South Austin', 7, 'Post-surgical follow ups');

-- Seed Routes (15+)
INSERT INTO routes (nurse_id, route_date, status, total_distance, total_duration, optimization_score) VALUES
(1, CURRENT_DATE, 'active', 28.5, 95, 87.5),
(2, CURRENT_DATE, 'active', 22.3, 75, 92.1),
(3, CURRENT_DATE, 'planned', 31.0, 105, 78.3),
(4, CURRENT_DATE, 'active', 19.8, 65, 94.6),
(5, CURRENT_DATE, 'active', 25.1, 85, 89.2),
(6, CURRENT_DATE, 'active', 33.7, 110, 76.8),
(7, CURRENT_DATE, 'active', 27.4, 90, 85.4),
(8, CURRENT_DATE, 'completed', 18.2, 60, 96.1),
(9, CURRENT_DATE, 'active', 29.6, 100, 82.7),
(10, CURRENT_DATE, 'active', 24.0, 80, 90.3),
(11, CURRENT_DATE, 'planned', 30.5, 102, 79.5),
(12, CURRENT_DATE, 'planned', 26.8, 88, 84.9),
(1, CURRENT_DATE + 1, 'planned', 30.2, 100, 83.0),
(2, CURRENT_DATE + 1, 'planned', 24.5, 82, 88.5),
(5, CURRENT_DATE + 1, 'planned', 27.0, 90, 86.2);

-- Seed Route Stops
INSERT INTO route_stops (route_id, visit_id, stop_order, estimated_arrival, estimated_departure, distance_from_prev, duration_from_prev) VALUES
(1, 1, 1, '08:00', '08:45', 5.2, 15),
(1, 8, 2, '09:10', '09:40', 8.3, 25),
(1, 14, 3, '10:05', '10:50', 15.0, 25),
(2, 5, 1, '08:00', '08:45', 4.1, 12),
(2, 9, 2, '09:10', '09:55', 10.5, 25),
(5, 2, 1, '09:00', '09:45', 3.8, 10),
(5, 16, 2, '10:05', '10:50', 8.2, 20),
(7, 4, 1, '10:00', '11:00', 6.5, 18),
(7, 7, 2, '11:20', '12:20', 12.3, 20);

-- Seed Notifications (15+)
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(1, 'New Patient Assigned', 'Patient John Smith has been assigned to nurse Emily Johnson', 'assignment', false),
(1, 'Visit Completed', 'Nurse Michael Chen completed wound care visit for Robert Anderson', 'visit', true),
(1, 'Route Optimized', 'AI has optimized routes for 8 nurses today, saving 45 minutes total', 'optimization', false),
(1, 'Medical Order Expiring', 'Order for Margaret Taylor (Hip Rehab) expires in 7 days', 'alert', false),
(1, 'Schedule Conflict', 'Nurse Amanda Davis has overlapping visits at 10:00 AM', 'conflict', false),
(1, 'New Medical Order', 'Dr. Peterson submitted new order for patient Patricia White', 'order', false),
(1, 'Visit Running Late', 'Nurse Emily Johnson is 15 minutes behind schedule', 'delay', false),
(1, 'Weekly Report Ready', 'Performance report for week of March 10 is available', 'report', true),
(1, 'Nurse On Leave', 'James Wilson started medical leave effective today', 'staff', true),
(1, 'Patient Discharge', 'Patient evaluation complete - Margaret Taylor ready for discharge review', 'discharge', false),
(1, 'Certification Expiring', 'Nurse Lisa White license expires in 30 days', 'certification', false),
(1, 'High Priority Visit', 'Urgent visit needed for Helen Thomas - behavior change reported', 'urgent', false),
(1, 'AI Insight Available', 'Route optimization analysis complete for tomorrow', 'ai', false),
(1, 'Supply Alert', 'Wound care supplies running low - reorder needed', 'supply', false),
(1, 'Compliance Reminder', 'Monthly documentation audit due by end of week', 'compliance', false);

-- Seed Visit Notes (15+)
INSERT INTO visit_notes (visit_id, nurse_id, note_type, content, ai_generated) VALUES
(1, 1, 'SOAP', 'S: Patient reports mild shortness of breath with exertion. Sleeping on 2 pillows. O: BP 138/82, HR 76, SpO2 96%. Weight 185 lbs (+1 lb from last visit). Mild bilateral ankle edema. A: CHF stable with slight fluid retention. P: Continue current medications, restrict sodium intake, monitor weight daily.', false),
(2, 5, 'SOAP', 'S: Patient states blood sugar has been running higher than usual in mornings. Feeling tired. O: Fasting BG 178, post-prandial 245. A1C due next week. Feet intact, no lesions. A: Diabetes poorly controlled, insulin adjustment needed. P: Increase morning Lantus by 2 units. Continue monitoring.', false),
(3, 6, 'SOAP', 'S: Patient reports increased coughing, especially at night. Using O2 at 2L continuously. O: SpO2 92% on room air, 96% on 2L. Lung sounds: scattered wheezes bilateral. RR 20. A: COPD with mild exacerbation. P: Nebulizer treatment administered. Contact physician for possible steroid burst.', false),
(4, 7, 'Progress', 'Patient progressing well with hip rehabilitation. ROM improved to 95 degrees flexion. Gait steadier with walker. Able to perform ADLs with minimal assistance. Continuing strengthening exercises per protocol.', false),
(5, 2, 'Wound Care', 'Wound measurement: 3.2cm x 2.1cm x 0.4cm depth. Decreased from 3.5cm x 2.4cm last visit. Wound bed 80% granulation, 20% slough. Moderate serous drainage. Applied silver alginate and foam dressing. No signs of infection.', false),
(6, 4, 'Assessment', 'Cognitive assessment performed. MMSE score 18/30 (decline from 20 last month). Patient oriented to person only. Medication compliance checked - all pills accounted for in organizer. Caregiver present and attentive.', false),
(7, 7, 'Progress', 'Knee ROM: 0-110 degrees (improved from 0-95). Quad strength 4/5. Patient able to walk 200 feet with cane. Ice therapy applied post-exercise. Good compliance with home exercise program.', false),
(8, 1, 'SOAP', 'S: Patient feeling well, no complaints. O: BP 128/78 (well controlled). HR 72 regular. No edema. A: Hypertension well managed on current regimen. P: Continue current medications. Next visit in 1 week.', false),
(9, 2, 'Wound Care', 'Right foot: Wound 2.1cm x 1.8cm, good granulation. Left foot: Wound 1.5cm x 1.2cm, 100% granulation. Both wounds improving. Offloading devices in place. Dressings changed with collagen matrix.', false),
(10, 4, 'Assessment', 'Fall risk assessment completed. Timed Up and Go: 18 seconds (high risk). Balance impaired. Recommended grab bars installation. Home environment modifications discussed with family.', false),
(11, 8, 'Palliative', 'Pain assessment: 6/10 at rest, 8/10 with movement. Current pain medication regimen reviewed. Morphine dosage adequate. Patient and family counseled on comfort measures. Emotional support provided.', false),
(12, 9, 'Progress', 'Speech therapy: Patient able to form 3-word sentences consistently. Fine motor: Can grip objects with right hand for 30 seconds. Balance: Can stand unsupported for 45 seconds. Continued improvement noted.', false),
(13, 10, 'SOAP', 'S: Patient reports increased fatigue and mild numbness in left hand. Mood stable. O: Grip strength reduced left hand. Gait steady. Injection site clean. A: MS with mild symptom fluctuation. P: Continue disease-modifying therapy. Report any vision changes.', false),
(14, 1, 'Cardiac', 'ECG performed: Normal sinus rhythm, occasional PACs. HR 68. BP 132/76. Patient reports no palpitations this week. Medication compliance confirmed. Activity tolerance improved.', false),
(15, 9, 'Progress', 'Back pain level: 4/10 (reduced from 6/10). Core strengthening exercises progressing well. Patient performing home exercises daily. Added resistance band exercises. Posture education reinforced.', false),
(16, 5, 'SOAP', 'S: Patient reports insulin pump site irritation. BG logs reviewed - good control. O: Pump site right abdomen, mild erythema. Rotated to left abdomen. BG range 90-160 this week. A: Type 1 DM well managed. P: Continue current regimen, rotate sites regularly.', true);

-- Seed AI Logs (15+)
INSERT INTO ai_logs (feature, prompt, response, model, tokens_used) VALUES
('route_optimization', 'Optimize route for Emily Johnson...', 'Recommended route order: 1. John Smith (River Road) 2. Patricia White (Park Lane) 3. Susan Lewis (Orchard Road). Estimated savings: 22 minutes.', 'anthropic/claude-haiku-4.5', 850),
('order_processing', 'Analyze order for John Smith - CHF monitoring...', 'Clinical Summary: Patient requires skilled nursing for congestive heart failure management including daily weight monitoring, blood pressure assessment, and edema evaluation.', 'anthropic/claude-haiku-4.5', 1200),
('visit_notes', 'Generate SOAP notes for wound care visit...', 'Subjective: Patient reports wound area is less painful. Objective: Wound measurements show 15% size reduction. Assessment: Wound healing progressing well. Plan: Continue current dressing protocol.', 'anthropic/claude-haiku-4.5', 920),
('smart_schedule', 'Analyze schedule for March 16...', 'Schedule Analysis: 12 nurses on duty, 16 visits scheduled. Workload balanced. Recommendation: Reassign 2 visits from Nurse Johnson to Nurse Martinez for better geographic clustering.', 'anthropic/claude-haiku-4.5', 1100),
('patient_risk', 'Evaluate risk for Dorothy Miller...', 'Overall Risk Level: Moderate. Key Factors: Type 2 Diabetes with suboptimal control, age 87, living alone. Hospitalization Risk: 25% within 30 days. Recommended: Increase visit frequency.', 'anthropic/claude-haiku-4.5', 980),
('chat', 'Best practices for wound care documentation?', 'Key documentation elements: wound location, size (L x W x D), wound bed description, drainage characteristics, periwound skin condition, treatment applied, and patient tolerance.', 'anthropic/claude-haiku-4.5', 650),
('route_optimization', 'Optimize route for Michael Chen...', 'Current route: 22.3 miles. Optimized route: 18.1 miles. Time savings: 18 minutes. Reorder: Stop 2 and Stop 3 swapped for better flow.', 'anthropic/claude-haiku-4.5', 780),
('order_processing', 'Process physical therapy order for Margaret Taylor...', 'Care Plan: 4x weekly PT sessions focusing on hip abductor strengthening, gait training with progressive weight bearing, and ROM exercises. Duration: 12 weeks.', 'anthropic/claude-haiku-4.5', 1050),
('visit_notes', 'Generate notes for palliative care visit...', 'Pain Management: Current morphine regimen adequate. Symptom Assessment: Mild nausea managed with ondansetron. Emotional Support: Patient expressed concerns about family burden.', 'anthropic/claude-haiku-4.5', 890),
('smart_schedule', 'Analyze tomorrow schedule...', 'Gap Analysis: 3 unassigned visits in North Austin. Nurse Anderson available with 2 open slots. Recommendation: Assign visits 14, 15 to Anderson for coverage.', 'anthropic/claude-haiku-4.5', 940),
('patient_risk', 'Evaluate risk for Helen Thomas...', 'Overall Risk Level: High. Alzheimers with behavioral changes, fall risk elevated, caregiver burnout indicators present. Immediate actions: Safety evaluation, caregiver support referral.', 'anthropic/claude-haiku-4.5', 1150),
('chat', 'Medicare documentation requirements for home health?', 'Medicare requires: physician certification, comprehensive assessment (OASIS), individualized care plan, and progress notes documenting skilled need. Recertification every 60 days.', 'anthropic/claude-haiku-4.5', 720),
('route_optimization', 'Optimize route for Amanda Davis...', 'Analysis: Current 7 stops covering 27.4 miles. Optimized: 23.8 miles with better clustering. Key change: Move stop 5 before stop 3 to reduce backtracking.', 'anthropic/claude-haiku-4.5', 830),
('order_processing', 'Process respiratory therapy order for William Moore...', 'Critical order: COPD management requiring nebulizer treatments, oxygen titration, and breathing exercises. Priority: High. Insurance pre-auth recommended for oxygen equipment.', 'anthropic/claude-haiku-4.5', 1080),
('patient_risk', 'Evaluate risk for Thomas Garcia...', 'Overall Risk Level: Critical. Lung cancer palliative care, declining functional status, pain management challenges. Hospice evaluation recommended within 2 weeks.', 'anthropic/claude-haiku-4.5', 1200);
