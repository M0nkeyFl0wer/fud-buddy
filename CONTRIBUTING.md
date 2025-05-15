
# Contributing to FUD Buddy

Thank you for considering contributing to FUD Buddy! This document outlines the process for contributing to this project.

## Development Setup

1. **Fork the repository**

2. **Clone your fork**
   ```
   git clone https://github.com/yourusername/fud-buddy.git
   cd fud-buddy
   ```

3. **Install dependencies**
   ```
   npm install
   ```

4. **Start the development server**
   ```
   npm run dev
   ```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing project structure
- Use functional components with hooks
- Document complex functions with JSDoc comments
- Use Tailwind CSS for styling

### Component Structure

- Create small, focused components
- Group related components in directories
- Export components from index.ts files

### Testing

- Write unit tests for utility functions
- Write component tests for UI components
- Test across different browsers and devices

### Commit Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for code style changes (formatting, etc.)
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for changes to the build process or tools

### Pull Request Process

1. Create a new branch for your feature or fix
2. Make your changes and commit them
3. Push your branch to your fork
4. Submit a pull request to the main repository
5. Address any feedback in the code review

## Adding New Features

When adding new features:

1. **Discuss First**: Open an issue to discuss the feature before implementing it
2. **Keep It Focused**: Each PR should address a single feature or fix
3. **Document It**: Add documentation for new features
4. **Test It**: Add tests for new code

## Reporting Bugs

When reporting bugs, please include:

1. A clear description of the bug
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots or code snippets if applicable
6. Environment information (browser, OS, etc.)

## Feature Requests

We welcome feature requests! Please include:

1. A clear description of the feature
2. The use case or problem it solves
3. Any alternative solutions you've considered
4. Any implementation details you can provide

## License

By contributing to FUD Buddy, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
