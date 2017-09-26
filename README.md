# imei_gencheck
An IMEI generator and checker written for NodeJS using NPM. Uses a DB from tacdb.osmocom.org.
At this point the project is in a not-too early development stage. Already kinda usable!

## Install
To use this, NPM is needed. Read about it whereever ya willing.
Usually **npm install imei_gencheck** must be enough.
This won't depend (i hope) on anything but:

"devDependencies": {
  "chai": "^4.1.1",
  "mocha": "^3.5.0"
},
"dependencies": {
  "async": "^2.5.0",
  "checkdigit": "^1.1.1",
  "csv-parse": "^1.2.1"
}

"devDependencies" are kinda optional. You don't need them unless wanna check tested features working.

## Features
You can read the tests code in the file inside "test" directory. It pretty much sums up the possibilities.
NOTE that some of the features are not implemented yet. Run "npm test" to see what is currently up an working.

**As of 1.0.0**:
![The testing results output](https://user-images.githubusercontent.com/31159979/29488858-f80aa51e-851b-11e7-87c3-4471a01e8fb8.PNG)
