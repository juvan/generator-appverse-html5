'use strict';
var gulp  = require('gulp');
var gutil = require('gulp-util');
// This lib spawns a child process on each mocha execution
var mocha = require('gulp-spawn-mocha');

// Watch for changes
gulp.task('watch', function () {
    gulp.watch(['*/*.js'], ['test']);
});

// Run tests with mocha
gulp.task('test', function() {
    return gulp.src(['test/*.js'], {read: false})
        .pipe(mocha())
        .on('error', gutil.log);
});

