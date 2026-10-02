import { builtinModules } from "node:module";
import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

// 플랫폼 경계 규칙(docs/08_ARCHITECTURE.md 코드 경계). 정적 import, 동적 import(), 접두사 없는 Node 내장 모듈,
// globalThis 등을 통한 플랫폼 전역 접근, 상대경로로 서버 코드를 가져오는 경우를 함께 막습니다.
// 린트는 흔한 유입 경로를 막는 장치이며 모든 우회(별칭 변수로 전역 접근 등)를 증명하지 않습니다. Node(Vitest)·Deno 타입 검사와 검토로 보완합니다.
const nodeBuiltins = [...new Set(builtinModules.filter((name) => !name.startsWith("_")).map((name) => name.replace(/^node:/, "")))];
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const nodeBuiltinRegex = `^(node:.+|${nodeBuiltins.map(escape).join("|")})$`;
const platformRegex = "^(@supabase/|npm:|jsr:|https?:)";
const serverCodeRegex = "(^@outfoot/api-core($|/))|((^|/)packages/api-core($|/))|((^|/)api-core/src($|/))|((^|/)supabase/functions($|/))";
// 코어가 실행환경 진입점(supabase/functions)을 직접 가져오지 못하게 합니다. 코어 내부 상대경로(./config.ts 등)는 허용합니다.
const runtimeEntryRegex = "(^|/)supabase/functions($|/)";
const supabaseRegex = "^@supabase/";
// 플랫폼·Node 전용 전역입니다. Request·Response·Headers·URL·fetch·crypto 같은 웹 표준 API는 넣지 않습니다.
const platformGlobals = ["Deno", "EdgeRuntime", "Bun", "process", "global", "Buffer", "require", "module", "exports", "__dirname", "__filename", "setImmediate", "clearImmediate"];
const globalObjects = new Set(["globalThis", "self", "window", "global"]);
// 타입 단언·non-null 단언 노드입니다. 단언을 벗긴 실제 대상이 전역 객체인지 확인할 때 씁니다.
const assertionNodes = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion"]);

const restrictImports = (patterns) => ["error", { patterns: patterns.map(([regex, message]) => ({ regex, message })) }];
// 동적 import의 경로가 일반 문자열("…")이거나 표현식 없는 템플릿 문자열(`…`)이면 정적 import와 같은 정규식으로 막습니다.
// 표현식이 들어간 템플릿·변수·문자열 조합은 분석하지 않습니다(런타임 중립 코드는 동적 import 자체를 금지).
const dynamicImport = (regex, message) => {
  const pattern = `/${regex.replace(/\//g, "\\/")}/`;
  return [
    { selector: `ImportExpression[source.type='Literal'][source.value=${pattern}]`, message },
    { selector: `ImportExpression[source.type='TemplateLiteral'][source.expressions.length=0][source.quasis.0.value.cooked=${pattern}]`, message },
  ];
};
// 전역 객체를 통한 플랫폼 전역 접근(globalThis.process, globalThis["Deno"], (globalThis as unknown as …)["Deno"])을 막는 작은 로컬 규칙입니다.
// - 대상: 단언을 두 겹까지 벗긴 식별자가 globalThis·self·window·global이고, 그 식별자의 실제 값 참조가 코드 안의 값 선언으로
//   해석되지 않는 경우(실제 전역)만. 이름 검색이 아니라 파서의 참조 해석(reference.resolved)을 기준으로 합니다.
//   같은 이름의 지역 매개변수·변수·import·바깥 함수 값(예: 매개변수 window)은 허용하고, 매개변수 기본값에서 함수 본문 선언을 가리키는 것으로
//   보지 않으며(해석상 전역), type·interface 같은 타입 전용 선언은 런타임 전역을 가리지 않습니다.
// - 속성: 점 표기는 속성 이름, 대괄호는 문자열 리터럴일 때만 그 문자열을 봅니다. globalThis[name] 같은 계산된 접근은 검사하지 않습니다.
// - 변수 값 추적·상수 전파·별칭 분석은 하지 않습니다(docs/08_ARCHITECTURE.md 코드 경계의 한계).
const unwrapAssertions = (node, depth = 2) => (depth > 0 && assertionNodes.has(node.type) ? unwrapAssertions(node.expression, depth - 1) : node);
const findReference = (scope, identifier) => {
  for (let current = scope; current; current = current.upper) {
    const reference = current.references.find((item) => item.identifier === identifier);
    if (reference) return reference;
  }
  return null;
};
const resolvesToLocalValue = (scope, identifier) => {
  // 참조를 찾지 못하면 전역으로 보고 검사합니다(누락보다 차단 쪽을 택함).
  const variable = findReference(scope, identifier)?.resolved;
  // 설정의 globals·TypeScript lib 전역은 선언(defs)이 없습니다. 값 참조가 선언이 있는 변수로 해석되면 코드 안의 값 바인딩입니다.
  // typescript-eslint 스코프 분석은 값 참조를 type·interface 같은 타입 전용 선언으로 해석하지 않습니다(회귀 테스트로 확인).
  return Boolean(variable && variable.defs.length > 0);
};
const platformGlobalSet = new Set(platformGlobals);
const localPlugin = {
  rules: {
    "no-platform-global-access": {
      meta: { type: "problem", schema: [], messages: { blocked: "플랫폼 전역({{name}})은 진입점에서 주입합니다." } },
      create(context) {
        return {
          MemberExpression(node) {
            const target = unwrapAssertions(node.object);
            if (target.type !== "Identifier" || !globalObjects.has(target.name)) return;
            const name = !node.computed ? node.property.name : node.property.type === "Literal" && typeof node.property.value === "string" ? node.property.value : null;
            if (name === null || !platformGlobalSet.has(name)) return;
            if (resolvesToLocalValue(context.sourceCode.getScope(target), target)) return;
            context.report({ node, messageId: "blocked", data: { name } });
          },
        };
      },
    },
  },
};

const serverMessage = "서버 코드(api-core·supabase/functions)는 웹 번들에 넣지 않습니다.";
const platformMessage = "플랫폼 연동(Supabase SDK·Deno·Node 전용 API)은 실행환경 진입점(supabase/functions/*)에 둡니다.";

// 런타임 중립 코드(api-core, contracts)의 공통 제한입니다.
const neutralRules = (extraImports = []) => ({
  // 재수출(export … from)도 no-restricted-imports가 같은 기준으로 검사합니다.
  "no-restricted-imports": restrictImports([[platformRegex, platformMessage], [nodeBuiltinRegex, platformMessage], [runtimeEntryRegex, platformMessage], ...extraImports]),
  "no-restricted-globals": ["error", ...platformGlobals.map((name) => ({ name, message: "환경변수·플랫폼 API는 진입점에서 주입합니다." }))],
  "no-restricted-syntax": ["error",
    // 런타임 중립 코드는 동적 import를 쓰지 않습니다(경로가 변수여도 검사를 피할 수 없게).
    { selector: "ImportExpression", message: "런타임 중립 코드에서는 동적 import를 쓰지 않습니다." },
  ],
  "outfoot/no-platform-global-access": "error",
});

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.wrangler/**",
      "**/worker-configuration.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node } },
  },
  // 런타임 중립 서버 코어: AWS 이전 시 Node에서 재사용합니다.
  {
    files: ["packages/api-core/src/**/*.ts"],
    plugins: { outfoot: localPlugin },
    rules: neutralRules(),
  },
  // 공용 계약: 웹과 서버가 함께 가져가므로 플랫폼 코드와 서버 코드를 끌어오지 않습니다.
  {
    files: ["packages/contracts/src/**/*.ts"],
    plugins: { outfoot: localPlugin },
    rules: neutralRules([[serverCodeRegex, serverMessage]]),
  },
  // 웹(services 밖): 서버 코드를 가져오지 않고, Supabase SDK는 services 안에서만 씁니다.
  {
    files: ["apps/web/src/**/*.{ts,vue}"],
    ignores: ["apps/web/src/services/**"],
    rules: {
      "no-restricted-imports": restrictImports([[serverCodeRegex, serverMessage], [supabaseRegex, "Supabase SDK는 apps/web/src/services의 연동 모듈에서만 씁니다."]]),
      "no-restricted-syntax": ["error",
        ...dynamicImport(serverCodeRegex, serverMessage),
        ...dynamicImport(supabaseRegex, "Supabase SDK는 apps/web/src/services의 연동 모듈에서만 씁니다."),
      ],
    },
  },
  // 웹 services: Supabase SDK 연동은 허용하고 서버 코드는 막습니다.
  {
    files: ["apps/web/src/services/**/*.ts"],
    rules: {
      "no-restricted-imports": restrictImports([[serverCodeRegex, serverMessage]]),
      "no-restricted-syntax": ["error", ...dynamicImport(serverCodeRegex, serverMessage)],
    },
  },
);
