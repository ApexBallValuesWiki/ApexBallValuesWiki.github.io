// ============================================================================
// APEX — CLOUDFLARE KV ENGINE (ZERO-SUPABASE, INFINITE FREE LIVE DATABASE)
// ============================================================================
// Storing your entire live Values & WIKI overrides directly in Cloudflare KV.
// Edits are live INSTANTLY for everyone, with ZERO dependency on developers,
// ZERO manual git pushes, and ABSOLUTE ZERO Supabase egress or billing limits!
//
// How to deploy in 1 minute:
// 1. Go to your Cloudflare Dashboard -> Workers & Pages -> Click "Create Application".
// 2. Paste this exact code into your Worker editor.
// 3. Go to your Worker Settings -> KV Namespace Bindings -> Click "Add Binding".
// 4. Name the binding "APEX_OVERRIDES" and select/create a KV Namespace.
// 5. Save & Deploy!
// ============================================================================

// Simple in-memory fallback for initial tests/cold starts in case KV is not bound
let IN_MEMORY_DB_FALLBACK = null;
let IN_MEMORY_PASSWORDS_FALLBACK = null;
let IN_MEMORY_BUG_REPORTS = null;

const TEAM_EMAILS = [
  'gustavo.rb1410@gmail.com',
  'bananatempest25@gmail.com',
  'treymurphy3rd@gmail.com',
  'destroyha3@gmail.com',
  'gloomy302010@gmail.com',
  'jiteaianis@gmail.com',
  'dakingnub@gmail.com',
  'johnmustard129@gmail.com',
  'alieldaw6@gmail.com',
  'hungryaistukas@gmail.com',
  'luquitas290414@gmail.com',
  'hellfiregamingytt@gmail.com'
];

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await handleRequest(request, env, ctx);
      return addCorsHeaders(request, response);
    } catch (e) {
      return addCorsHeaders(
        request,
        new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
  }
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight check immediately with standard 204 No Content
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('Origin') || '*';
    const reqHeaders = request.headers.get('Access-Control-Request-Headers') || '*';
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': reqHeaders,
        'Access-Control-Max-Age': '0', // Force browser to bypass stale preflight caches
      },
    });
  }

  // Helper: Retrieve all individual admin passwords map (KV or fallback or defaults)
  async function getPasswordsMap() {
    let passwordsText = null;
    try {
      if (env.APEX_OVERRIDES) {
        passwordsText = await env.APEX_OVERRIDES.get('adminPasswords');
      } else {
        passwordsText = IN_MEMORY_PASSWORDS_FALLBACK;
      }
    } catch (e) {
      console.error('Failed to read passwords from KV:', e);
    }

    let map = {};
    if (passwordsText) {
      try {
        map = JSON.parse(passwordsText);
      } catch (e) {
        console.error('Failed to parse passwords map:', e);
      }
    }

    // Initialize defaults for any team member who does not have a password yet
    let updated = false;
    TEAM_EMAILS.forEach(email => {
      const clean = email.toLowerCase().trim();
      if (!map[clean]) {
        map[clean] = 'apex2026'; // Default initial passcode
        updated = true;
      }
    });

    // Cache back to KV if updated
    if (updated) {
      try {
        const serialized = JSON.stringify(map);
        if (env.APEX_OVERRIDES) {
          await env.APEX_OVERRIDES.put('adminPasswords', serialized);
        } else {
          IN_MEMORY_PASSWORDS_FALLBACK = serialized;
        }
      } catch (e) {
        console.error('Failed to write initialized passwords to KV:', e);
      }
    }

    return map;
  }

  // 1. GET /bug-reports - Fetch bug reports from KV
  if (path === '/bug-reports' && request.method === 'GET') {
    let data = null;
    try {
      if (env.APEX_OVERRIDES) {
        data = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        data = IN_MEMORY_BUG_REPORTS;
      }
    } catch (e) {
      console.error('Failed to read bug reports from KV:', e);
    }
    if (!data) data = '[]';
    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. POST /bug-reports - Submit a bug report into KV
  if (path === '/bug-reports' && request.method === 'POST') {
    const payloadText = await request.text();
    let newReport = null;
    try {
      newReport = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let reports = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) {
        raw = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        raw = IN_MEMORY_BUG_REPORTS;
      }
      if (raw) reports = JSON.parse(raw);
    } catch {}

    const reportId = Date.now() + Math.floor(Math.random() * 1000);
    const reportRow = {
      id: reportId,
      title: newReport.title || 'Untitled Report',
      category: newReport.category || 'Other',
      description: newReport.description || '',
      page_url: newReport.page_url || '',
      contact: newReport.contact || null,
      browser: newReport.browser || null,
      resolved: false,
      created_at: new Date().toISOString()
    };

    reports.push(reportRow);

    try {
      const serialized = JSON.stringify(reports);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('bugReports', serialized);
      } else {
        IN_MEMORY_BUG_REPORTS = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Bug report submitted successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. POST /bug-reports/resolve - Mark bug report resolved in KV (Admin-only)
  if (path === '/bug-reports/resolve' && request.method === 'POST') {
    let passcode = null;
    let emailHeader = null;
    request.headers.forEach((val, key) => {
      const k = key.toLowerCase();
      if (k === 'x-admin-passcode') passcode = val;
      if (k === 'x-admin-email') emailHeader = val;
    });

    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();

    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedPass = passwordsMap[cleanEmail];
    if (!passcode || passcode !== expectedPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportId = Number(payload.id);
    let reports = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) {
        raw = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        raw = IN_MEMORY_BUG_REPORTS;
      }
      if (raw) reports = JSON.parse(raw);
    } catch {}

    reports = reports.map(r => r.id === reportId ? { ...r, resolved: true } : r);

    try {
      const serialized = JSON.stringify(reports);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('bugReports', serialized);
      } else {
        IN_MEMORY_BUG_REPORTS = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Resolved successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. POST /bug-reports/delete - Delete a bug report from KV (Admin-only)
  if (path === '/bug-reports/delete' && request.method === 'POST') {
    let passcode = null;
    let emailHeader = null;
    request.headers.forEach((val, key) => {
      const k = key.toLowerCase();
      if (k === 'x-admin-passcode') passcode = val;
      if (k === 'x-admin-email') emailHeader = val;
    });

    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();

    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedPass = passwordsMap[cleanEmail];
    if (!passcode || passcode !== expectedPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reportId = Number(payload.id);
    let reports = [];
    try {
      let raw = null;
      if (env.APEX_OVERRIDES) {
        raw = await env.APEX_OVERRIDES.get('bugReports');
      } else {
        raw = IN_MEMORY_BUG_REPORTS;
      }
      if (raw) reports = JSON.parse(raw);
    } catch {}

    reports = reports.filter(r => r.id !== reportId);

    try {
      const serialized = JSON.stringify(reports);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('bugReports', serialized);
      } else {
        IN_MEMORY_BUG_REPORTS = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Deleted successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 5. GET /overrides - Read the live staticOverrides JSON database
  if (path === '/overrides' && request.method === 'GET') {
    let data = null;
    try {
      if (env.APEX_OVERRIDES) {
        data = await env.APEX_OVERRIDES.get('staticOverrides');
      } else {
        data = IN_MEMORY_DB_FALLBACK;
      }
    } catch (e) {
      console.error('Failed to read from Cloudflare KV:', e);
    }

    // Fallback: If KV database is completely empty/fresh, fetch the latest baked database from your GitHub Pages live site!
    if (!data) {
      try {
        const fbResponse = await fetch('https://zenithvalues.github.io/Apex-Ball-TD-WIKI/overrides/staticOverrides.json');
        if (fbResponse.ok) {
          data = await fbResponse.text();
          // Automatically bootstrap/cache it into KV so we don't have to fetch GitHub again!
          if (env.APEX_OVERRIDES) {
            await env.APEX_OVERRIDES.put('staticOverrides', data);
          } else {
            IN_MEMORY_DB_FALLBACK = data;
          }
        }
      } catch (err) {
        console.error('Failed to fetch static bootstrap from GitHub:', err);
      }
    }

    // Default fallback structure if KV database and GitHub fetch both failed
    if (!data) {
      data = JSON.stringify({
        timestamp: new Date().toISOString(),
        valueOverrides: {},
        wikiOverrides: {},
        mapOverrides: {},
        crateOverrides: {}
      });
    }

    return new Response(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 6. POST /overrides - Write the live staticOverrides JSON database
  if (path === '/overrides' && request.method === 'POST') {
    // Validate headers (support case-insensitive headers by scanning all keys)
    let passcode = null;
    let emailHeader = null;
    request.headers.forEach((val, key) => {
      const k = key.toLowerCase();
      if (k === 'x-admin-passcode') passcode = val;
      if (k === 'x-admin-email') emailHeader = val;
    });

    const passwordsMap = await getPasswordsMap();
    const cleanEmail = String(emailHeader || '').trim().toLowerCase();

    // HARD REJECT unknown editors
    if (!cleanEmail || !Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Email not found on the APEX team roster.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const expectedPass = passwordsMap[cleanEmail];

    if (!passcode || passcode !== expectedPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid Admin Passcode or Session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadText = await request.text();
    try {
      JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('staticOverrides', payloadText);
      } else {
        IN_MEMORY_DB_FALLBACK = payloadText;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Saved successfully to Cloudflare KV database!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 7. POST /change-password - Update an individual editor's secure password in KV
  if (path === '/change-password' && request.method === 'POST') {
    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email: rawEmail, currentPassword, newPassword } = payload;
    if (!rawEmail || !currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing email, currentPassword or newPassword' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanNewPassword = String(newPassword).trim();

    // Match the client-side rule (Admin reset screen): at least 6 characters
    if (cleanNewPassword.length < 6 || cleanNewPassword.length > 200) {
      return new Response(JSON.stringify({ error: 'New password must be between 6 and 200 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passwordsMap = await getPasswordsMap();

    if (!Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Email not found on the APEX team roster.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const livePass = passwordsMap[cleanEmail];

    if (currentPassword !== livePass) {
      return new Response(JSON.stringify({ error: 'Incorrect current password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    passwordsMap[cleanEmail] = cleanNewPassword;

    try {
      const serialized = JSON.stringify(passwordsMap);
      if (env.APEX_OVERRIDES) {
        await env.APEX_OVERRIDES.put('adminPasswords', serialized);
      } else {
        IN_MEMORY_PASSWORDS_FALLBACK = serialized;
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: `KV Password Write Failed: ${e.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Password updated successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 8. POST /login - Verify individual editor credentials
  if (path === '/login' && request.method === 'POST') {
    const payloadText = await request.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email: rawEmail, password } = payload;
    if (!rawEmail || !password) {
      return new Response(JSON.stringify({ error: 'Missing email or password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = rawEmail.trim().toLowerCase();
    const passwordsMap = await getPasswordsMap();

    if (!Object.prototype.hasOwnProperty.call(passwordsMap, cleanEmail)) {
      return new Response(JSON.stringify({ error: 'Email not found on the APEX team roster.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const livePass = passwordsMap[cleanEmail];

    if (password !== livePass) {
      return new Response(JSON.stringify({ error: 'Incorrect password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Authenticated successfully!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      status: '✅ APEX Serverless Cloudflare KV Engine is Live!',
      endpoints: {
        'GET /bug-reports': 'Read bug reports from KV',
        'POST /bug-reports': 'Submit bug reports directly to KV',
        'POST /bug-reports/resolve': 'Mark reports resolved securely via KV',
        'POST /bug-reports/delete': 'Delete bug reports securely via KV',
        'GET /overrides': 'Read the live values and WIKI overrides database',
        'POST /overrides': 'Update and publish the live database',
        'POST /change-password': 'Change an individual editor password dynamically in KV',
        'POST /login': 'Authenticate an individual editor dynamically in KV'
      },
    }, null, 2),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function addCorsHeaders(request, response) {
  // If preflight options response already has complete headers, pass through
  if (request.method === 'OPTIONS') return response;

  const newResponse = new Response(response.body, response);
  const origin = request.headers.get('Origin') || '*';
  newResponse.headers.set('Access-Control-Allow-Origin', origin);
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  const reqHeaders = request.headers.get('Access-Control-Request-Headers') || '*';
  newResponse.headers.set('Access-Control-Allow-Headers', reqHeaders);
  
  return newResponse;
}
