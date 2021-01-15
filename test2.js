const zotzenlib = require('./index')
const result = zotzenlib.create({
    title: "ABC"
})
console.log(JSON.stringify(result,null,2))