# Project Build & Development Guidelines

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint on all files
- `npx jest path/to/file.test.ts` - Run single test file
- `npm test` - Run all tests

## Code Style Guidelines
- **TypeScript**: Use strict type checking and explicit return types
- **Imports**: Group imports by external libraries first, then internal modules
- **Components**: Use functional components with React hooks
- **Naming**: PascalCase for components/interfaces, camelCase for variables/functions
- **Error Handling**: Use try/catch with specific error types, log errors with context
- **Styling**: Utilize Material UI and styled-components with theme variables
- **State Management**: Local state with React hooks, props for component communication
- **Testing**: Write unit tests for utilities and component tests for UI

## Project Structure
- `components/` - Reusable React components
- `pages/` - Next.js page components and API routes
- `utils/` - Shared utility functions
- `hooks/` - Custom React hooks
- `__tests__/` - Test files