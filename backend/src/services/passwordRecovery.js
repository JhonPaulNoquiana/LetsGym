import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

export function createRecoveryMailer(
  settings = config.smtp,
  { sendRequest = globalThis.fetch } = {},
) {
  let transport;
  const provider = settings.provider || 'smtp';
  const validScriptUrl = () => {
    try {
      const url = new URL(settings.appsScriptUrl);
      return (
        url.origin === 'https://script.google.com' &&
        /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  };
  return {
    assertConfigured() {
      const configured =
        provider === 'apps-script'
          ? validScriptUrl() && settings.appsScriptSecret?.length >= 32
          : settings.from &&
            (provider === 'resend'
              ? settings.apiKey
              : provider === 'smtp' &&
                settings.host &&
                settings.user &&
                settings.pass);
      if (!configured)
        throw Object.assign(
          new Error(
            'Email recovery is not configured yet. Please contact the app administrator.',
          ),
          { status: 503 },
        );
    },
    async send({ email, code }) {
      this.assertConfigured();
      if (provider === 'apps-script') {
        const payload = JSON.stringify({
          version: 1,
          timestamp: Date.now(),
          requestId: randomUUID(),
          email,
          code,
        });
        const signature = createHmac('sha256', settings.appsScriptSecret)
          .update(payload)
          .digest('hex');
        try {
          const response = await sendRequest(settings.appsScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload, signature }),
            signal: AbortSignal.timeout(12000),
            redirect: 'follow',
          });
          // Apps Script ContentService redirects its JSON response to googleusercontent.com.
          // It may return HTTP 200 for application errors: check the JSON too.
          if (!response.ok || (await response.json()).ok !== true)
            throw new Error('Not accepted');
          return;
        } catch {
          throw Object.assign(
            new Error(
              'Could not send the recovery email. Please try again later.',
            ),
            { status: 503 },
          );
        }
      }
      const message = {
        from: settings.from,
        to: email,
        subject: 'Your LetsGym password reset code',
        text: `Your LetsGym password reset code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request a reset, ignore this email.`,
      };
      if (provider === 'resend') {
        try {
          const response = await sendRequest('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${settings.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...message, to: [email] }),
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok || !(await response.json()).id)
            throw new Error('Not accepted');
          return;
        } catch {
          throw Object.assign(
            new Error(
              'Could not send the recovery email. Please try again later.',
            ),
            { status: 503 },
          );
        }
      }
      transport ||= nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465,
        requireTLS: true,
        auth: { user: settings.user, pass: settings.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      try {
        const result = await transport.sendMail(message);
        if (!result.accepted?.length) throw new Error('Not accepted');
      } catch {
        throw Object.assign(
          new Error(
            'Could not send the recovery email. Please try again later.',
          ),
          { status: 503 },
        );
      }
    },
  };
}
export function createRecoveryCodes(secret = config.resetSecret) {
  return {
    assertConfigured() {
      if (!secret || secret.length < 32)
        throw Object.assign(
          new Error(
            'Email recovery is not configured yet. Please contact the app administrator.',
          ),
          { status: 503 },
        );
    },
    generate: () => String(randomInt(0, 1000000)).padStart(6, '0'),
    hash(email, code) {
      this.assertConfigured();
      return createHmac('sha256', secret)
        .update(`${email}:${code}`)
        .digest('hex');
    },
    matches(email, code, hash) {
      const actual = Buffer.from(this.hash(email, code), 'hex');
      const expected = Buffer.from(hash, 'hex');
      return (
        expected.length === actual.length && timingSafeEqual(actual, expected)
      );
    },
  };
}
