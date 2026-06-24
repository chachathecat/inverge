#!/usr/bin/env node

// Simple placeholder for risk classification.
// This script currently returns a low risk classification for demonstration purposes.
// Future implementations should parse changes and signals to classify risk based on config/agent-risk-policy.yml.

console.log(JSON.stringify({ risk: 'low' }));
