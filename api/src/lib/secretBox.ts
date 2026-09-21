import crypto from "crypto";
import { getSecret } from "./auth";

const key = () => crypto.createHash("sha256").update(`concursei-secretbox|${getSecret()}`).digest();

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decrypt(box: string) {
  const [v, iv, tag, data] = box.split(":");
  if (v !== "v1") throw new Error("formato inválido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
