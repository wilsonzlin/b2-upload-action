const core = require("@actions/core");
const crypto = require("crypto");
const fs = require("fs").promises;
const https = require("https");

const textEncoder = new TextEncoder();

// Defined at https://www.backblaze.com/b2/docs/string_encoding.html.
const SAFE_BYTES = new Set(
  [
    ".",
    "_",
    "-",
    "/",
    "~",
    "!",
    "$",
    "'",
    "(",
    ")",
    "*",
    ";",
    "=",
    ":",
    "@",
  ].map((c) => c.charCodeAt(0))
);

const isDigit = (b) => b >= 0x30 && b <= 0x39;
const isLcAlpha = (b) => b >= 0x61 && b <= 0x7a;
const isUcAlpha = (b) => b >= 0x41 && b <= 0x5a;

const encodeB2PathComponent = (raw) => {
  const bytes = textEncoder.encode(raw);
  return [...bytes]
    .map((b) =>
      SAFE_BYTES.has(b) || isDigit(b) || isLcAlpha(b) || isUcAlpha(b)
        ? String.fromCharCode(b)
        : `%${b.toString(16)}`
    )
    .join("");
};

const fetchOkJson = (url, { body, ...opts }) =>
  new Promise((resolve, reject) => {
    const req = https.request(url, opts);
    req.on("error", reject);
    req.on("response", (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) {
        return reject(
          new Error(
            `Request to ${url} failed with status ${res.statusCode}`
          )
        );
      }
      const chunks = [];
      res.on("error", reject);
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(chunks.join("")));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.end(body);
  });

(async () => {
  const auth = `Basic ${[
    Buffer.from(core.getInput("keyId")).toString("base64"),
    Buffer.from(core.getInput("applicationKey")).toString("base64"),
  ].join(":")}`;
  const contentType = core.getInput("contentType");
  const bucket = core.getInput("bucket");
  const filePath = core.getInput("file");
  const key = core.getInput("uploadKey");

  const body = await fs.readFile(filePath);
  const sha1 = crypto.createHash("sha1").update(body).digest("hex");

  const { accountId, apiUrl, authorizationToken } = await fetchOkJson(
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
    {
      headers: {
        Authorization: auth,
      },
    }
  );

  const {
    buckets: [{ bucketId }],
  } = await fetchOkJson(`${apiUrl}/b2api/v2/b2_list_buckets`, {
    method: "POST",
    headers: {
      Authorization: authorizationToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountId,
      bucketName: bucket,
    }),
  });

  const { authorizationToken: uploadAuthorizationToken, uploadUrl } =
    await fetchOkJson(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketId,
      }),
    });

  const uploadResult = await fetchOkJson(uploadUrl, {
    method: "POST",
    body,
    headers: {
      Authorization: uploadAuthorizationToken,
      "Content-Type": contentType,
      "X-Bz-Content-Sha1": sha1,
      "X-Bz-File-Name": encodeB2PathComponent(key),
    },
  });

  for (const prop of [
    "bucketId",
    "contentLength",
    "contentSha1",
    "contentMd5",
    "contentType",
    "fileId",
    "fileInfo",
    "fileName",
    "fileRetention",
    "legalHold",
    "serverSideEncryption",
  ]) {
    core.setOutput(prop, uploadResult[prop]);
  }
})().catch((err) => core.setFailed(err.message));
