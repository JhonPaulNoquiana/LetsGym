# Google Apps Script + Gmail recovery email

This sender uses HTTPS from Express to Google Apps Script, which sends the
recovery email from the owner's Google account using MailApp. It works with
Render Free and requires no purchased domain or SMTP app password.

## Configuration

The source is [Code.gs](../backend/apps-script/Code.gs). Use a dedicated Apps
Script project in the account that should send mail. For this installation the
approved sender account is `jpaulnoquiana2@gmail.com` and the project is
[LetsGym Recovery Email](https://script.google.com/home/projects/1ksN9UX44d7AjcrQLiXbtKj2NO-dKyaIwLzWtFetGUB7q5l_cRRYQmWOB/edit).

To recreate the setup:

1. Create a project at <https://script.google.com/> and replace Code.gs with the
   repository's script. Save it. When pasting into the editor, replace the entire
   file and check that saving completes without a syntax error.
2. Generate a separate random signing secret of at least 32 characters. This is
   **not** your Gmail password or `PASSWORD_RESET_SECRET`.
3. In **Project Settings → Script Properties**, save it as `APPS_SCRIPT_SECRET`.
4. Choose **Deploy → New deployment → Web app**. Execute as **Me**, with access
   set to **Anyone**, so your backend can call it without a browser Google login.
   Requests still require a valid signature; knowing the URL cannot send mail.
5. Authorize the project's **Send email as you** permission with the sender
   account. The script uses MailApp and does not read your inbox. A newly created
   private project may show Google's unverified-app screen; confirm the project
   and developer are your own before authorizing.
6. Complete deployment and copy the **Web app URL** ending in `/exec`, not `/dev`.
7. Save the following values in your private `backend/.env`, then restart the
   backend. The signing secret must exactly match the Script Property.

```dotenv
EMAIL_PROVIDER=apps-script
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
APPS_SCRIPT_SECRET=YOUR_SEPARATE_RANDOM_SIGNING_SECRET
```

Use these same three settings in Render. `render.yaml` now selects `apps-script`
and asks for its URL and secret. `SMTP_*`, `EMAIL_FROM`, and `RESEND_API_KEY` are
not needed for this provider. Existing local SMTP credentials are retained but
unused while `EMAIL_PROVIDER=apps-script`.

## Behavior and limits

The Express backend generates and hashes recovery codes as before. It signs a
short-lived request with HMAC-SHA256; the shared secret is never sent in the
request. The script checks the signature, a two-minute timestamp window, the
recipient and code formats, and persistent replay protection under a script
lock. It sends only the fixed LetsGym recovery message. It does not store codes
or recipient email addresses in Script Properties or log them.

The script has a **90-send-attempt daily cap, resetting at midnight UTC**, and
also checks Google's remaining recipient quota. Personal accounts currently
allow 100 Apps Script recipients per day, shared across their scripts. Failed
send attempts count toward the script cap to prevent repeated abuse. Other
Google limits or account restrictions can also prevent sending. This is suitable
for a small project; use a transactional provider as volume grows. Quota
exhaustion or a sender error returns a service error and does not consume a
usable reset code in the app database.

Google's email acceptance does not guarantee inbox placement. Test inbox and
spam receipt with an address you control. End users do not authorize the script;
only the sender account does. Keep the signing secret out of frontend variables,
GitHub, browser URLs, and chat. Rotate it in both locations if compromised.

## Updating the script

Editing Code.gs does not update the deployed version automatically. After any
script change, use **Deploy → Manage deployments → Edit → New version → Deploy**.
Updating the existing deployment preserves its `/exec` URL. Deploy a matching
script version before switching the backend signing protocol.

## Verification

On October 8, 2026, the web app was authorized with the approved sender account
and deployed as Version 1. `backend/.env` now selects this provider with the
matching signing secret and `/exec` URL. A live `/api/auth/forgot-password`
request for the approved account returned HTTP 200 after the script accepted the
email. Inbox receipt and the owner's chosen password reset remain for the owner
to confirm. All 51 backend tests pass.

Automated tests execute the actual Code.gs in an isolated mock Apps Script
runtime and cover the backend/script signature contract, replay, tampering,
expiry, malformed recipients, quota, lock contention, mail failures, and safe
backend errors. They do not themselves send real emails. Use **Forgot password?**
for a live test after configuration, then enter the emailed code and your chosen
password yourself. Code and password must remain private.

References: [web-app deployment](https://developers.google.com/apps-script/guides/web),
[MailApp](https://developers.google.com/apps-script/reference/mail/mail-app),
[Google quotas](https://developers.google.com/apps-script/guides/services/quotas),
[HMAC utilities](https://developers.google.com/apps-script/reference/utilities/utilities).
