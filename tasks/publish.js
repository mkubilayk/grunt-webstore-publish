'use strict';

var Q = require('q');
var unirest = require('unirest');
var path = require('path');

module.exports = function (grunt) {

    grunt.registerTask('webstore-publish',
        'Task for updating and publishing items in the Chrome Web Store.',
        run
    );

    function run() {
        var self = this;
        var done = self.async();

        authorize()
            .then(upload)
            .then(publish)
            .then(done)
            .catch(function (err) {
                grunt.log.error(JSON.stringify(err, null, 4));
            });
    }

    function publish() {
        grunt.log.writeln('Publishing it live...');

        grunt.config.requires('webstore.tokens.access');
        grunt.config.requires('webstore.app.id');

        return Q.promise(function (resolve, reject) {
            var r = unirest
                .post(grunt.template.process('https://www.googleapis.com/chromewebstore/v1.1/items/<%= webstore.app.id %>/publish'))
                .header('x-goog-api-version', 2)
                .header('Authorization', grunt.template.process('Bearer <%= webstore.tokens.access %>'))
                .header('Content-Length', 0);

            if (grunt.config.get('webstore.app.private')) {
                r.query({ publishTarget: 'trustedTesters' });
            }

            r.end(function (res) {
                if (res.error)
                    return reject(res.body || res.error);

                grunt.log.ok('Done.');

                resolve();
            });
        });
    }

    function upload() {
        grunt.log.writeln('Uploading the package...');

        grunt.config.requires('webstore.tokens.access');
        grunt.config.requires('webstore.app.id');
        grunt.config.requires('webstore.app.pkg');

        return Q.promise(function (resolve, reject) {
            var r = unirest
                .put(grunt.template.process('https://www.googleapis.com/upload/chromewebstore/v1.1/items/<%= webstore.app.id %>'))
                .header('x-goog-api-version', 2)
                .header('Authorization', grunt.template.process('Bearer <%= webstore.tokens.access %>'))
                .attach('file', grunt.template.process('<%= webstore.app.pkg %>'));

            r.end(function (res) {
                if (res.error)
                    return reject(res.body || res.error);

                grunt.log.ok('Done.');

                resolve();
            });
        });
    }

    function authorize() {
        grunt.log.writeln('Authorizing the client...');

        grunt.config.requires('webstore.client.id');
        grunt.config.requires('webstore.client.secret');
        grunt.config.requires('webstore.tokens.refresh');

        return Q.promise(function (resolve, reject) {
            var r = unirest
                .post('https://accounts.google.com/o/oauth2/token')
                .form({
                    client_id: grunt.template.process('<%= webstore.client.id %>'),
                    client_secret: grunt.template.process('<%= webstore.client.secret %>'),
                    refresh_token: grunt.template.process('<%= webstore.tokens.refresh %>'),
                    grant_type: 'refresh_token'
                });

            r.end(function (res) {
                if (res.error)
                    return reject(res.body || res.error);

                grunt.config.set('webstore.tokens.access', res.body.access_token);
                grunt.log.ok('Done.');

                resolve();
            });
        });
    }
};
