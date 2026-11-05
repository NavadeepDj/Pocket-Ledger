// Run the pure TypeScript service tests without adding a test-runner dependency.
const fs = require('fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
require('../services/__tests__/verifyServices.ts');
require('../services/__tests__/verifyPaymentCapture.ts');
require('../services/__tests__/verifySpendingInsights.ts');
require('./verify-email-storage.cjs');
require('../services/__tests__/verifyEmailCapture.ts').verifyEmailSync().catch(error => { console.error(error); process.exitCode = 1; });
