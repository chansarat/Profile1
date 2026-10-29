# Profile1
My Profile1

## Message form

The website is a static GitHub Pages site, so the message form needs a separate Node.js server. The server accepts messages at `POST /messages` and keeps up to 1,000 messages in memory while it is running. It does not use a database; messages are lost when the server restarts.

### Deploy the message server

The repository includes a Render Blueprint in `render.yaml`, so you do not need to enter the server settings manually.

1. Push this repository to GitHub.
2. Sign in to [Render](https://render.com/) and open **New → Blueprint**.
3. Connect the `chansarat/Profile1` repository and apply the Blueprint. Approve access to the repository if Render asks.
4. Wait for the `profile1-message-server` service to finish deploying and copy its `onrender.com` URL.
5. In `index.html`, set the form's `action` and `messageApiUrl` to your service URL followed by `/messages`.
6. Commit and push the updated `index.html`. GitHub Pages publishes the form; Render runs the message server.

The form works after both services are deployed and the server URL is added. The Render Blueprint sets `ALLOWED_ORIGIN` to `https://chansarat.github.io`. If you use a different GitHub Pages domain or custom domain, change that value in `render.yaml` and the Render service's environment settings to match your site's origin.

Messages are kept only in server memory and disappear when Render restarts the server. There is no database or message-reading page.
