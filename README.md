# imei_gencheck
An IMEI generator and checker written for NodeJS using NPM. Uses a DB from tacdb.osmocom.org.
At this point the project is in a not-too early development stage. Already kinda usable!

## Install
To use this, NPM is needed. Read about it whereever ya willing.
Usually **npm install imei_gencheck** must be enough.
This won't depend (i hope) on anything but:

**"devDependencies"**: {
  "chai": "^4.1.1",
  "mocha": "^3.5.0"
},
**"dependencies"**: {
  "async": "^2.5.0",
  "checkdigit": "^1.1.1",
  "csv-parse": "^1.2.1"
}
<br/>
"devDependencies" are kinda optional. You don't need them unless wanna check tested features working.

## Usage

To just randomize an IMEI:
```JS
    const imeigc = require("imei_gencheck");

    console.log( // Should give the 15-digit id real fast
        imeigc.randomIMEI_fullRandom()
);
```
_(this is likely to give an actually non-existent number)_
<br /><br />
Here is the code to get the gencheck **DB** up:
```JS
    const imeigc = require("imei_gencheck");

    imeigc.loadDB()
    .then(rowsCount=>{
        console.log(rowsCount); // Sure no actual need for this, just a way to test that all gone well.
    });
```
<br />
And after the DB was put into RAM, some special functions become available. For example:
```js
    // Fully randomize an IMEI using a random TAC. Takes like zero time so not async.
    console.log(
      imeigc.randomIMEI_TACfromDB()
    );
```
<br />
And let's get something useful. Like a random iPhone 7 Plus IMEI:
```js
    // This involves a search in DB (which i didn't optimize (yet?) at all), so it's async:
    imeigc.randomTACInfoWithNames("Apple", "iPhone 7 Plus")
    .then(imei=>{
        console.log(
            imeigc.randomIMEIwithTAC(imei.tac) // Should be 35381208xxxxxxx
        );
    });
```

## Features
You can read the tests code in the file inside "test" directory. It pretty much sums up the possibilities and provides usage examples.

**As of 1.0.0** (For 3.x.x the feature set didn't change):
![Not an image of Yaktocat](https://user-images.githubusercontent.com/31159979/29488858-f80aa51e-851b-11e7-87c3-4471a01e8fb8.PNG)
