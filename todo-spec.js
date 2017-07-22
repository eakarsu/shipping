

describe('angularjs homepage todo list', function() {
    it('should add a todo', function() {
        var util = require("./fedexUtils");
        var Promise = require("bluebird");

        browser.ignoreSynchronization = true;
        browser.get('https://www.fedex.com/servlet/InvoiceServlet?link=2&jsp_name=adjustment&orig_country=US&language=english');


        browser.driver.findElement(by.name('service_type')).click();
        browser.driver.findElement(by.name('pay_type')).click();

        browser.driver.findElement(by.name('NewReq')).click();

        expect(  element(by.name('tracking_nbr')));
        expect(  element(by.id('nucaptcha-answer')));

        browser.driver.findElement(by.name('tracking_nbr')).sendKeys("642755709303");
        browser.driver.findElement(by.name('invoice_nbr')).sendKeys("155723013");

        //browser.driver.findElement(by.id('nucaptcha-answer')).sendKeys("ABCD");

        //browser.driver.findElement(by.xpath("//input[@type='SUBMIT']")).click();

        browser.driver.wait(function() {
            return browser.driver.findElement(by.id('nucaptcha-media'))
                .then(function(elem) {
                    return elem.getAttribute("src").then (x=>{
                        console.log (" elem.getAttribut:"+x);
                        var captchaPromise;
                        browser.controlFlow().execute(function() {
                            captchaPromise = util.obtainCaptcha(x);
                            console.log ("First block")
                        },5000);

                        browser.controlFlow().execute(function() {
                            browser.driver.wait(function () {
                                console.log ("Second block")
                                return Promise.all([captchaPromise]);
                            }, 15000);
                        });

                        browser.controlFlow().execute(function() {
                            captchaPromise.then(x=> {
                                console.log ("Third block")
                                console.log(x);
                                browser.driver.findElement(by.id('nucaptcha-answer')).sendKeys(x);
                                browser.driver.findElement(by.xpath("//input[@type='SUBMIT']")).click();
                            })
                        },5000);
                    })
                    return true;
                });
        }, 1);



        //expect( browser.driver.findElement(by.name('tracking_nbr')));
        //expect( browser.driver.findElement(by.id('nucaptcha-media')));

        /*
        var elem = browser.driver.findElement(by.id('nucaptcha-media'));
        elem.then (elemx=>{
            var captchaPromise = util.obtainCaptcha(elem.getAttribute("src"));
            captchaPromise.then (x=>{
                console.log (x);
                browser.driver.findElement(by.id('nucaptcha-answer')).sendKeys(x);
            })
        })
        */
        //browser.pause();
        //expect(  browser.driver.findElement(by.tagName('span'))).getText().toEqual('Please enter your tracking number.');

        /*
        var todoList = element.all(by.repeater('todo in todoList.todos'));
        expect(todoList.count()).toEqual(3);
        expect(todoList.get(2).getText()).toEqual('write first protractor test');

        // You wrote your first test, cross it off the list
        todoList.get(2).element(by.css('input')).click();
        var completedAmount = element.all(by.css('.done-true'));
        expect(completedAmount.count()).toEqual(2);
        */
    });
});

/*
 describe('Fixed test', function(){

 it('should navigate', function() {
 this.timeout(10000);

 protractor.promise.controlFlow().execute(function() {
 var deferred = new protractor.promise.Deferred();
 request.get("http://ip.jsontest.com/", function(e, c, body) {
 deferred.fulfill(body);
 });
 return deferred.promise;
 }).then(function(results) {
 browser.get("https://www.yahoo.com").then(function() {
 console.log("here, and the resolved promise is: " + results);
 })
 });
 });
 });
 */

