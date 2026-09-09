#!/usr/bin/env node

'use strict';

const webpack = require('webpack');
const config = require('../webpack.production.config');

webpack(config, (error, stats) => {
  if (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
    return;
  }
  console.log(stats.toString({
    chunks: false,
    colors: true,
    modules: false,
  }));
  if (stats.hasErrors()) {
    process.exitCode = 1;
  }
});
