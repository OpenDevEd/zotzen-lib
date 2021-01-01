#!/usr/bin/env node
const fs = require('fs');

export async function create(args) {
  const data = fs.readFileSync('data.json', "utf8");
  // console.log(data)
  let result = JSON.parse(data)
  return result
}
