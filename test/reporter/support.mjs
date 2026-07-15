export async function getBrowserstackUrl (username, accessKey, buildName) {
  try {
    const auth = Buffer.from(`${username}:${accessKey}`).toString('base64');
    const res = await fetch('https://api.browserstack.com/automate/builds.json?limit=20', {
      headers: { Authorization: `Basic ${auth}` }
    });
    if (!res.ok) return null;
    const builds = await res.json();
    const match = builds.find(b => b.automation_build.name === buildName);
    return match
      ? `https://automate.browserstack.com/builds/${match.automation_build.hashed_id}`
      : null;
  } catch {
    return null;
  }
}
