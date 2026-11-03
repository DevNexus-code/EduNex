"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.devMailbox = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = require("crypto");
const index_js_1 = require("../config/index.js");
const prisma_js_1 = require("../db/prisma.js");
const logger_js_1 = require("../utils/logger.js");
// In-memory mailbox for development & testing inspection
exports.devMailbox = [];
class EmailService {
    transporter = null;
    isConfigured = false;
    constructor() {
        this.initTransporter();
    }
    initTransporter() {
        if (index_js_1.config.SMTP_HOST && index_js_1.config.SMTP_USER && index_js_1.config.SMTP_PASS) {
            this.transporter = nodemailer_1.default.createTransport({
                host: index_js_1.config.SMTP_HOST,
                port: index_js_1.config.SMTP_PORT,
                secure: index_js_1.config.SMTP_SECURE,
                auth: {
                    user: index_js_1.config.SMTP_USER,
                    pass: index_js_1.config.SMTP_PASS
                }
            });
            this.isConfigured = true;
            logger_js_1.logger.info({ host: index_js_1.config.SMTP_HOST, port: index_js_1.config.SMTP_PORT }, 'SMTP Email Transport initialized.');
        }
        else {
            this.transporter = null;
            this.isConfigured = false;
            logger_js_1.logger.info('SMTP credentials not configured. Operating in development console/dev-mailbox delivery mode.');
        }
    }
    getStatus() {
        return {
            isConfigured: this.isConfigured,
            host: index_js_1.config.SMTP_HOST,
            from: index_js_1.config.EMAIL_FROM
        };
    }
    /**
     * Internal generic dispatcher that logs to EmailNotificationLog
     */
    async dispatch(params) {
        const logId = (0, crypto_1.randomUUID)();
        const normalizedTo = params.to.trim().toLowerCase();
        // Prevent attempt if recipient is empty or internal dummy domain
        if (!normalizedTo || normalizedTo.endsWith('@internal.edunex.local')) {
            logger_js_1.logger.warn({ recipient: normalizedTo }, 'Skipping email delivery for internal/dummy unroutable address.');
            await prisma_js_1.prisma.emailNotificationLog.create({
                data: {
                    id: logId,
                    recipient: normalizedTo || 'none@internal.edunex.local',
                    userId: params.userId || null,
                    notificationType: params.notificationType,
                    subject: params.subject,
                    contentSummary: params.text.slice(0, 300),
                    status: 'FAILED',
                    errorMessage: 'Unroutable or internal placeholder email address. Manual credential delivery required.',
                    retryCount: 0,
                    metadata: params.metadata ?? undefined,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            return {
                success: false,
                logId,
                recipient: normalizedTo,
                notificationType: params.notificationType,
                error: 'No valid external email registered.'
            };
        }
        try {
            let messageId = `msg-${(0, crypto_1.randomUUID)()}`;
            if (this.transporter && this.isConfigured) {
                const info = await this.transporter.sendMail({
                    from: index_js_1.config.EMAIL_FROM,
                    to: normalizedTo,
                    subject: params.subject,
                    text: params.text,
                    html: params.html
                });
                messageId = info.messageId || messageId;
                logger_js_1.logger.info({ recipient: normalizedTo, subject: params.subject, messageId }, 'Email dispatched via SMTP.');
            }
            else {
                // Dev fallback
                const devMsg = {
                    id: messageId,
                    to: normalizedTo,
                    subject: params.subject,
                    text: params.text,
                    html: params.html,
                    sentAt: new Date()
                };
                exports.devMailbox.push(devMsg);
                if (exports.devMailbox.length > 100)
                    exports.devMailbox.shift();
                logger_js_1.logger.info({ recipient: normalizedTo, subject: params.subject }, '[DEV EMAIL DELIVERED] Logged to dev mailbox.');
            }
            await prisma_js_1.prisma.emailNotificationLog.create({
                data: {
                    id: logId,
                    recipient: normalizedTo,
                    userId: params.userId || null,
                    notificationType: params.notificationType,
                    subject: params.subject,
                    contentSummary: params.text.slice(0, 300),
                    status: 'SENT',
                    sentAt: new Date(),
                    lastAttemptAt: new Date(),
                    metadata: params.metadata ?? undefined,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            return {
                success: true,
                logId,
                recipient: normalizedTo,
                notificationType: params.notificationType,
                messageId
            };
        }
        catch (err) {
            logger_js_1.logger.error({ err: err.message, recipient: normalizedTo, subject: params.subject }, 'Email delivery failed.');
            await prisma_js_1.prisma.emailNotificationLog.create({
                data: {
                    id: logId,
                    recipient: normalizedTo,
                    userId: params.userId || null,
                    notificationType: params.notificationType,
                    subject: params.subject,
                    contentSummary: params.text.slice(0, 300),
                    status: 'FAILED',
                    errorMessage: err.message || 'SMTP delivery failure.',
                    lastAttemptAt: new Date(),
                    metadata: params.metadata ?? undefined,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            return {
                success: false,
                logId,
                recipient: normalizedTo,
                notificationType: params.notificationType,
                error: err.message || 'SMTP delivery failure.'
            };
        }
    }
    /**
     * 1. Account Activation / Password Setup Email
     */
    async sendAccountActivationEmail(params) {
        const expiresHours = params.expiresHours || 72;
        const activationUrl = `${index_js_1.config.APP_URL}/auth/activate?token=${encodeURIComponent(params.activationToken)}&id=${encodeURIComponent(params.loginId)}`;
        const subject = `EDUNEX — Welcome to Campus Platform | Account Activation`;
        const text = `Dear ${params.name},

Welcome to the EDUNEX Student & Staff Management Platform!

Your official institutional account has been provisioned with the following details:
• Role: ${params.role}
• Login ID / Identifier: ${params.loginId}
• Registered Email: ${params.to}

To securely activate your account and establish your permanent password, please click the link below:
${activationUrl}

This activation link is single-use and will expire in ${expiresHours} hours.
For security reasons, never share this link or your credentials with anyone.

Sincerely,
EDUNEX Academic Administration Team`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #4f46e5; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #c7d2fe; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
    .badge-box { background: #f1f5f9; border-radius: 12px; padding: 16px 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .badge-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
    .badge-label { color: #64748b; font-weight: 600; }
    .badge-val { color: #0f172a; font-weight: 700; font-family: monospace; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; text-align: center; }
    .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>EDUNEX CAMPUS PLATFORM</h1>
      <p>Institutional Account Activation & Credential Setup</p>
    </div>
    <div class="content">
      <p>Dear <strong>${params.name}</strong>,</p>
      <p>Your institutional user account has been registered with EDUNEX. To begin using the portal, please activate your account and configure your permanent password.</p>
      
      <div class="badge-box">
        <div class="badge-row"><span class="badge-label">Role:</span><span class="badge-val">${params.role}</span></div>
        <div class="badge-row"><span class="badge-label">Login ID:</span><span class="badge-val">${params.loginId}</span></div>
        <div class="badge-row"><span class="badge-label">Registered Email:</span><span class="badge-val">${params.to}</span></div>
      </div>

      <div style="text-align: center;">
        <a href="${activationUrl}" class="btn">Activate Account & Set Password</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        This single-use activation link is valid for <strong>${expiresHours} hours</strong>. If you did not request this account, please notify the EDUNEX Administrator immediately.
      </p>
    </div>
    <div class="footer">
      EDUNEX Student & Staff Management System • Automated Security Delivery
    </div>
  </div>
</body>
</html>`;
        return this.dispatch({
            to: params.to,
            userId: params.userId,
            notificationType: 'ACCOUNT_ACTIVATION',
            subject,
            html,
            text,
            metadata: { loginId: params.loginId, role: params.role }
        });
    }
    /**
     * 2. Student Admission Confirmation Email
     */
    async sendAdmissionConfirmationEmail(params) {
        const institution = params.institutionName || 'EDUNEX Institute of Higher Education';
        const activationUrl = params.activationToken
            ? `${index_js_1.config.APP_URL}/auth/activate?token=${encodeURIComponent(params.activationToken)}&id=${encodeURIComponent(params.studentId)}`
            : `${index_js_1.config.APP_URL}/login`;
        const subject = `EDUNEX — Student Admission Confirmation`;
        const text = `Dear ${params.studentName},

We are pleased to confirm your successful admission to ${institution}.

Official Admission Details:
• Student Full Name: ${params.studentName}
• Student ID: ${params.studentId}
• Admission Number: ${params.admissionNumber}
• Department: ${params.departmentName}
• Degree Program / Course: ${params.courseName}
• Class Section: ${params.sectionName || 'Assigned Cohort'}
• Academic Session: ${params.academicSession}
• Admission Date: ${params.admissionDate}
• Parent / Guardian Name: ${params.parentName || 'Registered Guardian'}
• Status: Confirmed & Active

To activate your student portal credentials and complete setup, click:
${activationUrl}

Welcome to our academic community!

Sincerely,
Office of Admissions & Academic Registry
${institution}`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #059669; padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #a7f3d0; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
    .detail-grid { background: #f8fafc; border-radius: 12px; padding: 18px 22px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; }
    .val { color: #0f172a; font-weight: 700; }
    .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; text-align: center; }
    .footer { padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${institution}</h1>
      <p>Official Admission & Enrollment Confirmation</p>
    </div>
    <div class="content">
      <p>Dear <strong>${params.studentName}</strong>,</p>
      <p>Congratulations! Your admission has been verified and recorded in the EDUNEX Campus Academic Registry.</p>
      
      <div class="detail-grid">
        <div class="row"><span class="label">Student Name:</span><span class="val">${params.studentName}</span></div>
        <div class="row"><span class="label">Student ID:</span><span class="val" style="font-family:monospace; color:#059669;">${params.studentId}</span></div>
        <div class="row"><span class="label">Admission Number:</span><span class="val" style="font-family:monospace;">${params.admissionNumber}</span></div>
        <div class="row"><span class="label">Department:</span><span class="val">${params.departmentName}</span></div>
        <div class="row"><span class="label">Degree Course:</span><span class="val">${params.courseName}</span></div>
        <div class="row"><span class="label">Class Section:</span><span class="val">${params.sectionName || 'Cohort Section'}</span></div>
        <div class="row"><span class="label">Academic Session:</span><span class="val">${params.academicSession}</span></div>
        <div class="row"><span class="label">Admission Date:</span><span class="val">${params.admissionDate}</span></div>
        <div class="row"><span class="label">Guardian:</span><span class="val">${params.parentName || 'Registered Guardian'}</span></div>
        <div class="row"><span class="label">Status:</span><span class="val" style="color:#059669;">CONFIRMED & ACTIVE</span></div>
      </div>

      <div style="text-align: center;">
        <a href="${activationUrl}" class="btn">Activate Student Portal Account</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        Please retain your Student ID and Admission Number for all official academic records, fee payments, and timetable scheduling.
      </p>
    </div>
    <div class="footer">
      EDUNEX Academic Registry • Official Confirmation Notice
    </div>
  </div>
</body>
</html>`;
        return this.dispatch({
            to: params.to,
            userId: params.userId,
            notificationType: 'STUDENT_ADMISSION_CONFIRMATION',
            subject,
            html,
            text,
            metadata: {
                studentId: params.studentId,
                admissionNumber: params.admissionNumber,
                course: params.courseName
            }
        });
    }
    /**
     * 3. Parent Account Notification Email
     */
    async sendParentAccountEmail(params) {
        const activationUrl = params.activationToken
            ? `${index_js_1.config.APP_URL}/auth/activate?token=${encodeURIComponent(params.activationToken)}&id=${encodeURIComponent(params.parentId)}`
            : `${index_js_1.config.APP_URL}/login`;
        const subject = `EDUNEX — Parent Portal Access | Student Admission Linked`;
        const text = `Dear ${params.parentName},

Your parent account has been provisioned on the EDUNEX Parent Portal.

Linked Student Details:
• Student Name: ${params.studentName}
• Admission Number: ${params.admissionNumber}
• Parent Login ID: ${params.parentId}
• Registered Email: ${params.to}

You can access real-time academic records, attendance logs, timetable, fee invoices, and examination results.

Activate your account and configure your password here:
${activationUrl}

Sincerely,
EDUNEX Parent Relations Team`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #3b82f6; padding: 30px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .content { padding: 30px 26px; line-height: 1.6; font-size: 14px; }
    .info-box { background: #f0f9ff; border-radius: 12px; padding: 16px 20px; margin: 18px 0; border: 1px solid #bae6fd; font-size: 13px; }
    .btn { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; }
    .footer { padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>EDUNEX PARENT PORTAL</h1>
      <p>Student Academic Monitoring & Fee Account</p>
    </div>
    <div class="content">
      <p>Dear <strong>${params.parentName}</strong>,</p>
      <p>Your parent account has been linked to student <strong>${params.studentName}</strong> (Admission #${params.admissionNumber}).</p>
      
      <div class="info-box">
        <div><strong>Parent Login ID:</strong> <span style="font-family:monospace; color:#0284c7;">${params.parentId}</span></div>
        <div><strong>Linked Student:</strong> ${params.studentName}</div>
        <div><strong>Registered Email:</strong> ${params.to}</div>
      </div>

      <div style="text-align: center;">
        <a href="${activationUrl}" class="btn">Activate Parent Account</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        Through the Parent Portal, you can track daily attendance, view fee receipts, check upcoming examinations, and review grade reports.
      </p>
    </div>
    <div class="footer">
      EDUNEX Campus Platform • Parent Portal Security
    </div>
  </div>
</body>
</html>`;
        return this.dispatch({
            to: params.to,
            userId: params.userId,
            notificationType: 'PARENT_ACCOUNT_CREATED',
            subject,
            html,
            text,
            metadata: { parentId: params.parentId, studentName: params.studentName }
        });
    }
    /**
     * 4. 6-Digit Email OTP Verification Email
     */
    async sendOtpEmail(params) {
        const expiresMinutes = params.expiresMinutes || 5;
        const readablePurpose = params.purpose.replace(/_/g, ' ').toLowerCase();
        const subject = `EDUNEX — Your Verification Code: ${params.otp}`;
        const text = `Dear ${params.name || 'User'},

Your one-time verification code for ${readablePurpose} is:

  ${params.otp}

This code is valid for ${expiresMinutes} minutes and can only be used once.
If you did not request this verification code, please ignore this email or contact support immediately.

Sincerely,
EDUNEX Security Team`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #1e1b4b; padding: 28px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; text-align: center; }
    .otp-code { display: inline-block; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #4338ca; background: #eef2ff; border: 2px dashed #c7d2fe; border-radius: 12px; padding: 14px 28px; margin: 24px 0; font-family: monospace; }
    .warning { font-size: 12px; color: #ef4444; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 10px; margin-top: 20px; }
    .footer { padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SECURITY VERIFICATION</h1>
    </div>
    <div class="content">
      <p style="margin: 0;">Dear <strong>${params.name || 'User'}</strong>,</p>
      <p style="margin-top: 8px; color: #64748b;">
        Please enter the one-time verification code below to authorize <strong>${readablePurpose}</strong>:
      </p>

      <div class="otp-code">${params.otp}</div>

      <p style="font-size: 13px; color: #64748b; margin: 0;">
        This code is valid for <strong>${expiresMinutes} minutes</strong> and is strictly single-use.
      </p>

      <div class="warning">
        Security Notice: EDUNEX staff will never ask for your verification code. Do not share this code.
      </div>
    </div>
    <div class="footer">
      EDUNEX Authentication & Identity Protection
    </div>
  </div>
</body>
</html>`;
        return this.dispatch({
            to: params.to,
            userId: params.userId,
            notificationType: 'OTP_VERIFICATION',
            subject,
            html,
            text,
            metadata: { purpose: params.purpose, expiresMinutes }
        });
    }
    /**
     * 5. Password Reset Request Email
     */
    async sendPasswordResetEmail(params) {
        const expiresHours = params.expiresHours || 24;
        const subject = `EDUNEX — Password Reset Request`;
        const text = `Dear ${params.name || 'User'},

A password reset was requested for your EDUNEX account.

Click the link below to set a new password:
${params.resetUrl}

This link is valid for ${expiresHours} hours and can only be used once.
If you did not request a password reset, you can safely ignore this email.

Sincerely,
EDUNEX Security Team`;
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #4f46e5; padding: 28px 20px; text-align: center; color: #ffffff; }
    .content { padding: 30px 24px; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 26px; border-radius: 10px; text-decoration: none; font-weight: 700; margin: 20px 0; }
    .footer { padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; font-size: 18px;">EDUNEX Password Reset</h2>
    </div>
    <div class="content">
      <p>Dear <strong>${params.name || 'User'}</strong>,</p>
      <p>We received a request to reset your password. Click the link below to set a new password:</p>
      
      <div style="text-align: center;">
        <a href="${params.resetUrl}" class="btn">Reset My Password</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">
        This single-use link is valid for ${expiresHours} hours. If you did not make this request, your account remains secure.
      </p>
    </div>
    <div class="footer">
      EDUNEX Identity & Access Management
    </div>
  </div>
</body>
</html>`;
        return this.dispatch({
            to: params.to,
            userId: params.userId,
            notificationType: 'PASSWORD_RESET',
            subject,
            html,
            text,
            metadata: { expiresHours }
        });
    }
    /**
     * Retry a failed email from EmailNotificationLog
     */
    async retryNotification(notificationId) {
        const record = await prisma_js_1.prisma.emailNotificationLog.findUnique({
            where: { id: notificationId }
        });
        if (!record) {
            throw new Error('Notification record not found.');
        }
        let retrySubject = record.subject;
        let retryText = record.contentSummary || 'EDUNEX automated notification retry.';
        let retryHtml = `<p>${retryText}</p>`;
        try {
            if (this.transporter && this.isConfigured) {
                await this.transporter.sendMail({
                    from: index_js_1.config.EMAIL_FROM,
                    to: record.recipient,
                    subject: retrySubject,
                    text: retryText,
                    html: retryHtml
                });
            }
            const updated = await prisma_js_1.prisma.emailNotificationLog.update({
                where: { id: notificationId },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    lastAttemptAt: new Date(),
                    retryCount: { increment: 1 },
                    errorMessage: null,
                    updatedAt: new Date()
                }
            });
            return {
                success: true,
                logId: updated.id,
                recipient: updated.recipient,
                notificationType: updated.notificationType
            };
        }
        catch (err) {
            await prisma_js_1.prisma.emailNotificationLog.update({
                where: { id: notificationId },
                data: {
                    status: 'FAILED',
                    lastAttemptAt: new Date(),
                    retryCount: { increment: 1 },
                    errorMessage: err.message || 'Retry attempt failed.',
                    updatedAt: new Date()
                }
            });
            return {
                success: false,
                logId: notificationId,
                recipient: record.recipient,
                notificationType: record.notificationType,
                error: err.message || 'Retry attempt failed.'
            };
        }
    }
}
exports.emailService = new EmailService();
