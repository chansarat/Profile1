import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "https://chansarat.github.io";
const maxBodyBytes = 10 * 1024;
const maxMessages = 1000;
const messages = [];

class InvalidJsonError extends Error {}
class PayloadTooLargeError extends Error {}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBodyBytes) {
      throw new PayloadTooLargeError();
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseMessage(body, contentType) {
  let fields;

  if (contentType === "application/json") {
    try {
      fields = JSON.parse(body);
    } catch {
      throw new InvalidJsonError();
    }
  } else if (contentType === "application/x-www-form-urlencoded") {
    fields = Object.fromEntries(new URLSearchParams(body));
  } else {
    return { error: "Send the form as JSON or form data." };
  }

  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
    return { error: "Send a name and a message." };
  }

  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const message = typeof fields.message === "string" ? fields.message.trim() : "";

  if (!name || name.length > 80) {
    return { error: "Enter a name between 1 and 80 characters." };
  }
  if (!message || message.length > 2000) {
    return { error: "Enter a message between 1 and 2,000 characters." };
  }

  return { name, message };
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  response.setHeader("Vary", "Origin");

  if (origin && origin !== allowedOrigin) {
    sendJson(response, 403, { error: "This website is not allowed to send messages." });
    return;
  }

  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }

  const requestUrl = new URL(request.url, "http://localhost");

  if (requestUrl.pathname === "/health" && request.method === "GET") {
    sendJson(response, 200, { status: "ok" });
    return;
  }

  if (requestUrl.pathname !== "/messages") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    sendJson(response, 405, { error: "Use POST to send a message." });
    return;
  }

  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      sendJson(response, 413, { error: "The submitted form is too large." });
      return;
    }
    console.error("Could not read the submitted message.", error);
    sendJson(response, 400, { error: "Could not read the submitted form." });
    return;
  }

  const contentType = request.headers["content-type"]?.split(";")[0].trim();
  let submitted;
  try {
    submitted = parseMessage(body, contentType);
  } catch (error) {
    if (error instanceof InvalidJsonError) {
      sendJson(response, 400, { error: "The submitted form is not valid JSON." });
      return;
    }
    throw error;
  }

  if (submitted.error) {
    const statusCode = contentType === "application/json" || contentType === "application/x-www-form-urlencoded"
      ? 400
      : 415;
    sendJson(response, statusCode, { error: submitted.error });
    return;
  }

  if (messages.length >= maxMessages) {
    sendJson(response, 503, { error: "The message box is full. Please try again later." });
    return;
  }

  messages.push({
    name: submitted.name,
    message: submitted.message,
    receivedAt: new Date().toISOString()
  });
  sendJson(response, 201, { message: "Thanks! Your message has been received." });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Message server listening on port ${port}`);
});
