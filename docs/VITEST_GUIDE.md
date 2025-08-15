# Vitest Guide

This document summarizes Vitest APIs, features, and implementation patterns used in this project.

## Mock Functions

### `vi.fn()`

**Purpose**: Create "fake functions" for testing

**Basic usage**:
```typescript
const mockFunction = vi.fn()
```

**Capabilities**:

#### 1. Function Call Monitoring
Record and verify how functions were called

```typescript
const mockFn = vi.fn()
mockFn('hello', 123)

// Check number of calls
expect(mockFn).toHaveBeenCalledTimes(1)

// Check call arguments
expect(mockFn).toHaveBeenCalledWith('hello', 123)

// Check if called
expect(mockFn).toHaveBeenCalled()
```

#### 2. Return Value Configuration
Specify values that fake functions should return

```typescript
const mockFn = vi.fn().mockReturnValue('fake result')
const result = mockFn() // 'fake result'

// Return different values on multiple calls
const mockFn2 = vi.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default')

console.log(mockFn2()) // 'first'
console.log(mockFn2()) // 'second'
console.log(mockFn2()) // 'default'
```

#### 3. Asynchronous Processing Mocks
Mock asynchronous functions that return Promises

```typescript
// Success case
const mockAsyncFn = vi.fn().mockResolvedValue({ id: 'user-123' })
const result = await mockAsyncFn() // { id: 'user-123' }

// Error case
const mockErrorFn = vi.fn().mockRejectedValue(new Error('API Error'))
try {
  await mockErrorFn()
} catch (error) {
  console.log(error.message) // 'API Error'
}
```

#### 4. Function Implementation Replacement
Create fake functions with custom logic

```typescript
const mockFn = vi.fn().mockImplementation((name: string) => {
  return `Hello, ${name}!`
})

console.log(mockFn('World')) // 'Hello, World!'
```

#### 5. Type-safe Mock Function Definition
Explicitly specify types for vi.fn() in TypeScript

```typescript
// Specify argument and return value types with generics
const mockFn = vi.fn<[string, number], Promise<string>>()

// More specific example
const mockLoadConfig = vi.fn<[], Promise<DatabasesConfig>>()
  .mockResolvedValue({ databases: [] })

const mockGetById = vi.fn<[string], Promise<User | null>>()
  .mockImplementation((id) => Promise.resolve({ id, name: 'Test User' }))
```

**Type definition syntax**:
```typescript
vi.Mock<Parameters, ReturnType>
// Parameters: Argument types (specified as array)
// ReturnType: Return value type
```

**Usage examples in this project**:
```typescript
// Mock Notion API users.me() method
mockUsersMe = vi.fn().mockResolvedValue({ 
  object: 'user', 
  id: 'test-user-id' 
})

// Type-safe mock object definition
type MockedNotionClient = {
  isConnected: vi.Mock<[], boolean>;
  testConnection: vi.Mock<[], Promise<boolean>>;
  getClient: vi.Mock<[], Client>;
};
```

**Why use it**:
- Achieve high-speed tests by avoiding actual API calls
- Build stable test environment by eliminating external dependencies
- Verify function call patterns in detail
- Easily reproduce error cases and special scenarios