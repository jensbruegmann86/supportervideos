import crypto from "node:crypto";

const CODE_LENGTH = 12;

function secret() {
  const value = process.env.VIDEO_LINK_SECRET;
  if (!value || value.length < 16) {
    throw new Error("VIDEO_LINK_SECRET is missing or too short (min. 16 characters)");
  }
  return value;
}

export function videoLinkCode(bib) {
  return crypto
    .createHmac("sha256", secret())
    .update(String(bib).trim())
    .digest("hex")
    .slice(0, CODE_LENGTH);
}

export function isValidVideoLinkCode(bib, code) {
  const given = Buffer.from(String(code || ""));
  const expected = Buffer.from(videoLinkCode(bib));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
