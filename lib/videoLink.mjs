import crypto from "node:crypto";

function secret() {
  const value = process.env.VIDEO_LINK_SECRET;
  if (!value || value.length < 16) {
    throw new Error("VIDEO_LINK_SECRET is missing or too short (min. 16 characters)");
  }
  return value;
}

// md5(bib + secret) as lowercase hex, so the mailing tool can reproduce it.
export function videoLinkCode(bib) {
  return crypto.createHash("md5").update(`${String(bib).trim()}${secret()}`).digest("hex");
}

export function isValidVideoLinkCode(bib, code) {
  const given = Buffer.from(String(code || "").trim().toLowerCase());
  const expected = Buffer.from(videoLinkCode(bib));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
