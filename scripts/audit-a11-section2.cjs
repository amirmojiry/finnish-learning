#!/usr/bin/env node
'use strict';
// Section 2 carries validated prerequisite and exact-answer history from Section 1.
require('./audit-a11-section1.cjs').main([...process.argv.slice(2), '--section=2']);
