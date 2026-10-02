// 웹 빌드 결과와 웹 환경변수에 서버 비밀값이 들어가지 않았는지 검사합니다.
// 사용: node scripts/check-web-bundle.mjs <빌드 폴더> [--env-dir <웹 폴더>]  (apps/web의 build 스크립트가 자동 실행)
//
// 검사 방식과 한계(docs/13_SECURITY_OPERATIONS.md):
// - 빌드 결과에서는 변수 이름이 사라질 수 있어 값의 형식으로 찾습니다. 형식이 알려진 키만 찾을 수 있고,
//   임의 문자열 비밀번호처럼 형식이 없는 값은 찾지 못합니다. 1차 방어는 서버 비밀값을 VITE_ 변수로 만들지 않는 것입니다.
// - JWT 후보는 payload를 읽어 role 값만 확인합니다. 서명·만료를 검증하지 않으며 인증 판단에 쓰지 않습니다.
// - 공개 키(Supabase publishable 키, role이 anon인 JWT)는 허용합니다.
// - 발견 시 파일·변수 이름과 규칙 이름만 출력하고 키 원문이나 JWT payload는 출력하지 않습니다.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const valueRules = [
  // Supabase 새 비밀 키(공식 형식 sb_secret_…). sb_publishable_… 는 공개 키라 허용합니다.
  { name: "Supabase secret 키 형식", pattern: /sb_secret_[A-Za-z0-9_-]{8,}/ },
  // OpenAI 키는 sk- 로 시작합니다. sk-proj- 등 하위 접두사는 공식 문서로 확정하지 못해 sk- 뒤 문자·숫자·-·_ 20자 이상으로 넓게 찾습니다.
  { name: "AI 공급자 키 형식(sk-)", pattern: /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}/ },
  { name: "DB 접속 문자열", pattern: /postgres(?:ql)?:\/\/[^\s"'`:/@]+:[^\s"'`@]+@/ },
  { name: "개인 키", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  // 서버 전용 변수 이름이 남아 있는 경우(빌드에서 이름이 사라질 수 있으므로 보조 검사입니다).
  { name: "서버 전용 변수 이름", pattern: /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEYS|SUPABASE_DB_URL|OPENAI_API_KEY/ },
];

const jwtCandidate = /eyJ[A-Za-z0-9_-]{4,}\.eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*/g;
const privilegedRoles = new Set(["service_role", "supabase_admin"]);

/** JWT 후보의 payload role만 읽습니다. 형식이 맞지 않으면 null(비밀값 판정 안 함). */
export function jwtRole(candidate) {
  try {
    const payload = JSON.parse(Buffer.from(candidate.split(".")[1], "base64url").toString("utf8"));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function findSecretRules(text) {
  const found = valueRules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.name);
  for (const match of text.matchAll(jwtCandidate)) {
    if (privilegedRoles.has(jwtRole(match[0]) ?? "")) {
      found.push("권한 우회 JWT(role=service_role 등)");
      break;
    }
  }
  return found;
}

// 웹(Vite)이 번들에 넣는 VITE_ 변수 중 비밀값으로 보이는 이름·값을 찾습니다.
const secretNamePattern = /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|DB_URL/i;
function envFindings(envDir) {
  const findings = [];
  const check = (source, name, value) => {
    if (!name.startsWith("VITE_")) return;
    if (secretNamePattern.test(name)) findings.push(`${source}: ${name} (비밀값으로 보이는 VITE_ 이름)`);
    for (const rule of findSecretRules(value ?? "")) findings.push(`${source}: ${name} (${rule})`);
  };
  for (const [name, value] of Object.entries(process.env)) check("환경변수", name, value);
  if (envDir && existsSync(envDir)) {
    for (const file of readdirSync(envDir).filter((name) => /^\.env(\..+)?$/.test(name) && !name.endsWith(".example"))) {
      for (const line of readFileSync(join(envDir, file), "utf8").split(/\r?\n/)) {
        const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
        if (match) check(file, match[1], match[2].replace(/^['"]|['"]$/g, ""));
      }
    }
  }
  return findings;
}

function bundleFindings(root) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(js|mjs|cjs|css|html|json|map|txt|webmanifest)$/.test(name)) files.push(path);
    }
  };
  walk(root);
  const findings = [];
  for (const file of files) for (const rule of findSecretRules(readFileSync(file, "utf8"))) findings.push(`${file}: ${rule}`);
  return { files, findings };
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const envIndex = args.indexOf("--env-dir");
  const envDir = envIndex >= 0 ? args[envIndex + 1] : undefined;
  const root = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--env-dir");
  if (!root || !existsSync(root)) {
    console.error("사용법: node scripts/check-web-bundle.mjs <빌드 폴더> [--env-dir <웹 폴더>]");
    process.exit(2);
  }
  const { files, findings } = bundleFindings(root);
  findings.push(...envFindings(envDir));
  if (findings.length > 0) {
    console.error(`웹 번들·환경변수에서 서버 비밀값 후보를 찾았습니다(${findings.length}건). 값은 출력하지 않습니다:\n${findings.join("\n")}`);
    process.exit(1);
  }
  console.log(`웹 번들 비밀값 검사 통과: ${files.length}개 파일${envDir ? " · 웹 환경변수 포함" : ""}`);
}
