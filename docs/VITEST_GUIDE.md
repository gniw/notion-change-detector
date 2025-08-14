# Vitest Guide

このプロジェクトで使用するVitestのAPI、機能、実装パターンをまとめています。

## Mock Functions（モック関数）

### `vi.fn()`

**目的**: テスト用の「偽の関数」を作成する

**基本的な使い方**:
```typescript
const mockFunction = vi.fn()
```

**できること**:

#### 1. 関数の呼び出し監視
関数がどのように呼ばれたかを記録・確認できる

```typescript
const mockFn = vi.fn()
mockFn('hello', 123)

// 呼び出し回数の確認
expect(mockFn).toHaveBeenCalledTimes(1)

// 呼び出し引数の確認
expect(mockFn).toHaveBeenCalledWith('hello', 123)

// 呼び出されたかの確認
expect(mockFn).toHaveBeenCalled()
```

#### 2. 戻り値の設定
偽の関数が返すべき値を指定できる

```typescript
const mockFn = vi.fn().mockReturnValue('fake result')
const result = mockFn() // 'fake result'

// 複数回呼び出しで異なる値を返す
const mockFn2 = vi.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default')

console.log(mockFn2()) // 'first'
console.log(mockFn2()) // 'second'
console.log(mockFn2()) // 'default'
```

#### 3. 非同期処理のモック
Promise を返す非同期関数をモック

```typescript
// 成功ケース
const mockAsyncFn = vi.fn().mockResolvedValue({ id: 'user-123' })
const result = await mockAsyncFn() // { id: 'user-123' }

// エラーケース
const mockErrorFn = vi.fn().mockRejectedValue(new Error('API Error'))
try {
  await mockErrorFn()
} catch (error) {
  console.log(error.message) // 'API Error'
}
```

#### 4. 関数の実装を置き換え
独自のロジックを持つ偽の関数を作成

```typescript
const mockFn = vi.fn().mockImplementation((name: string) => {
  return `Hello, ${name}!`
})

console.log(mockFn('World')) // 'Hello, World!'
```

#### 5. 型安全なモック関数の定義
TypeScriptでvi.fn()の型を明示的に指定

```typescript
// ジェネリクスで引数と戻り値の型を指定
const mockFn = vi.fn<[string, number], Promise<string>>()

// より具体的な例
const mockLoadConfig = vi.fn<[], Promise<DatabasesConfig>>()
  .mockResolvedValue({ databases: [] })

const mockGetById = vi.fn<[string], Promise<User | null>>()
  .mockImplementation((id) => Promise.resolve({ id, name: 'Test User' }))
```

**型定義の構文**:
```typescript
vi.Mock<Parameters, ReturnType>
// Parameters: 引数の型（配列で指定）
// ReturnType: 戻り値の型
```

**このプロジェクトでの使用例**:
```typescript
// Notion API の users.me() メソッドをモック
mockUsersMe = vi.fn().mockResolvedValue({ 
  object: 'user', 
  id: 'test-user-id' 
})

// 型安全なモックオブジェクトの定義
type MockedNotionClient = {
  isConnected: vi.Mock<[], boolean>;
  testConnection: vi.Mock<[], Promise<boolean>>;
  getClient: vi.Mock<[], Client>;
};
```

**なぜ使うのか**:
- 実際のAPI呼び出しを避けて高速テストを実現
- 外部依存を排除して安定したテスト環境を構築
- 関数の呼び出しパターンを詳細に検証
- エラーケースや特殊なシナリオを簡単に再現