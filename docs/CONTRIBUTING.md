# QMS Contributing Guide

## Getting Started

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- Git
- Basic knowledge of TypeScript, React, and Node.js

### Development Environment Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/quotation.git`
3. Navigate to project: `cd quotation`
4. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
5. Set up PostgreSQL database
6. Configure environment variables
7. Run migrations: `cd backend && npm run db:migrate`
8. Seed database: `npm run db:seed`
9. Start development servers

## Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Critical fixes

### Creating a Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Making Changes
1. Make your changes in the feature branch
2. Follow code style guidelines
3. Write tests for new functionality
4. Update documentation as needed
5. Commit changes with clear messages

### Commit Guidelines
- Use clear, descriptive commit messages
- Follow conventional commit format:
  - `feat: add user authentication`
  - `fix: resolve login timeout issue`
  - `docs: update API documentation`
  - `test: add unit tests for validation`
- Keep commits focused and atomic
- Include issue references when applicable

### Testing
- Run tests before committing: `npm test`
- Run linting: `npm run lint`
- Test manually in development environment
- Ensure all tests pass
- Check for TypeScript errors

### Pull Request Process
1. Push your branch: `git push origin feature/your-feature-name`
2. Create pull request to `develop` branch
3. Fill in PR template
4. Request review from team members
5. Address review feedback
6. Ensure CI checks pass
7. Merge after approval

## Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Enable strict mode in tsconfig.json
- Avoid `any` types when possible
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Add JSDoc comments for complex functions

### React
- Use functional components with hooks
- Use TypeScript for props
- Follow React best practices
- Use proper error boundaries
- Optimize performance with useMemo/useCallback

### Backend
- Follow RESTful API conventions
- Use proper HTTP status codes
- Implement proper error handling
- Use async/await for async operations
- Add input validation
- Implement proper logging

### Naming Conventions
- **Files**: kebab-case for files (`user-service.ts`)
- **Components**: PascalCase for React components (`UserProfile.tsx`)
- **Functions**: camelCase for functions (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE for constants (`API_BASE_URL`)
- **Variables**: camelCase for variables (`userId`)
- **Classes**: PascalCase for classes (`UserService`)

### Code Organization
- Group related functions together
- Use meaningful file and directory names
- Keep files focused and modular
- Follow existing project structure
- Add comments for complex logic

## Testing Guidelines

### Unit Tests
- Write unit tests for all new functions
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies
- Keep tests independent and fast

### Integration Tests
- Test API endpoints
- Test database operations
- Test authentication flows
- Test business logic
- Use test database

### Frontend Tests
- Test React components
- Test user interactions
- Test state management
- Test routing
- Test error handling

### Test Coverage
- Aim for 80%+ code coverage
- Focus on critical paths
- Test edge cases
- Review coverage reports
- Add tests for uncovered code

## Documentation Guidelines

### Code Comments
- Add comments for complex logic
- Document public APIs
- Explain non-obvious implementations
- Keep comments up to date
- Avoid redundant comments

### API Documentation
- Add Swagger comments to all endpoints
- Document request/response schemas
- Include example requests/responses
- Document error responses
- Keep documentation current

### README Updates
- Update README for new features
- Document configuration changes
- Update setup instructions
- Add examples for new functionality
- Update version history

## Security Guidelines

### Authentication
- Never commit secrets or credentials
- Use environment variables for sensitive data
- Implement proper authentication
- Validate all user input
- Use HTTPS in production

### Data Protection
- Sanitize user input
- Use parameterized queries
- Implement proper error handling
- Log security events
- Regular security audits

### Dependencies
- Keep dependencies updated
- Review security advisories
- Use `npm audit` regularly
- Address vulnerabilities promptly
- Use trusted packages

## Performance Guidelines

### Backend Performance
- Optimize database queries
- Use connection pooling
- Implement caching where appropriate
- Avoid N+1 queries
- Monitor performance metrics

### Frontend Performance
- Optimize bundle size
- Use code splitting
- Lazy load components
- Optimize images
- Implement proper caching

## Review Process

### Self-Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] No TODO comments (create issues instead)
- [ ] Environment variables are documented
- [ ] Error handling is proper
- [ ] Security best practices followed
- [ ] Performance considerations addressed

### Peer Review
- Request review from team members
- Be open to feedback
- Address review comments
- Update documentation as needed
- Ensure all checks pass

## Issue Reporting

### Bug Reports
- Use issue template
- Provide clear reproduction steps
- Include environment details
- Add error messages and logs
- Suggest possible fixes

### Feature Requests
- Describe the feature clearly
- Explain the use case
- Provide examples
- Consider implementation complexity
- Discuss with team first

## Questions and Support

### Getting Help
- Review documentation first
- Check existing issues
- Ask in team channels
- Be specific with questions
- Provide context and examples

### Communication
- Be respectful and constructive
- Ask questions in appropriate channels
- Share knowledge with team
- Document solutions
- Help others when possible

## Recognition

### Contributions
- All contributors are recognized
- Contributions are documented
- Major features are highlighted
- Team members are credited
- Release notes include contributors

### Guidelines
- Focus on quality over quantity
- Think about maintainability
- Consider user experience
- Plan before coding
- Test thoroughly

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.

## Additional Resources

### Documentation
- [Architecture Documentation](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [API Documentation](http://localhost:5000/api-docs)

### Tools
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Best Practices
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [React Best Practices](https://react.dev/learn/thinking-in-react)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Contact

For questions about contributing, contact the development team at:
- Email: dev@qms.example.com
- GitHub Issues: https://github.com/yourorg/quotation/issues
- Team Chat: [team-chat-link]

Thank you for contributing to QMS!