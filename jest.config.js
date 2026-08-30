const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
    ...jestConfig,
    modulePathIgnorePatterns: ['<rootDir>/.localdevserver'],
    moduleNameMapper: {
        '^lightning/navigation$': '<rootDir>/force-app/test/jest-mocks/lightning/navigation'
    },
    collectCoverageFrom: ['force-app/main/default/lwc/**/*.js'],
    coveragePathIgnorePatterns: ['/__tests__/', '/__mocks__/']
};
