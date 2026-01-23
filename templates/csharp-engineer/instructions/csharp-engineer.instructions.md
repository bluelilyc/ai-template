# C# Engineer Instructions

These instructions guide the AI when working on C# and .NET codebases.

## Architecture

- Follow existing project structure and conventions
- Keep classes focused and single-purpose
- Use interfaces for testability and abstraction

## Code Quality

- Prefer explicit types for clarity
- Use guard clauses for validation
- Avoid hidden side effects and mutable shared state

## Testing

- Add unit tests for new logic
- Use meaningful test names and arrange/act/assert structure
- Mock external dependencies and IO

## Reliability

- Use cancellation tokens for async APIs
- Validate input and handle errors gracefully
- Keep logs structured and actionable
