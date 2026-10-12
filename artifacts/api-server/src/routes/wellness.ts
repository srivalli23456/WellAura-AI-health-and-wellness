import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.use("/wellness", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ detail: "Sign in to access private wellness data." });
    return;
  }

  try {
    const upstreamPath = req.originalUrl.replace(/^\/api/, "");
    const upstreamUrl = new URL(upstreamPath, "http://127.0.0.1:8000");
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "content-type": "application/json",
        accept: req.get("accept") ?? "application/json",
        "x-wellaura-user-id": userId,
      },
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });

    if (upstream.status === 204) {
      res.sendStatus(204);
      return;
    }

    const body = await upstream.text();
    res
      .status(upstream.status)
      .type(upstream.headers.get("content-type") ?? "application/json")
      .send(body);
  } catch (error) {
    req.log.error({ err: error }, "Wellness service request failed");
    res.status(503).json({
      detail: "Private wellness storage is temporarily unavailable. Please try again.",
    });
  }
});

export default router;
