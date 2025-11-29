/* eslint-disable object-curly-spacing, max-len, @typescript-eslint/no-explicit-any, require-jsdoc, new-cap, valid-jsdoc */

import * as functions from "firebase-functions/v1";
import Twilio from "twilio";


function getTwilio() {
  const cfg = (functions.config().twilio || {}) as any;
  const accountSid: string = cfg.account_sid || "";
  const authToken: string = cfg.auth_token || "";
  const verifySid: string = cfg.verify_sid || "";

  if (!accountSid || !authToken || !verifySid) {
    throw new Error(
      "Twilio not configured. Run: firebase functions:config:set twilio.account_sid=... twilio.auth_token=... twilio.verify_sid=..."
    );
  }

  const client = Twilio(accountSid, authToken);
  return { client, verifySid };
}

function withCors(handler: (req: any, res: any) => Promise<void> | void) {
  return async (req: any, res: any) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      await handler(req, res);
    } catch (err: any) {
      console.error("Function error:", err);
      res.status(500).json({ error: err?.message || "Internal server error" });
    }
  };
}

export const sendOtp = functions.https.onRequest(
  withCors(async (req, res) => {
    const phone: string = req.body?.phone;

    if (!phone) {
      res.status(400).json({ error: "phone is required" });
      return;
    }

    const { client, verifySid } = getTwilio();

    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: phone,
        channel: "sms",
        locale: "en",
      });

    res.json({ status: verification.status }); 
  })
);

export const verifyOtp = functions.https.onRequest(
  withCors(async (req, res) => {
    const phone: string = req.body?.phone;
    const code: string = req.body?.code;

    if (!phone || !code) {
      res.status(400).json({ error: "phone and code are required" });
      return;
    }

    const { client, verifySid } = getTwilio();

    const result = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: phone,
        code,
      });

    res.json({
      status: result.status,
      valid: result.status === "approved",
    });
  })
);
