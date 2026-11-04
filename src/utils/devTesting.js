// Developer testing checkpoints, passed in order. Independent of the QA workflow.
export const DEV_TEST_STAGES = [
  {
    id: 'ui_layout',
    short: 'UI Layout',
    label: 'UI Layout',
    hint: 'Screens, tables, dropdowns, buttons and navigation are in place (static or sample data is fine).'
  },
  {
    id: 'real_data',
    short: 'Real Data',
    label: 'Real Data Loading',
    hint: 'Tables, lists and dropdowns load real values from the API / database.'
  },
  {
    id: 'forms',
    short: 'Forms',
    label: 'Create & Update Forms',
    hint: 'Create and edit forms open with correct values and save successfully.'
  },
  {
    id: 'crud',
    short: 'CRUD',
    label: 'CRUD Complete',
    hint: 'Create, read, update and delete all work end to end and lists refresh correctly.'
  },
  {
    id: 'validation',
    short: 'Validation',
    label: 'Validation & Errors',
    hint: 'Required fields, formats, error messages, empty states and edge cases handled.'
  },
  {
    id: 'code_review',
    short: 'Code Review',
    label: 'Code Review',
    hint: 'Code reviewed by another developer / PR approved; no debug code or warnings left.'
  },
  {
    id: 'self_test',
    short: 'Self-Test',
    label: 'Developer Self-Test',
    hint: 'The developer has tested the whole flow end to end.'
  }
];

export const DEV_STAGE_IDS = DEV_TEST_STAGES.map((s) => s.id);

// Progress of one feature: how many stages passed, and the next stage to do
export const getDevTestProgress = (feature) => {
  const checks = feature?.devChecks || {};
  let passed = 0;
  for (const id of DEV_STAGE_IDS) {
    if (checks[id]?.done) passed += 1;
    else break; // stages are sequential
  }
  const total = DEV_STAGE_IDS.length;
  return {
    passed,
    total,
    pct: Math.round((passed / total) * 100),
    next: passed < total ? DEV_TEST_STAGES[passed] : null,
    complete: passed === total
  };
};
