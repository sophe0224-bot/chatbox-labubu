import assert from "node:assert/strict";
import test from "node:test";

test("server-renders the Labubu experience page", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<html lang="en">/i);
  assert.match(html, /LABUBU Experience Chatbox/);
  assert.match(html, /Why do we suddenly want a Labubu\?/);
  assert.match(html, /What Kind of Collector Are You\?/);
  assert.match(html, /My friends all have one/);
});
