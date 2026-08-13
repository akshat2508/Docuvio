import {
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import crypto from "crypto";

import b2Client from "../config/b2Client.js";
import { config } from "../config/env.js";

class StorageService {
  constructor() {
    this.bucketName = config.b2.bucketName;
  }

  async uploadFile(file) {
    const timestamp = Date.now();

    const fileKey =
      `uploads/${timestamp}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await b2Client.send(command);

    return fileKey;
  }

  // ==========================================
  // PRINT SESSION FILE UPLOAD
  // ==========================================

  async uploadPrintSessionFile(file, sessionToken) {
    const extension =
      file.originalname.includes(".")
        ? file.originalname.substring(
            file.originalname.lastIndexOf(".")
          )
        : "";

    const safeFileName =
      file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/\s+/g, "_");

    const uniqueId = crypto.randomUUID();

    const fileKey =
      `print-sessions/${sessionToken}/${uniqueId}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await b2Client.send(command);

    return fileKey;
  }

  async getSignedUrl(fileKey) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    const url = await getSignedUrl(
      b2Client,
      command,
      {
        expiresIn: 300,
      }
    );

    return url;
  }
}

export default new StorageService();