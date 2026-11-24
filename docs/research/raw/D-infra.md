# D-infra: 패키지 매니저·모노레포·코드 생성·테스트·배포·CI 도구 조사

조사일: 2026-11-24 (환경 날짜 기준). 대상: `create-produx-app` (React+Vite, standalone / pnpm 모노레포).

## 공통 메모

- Context7 사용 범위: pnpm, turbo, orval, msw, playwright 는 Context7 로 조회했다. 조회 도중 **Context7 월간 quota 가 소진**되어(`Monthly quota exceeded`) 이후 항목(npm, Yarn, Bun, Renovate, `pnpm/action-setup`, GitHub Actions, CodeQL)은 "Context7 미조회(quota)"이고, GitHub 저장소의 공식 문서·소스(`gh api`), `npm view`, Docker Hub API, 그리고 직접 실행으로 확인했다.
- Context7 문서 버전과 선택 버전이 다르다: pnpm 문서 v12.15.0 (선택 12.23.0), turbo v2.11.10 (선택 2.11.13), orval v8.48.0 (선택 8.49.0), Playwright v1.64.1 (선택 1.65.1), msw v3.0.7 (선택과 일치).
- 실측 환경: macOS arm64, Node v24.14.0, 로컬 npm 11.9.0. pnpm 12.23.0 은 scratchpad 에 따로 설치해 실행했다(store 도 scratchpad 로 분리).
- "실측"은 직접 명령을 실행해 결과를 본 것이다. 실측 결과는 그 버전에서만 확인된 사실이다.

### 버전 요약 (npm registry, 2026-11-24 조회)

| 도구 | 선택 버전 | 게시일 (UTC) | 비고 |
| --- | --- | --- | --- |
| pnpm | 12.23.0 | 2026-11-22 | `latest` = `latest-12`. 11.x 최신 11.29.0 |
| npm | 12.2.3 (`latest`) | — | 과제 전제(npm 11)와 다름. Node 26.13.1 번들 npm 은 11.20.0 |
| Yarn (berry) | 4.19.0 (`@yarnpkg/cli-dist`) | 2026-11-21 | npm `yarn` 패키지는 여전히 1.22.22(classic) |
| Bun | 1.4.5 | 2026-11-19 | |
| turbo | 2.11.13 | 2026-11-18 | |
| orval | 8.49.0 | 2026-11-22 | engines `node >=22.18.0` |
| msw | 3.0.7 | 2026-11-18 | engines `node >=22.12.0` |
| @playwright/test | 1.65.1 | 2026-11-13 | engines `node >=20` |
| vite (참고) | 8.3.8 | 2026-11-11 | esbuild 는 optional peer 로만 남음 |
| Node LTS | 26.13.1 "Lithium" | 2026-11-10 | 24.x Krypton, 22.x Jod 도 LTS |

### 항목별 검증 상태 (과제 지정 라벨)

| 항목 | 라벨 | 보충 |
| --- | --- | --- |
| 1. pnpm 12 | docs-confirmed | + 12.23.0 실측 (빌드 승인, filtered install, 설정 파일 자동 수정) |
| 2. npm 12 | from release notes/API | + 실측 (`allowScripts`, 경고 후 exit 0) |
| 2. Yarn 4.19 | from release notes/API | 소스(`create.ts`) + 실측 (PnP 빌드, 기본 설정값, age gate) |
| 2. Bun 1.4.5 | docs-confirmed | GitHub `docs/` 만, 실행 안 함 |
| 3. turbo 2.11.13 | docs-confirmed | + 실측 (pnpm 12 워크스페이스, 로컬 캐시) |
| 4. orval 8.49.0 | docs-confirmed | + 실측 (생성, import 확인, 타입체크) |
| 5. msw 3.0.7 | from release notes/API | + 타입 정의 + 실측 (`setupServer`, `msw init`). Vite 플러그인은 unconfirmed |
| 6. Playwright 1.65.1 | docs-confirmed | 문서는 1.64.1, 1.65 는 릴리스 노트. 실행 안 함 |
| 7. Docker 이미지 | from release notes/API | Docker Hub API + 이미지 검사 + nginx 실행 단계·빌드 단계 실측 |
| 8. GitHub Actions | from release notes/API | SHA 는 `gh api` 로 직접 역참조. 워크플로 실행은 안 함 |
| 9. Renovate | docs-confirmed | + validator·extract 실측. 실제 교체 PR 은 unconfirmed. Dependabot 은 unconfirmed |

---

## 1. pnpm

- 이름: pnpm
- Context7 ID: `/pnpm/pnpm/v12.15.0` (버전 고정). 보조: 없음
- 선택 버전: **12.23.0**
- 문서 버전: v12.15.0
- 조회 주제: `allowBuilds`/`approve-builds`, 12 major 변경, `pmOnFail`/`devEngines.packageManager`, `minimumReleaseAge`, filtered install, catalog, `pnx`/`pnpm create`
- 공식 문서: https://pnpm.io/settings , https://pnpm.io/11.x/migration , 릴리스 https://github.com/pnpm/pnpm/releases/tag/v12.0.0 , https://github.com/pnpm/pnpm/releases/tag/v11.0.0
- 검증 상태: docs-confirmed + 릴리스 노트 + 12.23.0 실측

### 안정성

- v11.0.0: 2026-04-28, v12.0.0: 2026-08-26 정식 릴리스(prerelease=false). 현재 12.23.0 까지 나왔고 npm `latest` 태그가 12 계열이다. → 12 는 stable 로 봐도 된다(릴리스 근거).
- pnpm 12 는 네이티브 실행 파일이다. `pnpm@12.23.0` npm 패키지는 `@pnpm/exe.<platform>` optionalDependencies 와 `preinstall`/`postinstall: node install.js` 를 가진 래퍼이고, `engines.node` 는 `>=18` 이다. 이 `>=18` 은 래퍼 기준이며, 릴리스 노트에 "The Rust CLI" 표현이 있고 `pnpm/action-setup` README 가 "pnpm v12 ... plain `pnpm` package already installs a standalone native executable" 이라고 쓴다. → pnpm 12 자체의 Node 요구는 사실상 없다는 것은 **추론**이다. pnpm 11 은 `engines.node >=22.13` (npm view 확인).

### pnpm 10 → 11 주요 breaking (v11.0.0 릴리스 노트)

- Node 18–21 지원 중단, pure ESM.
- **`.npmrc` 는 인증·registry 전용.** `nodeLinker`, `hoistPattern`, `shamefullyHoist` 같은 나머지 설정은 `pnpm-workspace.yaml` 또는 전역 `~/.config/pnpm/config.yaml` 에 둔다.
- **`package.json` 의 `pnpm` 필드를 더 이상 읽지 않는다.** 설정은 `pnpm-workspace.yaml` 로 간다.
- `npm_config_*` 환경변수를 읽지 않는다 → `pnpm_config_*`.
- `onlyBuiltDependencies`, `onlyBuiltDependenciesFile`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, `ignoreDepScripts` 삭제 → **`allowBuilds`** 맵으로 대체.
- `strictDepBuilds` 기본값 `true` (승인되지 않은 빌드 스크립트가 있으면 에러).
- `minimumReleaseAge` 기본값 1440분(1일), `minimumReleaseAgeStrict` 는 사용자가 값을 직접 지정하지 않으면 `false`. `blockExoticSubdeps` 기본 `true`. `verifyDepsBeforeRun` 기본 `install`.
- `managePackageManagerVersions`, `packageManagerStrict`, `packageManagerStrictVersion`, `COREPACK_ENABLE_STRICT` 삭제 → **`pmOnFail`** (`download` 기본 | `error` | `warn` | `ignore`).
- `useNodeVersion` 삭제 → `devEngines.runtime`.
- 필터로 명시하면 루트 프로젝트도 선택된다.
- 자동 마이그레이션: `pnpx codemod run pnpm-v10-to-v11` (11, 12 양쪽 대상).

### pnpm 11 → 12 주요 breaking (v12.0.0 릴리스 노트)

- **`pnpm-workspace.yaml` 의 모르는 키**: 프로젝트가 실행 중인 pnpm 과 맞는 버전을 고정(`packageManager`/`devEngines`)하고 있으면 `ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS` 로 **실패**한다. 그렇지 않으면 경고.
- `pnpm install --frozen-lockfile false` 형태 제거 → `--no-frozen-lockfile`.
- 알려진 호스트(GitHub 등)의 git 의존성은 canonical HTTPS URL 로 해석.
- `engineStrict` 아래 optional 하위 트리의 비호환 패키지 처리 강화.
- `packageImportMethod: auto` 가 Linux 에서 hardlink 우선.
- peer 해석 시 dependency cycle 을 canonical 하게 끊음(기존 lockfile 은 그대로 동작).

같은 릴리스의 Minor/Patch 항목(breaking 아님): `pnpm init` 이 registry `latest` pnpm 을 고정, `pnx yarn@4`/`pnx npm@11` 로 다른 패키지 매니저 실행, `globalShims`, pnpmfile `filterLog` hook deprecated(무시).

### 12.23.0 실측 결과 (중요)

1. **빌드 스크립트 승인 (esbuild)**
   - React+Vite+orval+msw+Playwright 조합으로 lockfile 없이 처음 `pnpm install` → **exit 1**, `ERR_PNPM_IGNORED_BUILDS: Ignored build scripts: esbuild@0.28.2`. `CI=true` 에서도 같다. `--frozen-lockfile` 도 exit 1.
   - `pnpm why esbuild --depth 1` (전체 출력): `esbuild@0.28.2 ← @orval/core@8.49.0, vite@8.3.8`. vite 8.3.8 은 esbuild 를 optional peer 로만 두므로, esbuild 를 실제로 설치하게 만드는 것은 **orval** 이다.
   - 같은 조합에서 **orval 만 빼면** (react, vite, plugin-react, vitest, typescript, msw, playwright, axios) `allowBuilds` 없이 install **exit 0**. orval 을 넣으면 exit 1.
   - orval 없는 프로젝트에 `allowBuilds: { esbuild: false }` 를 미리 써 둬도 install exit 0 (에러·경고 없음). → 생성기는 이 키를 **옵션과 무관하게 항상** 써도 된다.
   - msw 3.0.7 에는 install script 가 없다(v2 는 `postinstall` 이 있었다). `@playwright/test`, `turbo`, `vite`, `rolldown`, `lightningcss` 에도 install script 가 없다(npm view 확인). `@vitejs/plugin-react-swc` 를 쓰면 `@swc/core` 가 `postinstall` 을 가진다(npm view, install 실측은 안 함).
   - orval 포함 프로젝트에 `allowBuilds: { esbuild: false }` 를 넣으면 install exit 0. 이 상태에서 `orval` 생성도 정상 동작했다. `true` 로 둬도 되지만 실측은 `false` 만 했다.
   - 문서(v12.15.0)는 "승인되지 않은 패키지를 placeholder 로 `allowBuilds` 에 자동 추가한다"고 하지만, **12.23.0 실측에서는 placeholder 가 써지지 않았다.**
2. **`minimumReleaseAge` 자동 수정**: standalone 프로젝트(원래 `pnpm-workspace.yaml` 없음)에서 install 하자 pnpm 이 **`pnpm-workspace.yaml` 을 새로 만들고** 1일이 안 된 패키지(`@tanstack/react-query@5.108.4`, `@tanstack/query-core@5.108.4`)를 `minimumReleaseAgeExclude` 에 써 넣었다. 생성 직후 첫 install 에서 파일이 바뀌어 git 이 dirty 해진다.
3. **삭제된 설정**: `onlyBuiltDependencies` 를 넣고 pnpm 12 를 고정한 상태에서 install → 에러 없이 exit 0 (무시됨). 반면 오타 키 `minimumReleaseAg` 는 exit 1 (`did you mean "minimumReleaseAge"?`).
4. **filtered install 과 루트 lifecycle**: 워크스페이스에서 `pnpm install --filter web...` 실행 시 **루트의 `postinstall`·`prepare` 가 실행됐다**. 선택되지 않은 `packages/other` 의 `postinstall` 은 실행되지 않았다.
5. **lockfile**: `packageManager: pnpm@12.23.0` 이 있으면 `pnpm-lock.yaml` 앞에 boot document(`importers['.'].packageManagerDependencies.pnpm`)가 붙는다. `lockfileVersion: '9.0'` 은 유지.

### 설정 위치

| 설정 | 위치 (pnpm 11+) |
| --- | --- |
| `allowBuilds`, `minimumReleaseAge`, `nodeLinker`, `catalog`, `pmOnFail`, `packages` | `pnpm-workspace.yaml` (standalone 에도 둘 수 있음) |
| registry, auth token | `.npmrc` |
| 사용자 전역 설정 | `~/.config/pnpm/config.yaml` |
| `package.json#pnpm` | **읽지 않음** |

### 생성 프로젝트용 최소 스니펫 (실측 근거)

```yaml
# pnpm-workspace.yaml (standalone 이면 packages 생략)
packages:
  - apps/*
  - packages/*

catalog:
  react: 19.3.1
  react-dom: 19.3.1

allowBuilds:
  esbuild: false   # orval → @orval/core → esbuild. true 도 가능
```

```json
{
  "private": true,
  "packageManager": "pnpm@12.23.0"
}
```

`apps/web/package.json` 에서 `"react": "catalog:"`, 워크스페이스 패키지는 `"workspace:*"`. catalog 항목에 `workspace:^` 도 쓸 수 있다(v12.2.0+, 문서).

### `packageManager` / 버전 관리

- `packageManager: "pnpm@x.y.z"` (정확한 버전) 또는 `devEngines.packageManager: { name: "pnpm", version: ">=12 <13", onFail: "download" }` (범위 허용, 해석 결과는 lockfile `packageManagerDependencies` 에 기록).
- 실행 중 pnpm 이 다르면 `pmOnFail` 기본값 `download` 에 따라 선언된 버전을 내려받아 실행한다. 로컬 pnpm 11.13.0 사용자도 선언된 12.23.0 으로 전환된다(문서 근거, 로컬 11 → 12 전환 자체는 실측 안 함).
- 둘 다 쓰지 말 것: corepack 은 두 필드가 다르면 거부한다(릴리스 노트).

### CLI

- `--filter <pkg>...` = 패키지와 그 의존성, `...<pkg>` = 의존하는 쪽. `-r` = 모든 프로젝트. 실측: `pnpm install --filter web...` 는 web 과 그 의존성만 설치하되 루트 lifecycle 은 실행.
- `pnpm create <name> <args...>` → `create-<name>` 실행. `pnx` = `pnpm dlx` = `pnpx`. 예: `pnpm create produx-app my-app --flag`, `pnx create-produx-app@latest my-app --flag`. 인자는 그대로 전달된다(문서. `--` 불필요하다는 점은 문서 예시 기준이며 실측 안 함).
- pnpm 12 의 `pnx yarn@4`, `pnx npm@11` 은 해당 패키지 매니저 자체를 내려받아 실행한다(릴리스 노트).

---

## 2. npm / Yarn / Bun

- Context7: **미조회(quota 소진)**. GitHub 공식 문서·소스와 실측으로 확인.
- 검증 상태: npm 은 릴리스 노트 + 실측(npm 12.2.3), Yarn 은 소스 확인(`create.ts`) + 실측(4.19.0 설치·빌드), Bun 은 GitHub `docs/` 문서 확인(실행 안 함).

### npm

- 버전: npm `latest` 는 **12.2.3**. npm 12.0.0 (2026-07-08) breaking:
  - Node 지원: `^22.22.2 || ^24.15.0 || >=26.0.0`. 실측: Node 24.14.0 에서 `npm v12.2.3 does not support Node.js v24.14.0` 경고.
  - **의존성 lifecycle script 기본 차단.** 루트 `package.json` 의 `allowScripts` 에 없는 패키지의 script 는 건너뛴다. 실측: esbuild 설치 시 `npm warn install-scripts ... blocked`, **exit 0** (pnpm 과 달리 실패하지 않음).
  - `allow-git`, `allow-remote` 기본값 `none`.
- `allowScripts` 형식 (실측, `npm install-scripts approve` 가 써 준 값):

```json
{ "allowScripts": { "esbuild": true } }
```

  기본 `approve` 는 `{"esbuild@0.28.2": true}` 처럼 버전을 고정한다. `--no-allow-scripts-pin` 이면 이름만 쓴다. `false` 는 명시적 거부.
- Node 26.13.1 / 24.22.3 에 번들된 npm 은 각각 11.20.0 / 11.19.1 이다(nodejs.org dist index). 사용자가 별도 업그레이드하지 않으면 npm 11 이다. 다만 npm 11.20.0 도 `npm install -g pnpm@12.23.0` 에서 `install scripts not yet covered by allowScripts` 경고를 냈다(7절 실측). npm 11.x 가 scripts 를 실제로 막는지, 경고만 하는지는 **미확인**.
- 공식 문서(읽은 경로): `npm/cli` 의 `docs/lib/content/commands/npm-init.md`, `npm-install-scripts.md`, `npm-approve-scripts.md`, `using-npm/workspaces.md`, `workspaces/config/lib/definitions/definitions.js`, 릴리스 https://github.com/npm/cli/releases/tag/v12.0.0 . 웹 문서: https://docs.npmjs.com/cli/commands/npm-init
- `npm create x@latest my-app -- --flag`: `npm init foo -- --hello` = `npm exec -- create-foo --hello` (npm-init 문서). **`--` 뒤만 create 패키지로 간다.** `--` 앞의 옵션은 npm 이 먹는다.
- workspaces: 루트 `package.json` 의 `"workspaces": ["apps/*", "packages/*"]`, `npm install <pkg> -w <ws>`, `npm run test --workspaces --if-present`. npm 은 **`workspace:` 프로토콜을 지원하지 않는다**(문서에 해당 표현 없음; 워크스페이스 간 의존은 `npm install b -w a` 로 추가) — 생성기가 npm 모드에서 `workspace:*` 를 쓰면 안 된다. 이 부분은 문서 부재 기반 판단.

### Yarn 4.19 (berry)

- 버전: `@yarnpkg/cli-dist@4.19.0` (GitHub 릴리스 `@yarnpkg/cli/4.19.0`, 2026-11-21). npm `yarn` 패키지는 1.22.22 classic.
- `yarn create foo my-app --flag`: `packages/plugin-dlx/sources/commands/create.ts` 가 `foo` → `create-foo` (`@scope/foo` → `@scope/create-foo`) 로 바꾼 뒤 `yarn dlx create-foo ...args` 를 실행하며, 인자는 `Option.Proxy()` 로 **전부 전달**된다(`--` 불필요). 소스 기준.
- workspaces: `package.json#workspaces` 배열, `workspace:` 프로토콜 지원(기존 지식, 이번에 문서로 재확인하지 않음 — `packages/docusaurus/docs/features/workspaces.mdx` 존재만 확인).
- Docker 주의: `node:26.13.1-alpine3.24` 이미지에는 `corepack` 이 없었다(그 이미지에서만 실측). Yarn 4 를 corepack 으로 켜는 방식은 이 이미지에서 쓸 수 없다.
- 공식 문서: https://yarnpkg.com/cli/create , 소스 `yarnpkg/berry` 의 `packages/plugin-dlx/sources/commands/create.ts`.
- Yarn 4.19.0 기본값 실측 (`yarn config get`):
  - `nodeLinker` = `pnp`
  - **`enableScripts` = `false`** → install 시 `YN0004: esbuild@npm:0.28.2 lists build scripts, but all build scripts have been disabled.` (실패는 아님)
  - **`npmMinimalAgeGate` = `1440`** (1일) → 게시 1일 미만인 정확한 버전을 추가하면 `YN0016: All versions satisfying "5.108.4" are quarantined` 로 **exit 1**. pnpm 은 같은 경우 fallback 후 `minimumReleaseAgeExclude` 를 써 주지만 Yarn 은 실패한다. 생성기가 방금 나온 버전을 고정하면 Yarn 모드에서 깨진다.
- PnP 실측: `nodeLinker` 기본값(pnp) 상태에서 vite 8.3.8 + `@vitejs/plugin-react` 6.3.0 + react 19.3.1 의 `yarn install` 과 `vite build` 모두 성공. 즉 **Vite 빌드 자체에는 `nodeLinker: node-modules` 가 필요하지 않았다.** vitest, Playwright, orval, msw CLI, 에디터 TypeScript 연동은 PnP 에서 확인하지 않았다 → 안전하게 가려면 `.yarnrc.yml` 에 `nodeLinker: node-modules` 를 넣는 것이 무난하다(권장 의견, 실측 근거 아님).

### Bun 1.4.5

- `bun create <template>` 은 로컬 템플릿이 없으면 npm 의 `create-<template>` 을 `bunx create-<template>` 로 실행(`docs/runtime/templating/create.mdx`). `react`, `next` 이름만 예외.
- lifecycle: Bun 은 기본으로 dependency lifecycle script 를 실행하지 않고, 기본 허용 목록에 `esbuild`, `msw` 가 들어 있다(`src/install/default-trusted-dependencies.txt`). **`trustedDependencies` 를 정의하면 기본 목록을 대체**한다(확장이 아님) — 생성기가 이 필드를 쓰면 esbuild 도 직접 넣어야 한다.
- workspaces: 루트 `package.json#workspaces` (glob, 부정 패턴 지원), `workspace:*` 프로토콜 지원 (`docs/pm/workspaces.mdx`).
- 공식 문서: https://bun.com/docs/runtime/templating/create , https://bun.com/docs/pm/lifecycle (읽은 경로: `oven-sh/bun` 의 `docs/runtime/templating/create.mdx`, `docs/pm/lifecycle.mdx`, `docs/pm/workspaces.mdx`, `docs/pm/bunx.mdx`).
- `bunx` 는 실행 파일 이름 **뒤**의 flag 를 그대로 넘긴다. `--bun` 은 이름 앞에 둬야 한다 (`docs/pm/bunx.mdx`). 따라서 `bun create produx-app my-app --flag` → `bunx create-produx-app my-app --flag` 로 인자가 전달된다고 보는 것은 두 문서를 합친 **추론**(실측 안 함).

---

## 3. Turborepo 2.11.13

- Context7 ID: `/vercel/turborepo/v2.11.10` (버전 고정)
- 선택 버전: **2.11.13** (2026-11-18)
- 문서 버전: v2.11.10
- 조회 주제: `turbo.json` tasks/dependsOn/outputs/inputs/persistent/cache, `packageManager` 요구, env/globalEnv/envMode, framework inference
- 공식 문서: https://turborepo.dev/docs/reference/configuration
- 검증 상태: docs-confirmed + 실측(pnpm 12.23.0 워크스페이스에서 `turbo run build` 성공, 재실행 시 `FULL TURBO`)

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "lint": {},
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

- `$schema` URL 이 **`https://turborepo.dev/schema.json`** 이다(문서 v2.11.10 기준. 예전 `turbo.build` 도메인 아님).
- 루트 `package.json` 에 패키지 매니저 선언이 **필수**: 문서는 이제 `devEngines.packageManager` 를 앞세우고, top-level `packageManager` 는 "legacy, backwards compatibility" 로 지원.
- env: `envMode` 기본 `strict` (`env`/`globalEnv`/`passThroughEnv`/`globalPassThroughEnv` 에 적힌 변수만 task 에 전달). Vite 패키지는 framework inference 로 `VITE_*` 가 자동으로 `env` 에 포함된다(패키지 단위).
- remote cache 없이: 로그인/링크 없이 로컬 캐시로 동작함을 실측(`cache hit, replaying logs`, `FULL TURBO`). 캐시 디렉터리 경로는 확인하지 않았다. 텔레메트리 끄기: `TURBO_TELEMETRY_DISABLED=1` (실측에 사용).
- 호환: 릴리스 노트에 "Support pnpm v11 multi-document lockfiles", "Provision pnpm 12 native binaries", "Support pnpm v13 lockfiles" 항목이 있다.
- 관찰(실측): git 저장소가 아닌 상태에서 두 번째 실행은 cache miss, 세 번째 실행은 hit 였다. 첫 실행이 만든 `dist/` 가 입력 해시에 섞였기 때문이라는 것은 **추론**이다. `git init` + `.gitignore` 후에는 연속 hit.

---

## 4. Orval 8.49.0

- Context7 ID: `/orval-labs/orval/v8.48.0` (버전 고정)
- 선택 버전: **8.49.0** (2026-11-22), engines `node >=22.18.0`
- 문서 버전: v8.48.0
- 조회 주제: `defineConfig`, react-query + `httpClient`, mutator, v8 breaking, `formatter`, hooks
- 공식 문서: https://orval.dev/docs/reference/configuration/output , v8 안내 https://orval.dev/docs/versions/v8
- 검증 상태: docs-confirmed + 실측(생성 + `tsc` 7.0.2 타입체크 통과). 단, 실측한 설정에는 `hooks.afterAllFilesWrite` 가 **없었다**(hook 은 문서 근거만). 타입체크는 `skipLibCheck: true`, `@types/react` 미설치 상태에서 통과한 것이다.

```ts
// orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: { target: './openapi/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      mock: true,
      override: {
        mutator: { path: './src/api/http.ts', name: 'customFetch' },
      },
    },
    hooks: { afterAllFilesWrite: 'prettier --write' },
  },
});
```

```ts
// src/api/http.ts — fetch mutator. 생성 코드는 { data, status, headers } 를 기대한다(실측)
export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = [204, 205, 304].includes(res.status) ? null : await res.json();
  return { data, status: res.status, headers: res.headers } as T;
};
```

- v8 breaking: 완전 ESM, Node 22.18+, **기본 `httpClient` 가 `axios` → `fetch`**. axios 를 쓰려면 `httpClient: 'axios'` 를 명시.
- `output.client` 기본값은 `'axios-functions'` (문서).
- 포매터: `output.formatter: 'prettier' | 'biome' | 'oxfmt'` (하나만) 또는 `hooks.afterAllFilesWrite: 'prettier --write'`.
- **axios import 여부 (실측)**: `httpClient: 'fetch'` + mutator 로 생성한 결과에 `axios` import 가 **없다**. import 는 `@tanstack/react-query`, `../model`, mutator, `msw`, `@faker-js/faker` 뿐.
- **`mock: true` 는 `@faker-js/faker` 를 import 한다** → 생성 프로젝트 devDependencies 에 `@faker-js/faker` 가 필요하다(실측; 10.6.0 설치 후 타입체크 통과). 8.49.0 은 mock 을 `<tag>.faker.ts` 와 `<tag>.msw.ts` 로 나눠 만든다.
- 생성된 msw 핸들러는 `import { http, HttpResponse } from 'msw'` 를 쓴다. msw 3 루트 export 에 그대로 있어 호환된다(타입체크 통과). orval 릴리스 노트에 msw 3 지원을 명시한 항목은 찾지 못했다.
- **pnpm 영향**: orval 이 esbuild 를 끌어오므로 pnpm 11+/12 에서 `allowBuilds.esbuild` 가 없으면 install 실패(1절).

---

## 5. MSW 3.0.7 (v2 → v3 major)

- Context7 ID: `/mswjs/msw/v3.0.7` (버전 고정). "migration v2 to v3" 질의는 Context7 결과 없음 → GitHub 릴리스 노트와 패키지 내용(`npm pack`)으로 확인
- 선택 버전: **3.0.7**, v3.0.0 은 2026-09-28
- 조회 주제: v2→v3 migration(Context7 결과 없음), `setupWorker`/`worker.start`/`msw init --save`/`workerDirectory`, 패키지 exports·bin·scripts, Vite 플러그인 타입, `onUnhandledFrame`
- 공식 문서: https://mswjs.io/docs , 릴리스 https://github.com/mswjs/msw/releases/tag/v3.0.0
- 검증 상태: 릴리스 노트 + 패키지 타입 정의 확인 + 실측(`setupServer`, `msw init`)

### v3 breaking (릴리스 노트)

- ESM 전용. Node 22+ (18, 20 지원 중단). TypeScript 5.9+ (peer `typescript >=5.9.x`, optional).
- `msw/native` 제거 → `@msw/react-native`.
- `graphql` 은 `msw/graphql` 로 이동(optional peer).
- **`onUnhandledRequest` → `onUnhandledFrame`** 으로 이름 변경 (`'bypass' | 'warn' | 'error'` 또는 함수).
- `worker.stop()` 이 Promise 반환.
- `handleRequest()` 제거 → `defineNetwork()` (`msw/experimental`).
- Node 에서 cookie 를 관리하지 않음. 핸들러 안 `request.headers.get('cookie')` 는 항상 `null` → `cookies` 인자를 쓸 것.
- fake timer 용 `setTimeout` 패치 제거 → 지연 응답은 fake timer 를 직접 진행해야 함.
- WebSocket `connection` 이벤트 → `websocket:connection`.
- **package `postinstall` 제거**: v2(2.14.7, 2.15.0)에는 `postinstall` 이 있었고 3.0.7 에는 없다(npm view 비교). 따라서 install 시 `msw.workerDirectory` 로 worker 파일이 자동 갱신되지 않는다는 것은 **추론**이다(직접 비교 실측은 안 함).

### 새 기능

- **Vite 플러그인** `msw/vite` (peer `vite >=6`, optional): `plugins: [msw()]` 이후 `import('virtual:msw')` 의 `network.configure({ handlers })` / `network.enable()`. 개발 서버가 worker 스크립트를 서빙하므로 `public/mockServiceWorker.js` 가 필요 없다. `mode: 'worker-only'` 옵션 있음. 타입: `/// <reference types="msw/vite/client" />`. 근거는 `lib/vite/index.d.ts` JSDoc 이며 **실행은 안 해 봄**(미확인).
- `msw/http`, `msw/ws`, `msw/sse`, `msw/utils/*` 개별 entry.

### 기존 API (v3 에도 유지, 타입 확인 + 실측)

```ts
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
// main.tsx: if (import.meta.env.DEV) await worker.start({ onUnhandledFrame: 'bypass' });
```

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('/api/pets', () => HttpResponse.json([{ id: 1, name: 'a' }])),
];
```

```ts
// vitest setup (setupFiles)
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './src/mocks/handlers';

const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- 실측: `setupServer(...).listen({ onUnhandledFrame: 'error' })` 에서 매칭된 요청은 mock 응답, 매칭 안 된 요청은 `[MSW] Error: intercepted a request without a matching request handler` 후 `TypeError: fetch failed`. (vitest 안에서 돌린 것은 아니고 node 스크립트로 확인)
- 실측: `msw init public --save` → `public/mockServiceWorker.js` 생성, `package.json` 에 `"msw": { "workerDirectory": ["public"] }` 기록. `--save` 없이 비대화형으로 돌리면 저장 여부를 묻는 프롬프트가 뜨는 코드(`cli/init.js`)이므로 생성기는 `--save` 또는 `--no-save` 를 명시해야 한다.

---

## 6. Playwright 1.65.1

- Context7 ID: `/microsoft/playwright/v1.64.1` (버전 고정, 1.65 는 Context7 에 없음)
- 선택 버전: **@playwright/test 1.65.1** (2026-11-13), engines `node >=20`
- 문서 버전: v1.64.1 + GitHub 릴리스 노트 v1.65.0
- 조회 주제: `defineConfig` + `webServer`/`reuseExistingServer`/CI 옵션/`projects`, CI 브라우저 설치(`--with-deps`, `--only-shell`), 1.65 릴리스 노트
- 공식 문서: https://playwright.dev/docs/test-configuration , https://playwright.dev/docs/test-webserver
- 검증 상태: docs-confirmed (실행은 안 함)

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- 브라우저 설치: `npx playwright install --with-deps chromium` (문서). headless 만 쓰면 `--only-shell` 로 chromium-headless-shell 만 받을 수 있다.
- `webServer.port` 는 deprecated → `url` 사용. `wait` 옵션(stdout/stderr 정규식) 존재.
- 1.65 새 기능(릴리스 노트): Bun 실행 지원(`bunx --bun playwright test`), `failures` reporter, reporter `onlyFailures` 옵션, `-exclusive-` test lock, `test.skip('설명')` 처럼 description 만 넘기는 호출 형태 추가.
- 1.65 Notable Changes(동작 변경): TS class field 가 `useDefineForClassFields` 를 따름(생성자 parameter property 를 읽는 field initializer 가 깨짐), `inert` 요소 action 대기, 매칭 테스트가 없는 shard run 실패(`--pass-with-no-tests`), cookie 매칭 RFC 6265, proxy 자격 증명을 웹사이트로 보내지 않음.
- `reporter` 의 `['github']` 조합은 기존 Playwright 기능으로 알고 있으나 이번에 문서로 다시 확인하지는 않았다(미확인).

---

## 7. Docker (multi-stage + nginx)

- Context7: 해당 없음(Docker Hub API + 이미지 직접 검사)
- 출처: https://hub.docker.com/_/node , https://hub.docker.com/_/nginx , https://hub.docker.com/r/nginxinc/nginx-unprivileged (API: `https://hub.docker.com/v2/repositories/<repo>/tags/<tag>`), Node 릴리스 https://nodejs.org/dist/index.json , 이미지 config 는 `docker buildx imagetools inspect`
- 검증 상태: from API + 실측(이미지 실행, nginx 설정 동작 확인)

### 이미지 태그 (Docker Hub API, 2026-11-24 조회)

| 이미지 | 태그 | 내용 (실측) |
| --- | --- | --- |
| `node` | `26.13.1-alpine3.24` (= `26-alpine` = `lts-alpine`, digest `sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5`, 2026-11-11) | `NODE_VERSION=26.13.1` |
| `nginx` (공식) | `1.30.8-alpine` / `stable-alpine` (2026-11-23) | `NGINX_VERSION=1.30.8`, EXPOSE **80**, root 로 시작 |
| `nginxinc/nginx-unprivileged` | `1.30.6-alpine` / `stable-alpine` (2026-10-19, digest `sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03`) | `NGINX_VERSION=1.30.6`, EXPOSE **8080**, `User=101`, pid `/tmp/nginx.pid` |

- **unprivileged 이미지가 공식보다 늦다**: 공식 stable 1.30.8 (11-23), unprivileged stable 1.30.6 (10-19). Docker Hub 에 `nginxinc/nginx-unprivileged:1.30.8-alpine` 은 없다.
- Docker Hub API 조회 시점에 공식 `stable-alpine` digest(`8eb2b55...`)와 `1.30.8-alpine` digest(`6437a63...`)가 달랐다. 이미지 내부 `NGINX_VERSION` 은 둘 다 1.30.8 이었다(같은 날 재빌드로 보임, 원인 미확인). digest 고정이 필요하면 빌드 시점에 다시 조회할 것.
- 두 nginx alpine 이미지 모두 `/usr/bin/wget`(BusyBox)과 `/usr/bin/curl` 이 있다(실측). HEALTHCHECK 는 `wget -q --spider` 로 충분하다.

### 실측으로 동작 확인한 nginx 설정

```nginx
# default.conf (nginx-unprivileged, 8080)
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- 실측 결과: `/deep/link` → 200 + `Cache-Control: no-cache` (index.html 로 fallback), `/assets/app-abc123.js` → `public, max-age=31536000, immutable`, `/assets/missing.js` → 404, HEALTHCHECK 상태 `healthy`.
- 함정(실측): `expires 1y;` 와 `add_header Cache-Control ...` 를 같이 쓰면 **`Cache-Control` 헤더가 두 개** 나간다. `expires` 를 빼야 한다.

```dockerfile
# 실행 단계 (실측으로 검증한 부분)
FROM nginxinc/nginx-unprivileged:1.30.6-alpine
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
```

### 빌드 단계 실측 (node:26.13.1-alpine3.24 + pnpm 12.23.0)

```dockerfile
FROM node:26.13.1-alpine3.24 AS build
RUN npm install -g pnpm@12.23.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
```

- **`node:26-alpine` 에는 `corepack` 이 없다** (실측: `corepack: not found`). `corepack enable` 로 pnpm 을 켜는 예전 Dockerfile 패턴은 동작하지 않는다. 번들 npm 은 11.20.0.
- `npm install -g pnpm@12.23.0` 은 성공했고 musl 환경에서 `pnpm --version` = 12.23.0. npm 11.20.0 이 `pnpm@12.23.0 (preinstall/postinstall) ... not yet covered by allowScripts` **경고**를 냈지만 동작에는 문제가 없었다. scripts 가 실제로 실행됐는지는 확인하지 않았다.
- macOS 에서 만든 `pnpm-lock.yaml` + `allowBuilds: { esbuild: false }` 로 컨테이너 안 `pnpm install --frozen-lockfile` 성공.
- `COPY . .` 이후 `pnpm build` 와 dist 복사까지 묶은 전체 multi-stage 빌드는 실행하지 않았다(실행 단계는 위에서 별도 검증).

---

## 8. GitHub Actions

- Context7: `/pnpm/action-setup/v6.1.1` 는 존재하나 quota 소진으로 **미조회**. 나머지는 GitHub API·README·`action.yml`·소스 확인
- 검증 상태: from release notes/API (SHA 는 모두 `gh api` 로 직접 가져와 annotated tag 를 commit 까지 역참조)
- 출처(읽은 경로): `actions/setup-node` 의 `README.md`·`action.yml` (v7.1.0), `pnpm/action-setup` 의 `README.md`·`src/install-pnpm/run.ts` (v6.1.1), `github/codeql-action` 의 `README.md` (v4.39.4), `actions/starter-workflows` 의 `code-scanning/codeql.yml`, 각 저장소 GitHub releases. 웹 문서: https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning

| action | 최신 릴리스 | 게시일 | commit SHA (태그 역참조) |
| --- | --- | --- | --- |
| `actions/checkout` | v7.0.1 (`v7` 동일) | 2026-07-20 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v7.1.0 (`v7` 동일) | 2026-10-08 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `pnpm/action-setup` | v6.1.1 (`v6` 동일, annotated tag) | 2026-11-03 | `73e46992e05b19abd31f2f3c20e0e7370d762115` |
| `github/codeql-action` (init/analyze) | v4.39.4 (`v4` 동일) | 2026-11-20 | `1bd86f2fdb4b86187fa4059f16f31a3202acc9ea` |
| `actions/upload-artifact` | v7.0.2 (`v7` 동일) | 2026-10-07 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

- 주의: `gh api repos/github/codeql-action/releases/latest` 는 `codeql-bundle-v2.27.5` 를 돌려준다. action 버전은 `v4.x` 태그에서 찾아야 한다. v3 도 아직 지원(v3.39.4).
- checkout v7: `pull_request_target`/`workflow_run` 에서 fork PR checkout 차단, ESM 전환. setup-node v7: ESM, `NODE_AUTH_TOKEN` 더미 export 제거, `package-manager-cache` 입력, v7.1.0 에서 `mise.toml` 지원. upload-artifact v7: `archive: false` 로 단일 파일 비압축 업로드, ESM.
- setup-node 자동 캐시는 **npm 일 때만** (`packageManager`/`devEngines.packageManager` 가 npm). pnpm 은 `cache: pnpm` 을 명시해야 한다.
- **`pnpm/action-setup` 은 `packageManager` (및 `devEngines.packageManager`) 를 읽는다.** `version` 입력은 이 경우 생략 가능. 둘 다 있고 값이 다르면 `Multiple versions of pnpm specified` 에러로 실패한다(`src/install-pnpm/run.ts`). → `packageManager` 를 쓰면 `version` 을 넣지 말 것.
- `pnpm/action-setup` README: "This action supports pnpm v12 and earlier", pnpm 11+ 용으로 `pnpm/setup` (네이티브 바이너리 + 런타임 설치) 도 있다. `pnpm/setup` 의 버전/SHA 는 조회하지 않았다.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:
permissions:
  contents: read
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: pnpm/action-setup@73e46992e05b19abd31f2f3c20e0e7370d762115 # v6.1.1 (version 은 packageManager 에서)
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 26
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
```

```yaml
# .github/workflows/codeql.yml — actions/starter-workflows code-scanning/codeql.yml 기준
name: CodeQL
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  schedule: [{ cron: '0 3 * * 1' }]
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      packages: read
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: github/codeql-action/init@1bd86f2fdb4b86187fa4059f16f31a3202acc9ea # v4.39.4
        with:
          languages: javascript-typescript
          build-mode: none
      - uses: github/codeql-action/analyze@1bd86f2fdb4b86187fa4059f16f31a3202acc9ea # v4.39.4
        with:
          category: /language:javascript-typescript
```

- 권한: codeql-action README 는 "모든 advanced setup 은 `security-events: write`, private 저장소는 추가로 `contents: read`" 라고 한다. starter workflow 는 `packages: read`, `actions: read` 까지 넣는다. 최소는 `security-events: write` + `contents: read`.
- 인터프리터 언어는 `build-mode: none` 이어야 한다(README). 언어 ID `javascript-typescript` 는 starter workflow 가 matrix 로 주입하는 값이라 파일에 직접 없다 → 언어 ID 자체는 이번에 문서로 확인하지 못했다(미확인, 기존 지식).
- codeql-action README 는 SHA 고정보다 `@v4` 같은 major 태그 참조를 권장한다(서버 측 feature flag 때문). SHA 로 고정하면 Dependabot/Renovate 로 갱신할 것.

---

## 9. Renovate vs Dependabot — 커스텀 JSON 버전 파일 추적

- Context7: **미조회(quota 소진)**. Renovate 저장소 문서(`lib/modules/manager/custom/jsonata/readme.md`)와 소스(`auto-replace.ts`) 확인
- Renovate 최신: 44.259.0 (2026-11-24). Renovate 가 쓰는 `jsonata` 의존성: 2.2.1
- 공식 문서: https://docs.renovatebot.com/modules/manager/jsonata/ , https://docs.renovatebot.com/modules/manager/regex/
- 검증 상태: 문서 + 실측. `renovate@44.259.0` 의 `renovate-config-validator` 로 아래 두 설정(jsonata, regex) 모두 `Config validated successfully`. `renovate --platform=local --dry-run=extract` 로 두 manager 모두 `src/config/dependency-versions.json` 에서 `react`, `react-dom` 을 `datasource: npm` 으로 추출함을 확인. **실제 업데이트 PR(파일 교체) 은 실행하지 않음**

`src/config/dependency-versions.json` 형식 `{ "react": "19.3.1", "react-dom": "19.3.1", ... }`:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "customManagers": [
    {
      "customType": "jsonata",
      "fileFormat": "json",
      "managerFilePatterns": ["/^src/config/dependency-versions\\.json$/"],
      "matchStrings": [
        "$each($, function($v, $k) { { \"depName\": $k, \"currentValue\": $v } })"
      ],
      "datasourceTemplate": "npm"
    }
  ]
}
```

- JSONata 식 실측 결과: `[{"depName":"react","currentValue":"19.3.1"},{"depName":"react-dom","currentValue":"19.3.1"},{"depName":"@tanstack/react-query","currentValue":"5.99.0"}]`. 문서 예시(`$each(dependencies, function($v, $k) {...})`)와 같은 형태.
- 같은 버전 문자열이 여러 번 나오는 경우(react/react-dom 모두 19.3.1): jsonata 는 `replaceString` 이 없으므로 `currentValue` 를 파일에서 찾아 바꾼 뒤 `confirmIfDepUpdated` 로 다시 추출해 해당 dep 이 바뀌었는지 확인하고, 아니면 되돌리고 다음 위치를 시도한다(`auto-replace.ts` 소스 확인). 실제 PR 생성으로 검증하지는 않았다.
- 대안 (regex manager, 추출 결과에 `replaceString: "\"react\": \"19.0.0\""` 처럼 이름까지 포함돼 교체 위치가 명확 — 실측):

```json
{
  "customType": "regex",
  "managerFilePatterns": ["/^src/config/dependency-versions\\.json$/"],
  "matchStrings": ["\"(?<depName>[^\"]+)\"\\s*:\\s*\"(?<currentValue>[^\"]+)\""],
  "datasourceTemplate": "npm"
}
```

- `enabledManagers` 를 쓰면 `custom.jsonata` (또는 `custom.regex`) 를 추가해야 한다(문서).
- versioning 기본값은 `semver-coerced` (문서). 정확한 버전 문자열이 그대로 유지된다.
- Dependabot: 지원 ecosystem 의 manifest 만 다루고 임의 JSON 파일 추적 기능은 없다 — 이번에 문서로 다시 확인하지는 않았다(기존 지식, 미확인).
