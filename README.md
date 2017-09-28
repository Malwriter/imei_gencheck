# imei_gencheck
An **IMEI generator and checker** written for NodeJS using NPM. Uses a DB from tacdb.osmocom.org.
The module exposes a class IMEI_GenCheck(sure You name it on requiring), which is to be used 
for constructing an actual object providing the features You can find below. Basically, the
object has features for IMEI generating and checking; exposes a comfortable interface to the TAC DB,
allowing to search through it. But to actually use the DB this way, You'll need to invoke **loadDB()**
method and wait for the returned Promise to resolve with the count of rows loaded into the DB property.<br/>
Enough of intro, just behold **usage examples down there.**

## Install
To use this, NPM is needed. Read about it whereever ya willing.<br/>
Usually **npm install imei_gencheck** must be enough.<br/>
This won't depend (i hope) on anything but:

```json
"devDependencies": {
  "chai": "^4.1.1",
  "mocha": "^3.5.0"
},
"dependencies": {
  "async": "^2.5.0",
  "checkdigit": "^1.1.1",
  "csv-parse": "^1.2.1"
}
```
_"devDependencies" are kinda optional. You don't need them unless wanna check tested features working._

## Usage

To just randomize an IMEI:
```js
    const IMEI_GenCheck = require("imei_gencheck");
    const imeigc = new IMEI_GenCheck();

    console.log( // Should give the 15-digit id real fast
        imeigc.randomIMEI_fullRandom()
);
```
_(this is likely to give an actually non-existent number)_
<br /><br />
Here is the code to get the gencheck **DB** up:
```js
    const IMEI_GenCheck = require("imei_gencheck");
    const imeigc = new IMEI_GenCheck();

    imeigc.loadDB()
    .then(rowsCount=>{
        console.log(rowsCount); // Sure no actual need for this, just a way to test that all gone well.
    });
```
<br />
And after the DB was put into RAM, some special functions become available. For example:

```js
    console.log(
      // Fully randomize an IMEI using a random TAC. Takes like zero time so not async.
      imeigc.randomIMEI_TACfromDB()
    );
```
<br />
And let us get something useful. Like a random iPhone 7 Plus IMEI:

```js
    imeigc.randomTACInfoWithNames("Apple", "iPhone 7 Plus")
    .then(tacinfo=>{ // This involves a search in DB (which i didn't optimize (yet?) at all), so it's async:
        console.log(
            imeigc.randomIMEIwithTAC(tacinfo.tac) // Should be 35381208xxxxxxx
        );
    });
```

And with the 3.1 here came a possibility to search by fields set:
**findTACInfoByFields**
```js
const searchObj = {name1: "Nokia", aka:"1112b"};
const strictSearch = false; // Searching with string's indexOf() method
// FALSE is the default value. With TRUE the search will use === operator
// (will perform toLowerCase() anyway tho)

imeigc.loadDB()
.then(rowcount  => imeigc.findTACInfoByFields(searchObj, strictSearch))
.then(foundTACs => console.log(foundTACs.length));
```

## Data
In the folder "data" there is the DB used by the code. When it gets loaded, it is put into an array
```js
    imeigc.DB
```
And here is how the data from each .csv row is stored in the objects inside the array:
```js
    let newTACinfo = {
        "tac":          line[0],
        "name1":        line[1],
        "name2":        line[2],
        "comment":      line[3],
        "gsmarena1":    line[5],
        "gsmarena2":    line[6],
        "aka":          line[7],
        "type":         ""      // Yep, there is no Type in the DB so far.
    };
```
To load from some other .csv file (which is now supported through a constructor parameter), You'll need to arrange the data accordingly or to change that code in **index.js**.

## Features
You can read the tests code in the file inside "test" directory. It pretty much sums up the possibilities and provides usage examples.

**As of 4.0** (Not very much new from 1.0.0, though not compatible with that already):
![Not an image of Yaktocat!](https://user-images.githubusercontent.com/31159979/30954952-ae1ea8a4-a43a-11e7-8be6-4153a347bc28.PNG)
