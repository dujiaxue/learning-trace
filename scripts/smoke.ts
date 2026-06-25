/**
 * 部署后冒烟测试脚本
 * 用法：npm run smoke -- https://your-app.vercel.app
 *
 * 检查关键端点是否返回 2xx 且 JSON 可解析，
 * 用于 CI 部署后或本地启动后快速验证"线上是不是还活着"。
 *
 * 退出码：全部通过 = 0，任一失败 = 1
 */
const baseUrl = process.argv[2] || "http://localhost:3000";

interface Probe {
  name: string;
  url: string;
  expectStatus?: number;
  expectHas?: string; // 响应 JSON 中应包含的字段
}

const probes: Probe[] = [
  { name: "homepage", url: "/", expectStatus: 200 },
  { name: "timeline", url: "/timeline", expectStatus: 200 },
  { name: "api-papers", url: "/api/papers", expectHas: "papers" },
  { name: "api-debug-version", url: "/api/debug-version" },
];

async function probe(p: Probe): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(new URL(p.url, baseUrl).toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const status = res.status;
    let bodyText = "";
    let json: any = null;
    try {
      bodyText = await res.text();
      json = JSON.parse(bodyText);
    } catch {
      // 非 JSON 响应（如首页 HTML）
    }
    if (p.expectStatus && status !== p.expectStatus) {
      return { ok: false, detail: `status=${status}, expected=${p.expectStatus}` };
    }
    if (p.expectHas && (!json || !(p.expectHas in json))) {
      return {
        ok: false,
        detail: `missing field "${p.expectHas}", body=${bodyText.slice(0, 200)}`,
      };
    }
    return { ok: true, detail: `status=${status}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

async function main() {
  console.log(`Smoke test against: ${baseUrl}\n`);
  let allOk = true;
  for (const p of probes) {
    const r = await probe(p);
    const mark = r.ok ? "✓" : "✗";
    console.log(`${mark} ${p.name.padEnd(20)} ${r.detail}`);
    if (!r.ok) allOk = false;
  }
  console.log(allOk ? "\nAll probes passed." : "\nSome probes failed.");
  process.exit(allOk ? 0 : 1);
}

main();
