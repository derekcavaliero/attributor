function Attributor( cookieDomain, fieldMap ) {

    console.time('Attributor');

    // Gracefully terminate if native JSON parsing/serialization isn't available
    if ( !JSON.parse || !JSON.stringify )
        return;

    this.cookieDomain = cookieDomain || window.location.hostname;

    this.fieldMap = fieldMap || {
        first: {
            source: 'source_first',
            medium: 'medium_first',
            campaign: 'campaign_first',
            term: 'term_first',
            content: 'content_first',
            lp: 'lp_first',
            date: 'date_first'
        },
        last: {
            source: 'source_last',
            medium: 'medium_last',
            campaign: 'campaign_last',
            term: 'term_last',
            content: 'content_last',
            lp: 'lp_last',
            date: 'date_last'
        }
    };

    this.referrer = this.objectifyUrl( document.referrer );
    this.params = this.getUrlParams();

    this.updateAttrCookies();
    this.fillFormFields();

}

Attributor.prototype = {

    objectifyUrl: function(referrer) {

        var parser = document.createElement( 'a' );
        parser.href = referrer;

        return {
            hostname: parser.hostname,
            href: parser.href,
            params: this.getUrlParams( parser.href )
        };
    },

    formatDate: function() {

        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth()+1; //January is 0!
        mm = ( mm < 10 ) ? '0' + mm : mm;
        var yyyy = today.getFullYear();

        return yyyy + '-' + mm + '-' + dd;

    },

    fillFormFields: function() {

        var storage = {
            first: this.getCookie( 'attr_first' ),
            last: this.getCookie( 'attr_last' )
        };

        console.log( '\n' + '-------------------' + '\n' + 'FIRST TOUCH:' + '\n' + '-------------------' + '\n' );
        console.log( storage.first );
        console.log( '\n' + '-------------------' + '\n' + 'LAST TOUCH:' + '\n' + '-------------------' + '\n' );
        console.log( storage.last );

        for ( var key in this.fieldMap ) {

            if ( !this.fieldMap.hasOwnProperty( key ) ) continue;

            for ( var prop in this.fieldMap[key] ) {

                if ( !this.fieldMap[key].hasOwnProperty( prop ) ) continue;

                var fields = document.getElementsByName( this.fieldMap[key][prop] );

                if ( fields ) {
                    for ( var i = 0; i < fields.length; i++ )
                        fields[i].value = storage[key][prop];
                }

            }

        }

        console.timeEnd('Attributor');

    },

    updateAttrCookies: function() {

        var data = {
            source: '(direct)',
            medium: '(none)',
            campaign: '(not set)',
            term: '(not provided)',
            content: '(not set)',
            lp: window.location.hostname + window.location.pathname,
            date: this.formatDate(),
            timestamp: Date.now()
        };

        // These are just some common referrers that we can parse easily into either organic or social. Expanding this list probably isn't necessary -
        // the most important mediums are paid and organic (social is also a nice one to have because theres a set # of relevant social platforms)
        var referrers = {
            organic: [
                'www.google.com',
                'www.bing.com',
                'www.yahoo.com',
                'www.ask.com',
                'search.aol.com',
                'www.baidu.com',
                'www.wolframalpha.com',
                'duckduckgo.com',
                'www.yandex.com'
            ],
            social: [
                'www.linkedin.com',
                'www.facebook.com',
                't.co',
                'l.instagram.com'
            ]
        };

        // Referrer parsing notes
        //
        // These common URL shorteners don't pass proper document.referrer values:
        // - t.co
        // - hubs.ly
        // - lnkd.in
        //
        // If the document.referrer is the same TLD as the cookieDomain then we can only assume its direct - UNLESS there are utm_ parameters that determine otherwise
        if ( document.referrer && ( this.referrer.hostname.indexOf( this.cookieDomain ) === -1 ) ) {

            var parsedSource = false;
            var parsedMedium = false;

            for ( var key in referrers ) {

                if ( parsedSource )
                    break;

                if ( !referrers.hasOwnProperty( key ) ) continue;

                for ( var i = 0; i < referrers[key].length; i++ ) {

                    if ( this.referrer.hostname.indexOf( referrers[key][i] ) > -1 ) {

                        var sourceParts = referrers[key][i].split( '.' );

                        // This is an assumption that most urls we'll want to part will only have 0-1 subdomains and exist on a TLD that doesn't contain 2 . (e.g: .co.uk)
                        parsedSource = ( sourceParts.length == 2 ) ? sourceParts[0] : sourceParts[1];
                        parsedMedium = key;

                        break;

                    }

                }

            }

            data.source = ( parsedSource ) ? parsedSource : this.referrer.hostname;
            data.medium = ( parsedMedium ) ? parsedMedium : 'referral';

        }

        // UTM parsing
        //
        // UTMs always take precedence over any referral parsing or direct traffic
        var utms = [
            'source', 'medium', 'campaign', 'term', 'content'
        ];

        // @TODO: IF Source/Medium params have value(s) force reset attr_last cookie.

        var forceLastTouchUpdate = ( this.params.utm_source || this.params.utm_medium ) ? true : false;

        for ( var i = 0; i < utms.length; i++ ) {
            if ( this.params['utm_' + utms[i]] )
                data[utms[i]] = this.params['utm_' + utms[i]];
        }

        // Forcing proper source/mediums for GoogleAds/Facebook fb/g clid autotagging in case manual UTM tagging hasn't been implemented
        if ( !this.params.utm_source && !this.params.utm_medium ) {

            if ( this.params.gclid || this.params.fbclid ) {
                data.medium = 'cpc';
                forceLastTouchUpdate = true;
            }

            if ( this.params.gclid )
                data.source = 'google';

            if ( this.params.fbclid )
                data.source = 'facebook';

        }

        if ( this.checkCookie( 'attr_first' ) ) {

            var storedLastTouchData = ( this.checkCookie( 'attr_last' ) ) ? this.getCookie( 'attr_last' ) : false;

            // Only overwrite last touch if 30 minutes has ellapsed OR if source/medium params are present
            if ( !storedLastTouchData || forceLastTouchUpdate ) {
                this.setCookie( 'attr_last', data, 30 );
            } else {
                this.setCookie( 'attr_last', storedLastTouchData, 30 );
            }

        } else {
            this.setCookie( 'attr_first', data, 730, 'days' );
            this.setCookie( 'attr_last', data, 30 );
        }

    },

    checkCookie: function( name ) {

		name = this.getCookie( name );

		return ( ( name != null && name != '' ) ? true : false );

	},

    getCookie: function( name ) {

		if ( document.cookie.length > 0 ) {

			var start = document.cookie.indexOf( name + '=' );

			if ( start != -1 ) {

				start = start + name.length + 1;

				var end = document.cookie.indexOf( ';', start );

				if ( end == -1 ) {
					end = document.cookie.length;
				}

				return JSON.parse( decodeURIComponent( document.cookie.substring( start, end ) ) );

			}
		}

		return '';

	},

    setCookie: function( name, value, expiresIn, expiresInUnits ) {

        expiresInUnits = (typeof expiresInUnits !== 'undefined') ?  expiresInUnits : 'minutes';

		var expireDate = new Date();

        if ( 'days' == expiresInUnits )
		      expireDate.setDate( expireDate.getDate() + expiresIn );

        if ( 'minutes' == expiresInUnits ) {
            expireDate.setTime( expireDate.getTime() + ( expiresIn * 60 * 1000 ) );
        }

		document.cookie = name + '=' + encodeURIComponent( JSON.stringify( value ) ) + ( ( expiresIn == null ) ? '' : '; domain=.' + this.cookieDomain + '; expires=' + expireDate.toUTCString() ) + '; path=/';

	},

    getUrlParams: function( url ) {

        var params = {};
    	var parser = document.createElement( 'a' );
    	parser.href = url || window.location.href;

        if ( !parser.search )
            return false;

    	var query = parser.search.substring( 1 );
    	var vars = query.split( '&' );

        for ( var i = 0; i < vars.length; i++ ) {
    		var pair = vars[i].split( '=' );
    		params[pair[0]] = decodeURIComponent( pair[1] );
    	}

        return params;

	}

};
