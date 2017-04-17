#!/usr/bin/env node
"use strict";

// eslint-disable-line global-require
require('ts-node').register({
    project: './'
});
require('./src/market-bot');
