#!/usr/bin/env node
const fs = require('fs');

async function create() {
  const data = fs.readFileSync('data.json', "utf8");
  // console.log(data)
  return JSON.parse(data)
}
