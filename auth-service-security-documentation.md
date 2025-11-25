# Auth-Service: Technical Documentation on Validation and Security

This document provides a comprehensive analysis of the security and validation measures implemented in the `auth-service`, based on the provided security standard.

## 2. Server-Side Validation

### Authenticity

**Status**: Implemented

**Implementation Found**:
The authenticity of users is verified through JSON Web Tokens (JWT). The `verifyToken` middleware is responsible for validating the token provided in the `Authorization` header of incoming requests.

-   The middleware extracts the token from the "Bearer <token>" format.
-   It uses the `jsonwebtoken` library to verify the token's signature against the `JWT_SECRET` stored in environment variables.
-   It handles specific errors like `TokenExpiredError` and `JsonWebTokenError` to provide appropriate responses.
-   If the token is valid, the decoded payload (containing `id` and `role`) is attached to the request object for further use.

**Code Example (`authMiddleware.js`)**:
```javascript
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ message: 'Token format is incorrect (e.g., missing Bearer).' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Unauthorized: Token expired.' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
            }
            return res.status(500).json({ message: 'Failed to authenticate token.' });
        }
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};
```

**Files Related**:
-   `auth-service/src/middlewares/authMiddleware.js`
-   `auth-service/src/controllers/authController.js` (generates the token on login/register)
-   `auth-service/src/routes/authRoutes.js` (applies the middleware to protected routes)

### Consistency

**Status**: Implemented

**Implementation Found**:
Database consistency is maintained through checks at the application level before performing write operations.

-   **User/Email Uniqueness**: During user registration, the `authController` checks if a user with the same `email` or `username` already exists in the database to prevent duplicates.
-   **Role Existence**: The system verifies that the default 'user' role exists before creating a new user, preventing inconsistent data states.
-   **Database Constraints**: The Prisma schema defines `@@unique` constraints on `username` and `email` fields in the `users` table, providing an additional layer of data integrity at the database level.
-   **Foreign Keys**: The `id_role` field in the `User` model is a foreign key referencing the `Role` model, ensuring that a user cannot be created with a non-existent role.

**Code Example (`authController.js`)**:
```javascript
// Validación de Consistencia: Verificar si el usuario o email ya existen
const existingUser = await userModel.findUserByEmail(email);
if (existingUser) {
    return res.status(409).json({ message: 'User with this email already exists.' });
}

// ...

// Obtener el rol 'user' usando el modelo de rol
const userRole = await roleModel.findRoleByName('user');
if (!userRole) {
    // ...
    return res.status(500).json({ message: 'System configuration error.' });
}
```

**Code Example (`schema.prisma`)**:
```prisma
model User {
  username    String   @unique @db.VarChar(100)
  email       String   @unique @db.VarChar(100)
  // ...
  role        Role     @relation(fields: [id_role], references: [id_role], onDelete: Restrict)
}
```

**Files Related**:
-   `auth-service/src/controllers/authController.js`
-   `auth-service/prisma/schema.prisma`

### Integrity

**Status**: Implemented

**Implementation Found**:
Data integrity in transit is ensured by using JWTs, which are digitally signed. The `verifyToken` middleware implicitly checks the integrity of the token payload. Any modification to the token payload by an unauthorized party will invalidate the signature, and the verification will fail.

Payload validation is performed using the `express-validator` library in the `validationMiddleware.js` file, which checks the structure and content of the request body for routes like `/register` and `/login`.

**Code Example (`authMiddleware.js`)**:
```javascript
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
        // ... a tampered token would fail here
        return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
    // ...
});
```

**Files Related**:
-   `auth-service/src/middlewares/authMiddleware.js`
-   `auth-service/src/middlewares/validationMiddleware.js`

### Permissions

**Status**: Implemented

**Implementation Found**:
Authorization is implemented using a Role-Based Access Control (RBAC) system.

-   The JWT payload contains the user's `role`.
-   The `authorizeRole` middleware takes an array of required roles as an argument.
-   It checks if the `userRole` (extracted from the JWT by `verifyToken`) is included in the list of required roles.
-   If the user does not have the required role, a `403 Forbidden` status is returned.

This middleware is applied to specific routes that require elevated privileges, such as the `/users` route, which is restricted to users with the 'admin' role.

**Code Example (`authMiddleware.js`)**:
```javascript
const authorizeRole = (requiredRoles) => {
    return (req, res, next) => {
        if (!req.userRole || !requiredRoles.includes(req.userRole)) {
            return res.status(403).json({ message: 'Forbidden: You do not have the necessary permissions.' });
        }
        next();
    };
};
```

**Code Example (`authRoutes.js`)**:
```javascript
// Ruta para obtener todos los usuarios (requiere token JWT y rol de administrador)
router.get('/users', verifyToken, authorizeRole(['admin']), getAllUsers);
```

**Files Related**:
-   `auth-service/src/middlewares/authMiddleware.js`
-   `auth-service/src/routes/authRoutes.js`

## 3. Type Validation

**Status**: Implemented

**Implementation Found**:
The `express-validator` library is used to perform type and format validation on incoming request bodies.

-   **Email**: `isEmail()` checks if the field is a valid email format.
-   **String Length**: `isLength()` checks for minimum (and optionally maximum) string length.
-   **Primitives**: The library inherently validates that the incoming data can be treated as the expected primitive type (e.g., a string for `isLength`).
-   The Prisma schema also enforces data types at the database level (e.g., `String`, `Int`, `DateTime`).

**Code Example (`validationMiddleware.js`)**:
```javascript
const registerValidation = [
    body('username')
        .isLength({ min: 3 }).withMessage('...'),
    body('email')
        .isEmail().withMessage('...'),
    body('password')
        .isLength({ min: 8 }).withMessage('...')
];
```

**Files Related**:
-   `auth-service/src/middlewares/validationMiddleware.js`
-   `auth-service/prisma/schema.prisma`

## 4. Business Logic Validation

**Status**: Implemented

**Implementation Found**:
Specific business rules are enforced within the validation middlewares and controllers.

-   **Password Policies**: The `registerValidation` middleware enforces several rules for password complexity (length, character types).
-   **Authentication Flow**: The `login` controller ensures that a user exists and that the provided password is correct before issuing a JWT.
-   **Username in Password**: A custom validation rule prevents the password from containing the username, making it less guessable.
-   **Attempt Limits**: Not explicitly implemented. This would require additional logic to track failed login attempts and temporarily lock accounts.

**Code Example (`validationMiddleware.js`)**:
```javascript
body('password')
    .isLength({ min: 8 }).withMessage(...)
    .matches(/[A-Z]/).withMessage(...)
    .matches(/[a-z]/).withMessage(...)
    .matches(/[0-9]/).withMessage(...)
    .matches(/[^A-Za-z0-9]/).withMessage(...)
    .custom((value, { req }) => {
        if (value.includes(req.body.username)) {
            throw new Error('Password cannot contain your username.');
        }
        return true;
    }),
```

**Files Related**:
-   `auth-service/src/middlewares/validationMiddleware.js`
-   `auth-service/src/controllers/authController.js`

## 5. Validation of Patterns and Rules

**Status**: Implemented

**Implementation Found**:
Specific patterns for data fields are validated using `express-validator`.

-   **Emails**: `isEmail()` validates the email format. `normalizeEmail()` is also used for canonicalization.
-   **Passwords**: `matches()` with regular expressions is used to enforce password complexity rules (uppercase, lowercase, number, special character).
-   **Username**: `matches(/^[a-zA-Z0-9_]+$/)` ensures the username only contains allowed characters.
-   **Tokens**: The structure of the JWT is implicitly validated by the `jwt.verify` function, which expects the `header.payload.signature` format.

**Code Example (`validationMiddleware.js`)**:
```javascript
body('username')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('...'),
body('email')
    .isEmail().withMessage('...'),
body('password')
    .matches(/[A-Z]/).withMessage(...)
```

**Files Related**:
-   `auth-service/src/middlewares/validationMiddleware.js`

## 6. Cross-Validation

**Status**: Partially Implemented

**Implementation Found**:
-   A custom validator in the `registerValidation` chain performs a cross-field validation by checking if the `password` contains the `username`.
-   However, there is no implementation for comparing two fields for equality, such as `password` and `passwordConfirmation`, which is a common cross-validation use case.

**Code Example (`validationMiddleware.js`)**:
```javascript
.custom((value, { req }) => {
    if (value.includes(req.body.username)) {
        throw new Error('Password cannot contain your username.');
    }
    return true;
})
```

**Files Related**:
-   `auth-service/src/middlewares/validationMiddleware.js`

## 7. Contextual Validation

**Status**: Implemented

**Implementation Found**:
Authorization serves as a form of contextual validation. The `authorizeRole` middleware validates if a user has permission to access a resource based on their role, which is part of their identity context. For example, only a user with the 'admin' role can access the list of all users.

**Code Example (`authRoutes.js`)**:
```javascript
router.get('/users', verifyToken, authorizeRole(['admin']), getAllUsers);
```

**Files Related**:
-   `auth-service/src/middlewares/authMiddleware.js`
-   `auth-service/src/routes/authRoutes.js`

## 8. Input Sanitization

**Status**: Implemented

**Implementation Found**:
The service employs multiple layers and types of sanitization, primarily using `express-validator` and the `validator` library.

-   **Escaping (HTML)**: `escape()` is used on `username` and `email` fields to prevent XSS by converting HTML special characters (`<`, `>`, `&`, `'`, `