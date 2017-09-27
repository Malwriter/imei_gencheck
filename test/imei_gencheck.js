const expect    = require("chai").expect;
const IMEI_Gencheck = require("../index.js");

const igc = new IMEI_Gencheck();

describe("IMEI generator and checker:", function (){
    describe("(Using a TAC DB from tacdb.osmocom.org)", function (){
        it("loads the DB on demand from a CSV file in 'data' dir, allowing other functions usage", 
        function (done){ // Arrow functions don't have access to "this". ¯\_(ツ)_/¯
            this.timeout(10000);
            igc.loadDB()
            .then(function (rowCount){
                expect(rowCount).to.above(25000);
                expect(igc.DB.length).to.above(25000);
                expect(loadDB.DBisReady).to.equal(true);
                done();
            });
        });
    });
    describe("(Generating randomized TACs and IMEIs)", ()=>{
        it("creates the next IMEI number from a given TAC and an IMEI",()=>{
            let imei = igc.nextIMEI("12345", "123451999999995");
            expect(imei).to.equal("123452000000005");
        });
        
        it("fully randomizes an IMEI (likely to be non-existent)",()=>{
            let imei = igc.randomIMEI_fullRandom();
            expect(imei.length).to.equal(15);
        });

        it("randomizes an IMEI with a random TAC from DB",()=>{
            let imei = igc.randomIMEI_TACfromDB();
            expect(imei.length).to.equal(15);
        });
        
        it("randomly outputs a known TAC from the DB",()=>{
            let tacinfo = igc.randomTACInfoFromDB();
            expect(typeof tacinfo).to.equal("object");
            expect(tacinfo.tac.length).to.above(4);
        });

        it("randomizes an IMEI for a given TAC",()=>{
            let imei = igc.randomIMEIwithTAC("12345");
            expect(imei.length).to.equal(15);
        });

        it("Finds a TAC info for a given device vendor name",
        function (done) {
            igc.randomTACInfoWithVendorName("Nokia")
            .then( tacinfo => {
                expect(tacinfo.name1.toLowerCase()).to.equal("nokia");
                done();
            });            
        });

        it("Finds a TAC info for a given full device name (vendor and model as strings)",
        function (done) {
            igc.randomTACInfoWithNames("Nokia", "1100b")
            .then( tacinfo => {
                expect(tacinfo.tac).to.equal("1037200");
                done();
            });
        });

        it("Finds a TAC info for a given object with {field:value} for TAC parameters to search by",
        function (done) {
            const searchObj = {name1: "Nokia", aka:"1112b"};
            igc.findTACInfoByFields(searchObj)
            .then(foundTACs=>{
                expect(foundTACs.length).to.above(5);
                expect(foundTACs[0].tac).to.equal("1108700");
            })
            .then(()=>{
                const failObj = {name1: "###Non###", aka:"###Existent###"};
                return igc.findTACInfoByFields(failObj, true);
            })
            .then(foundTACs=>{
                expect(foundTACs).to.equal(null);
                done();
            })
            .catch(err=>{
                throw(err);
            });

        });

        // TODO. This seems to require some datamining. The DB doesn't have device types so i need another DB.
        // Also it seems like some vendors just make different device types on a single TAC.
        // it("randomizes an IMEI for a given device type (EXPERIMENTAL)",()=>{
        //     let imei = imei_gencheck.randomTACInfoWithDeviceType("Smartphone");
        //     expect(imei.length).to.equal(15);
        // });
    });

    describe("(Checking TACs and IMEIs)", ()=>{
        it("checks if a given 15-digit string has the correct Luhn digit, returns an IMEI with correct(ed) Luhn digit", ()=>{
            let corrected = igc.fixIMEI("123456789012345");
            expect(corrected).to.not.equal("123456789012345");
            expect(corrected.length).to.equal(15);
        });
        
        it("finds a given TAC in DB and returns a member from imei_gencheck.DB or null if fails to", 
        function (done) {
            this.timeout(10000);
            igc.findTACinfo("49013920")
            .then( tacinfo => {
                expect(tacinfo).to.deep.equal(
                    [ 
                        { 
                            tac: '49013920',
                            name1: 'Nokia',
                            name2: '1610',
                            aka: '1610+,1611,1611+,NHE-5NX',
                            gsmarena1: '',
                            gsmarena2: 'http://www.gsmarena.com/nokia-phones-1.php',
                            comment: 'OsmoDevCon 2014',
                            type: '' 
                        } 
                    ]
                );
                done();
            });
        });

        it("tries to find TAC infos for a given IMEI, returns null if none found",
        function (done){
            this.timeout(10000);
            igc.findTACInfoByIMEI("499901012345671")
            .then( foundTACs => {
                expect(foundTACs).to.deep.equal(
                    [ 
                        { 
                            tac: '499901',
                            name1: 'CHUWI',
                            name2: 'CW-Vi7',
                            aka: '',
                            gsmarena1: '',
                            gsmarena2: '',
                            comment: 'OsmoTACDB client',
                            type: '' 
                        } 
                    ]
                );
                done();
            });
        });

        // it("searches for TACInfo objects by given fields and returns them as an array",function (done){
        //     imei_gencheck.findTACInfoByFields(["tac"], ["499901"], function (infos){
        //         expect(infos[0].tac).to.equal("499901");
        //         done();
        //     });
        // });

    });
        

});

