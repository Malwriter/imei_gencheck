const fs = require('fs');
const parse = require('csv-parse');
const async = require('async');

// This one knows the Luhn algorythm
const checkdigit = require('checkdigit');

const MODE_DEBUG = false;

class IMEI_GenCheck{
    constructor(param_dbPath = '') {
    // ############## PRIVATE MEMBERS ##############
    //                      \ /

    let _DB = [];

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
    let minTAClength = 15;
    let maxTAClength = 0;

    function internal_matchRow2Fields(row, fields, strictMatch){
        for(let fld in fields){
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

    function internal_recursive_NonBlocking_SearchByFields
    (fields, strictSearch, 
    curIndex, perCycle, dblen, foundTACs, 
    find_resolve, find_reject){
        for(let i=0; (i<perCycle) && (i+curIndex < dblen); i++ ){
            if(
                internal_matchRow2Fields(
                    _DB[i+curIndex], 
                    fields, 
                    strictSearch
                )
            ){
                foundTACs.push(_DB[i+curIndex]);
            }
        }
        curIndex+=perCycle;
        
        
        if(curIndex < dblen){
            setTimeout(function () {
                internal_recursive_NonBlocking_SearchByFields(
                    fields, strictSearch, 
                    curIndex, perCycle, dblen, foundTACs, 
                    find_resolve, find_reject);
            }, searchIterationTimeout_ms);
        }else{
            if (foundTACs.length > 0) {
                find_resolve(foundTACs);
            } else {
                find_resolve(null);
            }
        }
    }

    function internal_searchByFields(fields, strictSearch=false){
    return new Promise((find_resolve, find_reject)=>{
        let foundTACs = [];

        let curIndex = 0;
        let perCycle = 1000;
        let dblen = _DB.length;

        internal_recursive_NonBlocking_SearchByFields(
            fields, strictSearch, 
            curIndex, perCycle, dblen, foundTACs,
            find_resolve, find_reject
        )
    });
    }
    

    // This is called when the DB is already in RAM from inside LoadDB()
    // Initializes all the features accessing the database.
    const initializeDatabaseFeatures = function(){
        this.randomIMEI_TACfromDB = () => {
            let tacFromDB_id = Math.floor(Math.random() * _DB.length);
            let tacFromDB = _DB[tacFromDB_id].tac;
            let rez_withoutLuhn = tacFromDB;
            while (rez_withoutLuhn.length < 14) {
                let newDigit = Math.floor(Math.random() * 10);
                rez_withoutLuhn += newDigit;
            }
            return checkdigit.mod10.apply(rez_withoutLuhn);
        }


        // ############## PUBLIC MEMBERS ##############
        //                     \ /

        this.randomTACInfoFromDB = ()=>{
            let tacFromDB_id = Math.floor(Math.random() * _DB.length);
            return _DB[tacFromDB_id];
        }

        // TODO. This seems to require some datamining. The DB doesn't have device types so i need another DB.
        // Also i wonder if some vendors just make different device types on a single TAC.
        // this.randomTACInfoWithDeviceType = (type)=>{
        //     //todo
        // }

        // *** FINDERS ***

        this.findTACinfo = (tacToFind) => {
            return internal_searchByFields({"tac": tacToFind});
        }

        //todo: this one is begging for some parallelism, thogh after the fix looks as good as the others
        this.findTACInfoByIMEI = (imei) => {
        return new Promise((find_resolve, find_reject)=>{
            let foundTACs = [];
            let curTAClength = minTAClength;

            (function recursiveTACSearch() {
                let tacToFind = imei.substr(0, curTAClength);

                internal_searchByFields({"tac": tacToFind})
                .then(iteration_foundTACs => {
                    if (iteration_foundTACs !== null) {
                        iteration_foundTACs.forEach((tacinfo)=>{
                            foundTACs.push(tacinfo);
                        });
                    }

                    curTAClength++;
                    if (curTAClength > maxTAClength) {
                        if (foundTACs.length > 0) {
                            find_resolve(foundTACs);
                        } else {
                            find_resolve(null);
                        }
                    } else {
                        recursiveTACSearch();
                    }
                });
            })();
        });
        }

        this.findTACInfosWithVendorName = function (name1) {
            return internal_searchByFields({"name1": name1});
        }

        this.findTACsWithFullName = function(name1, name2) {
            return internal_searchByFields({"name1": name1, "name2": name2});
        }

        // todo:
        this.findTACInfosByFields = function (fields, strictSearch=false){
            return internal_searchByFields(fields, strictSearch);
        }
    }

    

    // Becomes true when DB has been loaded
    let _DBisReady = false;

    // This loads the TAC DB and makes related functions available
    // by calling the initializeDatabaseFeatures after the loading
    this.loadDB = function(){
    return new Promise(((loadDB_resolve, loadDB_reject)=>{
        if (MODE_DEBUG) console.log("      Loading the DB...");
        _DB = [];
        _DBisReady = false;
        //reading and parsing the csv
        var parser = parse ( {delimiter: ','}, (function (err, data) {
            if(err!=null){
                console.log(err);
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

                    if (newTACinfo.tac.length < minTAClength) {
                        minTAClength = newTACinfo.tac.length;
                    }
                    if (newTACinfo.tac.length > maxTAClength) {
                        maxTAClength = newTACinfo.tac.length;
                    }

                    _DB.push(newTACinfo);

                    setImmediate(()=>{linecallback.call(this);});
                }).bind(this),

                ((err, rez)=>{
                    if (MODE_DEBUG) console.log("      DB loaded!");
                    if (MODE_DEBUG) console.log(`      There are ${_DB.length} TACs.`);
                    this.DBisReady = true;
            
                    initializeDatabaseFeatures.call(this);
                    
                    loadDB_resolve(_DB.length);
                }).bind(this)
            );
            
            }).bind(this)
        );
        const csvDBStream = fs.createReadStream(tacdbFilePath);
        csvDBStream.pipe(parser);
    }).bind(this));
    };
};

    // These public methods are able to work without the database, they are just IMEI utilities.
    // That's why they are static and usable directly from the class definition
    static fixIMEI(imei){
        if (imei.length === 15 && checkdigit.mod10.isValid(imei)){
            return imei;
        }
        else{
            let rez_withoutLuhn = imei.substr(0,14);
            return checkdigit.mod10.apply(rez_withoutLuhn);
        }
    }

    static nextIMEI(tac, prev_imei){
        let serial_str = prev_imei.substr(tac.length, 14 - tac.length);
        let new_serial_int = parseInt(serial_str) + 1;
        let rez_withoutLuhn = tac + "" + new_serial_int;
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }

    static randomIMEI_fullRandom(){
        let rez_withoutLuhn = "";
        for (let i = 0; i < 14; i++)
        {
            let newDigit = Math.floor(Math.random() * 10);
            rez_withoutLuhn += newDigit;
        }
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }

    static randomIMEIwithTAC(tac){
        let rez_withoutLuhn = tac;
        while (rez_withoutLuhn.length < 14) {
            let newDigit = Math.floor(Math.random() * 10);
            rez_withoutLuhn += newDigit;
        }
        return checkdigit.mod10.apply(rez_withoutLuhn);
    }

}

module.exports = IMEI_GenCheck;


// some implicit testing code for my debugging:

// const searchObj = {name1: "Nokia", aka:"1112b"};
// const strictSearch = false;

// let igc = new IMEI_GenCheck();

// igc.loadDB()
// .then(rowcount=>{
//     console.log(rowcount);
//     return igc.findTACInfoByIMEI("499901012345671");
//     //return igc.findTACInfoByFields(searchObj, strictSearch);
//     //return igc.randomTACInfoWithNames("Nokia", "1100b");
// })
// .then(rez=>
//     console.log(JSON.stringify(rez, null, 2))

// );