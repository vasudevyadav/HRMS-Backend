# Node Express javascript Husky

This is a Node.js project with Express.js, javascript, and Husky for pre-commit hooks. The project is structured to support an HRMS system with different user roles like super-admin, HR, employee, and team-lead.

## Project Structure

```plaintext
.
├── app.js
├── config
│   ├── db.js
│   └── userPassportStrategy.js
├── constants
│   ├── authConstant.js
│   └── filterKeys.js
├── controller
│   ├── employee
│   ├── hr
│   ├── super-admin
│   │   ├── authController.js
│   │   ├── projectRouteController.js
│   │   ├── roleController.js
│   │   ├── routeRoleController.js
│   │   ├── userController.js
│   │   └── userRoleController.js
│   └── team-lead
├── docker-compose.yml
├── Dockerfile
├── jobs
│   └── index.js
├── logs
├── middleware
│   ├── activityLog.js
│   ├── auth.js
│   ├── checkRolePermission.js
│   └── loginUser.js
├── model
│   ├── activityLog.js
│   ├── projectRoute.js
│   ├── role.js
│   ├── routeRole.js
│   ├── user.js
│   ├── userRole.js
│   └── userTokens.js
├── package.json
├── package-lock.json
├── postman
│   ├── environment-file.json
│   ├── postman-collection.json
│   ├── postman-collection-v.2.1.0.json
│   ├── postman_documentation.html
│   └── swagger.yml
├── public
├── README.md
├── routes
│   ├── employee
│   │   ├── auth.js
│   │   └── index.js
│   ├── hr
│   │   ├── auth.js
│   │   └── index.js
│   ├── index.js
│   ├── super-admin
│   │   ├── auth.js
│   │   ├── index.js
│   │   ├── projectRouteRoutes.js
│   │   ├── roleRoutes.js
│   │   ├── routeRoleRoutes.js
│   │   ├── userRoleRoutes.js
│   │   └── userRoutes.js
│   └── team-lead
│       ├── auth.js
│       └── index.js
├── seeders
│   └── index.js
├── services
│   ├── auth.js
│   ├── email.js
│   └── sms.js
├── __test__
│   ├── admin
│   │   └── auth.test.js
│   └── device
│       └── auth.test.js
├── utils
│   ├── common.js
│   ├── dbService.js
│   ├── deleteDependent.js
│   ├── file
│   │   └── s3.js
│   ├── notification
│   │   ├── aws-sns.js
│   │   └── one-signal.js
│   ├── payment
│   │   ├── paypal.js
│   │   └── stripe.js
│   ├── response
│   │   ├── index.js
│   │   ├── responseCode.js
│   │   ├── responseHandler.js
│   │   └── responseStatus.js
│   ├── sms
│   │   ├── aws-sns.js
│   │   ├── nexmo.js
│   │   └── twilio.js
│   ├── validateRequest.js
│   └── validation
│       ├── commonFilterValidation.js
│       ├── projectRouteValidation.js
│       ├── roleValidation.js
│       ├── routeRoleValidation.js
│       ├── userRoleValidation.js
│       ├── userTokensValidation.js
│       └── userValidation.js
└── views
    ├── email
    │   ├── InitialPassword
    │   │   └── html.ejs
    │   ├── ResetPassword
    │   │   └── html.ejs
    │   └── SuccessfulPasswordReset
    │       └── html.ejs
    ├── index.ejs
    └── sms
        ├── ChangePassword
        │   └── html.ejs
        ├── InitialPassword
        │   └── html.ejs
        ├── OTP
        │   └── html.ejs
        ├── ResetPassword
        │   └── html.ejs
        └── WelcomeUser
            └── html.ejs
