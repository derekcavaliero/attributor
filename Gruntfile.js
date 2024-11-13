'use strict';

module.exports = function( grunt ) {

	grunt.initConfig({

		pkg: grunt.file.readJSON( 'package.json' ),

		project: {
			src  : {
				js   : [ 'src' ],
			},
			dist : {
				js   : [ 'dist' ],
			}
		},

		uglify: {
			options: {
				banner: '/*! \n * <%= pkg.name %>.js v<%= pkg.version %> \n * <%= pkg.repo %>\n * © 2018-<%= grunt.template.today("yyyy") %> Derek Cavaliero @ LEVEL\n * Updated: <%= grunt.template.today("yyyy-mm-dd HH:MM:ss Z") %> \n */\n',
			},
			dist: {
				options: {
					beautify: false,  // minify file when set to false
					compress: true, // renames variables and all that
					mangle: true,
					compress: {
						drop_console: true
					}
				},
				files: {
					'<%= project.dist.js %>/attributor.min.js': [
						'<%= project.src.js %>/attributor.js'
					]
				}
			},
			dev: {
				options: {
					beautify: true,  // minify file when set to false
					compress: false, // renames variables and all that
					mangle: false,
					compress: {
						drop_console: false
					}
				},
				files: {
					'<%= project.dist.js %>/attributor.js': [
						'<%= project.src.js %>/attributor.js'
					]
				}
			}
		},

		watch: {
			grunt: {
				files	   : [ 'Gruntfile.js' ],
				tasks	   : [ 'build' ]
			},
			options: {
				livereload : false
			},
			scripts: {
				files      : [ '<%= project.src.js %>/**/*.js' ],
				tasks  	   : [ 'uglify' ],
				exclude    : [ '!**/node_modules/**', '!**/bower_components/**' ]
			}
		},

	});

	grunt.loadNpmTasks( 'grunt-contrib-uglify' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );

	grunt.registerTask( 'build', [ 'uglify' ] );
	grunt.registerTask( 'default', [ 'build', 'watch' ] );

}
