import nodemailer from 'nodemailer';

// Create reusable transporter from env vars
function createTransporter() {
  if (!process.env.SMTP_HOST) {
    return null; // SMTP not configured
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send a visit reminder email to a clinician
 * @param {Object} patient - patient record
 * @param {Object} clinician - nurse record
 * @param {Object} visit - visit record
 */
export async function sendVisitReminder(patient, clinician, visit) {
  const transporter = createTransporter();

  const subject = `Visit Reminder: ${patient.first_name} ${patient.last_name} - ${visit.visit_date}`;
  const body = `
Dear ${clinician.first_name} ${clinician.last_name},

This is a reminder that you have a scheduled visit tomorrow:

Patient: ${patient.first_name} ${patient.last_name}
Date: ${visit.visit_date}
Time: ${visit.start_time} - ${visit.end_time}
Visit Type: ${visit.visit_type}
Address: ${visit.address}
Diagnosis: ${patient.primary_diagnosis || 'N/A'}

Please ensure you are prepared with the appropriate equipment and documentation.

Home Health System
  `.trim();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: clinician.email,
        subject,
        text: body,
      });
      console.log(`Visit reminder email sent to ${clinician.email}`);
      return { sent: true, method: 'email' };
    } catch (err) {
      console.error(`Failed to send email to ${clinician.email}:`, err.message);
    }
  }

  // SMS placeholder (log if Twilio not configured)
  console.log(`[SMS LOG] To: ${clinician.phone || 'N/A'} | ${subject}`);
  return { sent: false, method: 'logged', message: 'SMTP not configured, reminder logged.' };
}

/**
 * Send missed/cancelled visit alert to supervisor
 */
export async function sendVisitStatusAlert(visit, patient, clinician, supervisorEmail) {
  const transporter = createTransporter();

  const subject = `Alert: Visit ${visit.status.toUpperCase()} - ${patient.first_name} ${patient.last_name}`;
  const body = `
VISIT STATUS ALERT

A visit has been marked as ${visit.status.toUpperCase()}.

Patient: ${patient.first_name} ${patient.last_name}
Clinician: ${clinician ? `${clinician.first_name} ${clinician.last_name}` : 'Unassigned'}
Date: ${visit.visit_date}
Time: ${visit.start_time} - ${visit.end_time}
Visit Type: ${visit.visit_type}
Address: ${visit.address}

Please follow up immediately if necessary.

Home Health System
  `.trim();

  if (transporter && supervisorEmail) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: supervisorEmail,
        subject,
        text: body,
      });
      console.log(`Status alert sent to ${supervisorEmail}`);
      return { sent: true };
    } catch (err) {
      console.error(`Failed to send alert to ${supervisorEmail}:`, err.message);
    }
  }

  // Log SMS if Twilio not configured
  console.log(`[SMS LOG] ALERT to supervisor: ${subject}`);
  return { sent: false, message: 'SMTP not configured, alert logged.' };
}

/**
 * Save notification to DB
 */
export async function saveNotification(db, userId, title, message, type = 'info') {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [userId, title, message, type]
    );
  } catch (err) {
    console.error('Failed to save notification:', err.message);
  }
}

/**
 * Scheduler: check every hour for visits happening in the next 24h and send reminders
 */
export function startVisitReminderScheduler(db) {
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  const runCheck = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const visits = await db.query(`
        SELECT v.*,
               p.first_name as patient_first, p.last_name as patient_last,
               p.primary_diagnosis, p.address as patient_address,
               n.first_name as nurse_first, n.last_name as nurse_last, n.email as nurse_email, n.phone as nurse_phone
        FROM visits v
        JOIN patients p ON v.patient_id = p.id
        JOIN nurses n ON v.nurse_id = n.id
        WHERE v.visit_date = $1 AND v.status = 'scheduled'
      `, [tomorrowStr]);

      for (const v of visits.rows) {
        const patient = {
          first_name: v.patient_first,
          last_name: v.patient_last,
          primary_diagnosis: v.primary_diagnosis,
        };
        const clinician = {
          first_name: v.nurse_first,
          last_name: v.nurse_last,
          email: v.nurse_email,
          phone: v.nurse_phone,
        };
        await sendVisitReminder(patient, clinician, v);
        await saveNotification(
          db,
          null,
          `Visit Reminder Sent`,
          `Reminder sent to ${clinician.first_name} ${clinician.last_name} for visit on ${v.visit_date}`,
          'reminder'
        );
      }

      if (visits.rows.length > 0) {
        console.log(`[Scheduler] Sent ${visits.rows.length} visit reminders for ${tomorrowStr}`);
      }
    } catch (err) {
      console.error('[Scheduler] Error running reminder check:', err.message);
    }
  };

  // Run once on startup, then every hour
  runCheck();
  setInterval(runCheck, CHECK_INTERVAL);
  console.log('Visit reminder scheduler started (checking every hour).');
}
