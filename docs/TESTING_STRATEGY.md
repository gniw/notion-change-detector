# Testing Strategy

## Testing Strategy Policy

This project adopts TDD (Test-Driven Development) and implements an effective testing strategy.

## Testing Approach for External APIs (Notion API)

### Adopting Mock Patterns

For functions involving communication with external APIs, we adopt **mock patterns**.

#### Reasons for Adoption

##### 1. Alignment with TDD Basic Principles
- **Fast**: Actual API calls take several seconds, but mocks complete instantly
- **Independent**: Does not depend on external system (Notion API) state
- **Repeatable**: Consistent results regardless of network conditions or API state

##### 2. TDD Cycle Efficiency
- Enables high-speed **Red-Green-Refactor** cycles
- Clear cause of test failures (implementation logic issues vs external factors)
- Does not interfere with developer concentration

##### 3. Clear Test Targets
Unit tests test the following:
- Constructor behavior
- Connection state management logic
- Error handling implementation
- Internal business logic of classes

**The purpose is to test client class behavior, not actual API communication.**

##### 4. Improved Reliability
- Unaffected by API rate limits
- Independent of API key validity
- Unaffected by network failures

### Actual API Connection Testing

Actual Notion API communication verification is conducted through:

1. **Integration Tests**: Create separate test suite for integration testing
2. **Manual Testing**: Operation verification during development
3. **E2E Tests**: Comprehensive testing in production-like environments

### Test Hierarchy

```
Unit Tests
├── High-speed tests using mocks
├── Business logic testing
└── Error handling testing

Integration Tests
├── Actual API connection testing
├── Data consistency verification
└── External system integration testing

E2E Tests (End-to-End Tests)
├── Operation verification in real environment
└── User scenario testing
```

This strategy achieves both development speed and quality.