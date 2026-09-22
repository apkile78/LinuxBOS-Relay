import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;
const RELAY_TOKEN = process.env.RELAY_TOKEN;

app.get("/test", (_req, res) => {
  res.json({
    service: "linuxbos-relay",
    status: "ok"
  });
});

app.get("/fetch", async (req, res) => {
  if (!RELAY_TOKEN || req.get("authorization") !== `Bearer ${RELAY_TOKEN}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const target = req.query.url;

  if (!target || !/^https?:\/\//i.test(target)) {
    return res.status(400).json({ error: "url must start with http:// or https://" });
  }

  try {
    const response = await fetch(target, {
      redirect: "follow"
    });

    const body = await response.arrayBuffer();

    res.status(response.status);
    res.set("content-type", response.headers.get("content-type") || "application/octet-stream");
    res.send(Buffer.from(body));
  } catch (error) {
    res.status(502).json({
      error: "upstream request failed",
      message: error.message
    });
  }
});

app.get("/download", async (req, res) => {
  const target = req.query.url;

  if (!target || !/^https:\/\//i.test(target)) {
    return res.status(400).json({
      error: "url must start with https://"
    });
  }

  try {
    const response = await fetch(target, {
      redirect: "follow"
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `upstream returned ${response.status}`
      });
    }

    const contentLength = response.headers.get("content-length");

    if (contentLength && Number(contentLength) > 100 * 1024 * 1024) {
      return res.status(413).json({
        error: "file is larger than 100 MB"
      });
    }

    const body = await response.arrayBuffer();

    if (body.byteLength > 100 * 1024 * 1024) {
      return res.status(413).json({
        error: "file is larger than 100 MB"
      });
    }

    res.set(
      "content-type",
      response.headers.get("content-type") ||
      "application/octet-stream"
    );

    res.set(
      "content-disposition",
      "attachment"
    );

    res.send(Buffer.from(body));
  } catch (error) {
    res.status(502).json({
      error: "download failed",
      message: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LinuxBOS relay listening on ${PORT}`);
});
