const uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const supportedGetPaths = [/^me$/, /^platform\/tenants$/];
const supportedPostPaths = [
  /^tenants$/, /^specialists$/, /^platform\/tenants$/,
  new RegExp("^platform/tenants/" + uuid + "/owner-invitation$"),
  new RegExp("^specialists/" + uuid + "/sources$"),
  new RegExp("^specialists/" + uuid + "/sources/" + uuid + "/sync-runs$"),
  new RegExp("^sources/" + uuid + "/sync-runs$"),
  new RegExp("^specialists/" + uuid + "/documents$"),
  new RegExp("^specialists/" + uuid + "/revisions/" + uuid + "/publish$"),
  new RegExp("^specialists/" + uuid + "/conversations$"),
  new RegExp("^conversations/" + uuid + "/messages$"),
];
export function isSupportedApiProxyRequest(method: string, segments: string[]): boolean {
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) return false;
  const path = segments.join("/");
  if (method === "GET") return supportedGetPaths.some((pattern) => pattern.test(path));
  if (method === "POST") return supportedPostPaths.some((pattern) => pattern.test(path));
  return false;
}
