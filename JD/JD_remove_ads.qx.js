// Quantumult X response-body helper for JD server/basic config responses.
// Clears dnsvip values so the JD app does not use the server-provided DNS endpoint.

const body = $response.body || "";
const rewritten = body.replace(/("dnsvip"\s*:\s*)"(?:\\.|[^"\\])*"/g, '$1""');

$done({ body: rewritten });
