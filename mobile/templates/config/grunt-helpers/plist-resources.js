'use strict';
var plist      = require('plist');
var fs         = require('fs');
var https      = require('http');
var path       = require('path');
var url        = require('url');
var _          = require('lodash');
var Promise    = require('promise');
var Downloader = require('./downloader');

module.exports =  function(options) {
    return new PListResources(options);
};

var defaultOptions = {
    pListFile : '',
    iOSPath : '',
};

function PListResources(options) {
    options = setOptions(options);

    /**
     * Downloads all files in the specified path
     */
    this.extract = function() {
        return getResourcesFromPListFile(options.pListFile);
    };

    function getResourcesFromPListFile(filePath) {
        var originalPlistFile = fs.readFileSync(filePath, 'utf8');
        var plistObj = plist.parse(originalPlistFile);
        return plistObj.items[0].assets.map(prepareResource);
    }

    function prepareResource(asset) {
        var urlParts = url.parse(asset.url, false);
        return  { url: urlParts.path, downloadAs: options.iOSPath + '/' + getFileNameFromURLParam(urlParts.query) };
    }

    function getFileNameFromURLParam(url) {
        var pattern = /.+=(\S+)/;
        var match = pattern.exec(url);
        return match[1];
    }

    function setOptions(options) {
        return _.extend(defaultOptions, options);
    }

}





/*


console.log(resources);

var download = new Downloader({
    host : '',
    port : 443,
    baseUrl : ''
})

mobileDistDownloader({
            host: 'builder.gft.com',
            baseUrl: '',
            appName: 'TimeTracker'
        })
        .customResources(resources)
        .inFolder(__dirname)
        .then(
            function ok () {
                console.log('Downloaded generated build to ');
            },
            function error (err) {
                console.log(err);
            }
        );

/*Promise.all(plistObj.items[0].assets.map(prepareResource))
.done(function(res) {
    console.log('finished');
}, function(err) {
    console.log(err);
});*/


//console.log(resourcesToRequest);

/*
fs.writeFile('new.plist', plist.build(plistObj), function (err) {
    if (err) throw err;
    console.log('Plist changed');
});

function processAsset(asset) {
    download(asset.url);
    return asset;
}*/



