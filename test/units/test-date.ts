import {getTimeNumber, getTimezoneDateString} from "../../src/modules/util";

console.log(getTimezoneDateString(new Date()));
console.log(getTimezoneDateString(new Date()).slice(0,10));
console.log(getTimezoneDateString(new Date()).slice(11))
console.log(getTimeNumber('11:00:00'))
console.log(getTimeNumber('11:00:01'))
console.log(getTimeNumber('01:00:00'))
console.log(getTimeNumber('01:00'))