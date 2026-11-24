# A-cli: `create-produx-app` CLI 라이브러리 조사

- 조사일: 2026-11-24
- 실측 환경: macOS (darwin 25.6), Node **v24.14.0**. Node 26에서는 실행하지 않았다.
- 방법: Context7 문서 조회 → 각 패키지 정확한 버전을 scratchpad에 `npm install --ignore-scripts` → 설치된 `.d.ts`·소스 확인 → 작은 스크립트로 실측. 실측 후 임시 설치물은 삭제했다.

## 검증 라벨

| 라벨 | 의미 |
|---|---|
| **docs-confirmed** | Context7 문서에 있고, 설치된 버전의 `.d.ts`나 실측 결과와 맞음 |
| **installed-verified** | Context7에는 없거나 버전이 다름. 설치된 정확한 버전의 `.d.ts`/소스/실측으로 확인 |
| **changelog (gh)** | Context7 밖. `gh api`로 GitHub의 CHANGELOG/릴리스 노트에서 가져옴 |
| **not found in Context7 — from README** | 이번 조사에서는 해당 없음 |

## Node 최소 버전 산출

| 출처 | 요구 | 구분 |
|---|---|---|
| commander 15.1.0 `engines` | `>=22.12.0` | 런타임 (가장 높음) |
| execa 10.2.1 `engines` | `>=22` | 런타임 |
| @clack/prompts 1.9.0 `engines` | `>= 20.12.0` | 런타임 |
| zod 4.6.7 | `engines` 없음 | 런타임 |
| `fsPromises.cp` | 안정화 v22.3.0 (추가는 v16.7.0) | 런타임 |
| tsdown 0.23.7 `engines` | `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0` | **빌드 시에만** (devDependency) |

- **배포 CLI의 `engines.node` 권장: `">=22.12.0"`** (commander 때문).
- 기여자의 개발·빌드 환경은 tsdown 때문에 22.18+ / 24.11+ / 26+ 가 필요하다. Node 25는 tsdown 0.23에서 지원이 끊겼다.
- `fsPromises.mkdtempDisposable`은 v24.4.0에 추가되어 22.12 하한보다 높다. **권장하지 않는다.**

---

## 1. @clack/prompts

- **Context7 ID**: `/bombshell-dev/clack`. **버전 고정 안 됨.** 목록의 유일한 버전이 `__branch__v0`(0.x 브랜치)라서 쓰지 않았다. 고정하지 않은 ID는 `main` 브랜치의 `_autodocs/`를 돌려준다.
- **선택 버전**: 1.9.0 (`@clack/core` 1.6.0에 의존)
- **Context7 문서 버전**: 보고 없음 (main 브랜치)
- **조회 주제**: intro/outro/cancel, text/select/multiselect/confirm, group, isCancel, spinner 종료와 취소, v1 breaking changes
- **공식 문서**: https://bomb.sh/docs/clack/packages/prompts/ (설치된 JSDoc의 `@see`)
- **검증**: API 시그니처 → docs-confirmed + installed-verified(`dist/index.d.mts`). Breaking changes → changelog (gh). `group`·spinner 동작 → installed-verified(실측).

### 확인한 API (설치된 1.9.0 `.d.ts`)

```ts
// 모두 named export, ESM 전용 (dist/index.mjs)
intro(title?: string, opts?: CommonOptions): void
outro(message?: string, opts?: CommonOptions): void
cancel(message?: string, opts?: CommonOptions): void
text(opts: TextOptions): Promise<string | typeof CANCEL_SYMBOL>          // message, placeholder, defaultValue, initialValue, validate
select<V>(opts: SelectOptions<V>): Promise<V | typeof CANCEL_SYMBOL>    // message, options, initialValue, maxItems, showInstructions
multiselect<V>(opts: MultiSelectOptions<V>): Promise<V[] | typeof CANCEL_SYMBOL> // + initialValues, required, cursorAt
confirm(opts: ConfirmOptions): Promise<boolean | typeof CANCEL_SYMBOL>  // active, inactive, initialValue(기본 true), vertical
group<T>(prompts: PromptGroup<T>, opts?: { onCancel?: ({ results }) => void }): Promise<...>
isCancel(value: unknown): value is typeof CANCEL_SYMBOL                 // @clack/core에서 re-export
spinner(opts?: SpinnerOptions): { start, stop, cancel, error, message, clear, readonly isCancelled }
log.{ message, info, success, step, warn, warning, error }(message, opts?)
note(message?: string, title?: string, opts?: { format?: (line) => string })
interface CommonOptions { input?: Readable; output?: Writable; signal?: AbortSignal; withGuide?: boolean; accessible?: boolean }
```

`select` 옵션 타입: `value`가 원시값(string/number/boolean)이면 `label`은 선택이고, 객체이면 `label`이 필수다.

### 최소 예제 (JSDoc 예제와 `.d.ts` 시그니처만 사용)

```ts
import { intro, outro, text, select, confirm, isCancel, cancel, spinner } from '@clack/prompts';

intro('create-produx-app');

const name = await text({
  message: 'Project name?',
  placeholder: 'my-app',   // 화면 힌트일 뿐, 값이 아님
  defaultValue: 'my-app',  // 빈 입력일 때 이 값을 돌려줌
  validate: (v) => (!v || /^[a-z0-9-]+$/.test(v) ? undefined : 'lowercase, digits, dashes'),
});
if (isCancel(name)) { cancel('Operation cancelled.'); process.exit(1); }

const template = await select({
  message: 'Template',
  options: [{ value: 'react-vite-ts', label: 'React + Vite (TS)' }, { value: 'react-vite', label: 'React + Vite (JS)' }],
});
if (isCancel(template)) { cancel('Operation cancelled.'); process.exit(1); }

const s = spinner();
s.start('Copying template');
s.stop('Copied');     // 실패: s.error('...'), 취소: s.cancel('...')
outro('Done');
```

### 취소 처리 (실측, installed-verified)

- 각 prompt는 Ctrl+C·Esc·`signal` abort 때 **`CANCEL_SYMBOL`을 resolve**한다. throw하지 않는다. 그래서 반환값마다 `isCancel()`로 확인해야 한다.
- **`group()` 함정** (이미 abort된 `signal`로 실측):
  - `onCancel`이 없으면 취소 심볼이 결과 객체에 그대로 들어간다(`typeof r.name === 'symbol'`). 그리고 **다음 prompt를 계속 실행**한다. 반환 타입 `PromptGroupAwaitedReturn`은 symbol을 빼고 있어서 **타입이 실제 값과 다르다.**
  - `onCancel`이 있고 그냥 return하면 해당 필드에 **문자열 `"canceled"`**가 들어가고 다음 prompt를 계속 실행한다(실측: `onCancel` 2번 호출, `{"name":"canceled","ok":"canceled"}`).
  - → `onCancel` 안에서 `cancel(...); process.exit(…)` 하거나 throw해야 실제로 멈춘다. 소스(`group = async (o, r) => { for … if (onCancel && isCancel(n)) { t[e] = "canceled"; r.onCancel(...); continue } … }`)도 같은 내용이다.
- **spinner 중 Ctrl+C 함정** (macOS pty + Node 24.14 실측):
  - **프로세스가 exit code 0으로 끝났고 `onCancel`은 호출되지 않았다.** 화면에는 "Canceled"가 나온다.
  - 원인: `spinner.start()`가 `@clack/core`의 `block()`을 부르고, `block()`은 raw mode에서 cancel 키를 받으면 `process.exit(0)`을 호출한다(core `dist/index.mjs` 152행).
  - **Context7 문서(`_autodocs/errors.md`)와 다르다.** 문서는 "SIGINT → code 1, `isCancelled = true`, `onCancel` 호출"이라고 한다. SIGINT 신호를 직접 보낼 때만 맞는 설명으로 보인다(추정, 미검증).
  - 영향(추정): 설치 중 Ctrl+C를 누르면 CLI가 "성공(0)"으로 끝나고, 자식 프로세스 정리나 생성 중인 디렉터리 정리 코드가 돌지 않을 수 있다.

### Deprecated / breaking (changelog (gh), `packages/prompts/CHANGELOG.md`)

- **1.0.0**
  - **ESM 전용**이 되었다(0.x는 CJS+ESM 동시 배포).
  - spinner·progress의 `stop(msg, code)`가 **`stop()` / `cancel()` / `error()`로 나뉘었다.** `stop(undefined, 1)` → `cancel()`, `stop(undefined, 2)` → `error()`. 1.9.0 `.d.ts`의 `stop(msg?: string)`에는 code 인자가 없다.
  - `placeholder`가 탭으로 채울 수 있는 값이 아니라 **화면 힌트**로 바뀌었다. 빈 입력의 기본값은 `defaultValue`로 정한다.
  - 모든 prompt가 `signal`(AbortSignal), `input`/`output` 스트림, `withGuide`를 받는다.
  - `suggestion` prompt는 제거되었고 `path`는 autocomplete 기반으로 바뀌었다.
- 1.1.0: `picocolors` 대신 Node 내장 `util.styleText`를 쓴다.
- 1.3.0: `engines.node >= 20.12` 추가.
- 1.5.0: `validate`에 Standard Schema를 넘길 수 있다. zod 4 스키마를 직접 넘기는 것도 가능해 보이지만 실측하지 않았다.
- 1.6.0: `note()` 기본 포맷이 더 이상 dim이 아니다. 예전처럼 보이게 하려면 `format: (t) => styleText('dim', t)`.
- 1.8.0: `CANCEL_SYMBOL` export, 비동기 validate 지원.
- 1.8.1: prompt 반환 타입이 `symbol` 대신 `typeof CANCEL_SYMBOL`.
- 1.9.0: spinner 접근성 모드(`accessible` 옵션 / `ACCESSIBLE` env), `multiselect`가 readonly(`as const`) 옵션 배열을 받는다.

### 호환성 메모

- `isCI()` 결과를 spinner 렌더링에 쓴다(CI에서는 줄 단위로 출력).
- 테스트에서는 `input`/`output` 스트림을 주입하거나, 미리 abort한 `signal`로 취소 경로를 TTY 없이 테스트할 수 있다(실측).

---

## 2. commander

- **Context7 ID**: `/tj/commander.js/v15.0.0` (**고정했지만 15.0.0이다.** 15.1.0 문서는 목록에 없다.)
- **선택 버전**: 15.1.0
- **Context7 문서 버전**: v15.0.0 (`Readme.md`)
- **조회 주제**: negatable option, `--x`/`--no-x` 쌍, 기본값. 그 외 `.version`, `.exitOverride`, `parse(argv, {from})`, unknown option은 `.d.ts`와 실측으로 확인했다.
- **공식 문서**: https://github.com/tj/commander.js#readme
- **검증**: negatable → docs-confirmed. 나머지 → installed-verified(실측). Breaking changes → changelog (gh).

### 최소 예제 (실측에 쓴 코드)

```ts
import { Command, CommanderError } from 'commander'; // ESM 전용. 'commander/esm.mjs'는 v15에서 삭제됨

const program = new Command()
  .name('create-produx-app')
  .version('0.0.0')                        // -V, --version
  .argument('[project-dir]', 'target dir')
  .option('--no-install', 'skip install')  // 단독 --no-*: 기본값 true
  .option('--turbo', 'use turbo')
  .option('--no-turbo', 'no turbo')        // 쌍으로 정의: 기본값 없음(undefined)
  .option('-t, --template <name>', 'template', 'default')
  .exitOverride()                           // process.exit 대신 CommanderError를 throw
  .configureOutput({ writeOut: () => {}, writeErr: () => {} }); // 테스트에서 출력 숨김

try {
  program.parse(['app', '--no-install'], { from: 'user' }); // from: 'node' | 'electron' | 'user'
  const [dir] = program.args;             // 또는 program.processedArgs
  const opts = program.opts();            // { template, install, turbo? }
  program.getOptionValueSource('turbo');  // 'cli' | 'default' | undefined ...
} catch (e) {
  if (e instanceof CommanderError) { /* e.code, e.exitCode */ }
}
```

### 실측 결과 (commander 15.1.0, `from: 'user'`)

| argv | 결과 |
|---|---|
| `[]` | `opts {"template":"default","install":true}` (turbo 키 없음), `processedArgs [undefined]` |
| `['app','--no-install']` | `install:false` |
| `['app','--turbo']` | `turbo:true`, source `cli` |
| `['app','--no-turbo']` | `turbo:false`, source `cli` |
| `['app','--turbo','--no-turbo']` | 마지막 값이 이김 → `turbo:false` |
| `['app','--bogus']` | throw `commander.unknownOption`, exitCode 1, `error: unknown option '--bogus'` |
| `['a','b']` | throw `commander.excessArguments`, exitCode 1 ("too many arguments. Expected 1 argument but got 2: a, b.") |
| `['--version']` | throw `commander.version`, exitCode **0**, message `"0.0.0"` |
| `['--install']` | throw `commander.unknownOption`, `(Did you mean --no-install?)` |

- `--help`는 `exitOverride` 상태에서 `commander.helpDisplayed`(exitCode 0)를 throw한다. 에러 코드 목록은 `lib/command.js`에서 확인했다: `conflictingOption, error, excessArguments, executeSubCommandAsync, help, helpDisplayed, invalidArgument, missingArgument, missingMandatoryOptionValue, optionMissingArgument, unknownCommand, unknownOption, version`.
- 알 수 없는 옵션은 기본적으로 에러다. 허용하려면 `.allowUnknownOption()`. 남는 인자도 v13부터 기본 에러이고, 허용하려면 `.allowExcessArguments()`.

### Deprecated / breaking (changelog (gh), `CHANGELOG.md`)

- **15.0.0** (2026-05-29)
  - **ESM 전용**. `commander/esm.mjs` export 삭제. **Node ≥ 22.12.0** 필요.
  - ***Breaking:* 단독 `--no-*`만 기본값 `true`를 준다. 긍정·부정 옵션을 둘 다 정의하면(순서 무관) 기본값을 암묵적으로 정하지 않는다.** 위 실측과 같다(`turbo`는 `undefined`). → "플래그가 없으면 대화형으로 묻기"를 구현하기 좋다.
  - Commander 14는 2027년 5월까지 보안 업데이트를 받는다.
- 15.1.0: `cmd.storeOptionsAsProperties()`, `cmd.combineFlagAndOptionalValue()`가 deprecated 되었고 `InvalidOptionArgumentError`는 다시 deprecated가 아니게 되었다.
- 14.0.0: Node ≥ 20. 도움말 그룹(`.optionsGroup()`, `.helpGroup()`)과 이스케이프 없는 음수 인자 지원이 추가되었다.
- **13.0.0**
  - **남는 command-argument가 기본으로 에러**가 되었다(`allowExcessArguments` 기본 false).
  - `-ws` 같은 여러 글자 short flag는 throw한다. 13.1부터 `--ws, --workspace` 형태로 긴 플래그를 두 개 쓸 수 있다.
  - `.parse()`를 여러 번 호출할 수 있다(기본 설정에서). 테스트에서 `Command`를 새로 만드는 쪽이 여전히 단순하다.
- 타입이 있는 `opts()`가 필요하면 `@commander-js/extra-typings@15.1.0`을 쓴다(peer `commander ~15.1.0`, `npm view`로만 확인).

---

## 3. execa

- **Context7 ID**: `/sindresorhus/execa/v10.0.1` (**고정했지만 10.0.1이다.** 10.2.1 문서는 없다.)
- **선택 버전**: 10.2.1 (`engines.node >=22`, ESM 전용)
- **Context7 문서 버전**: v10.0.1 (`docs/api.md`, `docs/errors.md`, `docs/windows.md`, `docs/shell.md`)
- **조회 주제**: 배열 인자 실행, `cwd`, `stdio inherit`, `reject:false`, `exitCode`, Windows `.cmd` 처리
- **공식 문서**: https://github.com/sindresorhus/execa/blob/main/docs/api.md
- **검증**: docs-confirmed + installed-verified(실측). Breaking changes → changelog (gh, GitHub releases).

### 최소 예제 (실측에 쓴 코드)

```ts
import { execa, ExecaError } from 'execa';

// 배열 문법: 셸을 거치지 않음(shell 옵션 기본 false). cwd 지정
const r = await execa('npm', ['install'], { cwd: projectDir, stdio: 'inherit', reject: false });
if (r.failed) {
  // reject:false + 실패 → 반환값 자체가 ExecaError 인스턴스 (실측: r instanceof Error === true)
  // spawn 실패(ENOENT 등)면 r.exitCode === undefined, r.code === 'ENOENT'
  console.error(r.shortMessage, r.exitCode);
}

// 기본값(reject:true)이면 0이 아닌 종료는 throw
try { await execa('node', ['-e', 'process.exit(2)']); }
catch (e) { if (e instanceof ExecaError) e.exitCode; /* 2 */ }
```

### 실측 결과 (10.2.1)

| 경우 | 결과 |
|---|---|
| exit 3 + `reject:false` + `cwd:'/tmp'` | `{ exitCode: 3, failed: true, stdout: '/private/tmp' }`, 결과가 Error 인스턴스 |
| `stdio:'inherit'` | 터미널로 출력됨. `result.stdout === undefined` |
| 기본 reject | `ExecaError`, `exitCode 2`, `shortMessage "Command failed with exit code 2: node -e 'process.exit(2)'"` |
| 없는 명령 + `reject:false` | `exitCode: undefined`, `failed: true`, `code: 'ENOENT'` → **성공 여부는 `failed`로 판단** (`exitCode !== 0`으로 판단하면 놓침) |
| 반환값 | `execa(...) instanceof Promise === true`, `.nodeChildProcess`(object), `.pid`(number) |

- `stdout: ['pipe', 'inherit']`로 터미널에 출력하면서 값도 받을 수 있다(Context7 README 예제, 실측 안 함).
- Windows: `npm` 같은 `.cmd`도 **`shell: true` 없이** PATHEXT로 찾아 실행한다(docs-confirmed, `docs/windows.md`·`docs/shell.md`). v10에서는 `cross-spawn` 대신 `which-command` 의존성과 직접 구현한 cmd.exe 이스케이프를 쓴다(installed-verified, `lib/arguments/command-file.js`). CR/LF가 들어간 인자는 injection 방지를 위해 거부한다.

### Deprecated / breaking (changelog (gh), v10 릴리스 노트)

- **10.0.0**
  - **Node 22 필요.**
  - **subprocess가 `ChildProcess`가 아니라 일반 Promise**가 되었다. `.on()`, `.send()`, `.ref()`, `.unref()`는 `subprocess.nodeChildProcess`로 접근한다. 문서화된 execa 메서드와 속성은 그대로다.
  - **`execaCommand()` / `execaCommandSync()` 삭제.** template 문법이나 `parseCommandString()`을 쓴다.
  - 문서화되지 않은 `stdio: [..., 'ipc']` 삭제 → `ipc: true`.
  - `input`/`inputFile`과 inherit된 stdin을 함께 주면 이제 explicit input이 쓰인다.
  - 추가: `killDescendants` 옵션(자손 프로세스 종료), web stream 변환.
- 10.1.0 동작 변경: `extendEnv:false`만 주고 `env`가 없으면 `process.env`를 상속하지 않는다. Windows `.cmd`/`.bat` 인자 이스케이프가 바뀌었다(Rust 방식). 잘못된 stdio 값은 throw.
- 10.2.0 동작 변경: `maxBuffer`를 넘으면 subprocess를 `killSignal`로 종료한다(전에는 남겨 둔 채 pending 상태였음).
- 10.2.1: `exactOptionalPropertyTypes` 타입 호환성 수정.

---

## 4. tsdown

- **Context7 ID**: `/rolldown/tsdown/v0.23.0` (**고정했지만 0.23.0이다.** 0.23.7은 없다.)
- **선택 버전**: 0.23.7 (rolldown 1.3.3 사용, 실측 로그 기준)
- **Context7 문서 버전**: v0.23.0 (`skills/tsdown/references/*`, `docs/options/dependencies.md`, `docs/guide/faq.md`)
- **조회 주제**: Node CLI 설정, `platform`, shebang, 의존성 external 처리, 설정 파일 형식
- **공식 문서**: https://tsdown.dev (`.d.ts`의 `@see https://tsdown.dev/options/platform`)
- **검증**: CLI 설정 패턴과 `deps` 기본 동작 → docs-confirmed. shebang 유지와 chmod, 출력 확장자, `bin` 미작성 → installed-verified(실측 빌드와 소스). Breaking changes → changelog (gh, 릴리스 노트).

### 최소 설정 (실측 빌드 성공)

```ts
// tsdown.config.ts  (defineConfig는 'tsdown'에서 import)
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  platform: 'node',   // 기본값도 'node'
  format: 'esm',      // 기본값도 'esm'
})
```

```ts
// src/cli.ts — 첫 줄 shebang을 출력에서도 첫 줄로 유지함
#!/usr/bin/env node
import { Command } from 'commander';
```

```jsonc
// package.json — bin은 직접 써야 함. 출력 확장자는 .mjs
{
  "type": "module",
  "bin": { "create-produx-app": "./dist/cli.mjs" },
  "engines": { "node": ">=22.12.0" },
  "dependencies": { "commander": "15.1.0", "zod": "4.6.7" }
}
```

### 실측 결과 (0.23.7)

- 로그: `target: node22.12.0`(**`engines.node`에서 읽어 옴**), `Granting execute permission to dist/cli.mjs`.
- `dist/cli.mjs` 첫 줄이 `#!/usr/bin/env node`이고 파일 모드는 `-rwxr-xr-x`다. 소스의 `ShebangPlugin`이 `writeBundle`에서 shebang이 있는 entry chunk를 `chmod 0o755`한다.
- `commander`, `zod`(`dependencies`)는 `import ... from "commander"`로 **external 유지**. 로컬 `./helper.ts`는 인라인됨.
- **`package.json`은 수정되지 않았다.** 0.22 릴리스 노트에는 "shebang entry가 있으면 `bin` 필드를 자동으로 쓴다"고 되어 있지만, 이 옵션은 `exports.bin`이고 `exports`의 기본값이 `false`라서 꺼져 있다. → **`bin`은 직접 써야 하고 `./dist/cli.mjs`를 가리켜야 한다.**
- `fixedExtension` 기본값이 `platform === 'node'`일 때 `true`다 → `"type":"module"`이어도 출력은 **`.mjs`**다(`.d.ts` 확인 + 실측).

### 확인한 옵션과 기본값 (installed-verified, `dist/types-*.d.mts` `UserConfig`)

- `entry` 기본값 `{ index: 'src/index.ts' }`
- `platform` 기본값 `'node'`
- `format` 기본값 `'esm'`
- `outDir` 기본값 `'dist'`
- `clean` 기본값 `true`
- `minify` 기본값 `'dce-only'`
- `shims` 기본값 `false`. ESM에서 `__dirname` 같은 것을 쓸 때만 켠다. `import.meta.dirname`(Node 20.11+)을 쓰면 필요 없다.
- `target`이 없으면 `engines.node`를 쓰고, 그것도 없으면 문법 변환을 하지 않는다.
- `dts`는 자동 감지한다(`types` 필드나 tsconfig `declaration: true`이면 켜짐). CLI에는 필요 없으니 `declaration`을 켜 둔 tsconfig라면 `dts: false`.
- `banner` / `footer`(`ChunkAddon`), `outputOptions`도 있다. **banner로 shebang을 넣는 방식은 검증하지 않았다.** 확인된 방법은 소스 첫 줄에 shebang을 두는 것이다.
- 의존성:
  - 기본 동작(docs-confirmed): `dependencies`, `peerDependencies`, `optionalDependencies`는 external. `devDependencies`와 phantom deps는 import되면 번들한다.
  - 바꾸려면 `deps.neverBundle`(true면 전부 external), `deps.alwaysBundle`, `deps.onlyBundle`.

### Deprecated / breaking (changelog (gh))

- **0.23.0**
  - **Node 25 지원 중단** → `^22.18.0 || ^24.11.0 || >=26.0.0`.
  - tsup 호환 옵션 제거:
    - `bundle:false` → `unbundle:true`
    - `outExtension` → `outExtensions`
    - `publicDir` → `copy`
    - `removeNodeProtocol` → `nodeProtocol:'strip'`
  - `skipNodeModulesBundle` → `deps.neverBundle: true`, `deps.onlyAllowBundle` → `deps.onlyBundle`.
  - `resolveDepSubpath` 기본값이 `false`로 바뀜.
  - `dts.oxc`/`dts.tsgo` → `dts.generator`.
  - attw 기본 profile이 `esm-only`로 바뀜.
  - `build()`가 `{ bundles, watch }`를 반환.
- 0.22.0
  - Node < 22.18 지원 중단.
  - `unrun` 설정 로더를 더 이상 같이 주지 않는다. Node 22.18+는 native TS loader를 쓴다.
  - tsconfig `declaration:true`이면 dts가 자동으로 켜진다.
  - `exports.bin` 자동 감지가 추가되었지만 `exports`를 켰을 때만 동작한다.
- 0.22.3: Node 24.0–24.10 지원 중단.
- **0.21.0**
  - **`external` → `deps.neverBundle`, `noExternal` → `deps.alwaysBundle`.** 예전 이름은 0.23.7 `.d.ts`에서 `@deprecated`이고 경고가 나온다.
  - `failOnWarn` 기본값이 `'ci-only'`에서 `false`로 바뀜.
- `exe` 옵션(단일 실행 파일, `@tsdown/exe`)은 experimental이고 SemVer를 따르지 않는다. 이 프로젝트에는 필요 없다.

---

## 5. zod

- **Context7 ID**: `/colinhacks/zod/v4.6.7` (**정확히 고정됨**)
- **선택 버전**: 4.6.7
- **Context7 문서 버전**: v4.6.7 (`packages/docs/content/api.mdx`, `error-formatting.mdx`, `json-schema.mdx`)
- **조회 주제**: `z.strictObject`, `z.enum`, `.default`, `safeParse`, `z.prettifyError`/`treeifyError`/`flattenError`, refine/superRefine, `z.toJSONSchema`
- **공식 문서**: https://zod.dev
- **검증**: docs-confirmed + installed-verified(실측). deprecated 표시 → installed-verified(`v4/classic/*.d.ts`).

### 최소 예제 (실측에 쓴 코드)

```ts
import { z } from 'zod'; // 'zod' 루트가 v4 classic API

const Config = z.strictObject({                       // 모르는 키 → unrecognized_keys 이슈
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'lowercase, digits, dashes'),
  template: z.enum(['react-vite', 'react-vite-ts']).default('react-vite-ts'),
  install: z.boolean().default(true),
  turbo: z.boolean().optional(),
  packages: z.array(z.string()).default([]),
}).superRefine((v, ctx) => {
  if (v.turbo && v.packages.length === 0)
    ctx.addIssue({ code: 'custom', message: 'turbo needs packages', path: ['packages'] });
});

const r = Config.safeParse(input);
if (!r.success) console.error(z.prettifyError(r.error));
else r.data; // 기본값 적용됨

const jsonSchema = z.toJSONSchema(Config, { io: 'input' }); // 설정 파일용 스키마는 io:'input' 권장(아래 참고)
```

### 실측 출력 (4.6.7)

- `safeParse({ name: 'my-app' })` → `{"name":"my-app","template":"react-vite-ts","install":true,"packages":[]}`
- `safeParse({ name: 'My App', template: 'vue', extra: 1 })` → `z.prettifyError`:
  ```
  ✖ Unrecognized key: "extra"
  ✖ lowercase, digits, dashes
    → at name
  ✖ Invalid option: expected one of "react-vite"|"react-vite-ts"
    → at template
  ```
- `superRefine`은 **멈추지 않는(continuable) 이슈가 있어도 실행된다.** `{ name: 'BAD', turbo: true }` → 이슈 코드 `['invalid_format', 'custom']`. 타입 오류처럼 멈추는 이슈가 있으면 refine은 실행되지 않는다(docs-confirmed, "Refinements do not run if non-continuable type issues are encountered"). 실행 시점을 직접 정하려면 `when` 옵션, 바로 멈추게 하려면 `abort: true`.
- `z.toJSONSchema`
  - `.superRefine()`/`.refine()`이 붙은 스키마도 **기본 옵션으로 throw하지 않는다.** refine 로직은 스키마에서 빠지고 구조만 나온다.
  - 기본 target은 draft-2020-12이고 `"additionalProperties": false`가 들어간다(strictObject).
  - **기본값(`io: 'output'`)에서는 `.default()` 필드가 `required`에 들어간다.** `io: 'input'`으로 하면 `required`에서 빠진다. → 사용자가 직접 쓰는 설정 파일의 JSON Schema에는 `io: 'input'`.
  - 옵션: `target: 'draft-2020-12'|'draft-07'|'draft-04'|'openapi-3.0'`, `unrepresentable: 'throw'(기본)|'any'|fn`, `cycles`, `reused`, `metadata`.
- `z.object()`는 모르는 키를 **조용히 제거**한다(`{a:'x', b:1}` → `{a:'x'}`). 거부하려면 반드시 `z.strictObject`를 쓴다.

### Deprecated (installed-verified, 4.6.7 `.d.ts`)

- `ZodError#format()`, `#flatten()` → `@deprecated`. 대신 `z.treeifyError(err)`, `z.flattenError(err)`, `z.prettifyError(err)`.
- `z.nativeEnum()` → `@deprecated`, `z.enum()`이 TS enum도 받는다.
- `.passthrough()` → `@deprecated`, `z.looseObject()` / `.loose()`를 쓴다.
- `.merge()` → `@deprecated`, `A.extend(B.shape)`를 쓴다.
- `.strict()`는 deprecated가 아니다. 주석은 "Consider `z.strictObject(A.shape)` instead".
- **`.superRefine()`에는 `@deprecated` 표시가 없다**(4.6.7 `schemas.d.ts` 42행). `.check()`도 쓸 수 있다.

---

## 6. Node.js `fs/promises`

- **Context7 ID**: `/nodejs/node/v26.0.0` (**v26.0.0으로 고정**)
- **Context7 문서 버전**: v26.0.0 (`doc/api/fs.md`)
- **조회 주제**: `fsPromises.cp` 옵션, `mkdtemp`, `mkdtempDisposable`
- 버전 이력(YAML `added`/`changes`)은 `raw.githubusercontent.com/nodejs/node/v26.0.0/doc/api/fs.md`를 직접 받아 확인했다(Context7 밖).
- **공식 문서**: https://nodejs.org/api/fs.html
- **검증**: 옵션 의미 → docs-confirmed. 버전 이력 → GitHub raw doc. 동작 → installed-verified(Node 24.14 실측, Node 26은 미실행).

| API | 추가 | 비고 |
|---|---|---|
| `fsPromises.cp(src, dest, opts)` | v16.7.0 | **v22.3.0에서 안정화(no longer experimental)**. `mode`는 v20.1/v18.17, `verbatimSymlinks`는 v17.6/v16.15 |
| `fsPromises.mkdtemp(prefix)` | v10.0.0 | prefix에 Buffer/URL 허용은 이후 추가 |
| `fsPromises.mkdtempDisposable(prefix)` | **v24.4.0** | 하한(22.12)보다 높음 → 권장 안 함 |
| `fsPromises.realpath(path)` | v10.0.0 | |
| `fsPromises.lstat(path)` | v10.0.0 | `Stats#isSymbolicLink()` |

`cp` 옵션 기본값(docs-confirmed):
- `recursive:false`
- `force:true`(덮어씀)
- `errorOnExist:false`. `force:false`일 때만 의미가 있다.
- `filter(src, dest) => boolean | Promise<boolean>`. 디렉터리를 false로 거르면 그 안의 내용도 모두 건너뛴다.
- `dereference:false`
- `verbatimSymlinks:false`
- `preserveTimestamps:false`

### 최소 예제 (실측에 쓴 코드)

```ts
import { cp, mkdtemp, realpath, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

const tmp = await realpath(await mkdtemp(join(tmpdir(), 'cpx-'))); // prefix 끝에 6글자가 붙음
await cp(templateDir, targetDir, {
  recursive: true,
  force: false, errorOnExist: true,           // 기존 파일이 있으면 ERR_FS_CP_EEXIST
  filter: (src) => !src.includes(`${sep}node_modules`),
});
const st = await lstat(p); st.isSymbolicLink();
```

### 실측 결과 (Node 24.14, macOS)

- `mkdtemp(join(tmpdir(),'cpx-'))` → `/var/folders/.../T/cpx-YuDb59`이고 `realpath` 결과는 `/private/var/folders/...`. **macOS에서 tmpdir은 symlink 경로다.** 테스트에서 경로를 비교할 때는 `realpath`로 정규화해야 한다.
- `filter`는 **루트 `src` 자신**에도 호출된다(`['/src','/src/link-rel','/src/node_modules','/src/a.txt']`). 루트에 false를 돌려주면 아무것도 복사하지 않는다.
- **상대 symlink가 절대 경로로 바뀐다.** `verbatimSymlinks:false`(기본)이면 `link-rel -> a.txt`가 복사본에서 `-> /var/folders/.../src/a.txt`(**원본 쪽 절대 경로**)가 된다. `verbatimSymlinks:true`이면 `a.txt` 그대로 유지된다. 템플릿을 복사하는 scaffolder라면 symlink가 npx 캐시를 가리키게 될 수 있다. → symlink를 거부하거나(`lstat().isSymbolicLink()`) `verbatimSymlinks:true`.
- `force:false`(`errorOnExist` 없이)이면 기존 파일을 **조용히 건너뛴다**(에러 없음, 덮어쓰지 않음).
- `force:false, errorOnExist:true` → `ERR_FS_CP_EEXIST`.
- 자기 하위 디렉터리로 복사하면 `ERR_FS_CP_EINVAL`.
- 디렉터리를 `recursive` 없이 복사하면 `ERR_FS_EISDIR`.

---

## 확인하지 못했거나 불일치한 것

1. **clack spinner Ctrl+C**: Context7 문서는 code 1과 `onCancel` 호출이라고 하지만, 실측(macOS pty)에서는 exit 0이었고 `onCancel`도 호출되지 않았다. Linux/Windows 터미널과 외부 SIGINT(`kill -INT`)는 테스트하지 않았다.
2. clack `validate`에 zod 4 스키마(Standard Schema)를 직접 넘기는 것은 실측하지 않았다.
3. tsdown `banner`로 shebang을 넣는 방식은 검증하지 않았다(소스 첫 줄 shebang만 확인).
4. Node 26.x에서 직접 실행한 결과는 없다(문서는 v26.0.0, 실측은 v24.14.0).
5. Context7 문서 버전이 설치 버전과 다르다: commander 15.0.0(설치 15.1.0), execa 10.0.1(10.2.1), tsdown 0.23.0(0.23.7), clack은 main 브랜치(버전 미표시). 차이는 CHANGELOG와 설치된 `.d.ts`로 보완했다.
