# C. 품질 도구 조사 (create-produx-app 템플릿용)

조사일: 2026-11-24. 대상 스택: React 19.3.1, Vite 8.3.8, `@vitejs/plugin-react` 6.3.0, TypeScript 6.0.3.

## 0. 조사 방법과 출처 신뢰도

- Context7은 조사 도중 **월간 할당량이 소진**됐다(`Monthly quota exceeded`). 그래서 Tailwind, shadcn, lint-staged, prettier-plugin-tailwindcss는 Context7로 조회하지 못했다. 이 네 가지는 아래 순서로 대체했다.
  1. 해당 버전 태그의 GitHub 원문 문서
  2. npm tarball의 README·소스
  3. 실제 실행
- 실측은 `scratchpad/research/tmp-c/` 안의 임시 프로젝트에서 했다. 작업이 끝난 뒤 폴더는 삭제했다.
  - 실제로 실행한 것: `vitest run`, `eslint`, `prettier`, `tsc`, `vite build`, `shadcn info --json`, `shadcn add --dry-run`
  - **shadcn `init`은 실행하지 않았다.**
- 실측 환경은 **Node 24.14.0**이다. 이 버전은 jsdom 31.0.1의 engines 조건을 만족하지 않는다(아래 1번 참고). Vitest 결과는 지원 범위 밖의 Node에서 얻은 것이다.
- 검증 상태 표기:
  - `실측`: 직접 실행해서 확인했다.
  - `docs-confirmed`: Context7이나 공식 문서로 확인했다.
  - `README/changelog`: 패키지 README나 CHANGELOG에서 확인했다.
  - `소스 분석`: minify된 dist 코드를 읽고 추론했다. 실행은 하지 않았다.
  - `unconfirmed`: 확인하지 못했다.

### npm 레지스트리 기준 engines·peer 요약 (`npm view`, 실측)

| 패키지 | 버전 | engines.node | 주요 peer |
|---|---|---|---|
| vitest | 5.1.1 | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | vite `^6.4.0 \|\| ^7 \|\| ^8`, jsdom `*` |
| jsdom | 31.0.1 | **`^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`** | — |
| @testing-library/jest-dom | 8.0.0 | `>=22` | vitest `>=5 <6`(optional), @testing-library/dom `>=10 <11`(필수) |
| @testing-library/react | 16.3.3 | `>=18` | react/react-dom/@types `^18 \|\| ^19`, @testing-library/dom `^10` |
| @testing-library/user-event | 14.6.13 | `>=12` | @testing-library/dom `>=7.21.4` |
| eslint | 10.15.0 | `^20.19.0 \|\| ^22.13.0 \|\| >=24` | jiti `*`(TS config일 때만) |
| @eslint/js | 10.0.1 | 같음 | eslint `^10` |
| typescript-eslint | 8.74.0 | `^18.18 \|\| ^20.9 \|\| >=21.1` | eslint `^8.57 \|\| ^9 \|\| ^10`, **typescript `>=4.8.4 <6.1.0`** |
| eslint-plugin-react-hooks | 7.1.1 | `>=18` | eslint `… \|\| ^10` |
| eslint-plugin-react-refresh | 0.5.8 | — | eslint `^9 \|\| ^10` |
| @tanstack/eslint-plugin-query | 5.108.4 | — | eslint `… \|\| ^10`, typescript `^5.6 \|\| ^6 \|\| ^7` |
| prettier-plugin-tailwindcss | 0.8.1 | `>=20.19` | prettier `^3.0`(CHANGELOG상 0.8.0부터 실제로는 3.7 이상 필요) |
| lint-staged | 17.6.2 | **`>=22.22.1`** | — |
| husky | 9.1.7 | `>=18` | — |
| @tailwindcss/vite | 4.3.5 | — | vite `^5.2 \|\| ^6 \|\| ^7 \|\| ^8` |
| shadcn | 4.23.0 | `>=20.18.1` | — |

**템플릿의 실질 Node 하한은 `^22.22.2 || ^24.15.0 || >=26`이다.** jsdom이 가장 엄격하다. 이 범위를 `engines`나 `.nvmrc`에 그대로 쓰는 것을 권장한다. Node 24.14.0에서 npm은 `EBADENGINE` 경고만 내고 설치를 진행했고, 테스트도 통과했다. 다만 `engine-strict`를 켜면 설치가 실패한다.

---

## 1. Vitest 5.1.1

- Context7 ID: `/vitest-dev/vitest/v5.0.3`(버전 고정). 5.1.1 고정본은 없어서 v5.0.3 문서를 조회했다. 보조 자료로 GitHub `v5.1.1` 태그의 `docs/guide/migration/index.md`와 `docs/guide/cli.md` 원문을 읽었다.
- 조회 주제: v4에서 v5로의 마이그레이션, vite.config 안의 test 설정, setupFiles, globals, projects 상속, run과 watch의 차이
- 공식 문서: https://vitest.dev/guide/migration , https://vitest.dev/config/
- 확인된 설정(실측: `vitest run`에서 2개 테스트 통과, `tsc`로 vite.config.ts 타입체크 통과):

```ts
// vite.config.ts
/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- `resolve.alias`는 test 블록 밖, 최상위에 둔다. 테스트에서도 `@/` import가 그대로 해석된다(실측: `@/lib/greet` import 성공).
- `defineConfig`를 `vite`에서 가져올 때는 맨 위에 triple-slash reference가 필요하다. `vitest/config`의 `defineConfig`를 쓰면 필요 없다(docs-confirmed).
- `vitest`(인자 없음)는 개발 환경에서 watch 모드로 동작한다. CI이거나 TTY가 아닌 환경에서는 run 모드로 바뀐다. `vitest run`은 한 번 실행하고 끝낸다. lint-staged 같은 도구에서는 `--run`을 붙이라고 문서에 나와 있다(docs-confirmed, cli.md).
- `globals`는 기본값이 `false`다. `true`로 바꾸면 tsconfig의 `types`에 `vitest/globals`를 추가해야 한다(docs-confirmed).

**v4→v5 breaking changes 중 템플릿과 관련된 것** (출처: v5.1.1 migration 원문):
- 요구 사항: Vite `>=6.4.0`, Node `>=22.12.0`.
- `vite`는 더 이상 vitest의 직접 의존성이 아니라 필수 peer다. Yarn은 peer를 자동 설치하지 않으므로 `vite`를 직접 적어야 한다.
- **`clearMocks`의 기본값이 `true`로 바뀌었다.** 매 테스트 전에 mock 호출 기록이 지워진다(실측: 이전 테스트의 `vi.fn()` 호출 수가 다음 테스트에서 0이었다).
- **await하지 않은 비동기 assertion은 테스트를 실패시킨다.** `resolves`, `rejects`, `toMatchFileSnapshot`이 해당한다. v4는 경고만 냈다.
- inline `test.projects`가 루트 설정(plugins, `resolve.alias` 포함)을 기본으로 상속한다(`extends`의 기본값이 `true`). 배열 옵션(setupFiles 등)은 덮어쓰지 않고 이어 붙인다.
- 설정 파일을 상위 디렉터리에서 더 이상 찾지 않는다. 모노레포 하위에서 실행할 때는 `--config`를 명시해야 한다.
- 리포트와 산출물 경로가 `.vitest/`로 모였다. `.gitignore`에 `.vitest`를 한 줄 추가하면 된다. json과 junit reporter의 기본 출력이 stdout에서 파일로 바뀌었다.
- `test.sequential`과 `describe.sequential`이 제거됐다. 대신 `{ concurrent: false }`를 쓴다. `toThrow("")`는 이제 모든 메시지와 일치한다.
- 제거된 진입점: `vitest/coverage`, `vitest/reporters`, `vitest/environments`, `vitest/snapshot`, `vitest/runners`, `vitest/suite`, `vitest/mocker`.
- vitest가 더 이상 `@vitest/expect`에 의존하지 않는다. assertion 코드가 vitest에 번들된다. 그래서 `expect.extend`는 반드시 `vitest`에서 가져온 `expect`로 해야 한다. jest-dom 8이 나온 이유가 이것이다.
- 브라우저 모드의 `toHaveTextContent`가 완전 일치로 바뀌었다. **jsdom 환경의 jest-dom matcher와는 별개다.**

**Vite 8 관련 주의(실측)**: shadcn 문서 예시는 vite.config.ts에서 `__dirname`을 쓴다. 그대로 쓰면 Vite 8.3.8이 다음 경고를 낸다. `Your Vite config uses features that are unsupported by configLoader: 'native' … __dirname … Use import.meta.dirname instead`. `import.meta.dirname`으로 바꾸면 경고가 사라진다. 이 경우 `@types/node`가 필요하다.

검증 상태: 설정과 동작은 실측. breaking changes는 docs-confirmed(v5.1.1 원문).

---

## 2. @testing-library/jest-dom 8.0.0

- Context7 ID: `/testing-library/jest-dom`(고정 안 함). 고정본은 v6.9.1뿐이라 v8 정보는 없다. 보조 자료로 npm 8.0.0 README, `exports` 필드, GitHub v7.0.0/v7.0.1/v8.0.0 릴리스 노트를 확인했다.
- 공식 문서: https://github.com/testing-library/jest-dom#with-vitest
- 확인된 설정(실측):

```ts
// src/test/setup.ts  (vite.config의 test.setupFiles에 등록)
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

- TS 타입: setup 파일이 `.ts`이고 tsconfig `include` 범위 안에 있으면 `toHaveTextContent` 등의 타입이 잡힌다. `exports["./vitest"].types`가 `types/vitest.d.ts`를 가리키기 때문이다(실측: TS 6.0.3 `tsc`가 오류 0개, `compilerOptions.types`에 jest-dom을 넣지 않음). README는 `"types": ["vitest/globals", "@testing-library/jest-dom"]`를 상황에 따라 추가하라고 하는데, `globals: false`라면 필요 없다.
- breaking changes:
  - v7.0.0: `@testing-library/dom`이 **필수 peer**가 됐다. 최소 Node가 22가 됐다. `toContainAnyBy*`, `toContainOneBy*` matcher가 추가됐다.
  - v8.0.0: **vitest 5 미만 지원이 제거됐다**(README: "vitest 4 이하는 v7을 쓰라"). vitest peer는 optional로 표시돼 있다.
  - 진입점 `@testing-library/jest-dom/vitest`, `/matchers`, `/jest-globals`는 v6과 같다.

검증 상태: 실측 + README/changelog.

---

## 3. @testing-library/react 16.3.3, user-event 14.6.13, dom 10.4.2

- Context7 ID: `/testing-library/testing-library-docs`(고정 안 함). RTL 자체 ID `/testing-library/react-testing-library`에는 v16.3.3 고정본이 있지만 쿼리하지 않았다. 대신 16.3.3 `dist/index.js` 소스를 직접 확인했다.
- 공식 문서: https://testing-library.com/docs/react-testing-library/setup#auto-cleanup-in-vitest , https://testing-library.com/docs/user-event/intro
- 자동 cleanup은 전역 `afterEach`가 있을 때만 등록된다. 소스는 `if (typeof afterEach === 'function') afterEach(cleanup)`이다. `globals: false`이면 **setup 파일에서 직접 `afterEach(cleanup)`을 걸어야 한다.** 위 2번 snippet이 그 예다. 실측에서 이걸 빼자 두 번째 테스트에서 버튼이 2개 잡혀 실패했다.
- 같은 조건문에서 전역 `beforeAll`/`afterAll`이 있을 때만 `IS_REACT_ACT_ENVIRONMENT`를 설정한다. 하지만 `render`나 `act`를 호출하는 동안에는 `withGlobalActEnvironment`가 임시로 `true`로 바꾼다(소스 확인). 실측에서 act 경고는 없었다.
- user-event 권장 패턴은 `const user = userEvent.setup()`를 `render` 전에 테스트 안에서 호출하는 것이다. `before`/`after` 훅에서 setup하는 것은 권장하지 않는다(docs-confirmed).

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'

it('increments', async () => {
  const user = userEvent.setup()
  render(<Counter />)
  await user.click(screen.getByRole('button'))
  expect(screen.getByRole('button')).toHaveTextContent('1')
})
```

- `@testing-library/dom`은 RTL과 jest-dom 모두의 peer다. 패키지 매니저가 peer를 자동 설치하는지와 관계없이 devDependencies에 명시하는 편이 안전하다.

검증 상태: 실측 + 소스 + docs-confirmed.

---

## 4. ESLint 10.15.0 + @eslint/js 10.0.1 + typescript-eslint 8.74.0 + 플러그인

- Context7 ID:
  - `/eslint/eslint/v10.5.0`(고정, 10.15.0은 없음)
  - `/typescript-eslint/typescript-eslint/v8.72.1`(고정, 8.74.0은 없음)
  - `/arnaudbarre/eslint-plugin-react-refresh`(고정 안 함, 고정본은 v0.4.20뿐)
  - `/tanstack/query`(고정 안 함)
  - react-hooks와 globals는 Context7을 쓰지 않았다. tarball README와 런타임 export로 확인했다.
- 보조 자료:
  - GitHub `v10.15.0` 태그의 `docs/src/use/migrate-to-10.0.0.md`
  - react-refresh CHANGELOG
  - TanStack 문서 원문(`main`)
- 공식 문서: https://eslint.org/docs/latest/use/migrate-to-10.0.0 , https://typescript-eslint.io/packages/typescript-eslint/
- 확인된 설정(실측: ESLint 10.15.0과 TS 6.0.3에서 실행. TS 버전 경고 없음. react-hooks, react-refresh, query 규칙이 모두 적용됨):

```js
// eslint.config.js
import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage', '.vitest']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
      pluginQuery.configs['flat/recommended'],
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
```

**export 이름 실측 결과**:
- `eslint/config`: `defineConfig`, `globalIgnores`, `includeIgnoreFile`. ESLint 공식 예시가 이 형태를 쓴다(docs-confirmed).
- `typescript-eslint`의 `tseslint.config(...)`는 **deprecated**다. ESLint의 `defineConfig`로 옮기라고 안내한다(docs-confirmed). `configs`: `recommended`, `strict`, `stylistic`, `*TypeChecked` 등이 있다.
- `eslint-plugin-react-hooks` 7.1.1:
  - `configs`의 키는 `recommended`, `recommended-latest`, `flat`이다. `flat`의 키는 `recommended`, `recommended-latest`다.
  - **flat config에서는 `reactHooks.configs.flat.recommended`를 써야 한다.** `configs.recommended`는 legacy 형식이라 `plugins`가 배열이다. 넣으면 ESLint 10이 `A config object has a "plugins" key defined as an array of strings`라는 오류로 중단한다(실측).
  - `recommended-latest`는 `react-hooks/void-use-memo` 하나가 더 켜져 있다는 점만 다르다(실측 diff).
  - recommended에 React Compiler 계열 규칙이 포함된다(`set-state-in-effect`, `purity`, `refs`, `immutability` 등). 실측에서 `useEffect(() => { setN(1) }, [])`가 error로 걸렸다. 템플릿 예제 코드는 이 규칙들을 통과하는지 확인해야 한다.
- `eslint-plugin-react-refresh` 0.5.8:
  - 0.5.0부터 ESM 전용이고 ESLint 9 이상만 지원한다.
  - **권장 형태는 named export `{ reactRefresh }`이고, `configs.vite()`는 함수다.** default export(`reactRefresh.configs.vite`)는 이미 호출된 객체이고, 하위 호환용으로만 남아 있다. 두 형태를 섞으면 오류가 난다. 예: default import에서 `()`를 호출하는 경우.
  - `vite` preset은 `allowConstantExport: true`, `allowCompoundComponents: true`를 켠다(실측).
  - `customHOCs` 옵션 이름이 `extraHOCs`로 바뀌었다.
- `@tanstack/eslint-plugin-query`: `configs`의 키는 `recommended`, `recommendedStrict`, `flat/recommended`, `flat/recommended-strict`다. `flat/*`는 **배열**이다. 공식 예시는 `...spread` 형태이지만 `defineConfig`의 `extends`에 그대로 넣어도 동작했다(실측). `configs.recommended`(legacy)를 넣으면 react-hooks와 같은 plugins 배열 오류가 난다(실측).
- `globals` 17.14.0: `globals.browser`, `globals.node`, `globals.vitest`가 있다(실측).

**ESLint 10 breaking changes 중 템플릿과 관련된 것** (v10.15.0 태그 원문):
- Node `<20.19`, 21, 23 지원을 중단했다.
- **eslintrc 형식을 완전히 제거했다.** `ESLINT_USE_FLAT_CONFIG=false`가 더 이상 동작하지 않는다. `FlatESLint`/`LegacyESLint` API도 제거됐다.
- **설정 파일 탐색 방식이 바뀌었다.** 이제 각 lint 대상 파일의 디렉터리에서 위로 올라가며 `eslint.config.*`를 찾는다. v9의 `v10_config_lookup_from_file` 플래그가 기본 동작이 됐고, 그 플래그를 쓰면 오류가 난다. 모노레포에서 패키지마다 설정 파일을 두면 각 패키지 설정이 적용된다.
- `eslint:recommended`에 `no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`가 추가됐다.
- JSX 참조를 추적한다. JSX에서만 쓰는 import가 `no-unused-vars` 오탐을 일으키던 문제가 해결됐다.
- `/* eslint-env */` 주석이 오류로 보고된다.
- TS 설정 파일(`eslint.config.ts`)을 쓰려면 jiti `>=2.2.0`이 필요하다. `.js`를 쓰면 상관없다.
- core 설정에 `name` 속성이 추가됐다.

**eslint-config-prettier 10.1.8은 아직 필요한가**: 요청서에 "core 포매팅 규칙이 이미 제거됐다"는 전제가 있는데, 실측 결과 **사실이 아니다.** ESLint 10.15.0에도 `indent`, `semi`, `quotes`, `comma-dangle`, `max-len`, `no-mixed-spaces-and-tabs`, `no-extra-semi`가 deprecated 상태로 남아 있다. 다만 위 설정에서 실제로 켜지는 93개 규칙 가운데 eslint-config-prettier가 끄는 규칙은 **`no-unexpected-multiline` 하나뿐이다**(실측: `--print-config` 결과와 eslint-config-prettier가 끄는 358개 규칙의 교집합). eslint-config-prettier README는 이 규칙을 "작성 시 특별한 주의가 필요한 규칙"으로 분류한다.
- 판단(추정): 위 preset 조합이면 eslint-config-prettier는 **사실상 불필요하다.** stylistic 계열 preset을 추가할 때만 마지막에 `eslint-config-prettier/flat`을 넣으면 된다.

검증 상태: 설정과 export는 실측. breaking changes는 docs-confirmed.

---

## 5. Prettier 3.10.1 + prettier-plugin-tailwindcss 0.8.1

- Context7 ID:
  - `/prettier/prettier/3.9.10`(고정, 3.10.1은 없음)
  - `/prettier/eslint-config-prettier/v10.1.8`(고정)
  - prettier-plugin-tailwindcss는 조회하지 않았다(할당량 소진). 0.8.1 README와 CHANGELOG로 대체했다.
- 공식 문서: https://prettier.io/docs/configuration , https://github.com/tailwindlabs/prettier-plugin-tailwindcss
- 확인된 설정(실측: `flex bg-red-500 p-4 text-white`로 정렬됨. `cn(...)` 인자도 정렬됨):

```js
// prettier.config.js  (package.json에 "type": "module"이 있을 때)
/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
export default {
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/index.css',
  tailwindFunctions: ['cn', 'cva'],
}
```

- Tailwind v4에서는 **`tailwindStylesheet`가 필수다.** 경로는 prettier 설정 파일 기준으로 해석된다(README). v3용 옵션 `tailwindConfig`는 v4에서 쓰지 않는다.
- 이 플러그인은 다른 prettier 플러그인과 함께 쓸 때 **반드시 마지막에 로드해야 한다**(README).
- 0.8.0의 변경 사항: Prettier `>=3.7` 필요, top-level await 제거, `/sorter` 공개 API 추가. 0.5부터 ESM 전용이다.
- `.prettierignore`: Prettier 3의 `--ignore-path` 기본값은 `[.gitignore, .prettierignore]`다(실측: `prettier --help`). `.gitignore`에 있는 `dist`와 `node_modules`는 자동으로 제외되므로, `.prettierignore`에는 lockfile이나 생성 파일처럼 추가로 제외할 것만 적으면 된다. 예: `pnpm-lock.yaml`, `CHANGELOG.md`.

검증 상태: 실측 + README/changelog. Prettier 3.10.x에서 새로 생긴 옵션은 조사하지 않았다(unconfirmed).

---

## 6. husky 9.1.7 + lint-staged 17.6.2

- Context7 ID:
  - husky: `/typicode/husky/v9.1.7`(고정, 조회함)
  - lint-staged: 조회하지 못했다(할당량 소진). 17.6.2 README와 GitHub CHANGELOG로 대체했다.
- 공식 문서: https://typicode.github.io/husky/ , https://github.com/lint-staged/lint-staged
- husky 9.1.7 동작(`bin.js`와 `index.js` 소스 확인):
  - `husky init`이 하는 일:
    - `package.json`에 `"prepare": "husky"`를 쓴다.
    - `.husky/pre-commit`에 `<pm> test`를 쓴다. 기본은 `npm test`다.
    - `git config core.hooksPath .husky/_`를 실행한다.
  - 스캐폴더 입장에서는 `husky init`을 쓰지 말고 파일을 직접 쓰는 편이 낫다. `init`은 `npm test`를 써 넣기 때문이다.
  - **`.git`이 없으면 `prepare`가 실패하지 않는다.** `.git can't be found`를 출력하고 exit 0으로 끝나며 hook은 설치되지 않는다. 그래서 스캐폴더는 **`git init`을 install보다 먼저** 해야 한다. 아니면 git init 뒤에 `npx husky`를 다시 실행한다.
  - `HUSKY=0`이면 설치와 실행을 모두 건너뛴다. CI에서 쓰라고 문서가 권한다(docs-confirmed).
  - package.json이 git 루트가 아니면 `"prepare": "cd .. && husky frontend/.husky"` 형태를 쓴다(docs-confirmed).
  - v8 방식 hook 헤더(`#!/usr/bin/env sh` + `. "$(dirname -- "$0")/_/husky.sh"`)는 deprecated다. 코드 안의 안내문은 "v10에서 실패한다"고 적고 있다. hook 파일에는 명령만 적는다.

```sh
# .husky/pre-commit
npx lint-staged
```

```json
// package.json (일부)
{
  "scripts": { "prepare": "husky" },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": "prettier --write"
  }
}
```

- 위 lint-staged 설정 형태는 README 예시를 따른 것이고 직접 실행하지는 않았다(unconfirmed-run). pnpm을 쓰면 hook에 `pnpm exec lint-staged`를 쓸 수 있다. husky hook 런처가 `node_modules/.bin`을 PATH에 넣어 주므로 `lint-staged`라고만 써도 된다(소스 확인).
- lint-staged 설정 파일 형식(README):
  - `package.json#lint-staged`
  - `.lintstagedrc.json`
  - `.lintstagedrc.mjs`, `lint-staged.config.mjs`, `lint-staged.config.js`
  - TS 타입이 필요하면 `import { defineConfig } from 'lint-staged/config'`
- **lint-staged 16·17 breaking changes 및 주의점** (CHANGELOG):
  - 17.0.0:
    - **Node 22.22.1 이상**이 필요하다.
    - Git `>=2.32.0`을 검사한다.
    - **`yaml` 의존성이 optional이 됐다.** 확장자 없는 `.lintstagedrc`는 YAML로 취급되므로 `yaml`을 따로 설치해야 한다. JSON을 쓴다면 `.lintstagedrc.json`이나 package.json 키를 쓴다.
    - task 실행 뒤 `git add` 대신 `git update-index --again`을 쓴다.
  - 16.0.0: `--shell` 옵션을 제거했다. 셸 문법(`bash -c ...`)은 동작하지 않는다. 파일 인자 없이 실행하려면 함수 형태 `'*.ts': () => 'tsc --noEmit'`를 쓴다. Node 스크립트 task는 `node x.js`처럼 명시해야 한다.
  - 17.6.0: **task가 수정한 tracked 파일을 모두 stage한다.** 원래 stage하지 않은 파일과 glob에 맞지 않는 파일도 포함된다. 17.6.2에서는 `git commit <path>`처럼 pathspec을 줄 때 그 파일들로만 제한하도록 고쳤다. 원치 않으면 `--hide-unstaged`를 쓴다.
  - 모노레포: staged 파일마다 가장 가까운 설정 파일 하나만 적용된다. task는 그 설정 파일의 디렉터리에서 실행된다.
  - vitest를 lint-staged에 넣는다면 `vitest related --run`처럼 써야 한다(vitest cli 문서).

검증 상태: husky는 소스와 docs-confirmed. lint-staged는 README/changelog이고 hook은 실제로 돌려 보지 않았다.

---

## 7. Tailwind CSS 4.3.5 + @tailwindcss/vite 4.3.5

- Context7 ID: `/tailwindlabs/tailwindcss.com`. ID는 확인했지만 **쿼리는 할당량 소진으로 실패했다.** 대신 GitHub `tailwindlabs/tailwindcss.com`의 **`main` 브랜치**(버전 태그 없음) 문서를 읽었다:
  - `src/app/(docs)/docs/installation/(tabs)/using-vite/page.tsx`
  - `src/docs/dark-mode.mdx`
  - `src/docs/detecting-classes-in-source-files.mdx`
  - `src/docs/theme.mdx`
- 공식 문서: https://tailwindcss.com/docs/installation/using-vite
- 확인된 설정(실측: Vite 8.3.8에서 `vite build` 성공. `@source`로 지정한 경로의 클래스, `@theme` 토큰 `--color-brand`, `dark:` variant가 모두 CSS에 생성됨):

```css
/* src/index.css */
@import "tailwindcss";
@source "../../../packages/ui/src";   /* 모노레포 공유 패키지 예시. 경로는 이 CSS 파일 기준 */

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-brand: oklch(0.6 0.2 250);
}
```

- Vite 플러그인: `import tailwindcss from '@tailwindcss/vite'`를 `plugins: [tailwindcss()]`에 넣는다. PostCSS 설정은 필요 없다.
- 자동 소스 감지에서 제외되는 것: `.gitignore`에 있는 파일, `node_modules`, 바이너리, CSS 파일, lockfile. **기준 디렉터리는 현재 작업 디렉터리(cwd)다.** 모노레포에서 공유 패키지를 스캔하려면 `@source "<상대경로>"`를 쓴다. node_modules에 링크된 workspace 패키지도 기본으로는 제외된다. 기준 경로는 `@import "tailwindcss" source("../src")`로 바꿀 수 있고, `source(none)`과 `@source not`도 있다(문서 확인).
  - 실측은 `@source` 문법이 동작한다는 것만 확인했다. 앱 디렉터리 밖의 경로가 `@source` 없이는 빠진다는 것은 문서 근거만 있다.
- `@theme inline`: 다른 CSS 변수를 참조하는 토큰에 쓴다. shadcn이 이 방식을 쓴다.
- **dark variant가 두 가지로 쓰인다**:
  - Tailwind 문서: `@custom-variant dark (&:where(.dark, .dark *));` `.dark` 요소 자신도 포함하고 specificity는 0이다.
  - shadcn theming 문서와 init 결과: `@custom-variant dark (&:is(.dark *));` `.dark`의 자손에만 적용되고 specificity가 생긴다.
  - shadcn init이 CSS를 쓰므로, shadcn을 쓰는 템플릿에서는 shadcn 쪽 형태가 남는다(추정). 어느 쪽을 쓸지는 결정이 필요하다.

검증 상태: 실측(build) + 공식 문서(main 브랜치, 4.3.5 태그와 일치하는지 확인 안 함).

---

## 8. shadcn CLI 4.23.0

- Context7 ID: `/shadcn-ui/ui`. ID만 확인했다. 고정본은 `shadcn_4.21.0`까지 있다. **쿼리는 할당량 소진으로 하지 못했다.** 대신 아래 자료로 확인했다.
  - **`npx shadcn@4.23.0 --help`, `init --help`, `add --help`, `apply --help`, `preset --help`, `migrate --help`, `info --help`**(실측, 정답 기준)
  - GitHub 태그 `shadcn@4.23.0`의 `apps/v4/content/docs/(root)/{cli,components-json,monorepo,theming}.mdx`, `installation/vite.mdx`
  - npm tarball `shadcn@4.23.0`과 `@shadcn/registry@0.2.1`의 dist 소스(소스 분석)
  - `shadcn info --json`과 `add button --dry-run`을 직접 만든 fixture에 실행(실측)
  - init이 받아 오는 레지스트리 JSON: `https://ui.shadcn.com/init?...&template=vite`, `/r/styles/base-nova/{utils,font-geist}.json`(실측)
- 공식 문서: https://ui.shadcn.com/docs/cli , https://ui.shadcn.com/docs/components-json , https://ui.shadcn.com/docs/monorepo , https://ui.shadcn.com/docs/installation/vite

### 8.1 `init` 옵션 (실측 `--help`)
`-t, --template <next|start|vite|react-router|laravel|astro>`, `-b, --base <base|radix|aria>`, `--monorepo / --no-monorepo`, `-p, --preset [name]`, `-y, --yes`(**기본값 true**), `-d, --defaults`, `-f, --force`, `-c, --cwd`, `-n, --name`, `-s, --silent`, `--css-variables / --no-css-variables`(기본 true), `--rtl / --no-rtl`, `--pointer / --no-pointer`, `--reinstall / --no-reinstall`. `create`는 `init`의 alias다. `--style`과 `--base-color` 플래그는 없다. 스타일·색·아이콘·폰트는 preset으로 정한다.

### 8.2 비대화형 실행 조건 (소스 분석, 실행 안 함)
- 프롬프트가 뜨는지는 `--yes`가 아니라 **`--preset`, `--base`, `--defaults`**가 결정한다. `--yes`는 기본값이 이미 true이고, "components.json을 쓸까요?" 확인만 건너뛴다.
  - `--preset`도 컴포넌트 인자도 `--defaults`도 없으면 대화형 분기로 들어간다. template, base, preset을 차례로 묻는다.
  - `--base`가 없을 때 base 선택 프롬프트(`Base UI (Recommended)`, `React Aria`, `Radix UI`)는 preset이 아직 정해지지 않은 경우에만 뜬다. 이름이 있는 preset을 주면 base는 `"base"`로 자동 결정된다. 그래도 명시하는 것을 권장한다.
- `components.json`이 이미 있으면 두 프롬프트가 더 뜬다. 덮어쓰기 확인은 `--force`로 건너뛴다. 기존 컴포넌트 재설치 확인은 `--reinstall`이나 `--no-reinstall`로 건너뛴다.
- **`--defaults`를 주면 `-t`가 없을 때 template이 `next`가 된다.** Vite 프로젝트에서 쓰면 안 된다.
- **`-t <template>`을 주면 설치 목록에 `button` 컴포넌트가 자동으로 붙는다**(`Le()`의 `...c?["button"]:[]`). 기존 Vite 프로젝트에서 `-t vite`를 생략하면 붙지 않는다(추정).
- 모노레포 루트에서 `--monorepo` 없이 실행하고 루트가 지원 프레임워크로 인식되지 않으면, workspace 목록을 출력하고 exit 1로 끝난다.
- **이름이 있는 preset은 `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea` 여덟 가지다.** 이 밖에 preset 코드(예: `a2r6bw`)나 URL도 받는다.
  - **`--defaults` 도움말에 적힌 `--preset=base-nova`는 실제로는 유효하지 않은 이름이다.** `isPresetCode('base-nova') === false`이고 J 맵에도 없다(실측: 함수를 직접 호출). 그래서 `Invalid preset` 오류가 날 것으로 보인다(init은 실행 안 함).
  - 같은 태그의 문서는 `--preset=nova`로 적고 있다.
- 기존 Vite 프로젝트용 권장 명령(소스 분석으로 도출, 실행 안 함):
  `npx shadcn@4.23.0 init --preset nova --base radix --no-monorepo --no-reinstall --cwd <dir>`
  (Base UI를 쓰려면 `--base base`, 다시 실행할 때는 `--force`)
- init은 네트워크가 필요하다. 이름이 있는 preset을 `https://ui.shadcn.com/init?base=…&style=…&…`라는 URL로 바꿔서 레지스트리를 받아 온다.

### 8.3 Base UI와 Radix의 차이, styles, base colors (소스와 레지스트리 실측)
- base 값은 `radix`, `base`, `aria` 세 가지다. components.json의 `style`은 `<base>-<style>` 형식이다. 예: `base-nova`, `radix-nova`.
- 스타일(`PRESET_STYLES`): nova, vega, maia, lyra, mira, luma, sera, rhea
- baseColor(`PRESET_BASE_COLORS`): neutral, stone, zinc, **gray**, mauve, olive, mist, taupe. components-json 문서에는 gray가 빠져 있다.
- iconLibrary: lucide, hugeicons, tabler, phosphor, remixicon
- preset이 정하는 그 밖의 값: font(26종), radius, menuColor, menuAccent, theme, chartColor, fontHeading
- **init 레지스트리 응답(nova, vite, neutral 기준)**:
  - dependencies:
    - `shadcn@latest`(**런타임 dependency로 들어가고 버전이 latest라 고정되지 않음**)
    - `class-variance-authority`, `cn`, `tw-animate-css`, `lucide-react`
    - base에 따라 하나: **`@base-ui/react`(base)** 또는 **`radix-ui`(radix)**
  - registryDependencies: `utils`, `font-geist`(`@fontsource-variable/geist`)
  - css:
    - `@import "tw-animate-css"`
    - `@import "shadcn/tailwind.css"`
    - `@layer base { * { @apply border-border outline-ring/50 } body { @apply bg-background text-foreground } }`
    - `cssVars`는 theme, light, dark 세 묶음
  - config: `{"style":"base-nova","iconLibrary":"lucide","rtl":false,"menuColor":"default","menuAccent":"subtle", …}`
- **`lib/utils.ts`의 내용은 `export { cn } from "cn"` 한 줄이다.** clsx와 tailwind-merge 대신 shadcn이 만든 npm 패키지 `cn`(MIT)을 쓴다. `add button --dry-run --view`에서 button.tsx도 `import { cn } from "cn"`이었다. aliases.utils를 거치지 않는다.
- `shadcn/tailwind.css`는 shadcn 패키지가 export하는 CSS다. 안에 `data-open`, `data-checked` 같은 `@custom-variant`, accordion keyframes, `scroll-fade`와 `no-scrollbar` utility가 들어 있다. `shadcn eject`를 실행하면 이 CSS를 사용자 CSS에 인라인하고 shadcn 의존성을 제거한다.

### 8.4 components.json 스키마 (태그 문서 + 소스)
- 필드:
  - `$schema`(`https://ui.shadcn.com/schema.json`)
  - `style`: 초기화 뒤 변경 불가
  - `rsc`, `tsx`
  - `tailwind.config`: **v4에서는 `""`**
  - `tailwind.css`, `tailwind.baseColor`(변경 불가), `tailwind.cssVariables`(변경 불가), `tailwind.prefix`
  - `iconLibrary`, `rtl`, `menuColor`, `menuAccent`
  - `aliases.{components,ui,lib,hooks,utils}`
  - `registries`
- 문서와 코드가 어긋나는 곳. **코드(CLI)를 기준으로 삼는다**:
  - 문서에는 `"style": "new-york"`이 남아 있다(default는 deprecated). 실제로 init이 쓰는 값은 `base-nova`나 `radix-nova` 형식이다.
  - 문서의 baseColor 목록에 gray가 없다.
  - `--defaults` 설명이 문서는 `nova`, CLI 도움말은 `base-nova`다. 코드는 `J.nova`를 쓴다.
  - **Vite 설치 문서는 tsconfig에 `"baseUrl": "."`를 넣으라고 한다. TS 6.0.3에서는 이것이 `error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`이 돼서 `tsc`가 exit 2로 실패한다(실측).** `paths`만 쓰고 `baseUrl`은 빼야 한다. shadcn은 `baseUrl` 없이도 정상 동작했다(아래 8.5).

### 8.5 네 가지 오류의 발생 조건 (소스 분석 + `info`/`add --dry-run` 실측)
init preflight는 순서대로 다음을 검사한다.
1. framework 감지. cwd 바로 아래에 `vite.config.*`가 있으면 Vite로 본다. 없으면 `We could not detect a supported framework`로 exit 1.
2. `Validating Tailwind CSS.` 스피너
3. `Validating import alias.` 스피너

- **"Validating Tailwind CSS" 실패 → "No Tailwind CSS configuration found at <cwd>"**, 다음 중 하나일 때:
  - `package.json`의 dependencies나 devDependencies에 `tailwindcss`가 없다. 이러면 tailwindVersion이 null이 된다(fixture G에서 실측).
  - v4인데 CSS 파일을 찾지 못한다.
    - 탐색 범위: cwd 기준 `**/*.css`, `**/*.scss`, 깊이 5, 제외 목록 `node_modules`, `.next`, `public`, `dist`, `build`
    - **파일 내용에 `@import "tailwindcss"`, `@import 'tailwindcss'`, `@tailwind base` 중 하나가 글자 그대로 들어 있어야 한다.**
    - 실측: `@import url("tailwindcss");`는 감지되지 않았다(fixture F). `@import "tailwindcss" source("../");`는 감지됐다(fixture E).
    - 따라서 init 전에 CSS 파일이 이미 있어야 한다.
  - v3라면 `tailwind.config.*`와 CSS 파일이 둘 다 있어야 한다.
  - components.json에 `tailwind.config: ""`가 있으면 v4로 간주한다.
- **"Validating import alias" 실패 → "Could not find valid path aliases or package imports for init"**, 다음 조건일 때:
  - aliasPrefix가 null이다. 즉 tsconfig `paths`도 없고 `package.json#imports`도 없다(fixture C에서 실측: `importAlias: null`).
  - 감지 순서:
    1. tsconfig-paths의 `loadConfig(cwd)`로 루트 `tsconfig.json`의 paths를 읽는다(`extends`는 따라가고 `references`는 따라가지 않는다).
    2. paths가 비어 있으면 `tsconfig.json`, `tsconfig.web.json`, `tsconfig.app.json` 순서로 JSONC를 직접 파싱해서 `compilerOptions.paths`가 있는 첫 파일을 쓴다.
    3. 값이 `./*`, `./src/*`, `./app/*`, `./resources/js/*`인 key를 우선한다. 없으면 첫 key를 쓴다.
- **중요(실측)**: `paths`를 `tsconfig.app.json`에만 두고 루트 `tsconfig.json`은 solution-style(`files: []`, `references`)로 두는 경우를 따로 봤다(fixture B).
  - `info`의 alias 감지는 `@`로 **통과했다.**
  - 그런데 `add button --dry-run`의 대상 경로가 **`@/components/ui/button.tsx`라는 문자 그대로** 나왔다. 경로 해석에 실패한 것이다.
  - 같은 paths를 루트 `tsconfig.json`에도 둔 경우(fixture A)는 `src/components/ui/button.tsx`로 정상이었다.
  - 결론: **`paths`를 루트 `tsconfig.json`과 `tsconfig.app.json` 양쪽에 두되 `baseUrl`은 넣지 않는다.** 이 조합이 TS 6과 shadcn을 모두 만족시킨다(실측).
- 참고로 문서에는 `package.json#imports` 방식도 있다. 이 경우 `moduleResolution: "bundler"`와 `resolvePackageJsonImports: true`가 필요하다(문서만 확인, 실측 안 함).

### 8.6 `add` 옵션 (실측 `--help`)
`-y, --yes`(기본 **false**), `-o, --overwrite`, `-c, --cwd`, `-a, --all`, `-p, --path`, `-s, --silent`, `--dry-run`, `--diff [path]`, `--view [path]`. 예전의 `diff` 명령은 deprecated이고 `add --diff`로 바뀌었다. 비대화형으로 쓰려면 `add <c...> --yes --overwrite`(필요할 때 `-c <dir>`).

### 8.7 모노레포 지원 (태그 문서)
- `init --monorepo -t vite`를 실행하면 Turborepo 구조(`apps/web`, `packages/ui`)를 새로 만든다.
- workspace마다 `components.json`이 있어야 하고, 각 파일의 `style`, `iconLibrary`, `baseColor`가 같아야 한다.
- v4에서는 `tailwind.config`를 `""`로 둔다.
- 앱 쪽 aliases 예: `ui: "@workspace/ui/components"`, `utils: "@workspace/ui/lib/utils"`. 앱 쪽 `tailwind.css`는 `../../packages/ui/src/styles/globals.css`를 가리킨다.
- `add`는 `apps/web` 안에서 실행하거나 루트에서 `-c apps/web`으로 실행한다. ui 컴포넌트는 `packages/ui`에 설치된다.
- 공유 패키지는 `exports`로 경로를 노출한다. 예: `"./components/*": "./src/components/*.tsx"`. 패키지 내부 alias에는 `#...` package imports를 쓸 수 있다.

### 8.8 라이선스
GitHub `shadcn-ui/ui`의 LICENSE는 **MIT**다(태그 `shadcn@4.23.0`의 LICENSE.md, "Copyright (c) 2023 shadcn"). 저장소 전체 라이선스라서 레지스트리 컴포넌트 코드에도 적용된다고 보는 것이 일반적이다(추정). `cn` 패키지도 MIT다(npm 메타데이터). 재배포할 때는 MIT 고지문을 함께 넣으면 된다.

검증 상태: CLI 옵션은 실측. 비대화형 분기, 오류 조건, preset 이름은 소스 분석이고 일부는 함수 직접 호출과 `info`/`add --dry-run`으로 실측했다. init 결과물(파일 쓰기, 실제 설치되는 버전)은 **미실측**이다. 부모 에이전트가 init을 따로 돌린다.

---

## 9. 미확인·후속 확인이 필요한 항목

1. `shadcn init` 실제 실행 결과는 미실측이다. 특히 다음을 확인해야 한다.
   - `--preset nova --base radix`가 프롬프트 없이 끝나는지
   - `-t vite`를 줄 때 button이 추가되는지
   - `shadcn@latest`가 dependencies에 그대로 기록되는지
   - 쓰이는 CSS의 dark variant 형태
2. lint-staged와 husky hook을 실제 git commit으로 돌려 보지 않았다.
3. Tailwind 문서는 `main` 브랜치를 읽었다. 4.3.5 태그와 차이가 있는지는 확인하지 않았다.
4. Prettier 3.10에서 추가된 옵션이나 동작 변화는 조사하지 않았다.
5. Node 24.15 이상에서 Vitest와 jsdom 31 조합을 실행해 보지 않았다. 실측은 24.14.0에서 했고 engines 범위 밖이다.
