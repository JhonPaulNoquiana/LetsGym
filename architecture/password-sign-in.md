# Password sign-in and email recovery

Username/email and password sign-in and registration work in Expo Go, including
iPhone. Existing accounts can sign in by email; new accounts also choose a unique
username (3–30 letters, numbers, or underscores, case-insensitive). Display names
are separate from usernames. Passwords require at least eight characters.

Google remains optional on web and supported Android builds. Tapping Google on
iOS displays an alert and directs the user to password login. This is the app's
current platform policy; iOS itself supports Google OAuth in suitable builds.

## Email sender setup

Gmail SMTP has been prepared in the local `backend/.env` for
`jpaulnoquiana2@gmail.com`. No paid email service was activated.
The owner supplied `SMTP_PASS`. Gmail SMTP authentication and TLS verification
passed on October 8, 2026, and a recovery request through the browser app was
accepted without a delivery error. Inbox receipt and the owner's password reset
remain to be confirmed by the owner.

1. Enable Google 2-Step Verification if it is not already enabled.
2. Open <https://myaccount.google.com/apppasswords> and create an app password
   named **LetsGym**. This account-security step must be completed by the owner.
3. Save the generated app password in `backend/.env` as `SMTP_PASS`, without
   spaces. Use an app password, not the normal Gmail login password.
4. Restart the backend. Send a code using **Forgot password?** and check both the
   inbox and spam folder. Email delivery must be tested with the real sender.

Expected settings (the password and signing secret must remain private):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=jpaulnoquiana2@gmail.com
SMTP_PASS=YOUR_GOOGLE_APP_PASSWORD
SMTP_FROM=LetsGym <jpaulnoquiana2@gmail.com>
PASSWORD_RESET_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

The local reset signing secret is already generated. Retain it across server
restarts. Rotating it invalidates outstanding recovery codes. A different SMTP
provider can be configured using the same variables; port 587 requires STARTTLS.
SMTP delivery requires verified TLS and does not disable certificate validation.

The current local and Render configuration selects Google Apps Script + Gmail
over HTTPS using `EMAIL_PROVIDER=apps-script`, `APPS_SCRIPT_URL`, and
`APPS_SCRIPT_SECRET`. The web app is deployed and a live backend recovery request
was accepted on October 8, 2026. This requires no purchased domain and supports
other recipients within Google's quota. The script caps sending at 90 attempts
per UTC day. Gmail SMTP credentials are retained for optional local use.
Follow [apps-script-email.md](apps-script-email.md) and
[render-deployment.md](render-deployment.md).

## Recovery behavior

Enter the account's email in **Forgot password?**, then enter the six-digit code
and the new password twice. Codes expire after ten minutes, are limited to five
failed attempts, are single-use, and are replaced when a new email is sent.
Requests for another email have a 60-second per-address cooldown, plus the API's
per-IP authentication limit. The API never returns or logs the code, and stores
only a keyed hash in the private database schema.

Successful reset preserves the user ID and workout history, proves email
ownership, and revokes all existing app sessions. It requires a new sign-in.
Google-only accounts can use this flow to establish a password. Password accounts
without prior email verification have their old password invalidated when first
connected to the verified Gmail owner through Google; use email recovery to set
a verified password. Passwords established through email proof are preserved.

Unknown emails receive the same request message but no email. Missing sender
configuration or delivery failure produces an honest service error. The system
does not claim a message was sent when sender configuration is missing.

Registration creates an app account immediately; it does not itself verify email
ownership. It cannot claim an existing account or bypass recovery code checks.

## Run

Run `npm run db:migrate` and `npm run dev` in `backend/`. Restart Expo with
`npx expo start --clear` in `frontend/`, then reopen in Expo Go. Keep the phone
and computer on the same network and use the computer's LAN API URL.

## References

- [Google app passwords](https://support.google.com/accounts/answer/185833)
- [Nodemailer SMTP transport](https://nodemailer.com/smtp)
- [OWASP password recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
