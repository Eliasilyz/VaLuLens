// Quick check: import the Analyze page's dependencies to see if any crash
try {
  const calc = await import('./src/lib/calculations.ts');
  console.log('calculations.ts OK, exports:', Object.keys(calc));
} catch (e) {
  console.error('calculations.ts FAILED:', e.message);
}

try {
  const ml = await import('./src/lib/ml-model.ts');
  console.log('ml-model.ts OK');
} catch (e) {
  console.error('ml-model.ts FAILED:', e.message);
}

try {
  const ex = await import('./src/lib/exchanges.ts');
  console.log('exchanges.ts OK, exports:', Object.keys(ex));
} catch (e) {
  console.error('exchanges.ts FAILED:', e.message);
}

try {
  const cur = await import('./src/lib/currency.ts');
  console.log('currency.ts OK, exports:', Object.keys(cur));
} catch (e) {
  console.error('currency.ts FAILED:', e.message);
}
