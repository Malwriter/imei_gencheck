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
```js
    const imeigc = require("imei_gencheck");

    console.log( // Should give the 15-digit id real fast
        imeigc.randomIMEI_fullRandom()
);
```
_(this is likely to give an actually non-existent number)_
<br /><br />
Here is the code to get the gencheck **DB** up:
```js
    const imeigc = require("imei_gencheck");

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
    .then(imei=>{ // This involves a search in DB (which i didn't optimize (yet?) at all), so it's async:
        console.log(
            imeigc.randomIMEIwithTAC(imei.tac) // Should be 35381208xxxxxxx
        );
    });
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

## Features
You can read the tests code in the file inside "test" directory. It pretty much sums up the possibilities and provides usage examples.

**As of 1.0.0** (For 3.x.x the feature set didn't change):
![Not an image of Yaktocat](https://user-images.githubusercontent.com/31159979/29488858-f80aa51e-851b-11e7-87c3-4471a01e8fb8.PNG)
