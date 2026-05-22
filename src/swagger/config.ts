import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ThreadLearn API Documentation',
    version: '1.0.0',
    description:
      'Comprehensive API documentation for the ThreadLearn scalable learning platform backend. Built with Next.js, MongoDB, Redis, and Socket.IO.',
    contact: {
      name: 'ThreadLearn Team',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
          meta: { type: 'object' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      QuizSubmission: {
        type: 'object',
        required: ['quizId', 'answers'],
        properties: {
          quizId: { type: 'string' },
          answers: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
        },
      },
      CodeExecution: {
        type: 'object',
        required: ['sourceCode', 'languageId'],
        properties: {
          sourceCode: { type: 'string' },
          languageId: { type: 'integer' },
          stdin: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        responses: { '200': { description: 'Server is healthy' } },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
            },
          },
        },
        responses: {
          '201': { description: 'User registered successfully' },
          '400': { description: 'Validation error or duplicate email' },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful, tokens returned' },
          '400': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        responses: { '200': { description: 'New tokens issued' } },
      },
    },
    '/api/v1/auth/session': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user session',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'User context returned' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/v1/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile and stats',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Profile returned' } },
      },
    },
    '/api/v1/courses': {
      get: {
        tags: ['Courses'],
        summary: 'List published courses with search and pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated course list' } },
      },
    },
    '/api/v1/quiz/submit': {
      post: {
        tags: ['Quiz'],
        summary: 'Submit quiz answers',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QuizSubmission' },
            },
          },
        },
        responses: {
          '200': { description: 'Quiz graded, XP awarded if passed' },
        },
      },
    },
    '/api/v1/ai/recommendation': {
      post: {
        tags: ['AI'],
        summary: 'Generate personalized learning recommendation',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Recommendation generated' } },
      },
      get: {
        tags: ['AI'],
        summary: 'Get AI interaction history',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'AI history log returned' } },
      },
    },
    '/api/v1/leaderboard': {
      get: {
        tags: ['Leaderboard'],
        summary: 'Get top XP rankings',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: { '200': { description: 'Leaderboard rankings returned' } },
      },
    },
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get user notifications',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'unread', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Notifications list returned' } },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  swaggerDefinition,
  apis: [],
});
export default swaggerSpec;
