export const INITIAL_PROJECTS = [
  {
    id: 'proj-default',
    name: 'Main Project',
    code: 'MAIN',
    description: 'Primary project workspace',
    category: 'Core System',
    createdAt: new Date().toISOString().split('T')[0]
  }
];

export const INITIAL_FEATURES = [];

export const INITIAL_TEAM = [
  {
    id: 'user-admin',
    username: 'admin',
    password: '123',
    name: 'Super Admin',
    email: 'admin@devbridge.io',
    role: 'admin',
    title: 'Super Administrator',
    initials: 'SA',
    color: '#8b5cf6'
  }
];

export const INITIAL_ENVIRONMENTS = [
  {
    id: 'staging',
    name: 'Staging',
    cluster: 'cloud-staging',
    status: 'healthy',
    branch: 'main',
    commit: 'init',
    buildNumber: '1',
    lastDeploy: 'Never',
    url: 'https://staging.internal',
    latencyMs: 24,
    autoRegressionPassed: true,
    activeDevs: []
  },
  {
    id: 'production',
    name: 'Production',
    cluster: 'cloud-production',
    status: 'healthy',
    branch: 'main',
    commit: 'init',
    buildNumber: '1',
    lastDeploy: 'Never',
    url: 'https://app.internal',
    latencyMs: 18,
    autoRegressionPassed: true,
    activeDevs: []
  }
];

export const INITIAL_TICKETS = [];

export const INITIAL_TEST_SUITES = [];

export const INITIAL_RELEASES = [
  {
    id: 'REL-1.0.0',
    version: 'v1.0.0',
    sprint: 'Sprint 1',
    targetDate: '2026-11-01',
    status: 'pending_signoff',
    branch: 'release/v1.0.0',
    targetEnvironment: 'Staging -> Production',
    changeSummary: 'Initial production release candidate',
    gateChecks: {
      zeroBlockers: true,
      testRunPassRate: 100,
      stagingHealth: true,
      devLeadSignoff: {
        signed: false,
        by: null,
        date: null,
        note: ''
      },
      qaLeadSignoff: {
        signed: false,
        by: null,
        date: null,
        note: ''
      }
    }
  }
];
