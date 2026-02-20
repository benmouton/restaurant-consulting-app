const { execSync } = require("child_process");

let connectionSettings;

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;
  if (!xReplitToken) throw new Error("Token not found");
  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=github",
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
  )
    .then((r) => r.json())
    .then((d) => d.items?.[0]);
  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;
  if (!accessToken) throw new Error("GitHub not connected");
  return accessToken;
}

async function main() {
  console.log("Fetching GitHub token from integration...");
  const token = await getAccessToken();
  console.log("Token obtained. Pushing to GitHub...");

  const url = `https://x-access-token:${token}@github.com/benmouton/restaurant-consulting-app.git`;
  try {
    const output = execSync(`git push --force ${url} main 2>&1`, {
      cwd: "/home/runner/workspace",
      encoding: "utf-8",
      timeout: 30000,
    });
    console.log(output || "Push completed successfully!");
  } catch (e) {
    console.error("Push failed:", e.stdout || e.stderr || e.message);
  }
}

main();
