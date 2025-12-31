# Copilot Instructions for Anset Backend

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a backend service for the Anset home renovation suggestion mini-program, built with Elysiajs and TypeScript.

## Technology Stack

-   **Framework**: Elysiajs (high-performance TypeScript framework)
-   **Database**: Prisma ORM with PostgreSQL/MySQL
-   **AI Integration**: Alibaba Cloud Tongyi Qianwen (通义千问)
-   **File Upload**: Native file handling
-   **Runtime**: Node.js (or Bun for better performance)

## Code Style

-   Use TypeScript with strict mode
-   Follow async/await patterns for asynchronous operations
-   Use ESM (ES Modules) syntax
-   Implement proper error handling with try-catch blocks
-   Add JSDoc comments for complex functions

## API Design Principles

-   RESTful API structure
-   Consistent response format: `{ success: boolean, data?: any, error?: string }`
-   Proper HTTP status codes
-   Input validation using Elysia's type system

## Database Guidelines

-   Use Prisma Client for database operations
-   Always include proper relations in queries when needed
-   Use transactions for operations that modify multiple tables
-   Add indexes for frequently queried fields

## AI Integration Notes

-   The Tongyi Qianwen API requires an API key from Alibaba Cloud DashScope
-   Image analysis uses the multimodal model (qwen-vl-plus or qwen-vl-max)
-   Always handle AI API errors gracefully
-   Store both structured results and raw responses

## Security Considerations

-   Validate all user inputs
-   Sanitize file uploads (check file types and sizes)
-   Use environment variables for sensitive data
-   Implement rate limiting for API endpoints (TODO)
-   Add authentication middleware for protected routes (TODO)
