// Digitally generated VATTAMS onboarding letters (Technicians / Tutors)
// and student registration confirmation documents.
//
// Follows the same pattern already used by src/lib/invoice.ts:
// build a self-contained HTML string, then offer it as a downloadable
// .html file via a Blob. No new dependency, no PDF library, no
// signature capture — matches the existing project conventions.

const TERMS_AND_CONDITIONS = [
  'This ID card / letter is issued solely for identification within the VATTAMS platform and must not be used for any purpose outside VATTAMS-related work.',
  'The holder must comply with all VATTAMS service standards, code of conduct, and applicable local laws while representing VATTAMS.',
  'This ID is non-transferable. It must not be shared, duplicated, or used by any person other than the named holder.',
  'VATTAMS reserves the right to suspend, deactivate, or revoke this ID at any time in case of a policy violation, complaint, or inactivity.',
  'All KYC, banking, and personal information provided remains confidential and is used only for verification, payouts, and platform operations.',
  'Continued association with VATTAMS is subject to ongoing performance, customer feedback, and compliance with platform policies.',
];

function baseStyles(accentFrom: string, accentTo: string): string {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; padding: 40px 20px; color: #1e293b; }
  .letter { max-width: 680px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, ${accentFrom}, ${accentTo}); color: white; padding: 32px; }
  .header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
  .header p { opacity: 0.9; font-size: 13px; }
  .id-badge { display: inline-block; margin-top: 14px; padding: 8px 16px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35); border-radius: 10px; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; }
  .section { padding: 24px 32px; }
  .section-title { font-size: 13px; font-weight: 700; color: ${accentFrom}; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .detail-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
  .detail-label { color: #64748b; }
  .detail-value { font-weight: 600; text-align: right; }
  .body-text { font-size: 14px; line-height: 1.7; color: #334155; }
  .terms { list-style: decimal; padding-left: 20px; font-size: 12.5px; line-height: 1.7; color: #475569; }
  .terms li { margin-bottom: 6px; }
  .notice { margin-top: 18px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 12.5px; color: #1e40af; }
  .footer { padding: 20px 32px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  `;
}

export interface OnboardingLetterParams {
  role: 'Technician' | 'Tutor';
  employeeId: string;
  fullName: string;
  city: string;
  contactValue: string; // mobile or phone
  contactLabel?: string; // defaults to 'Mobile'
  email?: string | null;
  joinedOn?: string | null; // ISO date; falls back to today
  categoryLabel: string; // e.g. "Service Category(ies)" or "Subjects"
  categoryValue: string;
}

export function generateOnboardingLetterHTML(params: OnboardingLetterParams): string {
  const {
    role,
    employeeId,
    fullName,
    city,
    contactValue,
    contactLabel = 'Mobile',
    email,
    joinedOn,
    categoryLabel,
    categoryValue,
  } = params;

  const dateStr = new Date(joinedOn || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const accent = role === 'Technician' ? ['#2563eb', '#3b82f6'] : ['#7c3aed', '#a855f7'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VATTAMS Onboarding Letter — ${employeeId}</title>
<style>${baseStyles(accent[0], accent[1])}</style>
</head>
<body>
<div class="letter">
  <div class="header">
    <h1>VATTAMS</h1>
    <p>${role} Onboarding Letter</p>
    <div class="id-badge">${employeeId}</div>
  </div>

  <div class="section">
    <p class="body-text">
      Dear ${fullName},<br><br>
      Congratulations! We are pleased to confirm that you have been
      onboarded with VATTAMS as a ${role} on our platform. Your
      permanent Employee ID has been generated and is shown above.
      Please quote this ID in all future communication with VATTAMS.
    </p>
  </div>

  <div class="section">
    <div class="section-title">${role} Details</div>
    <div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${fullName}</span></div>
    <div class="detail-row"><span class="detail-label">Employee ID</span><span class="detail-value">${employeeId}</span></div>
    <div class="detail-row"><span class="detail-label">${contactLabel}</span><span class="detail-value">${contactValue}</span></div>
    ${email ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${email}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">City</span><span class="detail-value">${city}</span></div>
    <div class="detail-row"><span class="detail-label">${categoryLabel}</span><span class="detail-value">${categoryValue}</span></div>
    <div class="detail-row"><span class="detail-label">Onboarding Date</span><span class="detail-value">${dateStr}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Terms &amp; Conditions</div>
    <ol class="terms">
      ${TERMS_AND_CONDITIONS.map((t) => `<li>${t}</li>`).join('\n      ')}
    </ol>

    <div class="notice">
      This is a digitally generated VATTAMS onboarding letter. It does not require a physical or digital signature to be valid.
    </div>
  </div>

  <div class="footer">
    <p>VATTAMS Home Services | Support: +91 81898 00757 | support@vattams.net</p>
    <p style="margin-top:4px;">Government of India MSME (Udyam) Registered Enterprise | UDYAM-TN-02-0274720</p>
  </div>
</div>
</body>
</html>`;
}

export interface StudentConfirmationParams {
  studentId: string;
  studentName: string;
  parentName: string;
  city: string;
  phone: string;
  email?: string | null;
  course: string;
  classMode: string;
  registeredOn?: string | null;
}

export function generateStudentConfirmationHTML(params: StudentConfirmationParams): string {
  const {
    studentId,
    studentName,
    parentName,
    city,
    phone,
    email,
    course,
    classMode,
    registeredOn,
  } = params;

  const dateStr = new Date(registeredOn || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>VATTAMS Tuition Registration Confirmation — ${studentId}</title>
<style>${baseStyles('#7c3aed', '#a855f7')}</style>
</head>
<body>
<div class="letter">
  <div class="header">
    <h1>VATTAMS</h1>
    <p>Online Tuition — Registration Confirmation</p>
    <div class="id-badge">${studentId}</div>
  </div>

  <div class="section">
    <p class="body-text">
      Dear ${parentName},<br><br>
      This confirms that ${studentName} has been registered and
      approved for Vattams Online Tuition. A permanent Student ID has
      been generated and is shown above. Please quote this ID in all
      future communication regarding classes, attendance, or fees.
    </p>
  </div>

  <div class="section">
    <div class="section-title">Registration Details</div>
    <div class="detail-row"><span class="detail-label">Student Name</span><span class="detail-value">${studentName}</span></div>
    <div class="detail-row"><span class="detail-label">Student ID</span><span class="detail-value">${studentId}</span></div>
    <div class="detail-row"><span class="detail-label">Parent / Guardian</span><span class="detail-value">${parentName}</span></div>
    <div class="detail-row"><span class="detail-label">Mobile</span><span class="detail-value">${phone}</span></div>
    ${email ? `<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${email}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">City</span><span class="detail-value">${city}</span></div>
    <div class="detail-row"><span class="detail-label">Course</span><span class="detail-value">${course}</span></div>
    <div class="detail-row"><span class="detail-label">Class Mode</span><span class="detail-value">${classMode}</span></div>
    <div class="detail-row"><span class="detail-label">Registration Date</span><span class="detail-value">${dateStr}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Terms &amp; Conditions</div>
    <ol class="terms">
      ${TERMS_AND_CONDITIONS.map((t) => `<li>${t}</li>`).join('\n      ')}
    </ol>

    <div class="notice">
      This is a digitally generated VATTAMS onboarding letter. It does not require a physical or digital signature to be valid.
    </div>
  </div>

  <div class="footer">
    <p>VATTAMS Online Tuition | Support: +91 81898 00757 | support@vattams.net</p>
    <p style="margin-top:4px;">Government of India MSME (Udyam) Registered Enterprise | UDYAM-TN-02-0274720</p>
  </div>
</div>
</body>
</html>`;
}

function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadOnboardingLetter(params: OnboardingLetterParams) {
  const html = generateOnboardingLetterHTML(params);
  downloadHTML(html, `VATTAMS-Onboarding-${params.employeeId}.html`);
}

export function downloadStudentConfirmation(params: StudentConfirmationParams) {
  const html = generateStudentConfirmationHTML(params);
  downloadHTML(html, `VATTAMS-Confirmation-${params.studentId}.html`);
}