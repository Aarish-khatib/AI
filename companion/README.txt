LIMITLESS AI LOCAL AGENT COMPANION · V4

WINDOWS
1. Install the current Node.js LTS version.
2. Double-click start-windows.bat.
3. Keep the terminal window open.
4. In Limitless AI, open Agent and enter the six-digit pairing code.
5. Enter the full absolute path of the project folder the agent may use.

MACOS / LINUX
Run: sh companion/start-mac-linux.sh

YOUR OWN DEPLOYMENT
After publishing the website, paste its full HTTPS URL into app-url.txt.

SECURITY
- The server listens only on 127.0.0.1.
- Pairing is rate-limited and locked to the website origin.
- File operations use realpath checks, including symlink targets.
- Review mode is enforced here in the companion server.
- Approval codes appear only in this terminal, expire after 90 seconds, are
  tied to one exact request, and can be used once.
- Enabling Trusted mode requires a local approval.
- Terminal and delete actions still require approval in Trusted mode.
- Terminal commands receive a filtered environment without common provider,
  repository, or cloud secrets.

Terminal commands run as your normal computer account and can access operating-
system paths. Read every terminal approval carefully before entering its code.
