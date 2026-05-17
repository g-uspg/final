const jwt = require('jsonwebtoken');

const TEST_SECRET         = 'test_jwt_secret_parqueo_uspg';
const TEST_REFRESH_SECRET = 'test_jwt_refresh_secret_parqueo_uspg';

const TEST_USERS = {
  ADMIN:    { id: 'user-admin-001',    email: 'admin@uspg.edu.gt',    role: 'ADMIN'    },
  TEACHER:  { id: 'user-teacher-001',  email: 'teacher@uspg.edu.gt',  role: 'TEACHER'  },
  STUDENT:  { id: 'user-student-001',  email: 'student@uspg.edu.gt',  role: 'STUDENT'  },
  SECURITY: { id: 'user-security-001', email: 'security@uspg.edu.gt', role: 'SECURITY' },
  VISITOR:  { id: 'user-visitor-001',  email: 'visitor@uspg.edu.gt',  role: 'VISITOR'  },
};

function generateTestToken(role = 'ADMIN') {
  const user = TEST_USERS[role] ?? TEST_USERS.STUDENT;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    TEST_SECRET,
    { expiresIn: '1h' },
  );
}

function generateExpiredToken(role = 'ADMIN') {
  const user = TEST_USERS[role] ?? TEST_USERS.STUDENT;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    TEST_SECRET,
    { expiresIn: '-1s' },
  );
}

function generateRefreshToken(role = 'ADMIN') {
  const user = TEST_USERS[role] ?? TEST_USERS.STUDENT;
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    TEST_REFRESH_SECRET,
    { expiresIn: '7d' },
  );
}

function mockAuthenticatedUser(role = 'ADMIN') {
  const user = TEST_USERS[role] ?? TEST_USERS.STUDENT;
  return { sub: user.id, email: user.email, role: user.role };
}

function makeRequest(method, url, { body, token, role } = {}) {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
  const headers = new Headers({ 'Content-Type': 'application/json' });

  const resolvedToken = token ?? (role ? generateTestToken(role) : null);
  if (resolvedToken) headers.set('Authorization', `Bearer ${resolvedToken}`);

  return new Request(fullUrl, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

module.exports = {
  generateTestToken,
  generateExpiredToken,
  generateRefreshToken,
  mockAuthenticatedUser,
  makeRequest,
  TEST_USERS,
};
