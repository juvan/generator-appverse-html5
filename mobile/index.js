/*
 Copyright (c) 2015 GFT Appverse, S.L., Sociedad Unipersonal.
 This Source Code Form is subject to the terms of the Appverse Public License
 Version 2.0 (“APL v2.0”). If a copy of the APL was not distributed with this
 file, You can obtain one at http://www.appverse.mobi/licenses/apl_v2.0.pdf. [^]
 Redistribution and use in source and binary forms, with or without modification,
 are permitted provided that the conditions of the AppVerse Public License v2.0
 are met.
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. EXCEPT IN CASE OF WILLFUL MISCONDUCT OR GROSS NEGLIGENCE, IN NO EVENT
 SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT(INCLUDING NEGLIGENCE OR OTHERWISE)
 ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

var yeoman = require('yeoman-generator');
var path = require ('path');
var fs = require ('fs');

// This subgenerator adds all grunt tasks and resources necessary to make calls to
// the mobile builder server. This server builds HTML5 apps into native mobile apps.
module.exports = yeoman.generators.Base.extend({

    initializing: function () {
        this.log('You called the Mobile Build Support Subgenerator.');
        this.conflicter.force = true;
    },

    // Add necessary files to make requests to the mobile builder server
    projectFiles: function () {
        this.fs.copy(
            this.templatePath('config'),
            this.destinationPath('config')
        );
    },

    addNpmDependencies: function() {
        var filePath = this.destinationPath('package.json');
        var packageJson = this.fs.readJSON(filePath);
        packageJson.devDependencies.lodash = '^3.3.1';
        packageJson.devDependencies.promise = '^6.1.0';
        packageJson.devDependencies.plist = '^1.1.0';
        packageJson.devDependencies['grunt-contrib-compress'] = '^0.13.0';
        packageJson.devDependencies['grunt-http-upload'] = '^0.1.8';
        this.fs.writeJSON(filePath, packageJson);
    },

    // Following functions modify the Gruntfile to add mobile builds support
    addGruntDependencies: function() {
        this.gruntfile.insertVariable( '_', "require('lodash')" );
        this.gruntfile.insertVariable( 'mobileDistDownloader', "require('./config/grunt-helpers/download-mobile-dist')" );
    },

    addGruntVariables: function() {
        this.gruntfile.insertVariable('mobileBuilder', "{" +
            "// Remote mobile builer\n" +
            "host: 'builder.gft.com'," +
            "// Ensure this is equal to your app.name in the build.properties file\n" +
            "appName: 'TimeTracker'" +
        "}");
    },

    addGruntTasks: function() {
        this.gruntfile.registerTask('dist:mobile', ['dist:mobile:build'] );
        this.gruntfile.registerTask('dist:mobile:build', [
            'dist:mobile:emulator',
            'compress:mobileBuildBundle',
            'http_upload:mobileBuilder',
            'download_mobile_build'
        ]);
        this.gruntfile.registerTask('dist:mobile:emulator', [
            'dist',
            'clean:mobileBuilderBundle',
            'copy:mobile',
        ]);
        this.gruntfile.gruntfile.assignment('module.exports').value().body.append(
            "grunt.registerTask('download_mobile_build', function () {" +
                "var done = this.async();" +
                "var downloadPath = yeoman.mobileDist;" +
                "var downloadOptions = {" +
                "    host: mobileBuilder.host," +
                "    baseUrl: '/builder/dist/' + grunt.option('buildId')," +
                "    appName: mobileBuilder.appName" +
                "};" +
                "" +
                "grunt.log.writeln('Build available at https://' + downloadOptions.host + downloadOptions.baseUrl);" +
                "grunt.file.mkdir(yeoman.mobileDist);" +
                "grunt.file.mkdir(yeoman.mobileDist + '/ios');" +
                "grunt.file.mkdir(yeoman.mobileDist + '/android');" +
                "" +
                "mobileDistDownloader(downloadOptions)" +
                "    .downloadIn(downloadPath)" +
                "    .then(" +
                "        function ok() {" +
                "            grunt.log.ok('Downloaded generated build to ' + downloadPath);" +
                "            done();" +
                "        }," +
                "        function error(err) {" +
                "            grunt.log.error(err);" +
                "            done(false);" +
                "        }" +
                "    );" +
            "});"
        );
    },

    addGruntTasksConfig: function() {

        this.gruntfile.insertConfig('compress', "{" +
            "/* Compress mobile resources to send to the build server.\n" +
            " * Takes the structure required by the mobile builder and zips it.\n" +
            " * This creates the complete zipped file to:\n"  +
            " * Use in the emulator\n" +
            " * Upload to the builder service\n */" +
            "mobileBuildBundle: {" +
            "    options: {" +
            "        archive: '.tmp/mobile-build-bundle.zip'" +
            "    }," +
            "    files: [{" +
            "        expand: true," +
            "        cwd: '<%= yeoman.mobileDist %>/emulator'," +
            "        src: '**'" +
            "    }]" +
            "}" +
        "}");

        this.gruntfile.insertConfig('http_upload', "{" +
            "/* Http uploader.\n" +
            " * Uploads all the app resources to the mobile builder service\n" +
            " * that generates mobile Packages\n" +
            " */" +
            "mobileBuilder: {" +
            "    options: {" +
            "        url: 'https://' + mobileBuilder.host + '/builder/service_5_0'," +
            "        method: 'POST'," +
            "        rejectUnauthorized: false," +
            "        headers: {" +
            "            'Authorization': 'Basic ' + new Buffer('user:password').toString('base64')" +
            "        }," +
            "        data: {" +
            "            // Addresses where to email the result (separated by commas)\n" +
            "            addressList: ''" +
            "        }," +
            "        onComplete: function (data) {" +
            "            // Get build id from log and set is as grunt global variable \n" +
            "            var pattern =" + new RegExp(/Distributed to: http(s)?:\/\[\.\.\.\]\/(\S+)<br>/).toString() + ";" +
            "            var match = pattern.exec(data);" +
            "            var buildId = match[2];" +
            "            grunt.option('buildId', buildId);" +
            "            grunt.log.writeln('Builder server generated build with id: ' + buildId);" +
            "            grunt.file.write(yeoman.mobileDist + '/build.log', data);" +
            "        }" +
            "    }," +
            "    src: '.tmp/mobile-build-bundle.zip'," +
            "    dest: 'filename'" +
            "}" +
        "}");

        this.gruntfile.insertConfig('replace', "{" +
            "// Replace URLs relative to the mobile build server\n" +
            "// for a custom ones. This is necessary as the mobile build server only keeps generated\n" +
            "// files for 10 minutes. Because of this, assets should be downloaded to the CI server and this task\n" +
            "// replaces URLs to point to the CI server.\n" +
            "// This task requires the base-url command line parameter: eg grunt replace --base-url=http://localhost\n" +
            "plist: {" +
            "    options: {" +
            "        patterns: [" +
            "            {" +
            "                // match any url with domain builder.gft.com (inside a <string> tag)\n" +
            "                match:" +  new RegExp(/<string>\w+tps?:\/\/\S*builder\.gft\.com\S+\?\w+=(\w+\.\w+)<\/string>/g).toString() + "," +
            "                replacement: _.trim(grunt.option('base-url'), '/') + '/ios/$1'" +
            "            }" +
            "        ]" +
            "    }," +
            "    files: {" +
            "        '<%= yeoman.mobileDist %>/ios/<%= appName %>.plist': [" +
            "            '<%= yeoman.mobileDist %>/ios/<%= appName %>.plist'" +
            "        ]" +
            "    }" +
            "}," +
            "mobileZipUrl: {" +
            "    options: {" +
            "        patterns: [" +
            "            {" +
            "                // match the URL to download the mobile build ZIP file\n" +
            "                match:" + new RegExp(/href="(https:\/\/builder\.gft\.com\/builder\/dist\/\w+)"/).toString() + "," +
            "                replacement: 'href=\"' + _.trim(grunt.option('base-url'), '/') +'/build-result-encripted.zip\"'" +
            "            }" +
            "        ]" +
            "    }," +
            "    files: {" +
            "        '<%= yeoman.mobileDist %>/index.html': ['<%= yeoman.mobileDist %>/index.html']" +
            "    }" +
            "}," +
            "iOSBuildUrl: {" +
            "    options: {" +
            "        patterns: [" +
            "            {" +
            "                // match the URLs for each platform\n" +
            "                match:"  + new RegExp(/\w+tps?:\/\/\S*builder\.gft\.com\S+\/dist\/\w+\/(\w+.plist)/).toString() + "," +
            "                replacement: _.trim(grunt.option('base-url'), '/') + '/ios/$1'," +
            "            }" +
            "        ]" +
            "    }," +
            "    files: {" +
            "        '<%= yeoman.mobileDist %>/index.html': ['<%= yeoman.mobileDist %>/index.html']" +
            "    }" +
            "}," +
            "androidBuildUrl: {" +
            "    options: {" +
            "        patterns: [" +
            "            {" +
            "                // match the URLs for each platform\n" +
            "                match:" + new RegExp(/\w+tps?:\/\/\S*builder\.gft\.com\S+\/dist\/\w+\/(\w+.apk)/).toString() + "," +
            "                replacement: _.trim(grunt.option('base-url'), '/') + '/android/$1'," +
            "            }" +
            "        ]" +
            "    }," +
            "    files: {" +
            "        '<%= yeoman.mobileDist %>/index.html': ['<%= yeoman.mobileDist %>/index.html']" +
            "    }" +
            "}" +
        "}");
    }
});