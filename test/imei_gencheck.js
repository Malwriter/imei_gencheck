const expect    = require("chai").expect;
const imei_gencheck = require("../index.js");


describe("IMEI generator and checker:", function (){
    describe("(Using a TAC DB from tacdb.osmocom.org)", function (){
        it("loads the DB on demand from a CSV file in 'data' dir, allowing other functions usage", function (done){
            this.timeout(10000);
            imei_gencheck.loadDB()
            .then(rowCount=>{
                expect(rowCount).to.above(25000);
                expect(imei_gencheck.DB.length).to.above(25000);
                done();
            });
        });
    });
    describe("(Generating randomized TACs and IMEIs)", ()=>{
        it("creates the next IMEI number from a given TAC and an IMEI",()=>{
            let imei = imei_gencheck.nextIMEI("12345", "123451999999995");
            expect(imei).to.equal("123452000000005");
        });
        
        it("fully randomizes an IMEI (likely to be non-existent)",()=>{
            let imei = imei_gencheck.randomIMEI_fullRandom();
            expect(imei.length).to.equal(15);
        });

        it("randomizes an IMEI with a random TAC from DB",()=>{
            let imei = imei_gencheck.randomIMEI_TACfromDB();
            expect(imei.length).to.equal(15);
        });
        
        it("randomly outputs a known TAC from the DB",()=>{
            let tac = imei_gencheck.randomTACInfoFromDB();
            expect(typeof tac).to.equal("object");
            expect(tac === null).to.equal(false);
        });

        it("randomizes an IMEI for a given TAC",()=>{
            let imei = imei_gencheck.randomIMEIwithTAC("12345");
            expect(imei.length).to.equal(15);
        });

        it("Finds a TAC info for a given device vendor name",(done)=>{
            imei_gencheck.randomTACInfoWithVendorName("Nokia")
            .then( tacinfo => {
                expect(tacinfo.name1.toLowerCase()).to.equal("nokia");
                done();
            });            
        });

        it("Finds a TAC info for a given full device name (vendor and model as strings)",(done)=>{
            imei_gencheck.randomTACInfoWithNames("Nokia", "1100b")
            .then( tacinfo => {
                expect(tacinfo.tac).to.equal("1037200");
                done();
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
            let corrected = imei_gencheck.fixIMEI("123456789012345");
            expect(corrected).to.not.equal("123456789012345");
            expect(corrected.length).to.equal(15);
        });
        
        it("finds a given TAC in DB and returns a member from imei_gencheck.DB or null if fails to", function (done) {
            imei_gencheck.findTACinfo("49013920")
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
                            comment: '',
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
            imei_gencheck.findTACInfoByIMEI("499901012345671")
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
                            comment: '',
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

