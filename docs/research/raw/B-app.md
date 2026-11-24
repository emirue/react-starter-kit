# B. 앱 라이브러리 조사 (React 19.3 + Vite 8 + TS SPA 템플릿용)

조사일: 2026-11-24

## 공통 검증 방법과 한계

- 버전은 `npm view <pkg> version dist-tags`로 확인했다. 아래 "선택 버전"은 모두 npm `latest` 태그다.
- 각 패키지를 `scratchpad/research/tmp-b/`에 설치하고, 아래 스니펫을 **실제로 `tsc` 7.0.2(strict, `moduleResolution: bundler`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`)로 타입 검사했고 `vite build` 8.3.8 + `@vitejs/plugin-react` 6.3.0으로 빌드**했다. 함께 쓴 버전은 react/react-dom 19.3.1, @types/react 19.3.0, Node 24.14.0이다.
- **브라우저 런타임 실행은 하지 않았다.** 아래 "검증 상태"의 "tsc+build"는 타입과 번들만 확인했다는 뜻이다.
- 반대 검증도 했다. 실패해야 하는 코드(`useReactTable` import, sorting feature 없이 `getToggleSortingHandler` 호출, `.default()` 스키마에 generic 1개만 준 `useForm`)는 의도대로 tsc 에러가 났다. 타입 검사가 느슨하게 통과한 것이 아니다.
- Context7은 마지막 조회(zod)에서 월간 한도가 소진됐다. zod는 설치한 패키지의 `.d.ts`로 대신 확인했다.
- Context7에 고정(pinned)된 버전은 대부분 대상 버전보다 오래됐다. 라이브러리별로 차이를 적었다.

---

## 1. react-router 8.5.2 (새 메이저)

| 항목 | 내용 |
|---|---|
| Context7 ID | `/remix-run/react-router` (고정 안 함. 목록에 7.9.4까지만 있어서 기본(main) 브랜치로 조회), 보조로 `/websites/reactrouter` |
| 선택 버전 | 8.5.2 |
| Context7 문서 버전 | main 브랜치(v8 CHANGELOG와 `docs/upgrading/v7.md`가 들어 있음). `/websites/reactrouter`는 v7 시절 future flag 문서만 반환함 |
| 조회 주제 | v7→v8 breaking change와 제거된 API, 최소 버전, data mode(`createBrowserRouter`), 중첩 라우트와 `Outlet`, `ErrorBoundary`/`errorElement`, `lazy`, catch-all |
| 공식 문서 | https://reactrouter.com , 업그레이드 가이드는 https://reactrouter.com/upgrading/v7 |
| 보조 근거 | 설치된 패키지의 `CHANGELOG.md`(v8.0.0~v8.5.2), 패키지에 들어 있는 `docs/`, `dist/production/*.d.ts` |

### v7→v8 breaking change (CHANGELOG v8.0.0, 패키지 내장본 직접 확인)

- **`react-router-dom` 패키지 제거.** npm의 `react-router-dom` latest는 7.18.6이고 8.x는 없다. 템플릿에 `react-router-dom`을 넣으면 안 된다.
  - `RouterProvider`와 `HydratedRouter`는 `react-router/dom`에서, 나머지는 모두 `react-router`에서 import한다.
- 최소 버전: **Node 22.22.0+**, **React/ReactDOM 19.2.7+**, Framework mode는 Vite 7+. 설치본 `engines`는 `{"node":">=22.22.0"}`이고 peer는 `react >=19.2.7`, `react-dom >=19.2.7`, `@types/react >=19.2.0`(optional)이다.
- **ESM 전용** 패키지가 됐고, 빌드 대상이 ES2022다.
- `future.v8_*` flag가 모두 제거되고 기본 동작이 됐다(middleware 항상 활성, pass-through request, trailing-slash-aware data request, Vite Environment API). `v8_splitRouteModules`는 최상위 `splitRouteModules` 설정으로 옮겨졌고 기본값이 `true`다. 이 내용은 Framework mode 설정에만 해당한다.
  - Data mode에 남은 `FutureConfig`는 `unstable_customRouteDiscovery`와 `unstable_routePatternMatching`뿐이다.
- `meta`/`useMatches()`의 `data` 필드가 제거됐다. `loaderData`를 쓴다.
- `RouteObject`의 `hasErrorBoundary`가 제거됐다(내부 필드였다).
- middleware가 항상 켜져 있어서 loader/action의 `context`는 항상 `RouterContextProvider` 인스턴스다. Data mode에서 `interface Future { v8_middleware: true }` module augmentation은 더 이상 필요 없다.
- **v8.5.0 deprecation:** `viewTransition` prop/option, `useViewTransitionState`, `NavLink`의 `isTransitioning` render prop과 `transitioning` class가 deprecated됐다. React 19.3의 `<ViewTransition>`을 쓰라고 안내한다. 동작은 아직 남아 있다.
- 모드는 여전히 세 가지다(Declarative, Data, Framework). 패키지 내장 `docs/start/modes.md`와 업그레이드 가이드의 `[MODES: framework, data, declarative]` 표기로 확인했다.

### `RouterProvider` import 경로

`react-router`와 `react-router/dom` 둘 다 `RouterProvider`를 export한다(`index.d.ts`와 `dom-export.d.ts`로 확인). `react-router/dom` 버전은 `Omit<RouterProviderProps, "flushSync">` 타입이고 내부에서 `ReactDOM.flushSync`를 연결한다. v8에 포함된 `docs/start/data/installation.md`와 CHANGELOG는 **`react-router/dom`** 사용을 권장한다. Context7의 `modes.md` 예시는 `react-router`에서 import하지만, 템플릿은 `react-router/dom`을 쓴다.

### 순수 클라이언트 SPA(Data mode, Vite 플러그인 없음): tsc+build 통과

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  NavLink,
  Outlet,
  useRouteError,
  useSearchParams,
} from 'react-router'
import { RouterProvider } from 'react-router/dom'

function RootLayout() {
  return (
    <>
      <nav>
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : undefined)}>
          Home
        </NavLink>
        <NavLink to="/users">Users</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  )
}

// Data mode의 ErrorBoundary는 props를 받지 않는다. useRouteError()로 읽는다.
function RootErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error)) {
    return <h1>{error.status} {error.statusText}</h1>
  }
  return <h1>{error instanceof Error ? error.message : 'Unknown error'}</h1>
}

function Home() {
  return <h1>Home</h1>
}

function NotFound() {
  return (
    <>
      <h1>404</h1>
      <Link to="/">Go home</Link>
    </>
  )
}

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  return (
    <input
      value={q}
      onChange={(e) =>
        setSearchParams((prev) => {
          prev.set('q', e.target.value)
          return prev
        }, { replace: true })
      }
    />
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary, // errorElement: <X /> 와 상호 배타
    children: [
      { index: true, Component: Home },
      {
        path: 'users',
        // 객체형 lazy: 속성별로 분할한다
        lazy: { Component: async () => (await import('./users')).UsersPage },
      },
      {
        path: 'settings',
        // 함수형 lazy: route 속성 객체를 반환한다
        lazy: async () => {
          const { UsersPage } = await import('./users')
          return { Component: UsersPage }
        },
      },
      { path: '*', Component: NotFound }, // 404 catch-all
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

빌드 결과 `users-*.js`가 별도 청크로 분리됐다.

- `BaseRouteObject` 타입(`lib/router/utils.d.ts`)에서 확인한 사항이다. `Component`와 `element`는 상호 배타이고, `ErrorBoundary`와 `errorElement`도 상호 배타다. `lazy`는 함수형과 객체형을 모두 받고, lazy로 바꿀 수 없는 키는 `path`, `index`, `children`, `id`, `caseSensitive`, `unstable_validateParams`다.
- v8.5.1부터 실패한 `lazy` import를 영구 캐시하지 않고 재시도한다. 또 loader가 없는 route에서 `lazy.Component` import가 실패하면 가장 가까운 error boundary로 전파한다.

**검증 상태:** docs-confirmed + from changelog + tsc+build(런타임 미실행)

---

## 2. @tanstack/react-router 1.170.46 + @tanstack/router-plugin 1.169.0 (+ @tanstack/router-cli 1.168.0)

| 항목 | 내용 |
|---|---|
| Context7 ID | `/tanstack/router` (고정 안 함. 목록 최신 고정본이 v1.139.3이라 대상보다 오래됨) |
| 선택 버전 | react-router 1.170.46, router-plugin 1.169.0, router-cli 1.168.0 |
| Context7 문서 버전 | main 브랜치(`packages/*/skills/*/SKILL.md`와 `docs/router/*` 포함) |
| 조회 주제 | Vite 플러그인 이름, import 경로와 순서, `autoCodeSplitting`, 루트 route와 `notFoundComponent`/`errorComponent`, `validateSearch`(zod v4), `Register`, CLI `tsr generate`, `routeTree.gen.ts` 커밋 여부 |
| 공식 문서 | https://tanstack.com/router/latest/docs/framework/react/overview |

### 확인한 API

- 플러그인: `import { tanstackRouter } from '@tanstack/router-plugin/vite'`, 호출은 `tanstackRouter({ target: 'react', autoCodeSplitting: true })`.
- **플러그인 순서: `react()`보다 반드시 앞에 둔다.** 문서는 순서가 틀리면 "route 생성과 code splitting이 조용히 실패한다"고 경고한다. 틀린 순서를 직접 재현하지는 않았다.
- 플러그인 peer는 `vite >=6.0.0`, `@tanstack/react-router ^1.170.46`이고 engines는 `node ^20.19.0 || >=22.12.0`이다.
- CLI 바이너리는 `tsr`이고 명령은 `tsr generate`와 `tsr watch`다(`tsr --help`로 확인).

### `tsc -b`와 route tree 관계 (직접 실험)

1. `routeTree.gen.ts`가 없으면 `tsc`가 실패한다. `main.tsx`의 import 에러만이 아니라 **모든 route 파일**에서 `createFileRoute('/')` 인자가 `undefined` 타입과 맞지 않는다는 에러가 난다.
2. `tsr generate`(Vite 없이)를 실행하면 생성되고 `tsc`가 통과한다.
3. `vite build`도 플러그인이 `configResolved` 단계에서 route tree를 다시 생성한다.
4. **CLI와 Vite 플러그인이 만든 `routeTree.gen.ts`는 바이트 단위로 같았다**(`autoCodeSplitting` 여부와 무관하다. 분할은 번들 단계에서 한다).
5. 플러그인과 CLI 모두 `@tanstack/router-generator`의 `getConfig(inline, root)`를 쓴다. 이 함수는 **`tsr.config.json`을 읽고 inline 옵션을 덮어쓴다.** 반면 CLI는 `vite.config.ts`의 inline 옵션을 볼 수 없다. 그래서 기본값이 아닌 설정(`routesDirectory` 등)을 쓰면 `tsr.config.json`에 두어야 둘이 일치한다.
6. 생성기는 `.tanstack/tmp` 임시 디렉터리를 만든다(기본 `tmpDir`). 이 경로는 `.gitignore`에 넣어야 한다.
7. 문서(FAQ)는 **`routeTree.gen.ts`를 git에 커밋하라**고 권장하고, linter와 formatter에서는 제외하라고 한다. 생성 파일 첫머리에 `/* eslint-disable */`와 `// @ts-nocheck`가 붙는다.

템플릿에는 둘 중 하나를 권장한다. (a) `routeTree.gen.ts`를 함께 생성해 넣거나, (b) `"typecheck": "tsr generate && tsc -b"`처럼 타입 검사 전에 생성한다.

### `errorComponent`의 `error` 타입은 `unknown`

1.170.x의 `router-core/dist/esm/route.d.ts`에는 `DefaultErrorBoundaryTypes { error: unknown }`와 `ErrorComponentProps<TError = ErrorBoundaryTypes['error']>`가 있다. 그래서 `error.message`를 바로 쓰면 TS18046 에러가 난다. `instanceof Error`로 좁혀야 한다. 옛 문서 예시(`error.message` 직접 사용)는 이 버전과 맞지 않는다.

### 스니펫: tsc+build 통과

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
})
```

```tsx
// src/routes/__root.tsx
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

interface RouterContext {
  queryClient: QueryClient
}

// 이중 호출(factory 패턴)
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <>
      <h1>404</h1>
      <Link to="/">Go home</Link>
    </>
  ),
  errorComponent: ({ error, reset }) => (
    <div role="alert">
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button onClick={reset}>Retry</button>
    </div>
  ),
})

function RootLayout() {
  return (
    <>
      <nav>
        <Link to="/" activeProps={{ className: 'active' }} activeOptions={{ exact: true }}>Home</Link>
        <Link to="/users" search={{ page: 2 }}>Users</Link>
      </nav>
      <Outlet />
    </>
  )
}
```

```tsx
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <h1>Home</h1>,
})
```

```tsx
// src/routes/users.tsx — zod v4는 Standard Schema라서 adapter 없이 그대로 넘긴다
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const usersSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
  q: z.string().default('').catch(''),
})

export const Route = createFileRoute('/users')({
  validateSearch: usersSearchSchema,
  component: UsersPage,
})

function UsersPage() {
  const { page, q } = Route.useSearch() // page: number, q: string 로 추론됨
  const navigate = Route.useNavigate()
  return (
    <button onClick={() => navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })}>
      {page} {q}
    </button>
  )
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0, // 캐싱은 Query에 맡긴다(문서 권장)
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

빌드 결과 `users-*.js`가 별도 청크로 분리됐다(`autoCodeSplitting` 동작 확인).

### Deprecated와 주의점

- `NotFoundRoute`는 deprecated다. 루트의 `notFoundComponent`를 쓴다.
- zod v3에서는 `@tanstack/zod-adapter`의 `zodValidator`와 `fallback()`을 썼다. **zod v4에서는 adapter 없이 스키마를 직접 넘기고 `.catch()`를 쓴다**(문서에 명시돼 있다). `@tanstack/zod-adapter`는 설치하지 않는다.
- `useSearch()` 반환 타입에 직접 타입을 적지 않는다(추론에 맡긴다).
- `Link`의 `search`는 스키마 **입력 타입**을 기준으로 받는다. `.default()`가 있는 키는 생략할 수 있다(`search={{ page: 2 }}`가 `q` 없이 통과함).
- `tsr` 실행 시 Node 경고 `Accessing non-existent property 'replaceRouteChunk' ... circular dependency`가 출력되지만 생성은 정상이었다(Node 24.14.0 기준).

**검증 상태:** docs-confirmed + tsc+build(런타임 미실행). 플러그인 순서가 틀렸을 때의 실패는 문서 근거만 있고 재현하지 않았다.

---

## 3. @tanstack/react-query 5.108.4 + @tanstack/react-query-devtools 5.108.4

| 항목 | 내용 |
|---|---|
| Context7 ID | `/tanstack/query` (고정 안 함. 최신 고정본 v5.90.3이 대상보다 오래됨) |
| 선택 버전 | 5.108.4 (둘 다) |
| Context7 문서 버전 | main 브랜치(소스 `query-core/src/*.ts`와 docs) |
| 조회 주제 | important defaults, QueryClient `defaultOptions`, devtools 프로덕션 처리, `queryOptions`, `useMutation`과 `invalidateQueries`, mutation retry 기본값 |
| 공식 문서 | https://tanstack.com/query/latest/docs/framework/react/overview |

### 확인한 기본값 (소스 근거)

- query `retry` 기본값: 클라이언트 **3**, 서버 0(`retryer.ts`). 지수 backoff이고 최대 30초다.
- **mutation `retry` 기본값: 0**(`mutation.ts`의 `retry: this.options.retry ?? 0`).
- `staleTime` 기본값 0, `gcTime` 기본값 5분(서버에서는 Infinity), `refetchOnWindowFocus` 기본값 true.
- `staleTime`은 `'static'` 값도 받는다.
- v5 최신 mutation 콜백 시그니처는 `onSuccess(data, variables, onMutateResult, context)`이고, `context`에 `client`, `mutationKey`, `meta`가 들어 있다. `onSuccess`에서 Promise를 반환하면 그 Promise가 끝날 때까지 `isPending`이 유지된다.

### Devtools는 프로덕션에서 자동으로 빠진다 (빌드로 확인)

`@tanstack/react-query-devtools`의 기본 export는 `process.env.NODE_ENV !== 'development'`이면 `() => null`이 된다. 정적 import 그대로 `vite build`를 하면 번들에서 devtools 문자열(`tsqd`)이 **0건**이고, `NODE_ENV=development vite build`를 하면 `DevtoolsComponent-*.js` 청크(약 297KB)가 생긴다.

- **기준은 `process.env.NODE_ENV`이고 Vite `--mode`가 아니다.** `vite build --mode development`만 주면 결과가 프로덕션 빌드와 바이트 단위로 같았다.
- 정적 import와 `lazy(() => import(...))`를 섞으면 Rolldown이 `INEFFECTIVE_DYNAMIC_IMPORT` 경고를 낸다. **정적 import 한 가지 패턴만 쓴다.** 별도의 dev 전용 lazy 처리는 필요 없다.
- 프로덕션에서도 devtools를 쓰려면 `@tanstack/react-query-devtools/production`을 lazy import한다(문서). 템플릿에는 필요 없다.

### 스니펫: tsc+build 통과

```tsx
import type { ReactNode } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createUser, getUsers, type User } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 }, // 기본값과 같다. 명시만 한 것
  },
})

// query key factory (관례. 아래 주의 참고)
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
}

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: userKeys.lists(),
    queryFn: ({ signal }) => getUsers(signal), // AbortSignal을 axios에 전달
  })

export function useUsers() {
  return useQuery(usersQueryOptions())
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }), // Promise 반환
  })
}

export function UsersList() {
  const { data, isPending, isError, error } = useUsers()
  const create = useCreateUser()
  if (isPending) return <p>Loading…</p>
  if (isError) return <p role="alert">{error.message}</p>
  const users: User[] = data // 좁혀진 뒤에는 undefined가 아니다
  return (
    <>
      <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>
      <button disabled={create.isPending} onClick={() => create.mutate({ name: 'a', email: 'a@b.c' })}>Add</button>
    </>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- `queryOptions` 헬퍼와 `invalidateQueries({ queryKey: xxxOptions().queryKey })` 패턴은 문서에 있다(eslint `prefer-query-options` 문서).
- **`userKeys` 같은 query key factory 객체는 이번에 조회한 문서에서 확인하지 못했다.** 커뮤니티 관례이고 **unconfirmed**로 표시한다. 문서가 뒷받침하는 쪽은 `queryOptions`를 함수로 묶어 key를 재사용하는 방식이다.

**검증 상태:** docs-confirmed(기본값은 소스 근거) + tsc+build(런타임 미실행). key factory 형태만 unconfirmed.

---

## 4. zustand 5.1.0

| 항목 | 내용 |
|---|---|
| Context7 ID | `/pmndrs/zustand/v5.0.14` (**고정함**, 5.1.0 고정본은 없음), 마이그레이션 문서는 `/pmndrs/zustand`(main) |
| 선택 버전 | 5.1.0 |
| Context7 문서 버전 | v5.0.14, main |
| 조회 주제 | TS curried `create<T>()(...)`, `useShallow`, `persist`와 `createJSONStorage`, `partialize`, v5 마이그레이션 |
| 공식 문서 | https://zustand.docs.pmnd.rs/ |
| 보조 근거 | GitHub release v5.1.0(`gh api`) |

### 5.1.0 변경 (release note)

- `persist`가 storage 읽기와 migration에서 `PromiseLike`를 지원한다. **`persist.rehydrate()`가 이제 네이티브 `Promise<void>`를 반환하므로 await할 수 있다.**
- `devtools` middleware에 `actionCreators` 옵션이 추가됐다(Redux DevTools에서 action dispatch).
- breaking change는 없다.

### v5 breaking change (v4 대비, 마이그레이션 문서)

- default export가 제거됐다. `import { create } from 'zustand'`만 된다.
- React 18+, TS 4.5+가 필요하다. UMD/SystemJS와 ES5 지원이 빠졌다.
- `create(selector, equalityFn)` 형태가 제거됐다. 필요하면 `createWithEqualityFn`(`zustand/traditional`, `use-sync-external-store` peer)을 쓴다.
- **selector가 매번 새 참조를 반환하면 무한 루프가 생긴다**("Maximum update depth exceeded"). 객체나 배열을 고를 때는 `useShallow`를 쓴다.
- `setState(x, true)`(replace)는 완전한 state를 요구한다(타입 강화).
- 문서 목록에 "Persist middleware behavioral change" 항목이 있다. **세부 내용은 읽지 않았다(unconfirmed).**
- 설치본 `package.json`의 `type`은 `commonjs`이다. peer는 `react >=18`, `immer >=9.0.6`, `use-sync-external-store >=1.2.0`, `@types/react >=18`이고 `peerDependenciesMeta`에서 넷 다 optional이다.

### 스니펫: tsc 통과

```ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow' // 'zustand/shallow' 에서도 export됨(마이그레이션 문서)

type Theme = 'light' | 'dark'
interface UiState {
  theme: Theme
  sidebarOpen: boolean
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>()( // TS에서는 curried 형태가 필수다
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'ui', // storage key(고유해야 함)
      storage: createJSONStorage(() => localStorage), // 기본값도 localStorage
      partialize: (s) => ({ theme: s.theme }),
      version: 1,
    },
  ),
)

export const useTheme = () => useUiStore((s) => s.theme)
export const useSidebar = () =>
  useUiStore(useShallow((s) => ({ open: s.sidebarOpen, toggle: s.toggleSidebar })))

export async function waitForHydration() {
  await useUiStore.persist.rehydrate() // 5.1.0: Promise<void>
  return useUiStore.persist.hasHydrated()
}
```

**검증 상태:** docs-confirmed(v5.0.14 고정본) + release note(5.1.0) + tsc(런타임 미실행)

---

## 5. react-hook-form 7.92.0 + @hookform/resolvers 7.0.8 (새 메이저) + zod 4.6.7

| 항목 | 내용 |
|---|---|
| Context7 ID | RHF `/react-hook-form/react-hook-form/v7.90.0`(**고정함**, 7.92 고정본 없음), `/react-hook-form/documentation`(고정 안 함). resolvers `/react-hook-form/resolvers/v7.0.2`(**고정함**, 7.0.8 고정본 없음). zod는 Context7 월간 한도 소진으로 **조회 못 함** |
| 선택 버전 | react-hook-form 7.92.0, @hookform/resolvers 7.0.8, zod 4.6.7 |
| Context7 문서 버전 | RHF v7.90.0과 documentation master, resolvers v7.0.2 |
| 조회 주제 | zod v4 resolver import 경로, `useForm`의 input/output generic, `setError`와 `root.*`, 접근성 있는 에러 표시, resolvers v6→v7 |
| 공식 문서 | https://react-hook-form.com , https://github.com/react-hook-form/resolvers , https://zod.dev |
| 보조 근거 | GitHub releases(resolvers v6.0.0~v7.0.8 전부 확인), 설치본 `zod/dist/zod.d.ts`(resolver)와 `zod/v4/classic/schemas.d.ts` |

### resolvers breaking change: zod와 무관하다

- **v6.0.0**(2026-10-19): effect-ts resolver가 `effect@^4`를 요구한다.
- **v7.0.0**(2026-10-31): typebox resolver가 `@sinclair/typebox` 대신 `typebox ^1.0.0`을 요구한다.
- v7.0.1~v7.0.8은 버그 수정이다. 그중 **v7.0.7 "zod: select the Zod 4 overload for a generic Zod 4 schema"**가 zod 관련이다.
- 결론: **zod 사용 코드는 v5와 똑같다.** import는 `import { zodResolver } from '@hookform/resolvers/zod'`이고 `zod/v4` 서브패스가 아니라 `'zod'`를 그대로 쓴다. peer는 `zod ^3.25.0 || ^4.0.0`, `react-hook-form ^7.55.0`.
- 대안으로 `standardSchemaResolver`(`@hookform/resolvers/standard-schema`)도 있다. 이 경우 peer `@standard-schema/spec`가 필요하다. 템플릿은 `zodResolver`면 충분하다.
- `zodResolver`의 zod4 overload는 `Resolver<z4.input<T>, Context, z4.output<T>>`를 반환한다(`.d.ts` 확인).

### `useForm` 타입 지정

- generic을 생략하면 resolver에서 추론한다.
- 명시하려면 **세 개 모두** 적는다: `useForm<z.input<typeof s>, unknown, z.output<typeof s>>`.
- `.default()`가 있는 스키마에 generic을 하나만 주면(`useForm<z.output<...>>`) **타입 에러**가 난다. README에 적혀 있고 직접 재현했다.

### zod 4.6.7 (`.d.ts`로 확인, 문서는 미조회)

- `z.string().email()`은 `@deprecated Use z.email() instead`로 표시돼 있다. **`z.email()`을 쓴다.**
- `z.coerce.number()`로 빈 입력을 처리하면 `Number('') === 0`이라서 빈칸이 0이 된다. 숫자 입력은 `register(..., { setValueAs })`로 `''`를 `undefined`로 바꾸고 스키마는 `z.number().optional()`로 둔다.

### 스니펫: tsc 통과

```tsx
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { createUser } from './api'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  age: z.number().int().min(0).optional(),
  newsletter: z.boolean().default(false),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

export function SignupForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', newsletter: false },
  })

  const onSubmit: SubmitHandler<FormOutput> = async (values) => {
    try {
      await createUser({ name: values.name, email: values.email })
    } catch (e) {
      if (isAxiosError<{ fieldErrors?: { email?: string } }>(e) && e.response?.data.fieldErrors?.email) {
        setError('email', { type: 'server', message: e.response.data.fieldErrors.email }, { shouldFocus: true })
        return
      }
      // root.* 오류는 필드에 묶이지 않는다. 다음 제출 때 유지되지 않는다(7.43+)
      setError('root.server', { type: 'server', message: 'Could not save. Try again.' })
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <label htmlFor="name">Name</label>
      <input id="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} {...register('name')} />
      {errors.name && <p id="name-error" role="alert">{errors.name.message}</p>}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
      {errors.email && <p id="email-error" role="alert">{errors.email.message}</p>}

      <label htmlFor="age">Age</label>
      <input id="age" inputMode="numeric" {...register('age', { setValueAs: (v: string) => (v === '' ? undefined : Number(v)) })} />

      <label><input type="checkbox" {...register('newsletter')} /> Newsletter</label>

      {errors.root?.server && <p role="alert">{errors.root.server.message}</p>}
      <button type="submit" disabled={isSubmitting}>Submit</button>
    </form>
  )
}
```

- 문서 규칙: `handleSubmit`은 `onSubmit` 안의 에러를 삼키지 않는다. try/catch에서 `setError`를 부르면 `isSubmitSuccessful`이 false가 된다.
- 필드 이름으로 `root`, `type`, `ref`, `types`, `message`, `form`은 피한다.
- `aria-invalid`, `aria-describedby`, `role="alert"` 패턴은 RHF 공식 문서(advanced-usage) 예시와 같다.

**검증 상태:** RHF와 resolvers는 docs-confirmed + release note + tsc. zod API는 `.d.ts`와 tsc로만 확인했다(**Context7 zod 조회 못 함**). 런타임 미실행.

---

## 6. @tanstack/react-table 9.3.1 (새 메이저)

| 항목 | 내용 |
|---|---|
| Context7 ID | `/tanstack/table/_tanstack_react-table_9.2.4` (**고정함**, 9.3.1 고정본 없음) |
| 선택 버전 | 9.3.1 |
| Context7 문서 버전 | @tanstack/react-table@9.2.4 |
| 조회 주제 | v8→v9 마이그레이션, `useTable`, `tableFeatures`, row model, column helper, sorting/global filter/pagination, `FlexRender`, state 구독 |
| 공식 문서 | https://tanstack.com/table/latest |
| 보조 근거 | **설치본에 들어 있는 `skills/*/SKILL.md`(`library_version: '9.3.1'`)**와 `dist/*.d.ts`. 버전 차이는 이 자료로 메웠다 |

### v8→v9 핵심 변경

| v8 | v9 |
|---|---|
| `useReactTable` | **`useTable`** (`useReactTable`은 export되지 않음. tsc로 확인) |
| 모든 기능 번들 포함 | **`features` 옵션이 필수**다. `tableFeatures({...})`로 쓰는 기능만 등록한다. 옵션 이름은 `_features`가 아니라 `features`다 |
| `getCoreRowModel: getCoreRowModel()` | **제거**됨(export 없음). core row model은 기본으로 들어 있다 |
| `getSortedRowModel()` 등 테이블 옵션 | `tableFeatures` 안의 슬롯: `sortedRowModel: createSortedRowModel()`, `filteredRowModel: createFilteredRowModel()`, `paginatedRowModel: createPaginatedRowModel()` |
| `sortingFns`, `filterFns` 옵션, 전역 declaration merging | `tableFeatures` 안의 `sortFns`, `filterFns` 슬롯에 개별 함수를 등록한다(`sortFn_text`, `filterFn_includesString` 등) |
| `sortingFn`, `SortingFn` 철자 | `sortFn`, `SortFn` |
| `createColumnHelper<Person>()` | `createColumnHelper<typeof features, Person>()` + `helper.columns([...])` |
| `ColumnDef<TData>`, `Row<TData>` 등 | 첫 generic으로 `TFeatures`가 추가됨 |
| `flexRender(def, ctx)` | `<table.FlexRender header={h} />`, `cell={c}`, `footer={f}` (`flexRender`도 계속 지원) |
| `table.getState()`, `onStateChange` | `table.state`(`useTable`의 둘째 인자 selector로 범위를 고름), `table.Subscribe`. 전역 `onStateChange`는 제거됨 |
| column pinning `left`/`right` | 논리 방향 `start`/`end` |
| `RowData = unknown` | 행은 record 또는 array여야 한다 |

- 기능 사이의 선행 조건: **`globalFilteringFeature`는 `columnFilteringFeature`가 먼저 있어야 한다.** row model 슬롯은 선행 feature 뒤에 둔다. `columnSizingFeature`는 `columnResizingFeature`보다 먼저 둔다.
- feature를 등록하지 않으면 해당 API가 **타입에서 사라진다**(예: sorting feature 없이 `getToggleSortingHandler` 호출 시 TS2339. 직접 재현했다).
- `features`, `columns`, fallback data는 **모듈 스코프나 안정된 참조**에 둔다. `response.data ?? []`처럼 매 렌더마다 새 배열이 생기면 row model이 매번 무효화된다.
- 일시적인 이전 다리로 `useLegacyTable`(`@tanstack/react-table/legacy`)과 `stockFeatures`가 있지만 deprecated이고 v8보다 번들이 커질 수 있다. 템플릿에서는 쓰지 않는다.
- visibility를 반영하는 메서드(`row.getVisibleCells()`)는 `columnVisibilityFeature`가 필요하다. 없으면 `row.getAllCells()`를 쓴다.
- peer는 `react >=18`, engines는 `node >=20`. 내부적으로 `@tanstack/react-store`(TanStack Store)를 쓴다.

### 스니펫 (global filter + sorting + pagination): tsc 통과

```tsx
import { useState } from 'react'
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

type Person = { name: string; email: string; age: number }

// 모듈 스코프 = 안정된 참조
const features = tableFeatures({
  columnFilteringFeature, // globalFilteringFeature의 선행 조건
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})

const helper = createColumnHelper<typeof features, Person>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name', sortFn: 'text' }),
  helper.accessor('email', { header: 'Email', sortFn: 'text' }),
  helper.accessor('age', { header: 'Age', sortFn: 'alphanumeric' }),
])

export function PeopleTable({ data }: { data: Person[] }) {
  const [globalFilter, setGlobalFilter] = useState('')
  const table = useTable({
    features,
    columns,
    data,
    state: { globalFilter },            // 제어 slice는 state와 on*Change를 쌍으로 준다
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })

  return (
    <>
      <input aria-label="Search" value={globalFilter} onChange={(e) => table.setGlobalFilter(e.target.value)} />
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  aria-sort={
                    header.column.getIsSorted() === 'asc' ? 'ascending'
                    : header.column.getIsSorted() === 'desc' ? 'descending'
                    : 'none'
                  }
                >
                  {header.isPlaceholder ? null : (
                    <button type="button" onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()}>
                      <table.FlexRender header={header} />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}><table.FlexRender cell={cell} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
      <span>{table.state.pagination.pageIndex + 1} / {table.getPageCount()}</span>
      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
    </>
  )
}
```

- 기본 global filter 대상 판정은 첫 core row 값이 string 또는 number인 열이다. 다르게 하려면 `getColumnCanGlobalFilter`를 지정한다.
- client data가 바뀌면 `pageIndex`가 0으로 초기화될 수 있다(`autoResetPageIndex: false`로 끔).
- 전체 state 구독이 기본이다. 큰 테이블은 `useTable(opts, () => null)`과 `table.Subscribe`로 범위를 좁힌다. `table.store.state`는 deprecated(스냅샷일 뿐 구독이 아님)다.

**검증 상태:** docs-confirmed(9.2.4 고정본) + 패키지 내장 9.3.1 SKILL 문서 + tsc(런타임 미실행)

---

## 7. axios 1.21.1

| 항목 | 내용 |
|---|---|
| Context7 ID | `/axios/axios/v1.13.2` (**고정함**, 1.21.x 고정본 없음) |
| 선택 버전 | 1.21.1 |
| Context7 문서 버전 | v1.13.2 |
| 조회 주제 | `axios.create`, timeout, interceptors와 eject, AbortController `signal`, `isAxiosError`, 응답 generic |
| 공식 문서 | https://axios-http.com/docs/intro |
| 보조 근거 | 설치본 `CHANGELOG.md`(1.16.0~1.21.0)와 GitHub release v1.20.0, v1.21.0, v1.21.1 |

### 1.13 → 1.21.1 사이 주의점 (changelog)

- **1.21.0 breaking:** common/method별 header 기본값으로는 plain object, null-prototype map, 호환 `AxiosHeaders`만 인정된다. 커스텀 class 인스턴스를 기본값으로 넣으면 literal header 값이 된다. 템플릿처럼 `headers: { ... }` plain object를 쓰면 영향이 없다.
- 1.21.0: `response.duration`(ms)이 추가됐다. 1.21.1에서 `performance.now()` 기반으로 바뀌었다.
- 1.21.1: `follow-redirects ^1.16.2`로 CVE-2026-116689를 수정했다(Node HTTP adapter만 해당).
- 1.20.0: 413/422 상수명이 `ContentTooLarge`/`UnprocessableContent`로 추가됐고 `PayloadTooLarge`/`UnprocessableEntity`는 deprecated alias가 됐다. XHR에서 navigation으로 취소된 요청은 status 0으로 resolve되지 않고 `ECONNABORTED`로 reject된다.
- 1.19.0: 공개 타입 전반에 params generic이 추가됐다. 아래 스니펫의 `get<T>`, `post<T>` 사용에는 영향이 없다(tsc 확인).
- 1.16.0: fetch adapter가 `maxBodyLength`/`maxContentLength`를 강제한다. `QUERY` 메서드가 추가됐다.
- 패키지는 `"type": "module"`이고 `index.d.ts`와 `index.d.cts`를 모두 제공한다.

### 스니펫: tsc 통과

```ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 세션 정리 등
    }
    return Promise.reject(error)
  },
)

export type User = { id: number; name: string; email: string }
type ApiErrorBody = { message: string; fieldErrors?: Record<string, string> }

export async function getUsers(signal?: AbortSignal): Promise<User[]> {
  const { data } = await api.get<User[]>('/users', { signal }) // React Query의 signal 전달
  return data
}

export async function createUser(input: Omit<User, 'id'>): Promise<User> {
  const { data } = await api.post<User>('/users', input)
  return data
}

export function getErrorMessage(error: unknown): string {
  if (axios.isCancel(error)) return 'Request cancelled'
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data.message ?? error.message
  }
  return error instanceof Error ? error.message : 'Unknown error'
}
```

- `import.meta.env.VITE_API_URL`의 타입은 `vite/client` 타입 기준이다. 실제 템플릿에서는 `src/vite-env.d.ts`에 `ImportMetaEnv`를 보강한다.
- `isAxiosError`는 named export(`import { isAxiosError } from 'axios'`)와 `axios.isAxiosError` 둘 다 된다(폼 스니펫에서 named export를 tsc로 확인).

**검증 상태:** docs-confirmed(v1.13.2 고정본) + changelog(1.16~1.21.1) + tsc(런타임 미실행)

---

## 부수 발견 (다른 영역 참고)

- Vite 8.3.8에서 `vite.config.ts`를 ESM 문법으로 쓰고 가장 가까운 `package.json`에 `"type": "module"`이 없으면 경고가 나온다: "configLoader: 'native' ... planned to become the default in a future major". 생성되는 템플릿 `package.json`에 `"type": "module"`을 넣으면 피할 수 있다.
- 엔진 제약이 가장 빡빡한 것은 react-router 8의 **Node >=22.22.0**이다. 나머지는 `^20.19 || >=22.12`(router-plugin, router-cli), `>=20.19`(@tanstack/react-router), `>=20`(react-table) 수준이다.
