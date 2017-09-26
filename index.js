const fs = require('fs');
const parse = require('csv-parse');
const async = require('async');

// The original database is (at least it was) available from tacdb.osmocom.org
// I have no idea how full is it. But it has my phone vendor's TACs.
const tacdbFilePath= __dirname + '/data/tacdb_consistent_sorted_clear.csv';
const dbHeaders = ["tac","name","name","contributor","comment","gsmarena","gsmarena","aka","type"];

// This one knows the Luhn algorythm
const checkdigit = require('checkdigit');

const MODE_DEBUG = false;

var imei_gencheck = {};
imei_gencheck.DB = [];

// these will be overwritten as the DB will load.
imei_gencheck.minTAClength = 0;
imei_gencheck.maxTAClength = 15;

imei_gencheck.searchIterationTimeout_ms = 3;

// Becomes true when DB has been loaded
imei_gencheck.DBisReady = false;

// Just sorted the db by exel so this is obsolete now. //todo: find how to fast-search in a sorted array.
// function compare_TACDB(tacObj1, tacObj2){
//     return tacObj1.TAC - tacObj2.TAC;
// }

imei_gencheck.fixIMEI = (imei)=>{
    if (imei.length === 15 && checkdigit.mod10.isValid(imei)){
        return imei;
    }
    else{
        let rez_withoutLuhn = imei.substr(0,14);
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }
}

imei_gencheck.nextIMEI = (tac, prev_imei) => {
    let serial_str = prev_imei.substr(tac.length, 14 - tac.length);
    let new_serial_int = parseInt(serial_str) + 1;
    let rez_withoutLuhn = tac + "" + new_serial_int;
    return checkdigit.mod10.apply(rez_withoutLuhn);
}

imei_gencheck.randomIMEI_fullRandom = () => {
    let rez_withoutLuhn = "";
    for (let i = 0; i < 14; i++)
    {
        let newDigit = Math.floor(Math.random() * 10);
        rez_withoutLuhn += newDigit;
    }
    return checkdigit.mod10.apply(rez_withoutLuhn);
}

// This loads the TAC DB and makes related functions available.

imei_gencheck.loadDB = () => {
    return new Promise((loadDB_resolve, loadDB_reject)=>{
        if (MODE_DEBUG) console.log("      Loading the DB...");
        imei_gencheck.DB = [];
        imei_gencheck.DBisReady = false;
        //reading and parsing the csv
        var parser = parse({delimiter: ','}, function (err, data) {
            if(err!=null){
                console.log(data);
                loadDB_reject(err);
            }
            async.eachSeries(data, function (line, linecallback) {
                let newTACinfo = {
                    "tac":          line[0],
                    "name1":        line[1],
                    "name2":        line[2],
                    "aka":          line[7],
                    "gsmarena1":    line[5],
                    "gsmarena2":    line[6],
                    "comment":      line[3],
                    "type":         ""
                };

                if (newTACinfo.tac.length < imei_gencheck.minTAClength) {
                    imei_gencheck.minTAClength = newTACinfo.tac.length;
                }
                if (newTACinfo.tac.length > imei_gencheck.maxTAClength) {
                    imei_gencheck.maxTAClength = newTACinfo.tac.length;
                }

                imei_gencheck.DB.push(newTACinfo);

                setImmediate(()=>{linecallback();});
            },
            (err, rez)=>{
                if (MODE_DEBUG) console.log("      DB loaded!");
                if (MODE_DEBUG) console.log(`      There are ${imei_gencheck.DB.length} TACs.`);
                imei_gencheck.DBisReady = true;
        
                // *** GENERATORS ***
        
                imei_gencheck.randomIMEI_TACfromDB = () => {
                    let tacFromDB_id = Math.floor(Math.random() * imei_gencheck.DB.length);
                    let tacFromDB = imei_gencheck.DB[tacFromDB_id].tac;
                    let rez_withoutLuhn = tacFromDB;
                    while (rez_withoutLuhn.length < 14) {
                        let newDigit = Math.floor(Math.random() * 10);
                        rez_withoutLuhn += newDigit;
                    }
                    return checkdigit.mod10.apply(rez_withoutLuhn);
                }
        
                imei_gencheck.randomTACInfoFromDB = ()=>{
                    let tacFromDB_id = Math.floor(Math.random() * imei_gencheck.DB.length);
                    return imei_gencheck.DB[tacFromDB_id];
                }
        
                imei_gencheck.randomIMEIwithTAC = (tac)=>{
                    let rez_withoutLuhn = tac;
                    while (rez_withoutLuhn.length < 14) {
                        let newDigit = Math.floor(Math.random() * 10);
                        rez_withoutLuhn += newDigit;
                    }
                    return checkdigit.mod10.apply(rez_withoutLuhn);
                }
        
                // TODO. This seems to require some datamining. The DB doesn't have device types so i need another DB.
                // Also i wonder if some vendors just make different device types on a single TAC.
                // imei_gencheck.randomTACInfoWithDeviceType = (type)=>{
                //     //todo
                // }
        
                // *** FINDERS ***
        
                imei_gencheck.findTACinfo = (tacToFind) => {
                return new Promise((find_resolve, find_reject)=>{
                    let foundTACs = [];

                    let dblen = imei_gencheck.DB.length;
                    let curIndex = 0;
                    let perCycle = 1000;

                    let nonBlockingSearch = function (nonBlockingSearchCallBack) {
                        for (let i = 0; i < perCycle; i++) {
                            if (curIndex + i === dblen) {
                                break;
                            }
                            if (imei_gencheck.DB[curIndex + i].tac === tacToFind) {
                                foundTACs.push(imei_gencheck.DB[curIndex + i]);
                            }
                        }
                        curIndex += perCycle;
                        if (curIndex < dblen) {
                            setTimeout(function () { nonBlockingSearchCallBack(nonBlockingSearchCallBack); }, imei_gencheck.searchIterationTimeout_ms);
                        }
                        else {
                            if (foundTACs.length > 0) {
                                find_resolve(foundTACs);
                            } else {
                                find_resolve(null);
                            }
                        }
                    }

                    nonBlockingSearch(nonBlockingSearch);
                });
                }

                //todo: this one is begging for some parallelism
                imei_gencheck.findTACInfoByIMEI = (imei) => {
                return new Promise((find_resolve, find_reject)=>{
                    
                    let curTAClength = imei_gencheck.minTAClength;

                    let foundTACs = [];

                    recursiveTACSearch = function () {
                        let tacToFind = imei.substr(0, curTAClength);

                        imei_gencheck.findTACinfo(tacToFind)
                        .then(iteration_foundTACs => {
                            if (iteration_foundTACs != null) {
                                for (let i = 0; i < iteration_foundTACs.length; i++) {
                                    foundTACs.push(iteration_foundTACs[i]);
                                }
                            }

                            curTAClength++;
                            if (curTAClength > imei_gencheck.maxTAClength) {
                                if (foundTACs.length > 0) {
                                    find_resolve(foundTACs);
                                } else {
                                    find_resolve(null);
                                }
                            } else {
                                recursiveTACSearch();
                            }
                        });
                    }

                    recursiveTACSearch();
                });
                }

                imei_gencheck.randomTACInfoWithVendorName = function (name1) {
                return new Promise((find_resolve, find_reject)=>{
                    let nameToFind = name1.toLowerCase();
                    let foundTACs = [];

                    let dblen = imei_gencheck.DB.length;
                    let curIndex = 0;
                    let perCycle = 1000;

                    let nonBlockingSearch = function (nonBlockingSearchCallBack) {
                        //console.log(Date.now());
                        for (let i = 0; i < perCycle; i++) {
                            if (curIndex + i === dblen) {
                                break;
                            }
                            if (imei_gencheck.DB[curIndex + i].name1.toLowerCase() === nameToFind) {
                                foundTACs.push(imei_gencheck.DB[curIndex + i]);
                            }
                        }
                        curIndex += perCycle;
                        if (curIndex < dblen) {
                            setTimeout(function () { nonBlockingSearchCallBack(nonBlockingSearchCallBack); }, imei_gencheck.searchIterationTimeout_ms);
                        }
                        else {
                            //console.log(foundTACs);
                            if (foundTACs.length > 0) {
                                chosenTACInfoID = Math.floor(Math.random() * foundTACs.length)
                                find_resolve(foundTACs[chosenTACInfoID]);
                            } else {
                                find_resolve(null);
                            }
                        }
                    }

                    nonBlockingSearch(nonBlockingSearch);
                });
                }

                imei_gencheck.randomTACInfoWithNames = (name1, name2) => {
                return new Promise((find_resolve, find_reject)=>{
                    let nameToFind1 = name1.toLowerCase();
                    let nameToFind2 = name2.toLowerCase();
                    let foundTACs = [];

                    let dblen = imei_gencheck.DB.length;
                    let curIndex = 0;
                    let perCycle = 1000;

                    let nonBlockingSearch = function (nonBlockingSearchCallBack) {
                        //console.log(Date.now());
                        for (let i = 0; i < perCycle; i++) {
                            if (curIndex + i === dblen) {
                                break;
                            }
                            if (
                                (imei_gencheck.DB[curIndex + i].name1.toLowerCase() === nameToFind1)
                                &&
                                (imei_gencheck.DB[curIndex + i].name2.toLowerCase() === nameToFind2)
                            ) {
                                foundTACs.push(imei_gencheck.DB[curIndex + i]);
                            }
                        }
                        curIndex += perCycle;
                        if (curIndex < dblen) {
                            setTimeout(function () { nonBlockingSearchCallBack(nonBlockingSearchCallBack); }, imei_gencheck.searchIterationTimeout_ms);
                        }
                        else {
                            //console.log(foundTACs);
                            if (foundTACs.length > 0) {
                                chosenTACInfoID = Math.floor(Math.random() * foundTACs.length)
                                find_resolve(foundTACs[chosenTACInfoID]);
                            } else {
                                find_resolve(null);
                            }
                        }
                    }

                    nonBlockingSearch(nonBlockingSearch);
                });
                }

                // todo:
                //imei_gencheck.findTACInfoByFields(fields, outerCallback){
                //
                //}
                
                loadDB_resolve(imei_gencheck.DB.length);
            });
        });
        csvDBStream = fs.createReadStream(tacdbFilePath);
        csvDBStream.pipe(parser);
    });
};

module.exports = imei_gencheck;

// some implicit testing code for my debugging:
// imei_gencheck.loadDB()
// .then(rowcount=>imei_gencheck.findTACInfoByIMEI("499901012345671")
// .then(tacinfo=>console.log(JSON.stringify(tacinfo)))
// );
