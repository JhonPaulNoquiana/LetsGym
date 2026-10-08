/** LetsGym recovery sender. Set APPS_SCRIPT_SECRET in Script Properties.
 * Deploy as a Web app: execute as the owner, access Anyone.
 * This project sends mail only; it never reads the owner's mailbox.
 */
function doGet() {
  return json_({ service: 'LetsGym recovery sender' });
}

function doPost(event) {
  var lock;
  try {
    var raw = event && event.postData && event.postData.contents;
    if (!raw || raw.length > 4096) throw new Error('Invalid request');
    var envelope = JSON.parse(raw);
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('APPS_SCRIPT_SECRET');
    if (!secret || secret.length < 32 || typeof envelope.payload !== 'string' ||
        typeof envelope.signature !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature))
      throw new Error('Invalid request');
    var expected = Utilities.computeHmacSha256Signature(envelope.payload, secret, Utilities.Charset.UTF_8)
      .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join('');
    var difference = 0;
    for (var i = 0; i < expected.length; i++)
      difference |= expected.charCodeAt(i) ^ envelope.signature.charCodeAt(i);
    if (difference !== 0) throw new Error('Invalid request');
    var data = JSON.parse(envelope.payload);
    var now = Date.now();
    if (data.version !== 1 || !Number.isSafeInteger(data.timestamp) ||
        Math.abs(now - data.timestamp) > 120000 ||
        typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.requestId) ||
        typeof data.email !== 'string' || data.email.length > 254 ||
        !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(data.email) ||
        typeof data.code !== 'string' || !/^\d{6}$/.test(data.code))
      throw new Error('Invalid request');

    lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) throw new Error('Busy');
    // Persist replay protection; CacheService may evict entries before expiry.
    var state = JSON.parse(properties.getProperty('RECOVERY_STATE') || '{}');
    var day = new Date(now).toISOString().slice(0, 10);
    if (state.day !== day) state = { day: day, count: 0, seen: state.seen || {} };
    state.seen = state.seen || {};
    Object.keys(state.seen).forEach(function (id) {
      if (state.seen[id] < now) delete state.seen[id];
    });
    if (state.seen[data.requestId] || state.count >= 90 || MailApp.getRemainingDailyQuota() < 1)
      throw new Error('Unavailable');
    state.seen[data.requestId] = data.timestamp + 120000;
    state.count += 1;
    properties.setProperty('RECOVERY_STATE', JSON.stringify(state));
    MailApp.sendEmail({
      to: data.email,
      name: 'LetsGym',
      subject: 'Your LetsGym password reset code',
      body: 'Your LetsGym password reset code is ' + data.code +
        '. It expires in 10 minutes. Do not share this code. If you did not request a reset, ignore this email.',
    });
    return json_({ ok: true });
  } catch (error) {
    // Never log request bodies, codes, email addresses, signatures, or secrets.
    return json_({ ok: false });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

// Run once in the editor to grant the mail-send permission. Sends no email.
function authorizeMail() {
  MailApp.getRemainingDailyQuota();
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
