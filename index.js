const fs = require('fs');
const parse = require('csv-parse');
const async = require('async');

// This one knows the Luhn algorythm
const checkdigit = require('checkdigit');

const MODE_DEBUG = false;

const IMEI_GenCheck = function(param_dbPath = '') {
    // ############## PRIVATE MEMBERS ##############
    //                      \ /

    // The original database is (at least it was) available from tacdb.osmocom.org
    // I have no idea how full is it. But it has my phone vendor's TACs.
    let tacdbFilePath;
    if(param_dbPath === ''){
        tacdbFilePath= __dirname + '/data/tacdb_consistent_sorted_clear.csv';
    }else{
        tacdbFilePath = param_dbPath;
    }
    const dbHeaders = ["tac","name","name","contributor","comment","gsmarena","gsmarena","aka","type"];

    // When doing searches, wait a lil so we don't stop everything. Maybe i shouldn't make it more than 1? Or 0?
    const searchIterationTimeout_ms = 3;
    
    // these will be overwritten as the DB will load.
    let minTAClength = 0;
    let maxTAClength = 15;

    // This is called when the DB is already in RAM from inside LoadDB()
    // Initializes all the features accessing the database.
    const initializeDatabaseFeatures = function(){
        this.randomIMEI_TACfromDB = () => {
            let tacFromDB_id = Math.floor(Math.random() * this.DB.length);
            let tacFromDB = this.DB[tacFromDB_id].tac;
            let rez_withoutLuhn = tacFromDB;
            while (rez_withoutLuhn.length < 14) {
                let newDigit = Math.floor(Math.random() * 10);
                rez_withoutLuhn += newDigit;
            }
            return checkdigit.mod10.apply(rez_withoutLuhn);
        }

        this.randomTACInfoFromDB = ()=>{
            let tacFromDB_id = Math.floor(Math.random() * this.DB.length);
            return this.DB[tacFromDB_id];
        }

        // TODO. This seems to require some datamining. The DB doesn't have device types so i need another DB.
        // Also i wonder if some vendors just make different device types on a single TAC.
        // this.randomTACInfoWithDeviceType = (type)=>{
        //     //todo
        // }

        // *** FINDERS ***

        this.findTACinfo = (tacToFind) => {
        return new Promise((find_resolve, find_reject)=>{
            let foundTACs = [];

            let dblen = this.DB.length;
            let curIndex = 0;
            let perCycle = 1000;

            let nonBlockingSearch = function (nonBlockingSearchCallBack) {
                for (let i = 0; i < perCycle; i++) {
                    if (curIndex + i === dblen) {
                        break;
                    }
                    if (this.DB[curIndex + i].tac === tacToFind) {
                        foundTACs.push(this.DB[curIndex + i]);
                    }
                }
                curIndex += perCycle;
                if (curIndex < dblen) {
                    setTimeout(function () { nonBlockingSearchCallBack(nonBlockingSearchCallBack); }, this.searchIterationTimeout_ms);
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
        this.findTACInfoByIMEI = (imei) => {
        return new Promise((find_resolve, find_reject)=>{
            
            let curTAClength = this.minTAClength;

            let foundTACs = [];

            recursiveTACSearch = function () {
                let tacToFind = imei.substr(0, curTAClength);

                this.findTACinfo(tacToFind)
                .then(iteration_foundTACs => {
                    if (iteration_foundTACs != null) {
                        for (let i = 0; i < iteration_foundTACs.length; i++) {
                            foundTACs.push(iteration_foundTACs[i]);
                        }
                    }

                    curTAClength++;
                    if (curTAClength > this.maxTAClength) {
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
        };

        this.randomTACInfoWithVendorName = (function (name1) {
        return new Promise(((find_resolve, find_reject)=>{
            let nameToFind = name1.toLowerCase();
            let foundTACs = [];

            let dblen = this.DB.length;
            let curIndex = 0;
            let perCycle = 1000;

            (function nonBlockingSearch() {
                //console.log(Date.now());
                for (let i = 0; i < perCycle; i++) {
                    if (curIndex + i === dblen) {
                        break;
                    }
                    if (this.DB[curIndex + i].name1.toLowerCase() === nameToFind) {
                        foundTACs.push(this.DB[curIndex + i]);
                    }
                }
                curIndex += perCycle;
                if (curIndex < dblen) {
                    setTimeout(
                        (function () { 
                            nonBlockingSearch.call(this); 
                        }).bind(this), 
                        this.searchIterationTimeout_ms);
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
            }).call(this);
        }).bind(this));
        }).bind(this)

        this.randomTACInfoWithNames = (name1, name2) => {
        return new Promise((find_resolve, find_reject)=>{
            let nameToFind1 = name1.toLowerCase();
            let nameToFind2 = name2.toLowerCase();
            let foundTACs = [];

            let dblen = this.DB.length;
            let curIndex = 0;
            let perCycle = 1000;

            let nonBlockingSearch = function (nonBlockingSearchCallBack) {
                //console.log(Date.now());
                for (let i = 0; i < perCycle; i++) {
                    if (curIndex + i === dblen) {
                        break;
                    }
                    if (
                        (this.DB[curIndex + i].name1.toLowerCase() === nameToFind1)
                        &&
                        (this.DB[curIndex + i].name2.toLowerCase() === nameToFind2)
                    ) {
                        foundTACs.push(this.DB[curIndex + i]);
                    }
                }
                curIndex += perCycle;
                if (curIndex < dblen) {
                    setTimeout(function () { 
                        nonBlockingSearchCallBack(nonBlockingSearchCallBack); 
                    }, this.searchIterationTimeout_ms);
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
        this.findTACInfoByFields = (function (fields, strictSearch=false){
        return new Promise(((find_resolve, find_reject)=>{
            let foundTACs = [];

            let curIndex = 0;
            let perCycle = 1000;
            let dblen = this.DB.length;

            function matchRow2Fields(row, fields, strictMatch){
                for(fld in fields){
                    if ((function(){
                        if(strictMatch){
                            return  row[fld].toLowerCase()
                                    !==
                                    fields[fld].toLowerCase() 
                        }else{
                            return  row[fld].toLowerCase()
                                    .indexOf(fields[fld].toLowerCase()) 
                                    === -1;
                        }
                    })()){
                        return false;
                    }
                }
                return true;
            }

            (function recursiveNonBlockingSearch(){
                

                for(let i=0; (i<perCycle) && (i+curIndex<dblen); i++ ){
                    if(matchRow2Fields(
                        this.DB[i+curIndex], 
                        fields, 
                        strictSearch))
                    {
                        foundTACs.push(this.DB[i+curIndex]);
                    }
                }
                curIndex+=perCycle;
                
                
                if(curIndex < dblen){
                    setTimeout((function () {
                        recursiveNonBlockingSearch.call(this);
                    }).bind(this), this.searchIterationTimeout_ms);
                }else{
                    if (foundTACs.length > 0) {
                        find_resolve(foundTACs);
                    } else {
                        find_resolve(null);
                    }
                }
            }).call(this);
        }).bind(this));
        }).bind(this);
    }

    // ############## PUBLIC MEMBERS ##############
    //                     \ /
    

    // Becomes true when DB has been loaded
    this.DBisReady = false;

    // This loads the TAC DB and makes related functions available
    // by calling the initializeDatabaseFeatures after the loading
    this.loadDB = function(){
    return new Promise(((loadDB_resolve, loadDB_reject)=>{
        if (MODE_DEBUG) console.log("      Loading the DB...");
        this.DB = [];
        this.DBisReady = false;
        //reading and parsing the csv
        var parser = parse({delimiter: ','}, function (err, data) {
            if(err!=null){
                console.log(data);
                loadDB_reject(err);
            }
            async.eachSeries(data, (function (line, linecallback) {
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

                if (newTACinfo.tac.length < this.minTAClength) {
                    this.minTAClength = newTACinfo.tac.length;
                }
                if (newTACinfo.tac.length > this.maxTAClength) {
                    this.maxTAClength = newTACinfo.tac.length;
                }

                this.DB.push(newTACinfo);

                setImmediate(()=>{linecallback();});
            }).bind(this),
            ((err, rez)=>{
                if (MODE_DEBUG) console.log("      DB loaded!");
                if (MODE_DEBUG) console.log(`      There are ${this.DB.length} TACs.`);
                this.DBisReady = true;
        
                initializeDatabaseFeatures.call(this);
                
                loadDB_resolve(this.DB.length);
            }).bind(this));
        }.bind(this));
        csvDBStream = fs.createReadStream(tacdbFilePath);
        csvDBStream.pipe(parser);
    }).bind(this));
    };
};

// Hello my name is Malwriter and i love using IIFE for code folding (Applause)
// These public methods are able to work without the database, they are just IMEI utilities.
// That's why they are on the Prototype of the class.
(function PublicMethods_CreateOnPrototype(){
    IMEI_GenCheck.prototype.fixIMEI = (imei)=>{
        if (imei.length === 15 && checkdigit.mod10.isValid(imei)){
            return imei;
        }
        else{
            let rez_withoutLuhn = imei.substr(0,14);
            return checkdigit.mod10.apply(rez_withoutLuhn);
        }
    }


    IMEI_GenCheck.prototype.nextIMEI = (tac, prev_imei) => {
        let serial_str = prev_imei.substr(tac.length, 14 - tac.length);
        let new_serial_int = parseInt(serial_str) + 1;
        let rez_withoutLuhn = tac + "" + new_serial_int;
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }


    IMEI_GenCheck.prototype.randomIMEI_fullRandom = () => {
        let rez_withoutLuhn = "";
        for (let i = 0; i < 14; i++)
        {
            let newDigit = Math.floor(Math.random() * 10);
            rez_withoutLuhn += newDigit;
        }
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }

    IMEI_GenCheck.prototype.randomIMEIwithTAC = (tac)=>{
        let rez_withoutLuhn = tac;
        while (rez_withoutLuhn.length < 14) {
            let newDigit = Math.floor(Math.random() * 10);
            rez_withoutLuhn += newDigit;
        }
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }
})();

module.exports = IMEI_GenCheck;


// some implicit testing code for my debugging:

// const searchObj = {name1: "Nokia", aka:"1112b"};
// const strictSearch = false;

// let igc = new IMEI_GenCheck();

// igc.loadDB()
// .then(rowcount=>{
//     console.log(igc.DB.length);
//     return igc.randomTACInfoWithVendorName("ASUS");
//     //return igc.findTACInfoByFields(searchObj, strictSearch);
// })
// .then(rez=>console.log(JSON.stringify(rez, null, 2)));